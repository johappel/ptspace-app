import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConversationMessage, RuntimeUsage, emptyRuntimeUsage } from "@ptspace/shared";
import { HarnessPermissionRequest, PermissionPolicy } from "../policy/PermissionPolicy.js";
import {
  HarnessAdapter,
  HarnessAvailability,
  HarnessEvent,
  HarnessMessageResult,
  HarnessPolicySimulationResult,
  HarnessReviewResult,
  HarnessSession,
  HarnessTaskRequest,
  HarnessTaskResult,
  SendHarnessMessageInput
} from "./HarnessAdapter.js";
import {
  buildCriticalFriendPrompt,
  buildReviewPrompt,
  buildWorkerPrompt
} from "./prompts.js";
import { loadKernelContext } from "./kernelContext.js";
import {
  assertProjectDirectory,
  copyProjectForReview,
  diffSnapshots,
  safeRelativeOutputPath,
  snapshotProject
} from "./workspaceDiff.js";
import {
  guardUnsupportedClaims,
  normalizeOutput,
  parseReviewReply,
  toTeacherFacingReply
} from "./replyTranslation.js";

// Direkte LLM-Ausführungsstufe ohne Agenten-Runtime: Das Backend baut die Prompts,
// ruft eine OpenAI-kompatible Chat-Completion-API auf und schreibt Dateiänderungen
// selbst in den Planungsraum. Damit entfallen Docker, CLI, JSONL-Parsing und
// Secret-Mounts aus dem Standardpfad.

export type LlmChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Rohe Usage-Daten eines OpenAI-kompatiblen Providers (falls geliefert). */
export type LlmUsage = { promptTokens?: number; completionTokens?: number; cachedTokens?: number };

/**
 * Ein LLM-Aufruf. Liefert den Antworttext. Optional kann eine Usage-Struktur
 * über den zweiten Rückgabewert bereitgestellt werden; ältere Fakes, die nur
 * einen String liefern, bleiben kompatibel.
 */
export type LlmClient = (messages: LlmChatMessage[]) => Promise<string | { text: string; usage?: LlmUsage }>;

export type DirectLlmAdapterOptions = {
  enabled: boolean;
  policy: PermissionPolicy;
  baseUrl: string;
  model?: string;
  apiKeyAvailable: boolean;
  timeoutMs: number;
  kernelDir?: string;
  fetchImpl?: typeof fetch;
};

type WorkspaceFileUpdate = { relativePath: string; content: string };

/** Die einzigen Dateien, die der Denkstand-Update-Aufruf verändern darf. */
const THINKING_STATE_FILES = ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"];

/** Liest das JSON-Update-Protokoll tolerant aus (inkl. umgebendem Text/Markdown-Fences). */
export function parseThinkingStateUpdates(raw: string): WorkspaceFileUpdate[] {
  const text = raw.trim();
  if (!text) return [];
  const jsonCandidates: string[] = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) jsonCandidates.push(fenced[1].trim());
  const start = text.indexOf("{");
  const lastStart = text.lastIndexOf("{");
  for (const idx of [start, lastStart]) {
    if (idx === -1) continue;
    // Von jeder öffnenden Klammer bis zur passenden schließenden Klammer suchen.
    let depth = 0;
    for (let i = idx; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          jsonCandidates.push(text.slice(idx, i + 1));
          break;
        }
      }
    }
  }
  for (const candidate of jsonCandidates) {
    for (const attempt of [candidate, repairJsonNewlines(candidate)]) {
      try {
        const parsed = JSON.parse(attempt) as { updates?: Array<{ path?: string; content?: string }> };
        if (!Array.isArray(parsed.updates)) continue;
        return parsed.updates
          .filter((u): u is { path: string; content: string } => typeof u.path === "string" && typeof u.content === "string" && u.content.trim().length > 0)
          .map((u) => ({ relativePath: u.path.replace(/\\/g, "/"), content: u.content }));
      } catch {
        // Nächsten Reparatur-/Kandidaten-Versuch versuchen.
      }
    }
  }
  return [];
}

/**
 * Repariert das häufigste Modellproblem: echte Zeilenumbrüche innerhalb von
 * JSON-Strings (müssen als \n escaped sein). Ersetzt Newlines nur zwischen
 * Anführungszeichen, nicht die Struktur-Umbrüche außerhalb.
 */
function repairJsonNewlines(candidate: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  for (const char of candidate) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && char === "\n") {
      result += "\\n";
      continue;
    }
    if (inString && char === "\r") {
      continue;
    }
    result += char;
  }
  return result;
}

function defaultLlmClient(options: DirectLlmAdapterOptions): LlmClient {
  const doFetch = options.fetchImpl ?? fetch;
  return async (messages) => {
    const apiKey = process.env.PTSPACE_LLM_API_KEY ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("llm_api_key_missing");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await doFetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          // Reasoning-Modelle verbrauchen Tokens für Thinking, bevor der
          // sichtbare Content entsteht; ohne Limit bleibt die Antwort leer.
          max_tokens: 4000
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`llm_http_${response.status}`);
      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
      };
      const text = payload.choices?.[0]?.message?.content ?? "";
      const usage: LlmUsage | undefined = payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            cachedTokens: payload.usage.prompt_tokens_details?.cached_tokens
          }
        : undefined;
      return { text, usage };
    } finally {
      clearTimeout(timer);
    }
  };
}

/** Normalisiert das Client-Ergebnis (String oder { text, usage }). */
function readClientResult(result: string | { text: string; usage?: LlmUsage }): { text: string; usage?: LlmUsage } {
  return typeof result === "string" ? { text: result } : result;
}

/** Addiert Provider-Usage in eine providerneutrale RuntimeUsage. */
function accumulateUsage(target: RuntimeUsage, usage: LlmUsage | undefined): void {
  target.modelCalls += 1;
  if (!usage) return;
  if (usage.promptTokens !== undefined) target.inputTokens = (target.inputTokens ?? 0) + usage.promptTokens;
  if (usage.completionTokens !== undefined) target.outputTokens = (target.outputTokens ?? 0) + usage.completionTokens;
  if (usage.cachedTokens !== undefined) target.cachedTokens = (target.cachedTokens ?? 0) + usage.cachedTokens;
}

export class DirectLlmAdapter implements HarnessAdapter {
  id = "direct-llm";
  label = "Direkter Modellzugriff";
  mode = "external" as const;
  private readonly llm: LlmClient;

  constructor(private readonly options: DirectLlmAdapterOptions) {
    this.llm = defaultLlmClient(options);
  }

  async checkAvailability(): Promise<HarnessAvailability> {
    if (!this.options.enabled) {
      return {
        status: "requires_admin_configuration",
        teacherFacingMessage: "Die direkte Modellverbindung ist vorbereitet, aber noch nicht freigegeben."
      };
    }
    if (!this.options.apiKeyAvailable) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Für den Modellzugriff fehlt noch die freigegebene API-Key-Konfiguration."
      };
    }
    if (!this.options.model) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Für den Modellzugriff fehlt noch ein freigegebenes Modell."
      };
    }
    const kernelStatus = await this.checkKernelAvailability();
    if (kernelStatus) return kernelStatus;
    return {
      status: "ready",
      teacherFacingMessage: "Die geschützte Modellverbindung ist vorbereitet. Nutze sie nur mit einem nicht-sensiblen Test-Planungsraum."
    };
  }

  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<HarnessSession> {
    if (!this.options.enabled) throw new Error("direct_llm_adapter_not_enabled");
    const availability = await this.checkAvailability();
    if (availability.status !== "ready") throw new Error(`direct_llm_adapter_${availability.status}`);
    return {
      id: `direct-llm-session-${input.planningSpaceId}`,
      planningSpaceId: input.planningSpaceId,
      workspaceRoot: path.resolve(input.workspaceRoot)
    };
  }

  async sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult> {
    const projectDir = input.session.workspaceRoot;
    await assertProjectDirectory(projectDir, input.session.workspaceRoot);
    const before = await snapshotProject(projectDir);
    const startedAt = Date.now();
    const usage = emptyRuntimeUsage();

    let conversationContext = input.conversationContext ?? "";
    if (!conversationContext) {
      try {
        conversationContext = await fs.readFile(path.join(projectDir, "conversation-summary.md"), "utf8");
      } catch {
        // Kein Gesprächskontext vorhanden – erster Turn.
      }
    }

    const workspaceContext = await this.readWorkspaceContext(projectDir);
    const kernelContext = await loadKernelContext(this.options.kernelDir);
    const prompt = buildCriticalFriendPrompt(
      input.message,
      { kernelReferencePath: this.kernelReferencePath(), kernelWritableDescription: "keine im aktuellen Lauf", kernelContext },
      conversationContext
    );

    let replyText: string;
    try {
      const result = readClientResult(await this.llm([
        { role: "system", content: prompt },
        { role: "user", content: workspaceContext ? `Aktueller Planungsraum:\n\n${workspaceContext}\n\nNachricht der Lehrkraft: ${input.message}` : input.message }
      ]));
      accumulateUsage(usage, result.usage);
      replyText = result.text;
    } catch (error) {
      usage.runtimeMs = Date.now() - startedAt;
      return this.failedResult(this.teacherFacingError(error), usage);
    }

    replyText = toTeacherFacingReply(normalizeOutput(replyText));
    if (!replyText) {
      usage.runtimeMs = Date.now() - startedAt;
      return this.failedResult("Die geschützte Ausführung hat keine fachliche Antwort geliefert. Ich breche hier ab, statt einen Denkstand nur scheinbar zu aktualisieren.", usage);
    }

    // Strukturierter zweiter Aufruf: Das Modell entscheidet, welche kanonischen
    // Denkstand-Dateien mit welchem vollständigen Inhalt aktualisiert werden.
    // Das Backend schreibt selbst und ausschließlich diese Dateien – das Modell
    // erhält keinen Schreibzugriff auf den Workspace.
    const appliedUpdates = await this.applyThinkingStateUpdates(projectDir, workspaceContext, conversationContext, input.message, replyText, usage);

    const after = await snapshotProject(projectDir);
    const changedFiles = diffSnapshots(before, after);
    replyText = guardUnsupportedClaims(replyText, changedFiles);
    usage.runtimeMs = Date.now() - startedAt;

    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: replyText, createdAt: new Date().toISOString() } as ConversationMessage,
      workspaceUpdates: [],
      usage,
      events: [
        { type: "status", status: "ready", message: replyText },
        ...appliedUpdates.map((relativePath): HarnessEvent => ({ type: "workspace_update", relativePath })),
        ...changedFiles.map((relativePath): HarnessEvent => ({ type: "workspace_update", relativePath }))
      ]
    };
  }

  /** Führt die vom Modell gewünschten Denkstand-Updates serverseitig aus. */
  private async applyThinkingStateUpdates(
    projectDir: string,
    workspaceContext: string,
    conversationContext: string,
    teacherMessage: string,
    replyText: string,
    usage?: RuntimeUsage
  ): Promise<string[]> {
    const currentState = workspaceContext || "(Der Planungsraum enthält noch keine Denkstand-Dateien.)";
    const instruction = [
      "Du hast soeben als Critical Friend im Planungsraum geantwortet.",
      `Nachricht der Lehrkraft: ${teacherMessage}`,
      `Deine Antwort: ${replyText}`,
      ...(conversationContext ? ["Bisheriger Gesprächskontext:", conversationContext] : []),
      "",
      "Entscheide jetzt, ob der pädagogische Denkstand aktualisiert werden muss.",
      "Aktualisierbare Dateien sind ausschließlich:",
      "- learning-design.md",
      "- decisions.md",
      "- open-questions.md",
      "- next-steps.md",
      "",
      "Antworte AUSSCHLIESSLICH mit einem JSON-Objekt ohne Markdown-Formatierung:",
      '{"updates": [{"path": "<dateiname>", "content": "<vollständiger neuer Dateiinhalt>"}]}',
      "",
      "Regeln:",
      "- Gib für jede zu ändernde Datei den VOLLSTÄNDIGEN neuen Inhalt an, nicht nur Ausschnitte.",
      "- Erhalte die bestehende Struktur der Datei und ergänze oder passe Abschnitte sinnvoll an.",
      "- Wenn keine Aktualisierung nötig ist, antworte: {\"updates\": []}",
      "- Keine weiteren Texte, keine Erklärungen, nur das JSON."
    ].join("\n");

    let raw: string;
    try {
      const result = readClientResult(await this.llm([
        { role: "system", content: instruction },
        { role: "user", content: `Aktueller Stand des Planungsraums:\n\n${currentState}` }
      ]));
      if (usage) accumulateUsage(usage, result.usage);
      raw = result.text;
    } catch (error) {
      // Ein fehlgeschlagener Update-Aufruf darf das Gespräch nicht blockieren;
      // guardUnsupportedClaims kennzeichnet nicht persistierte Behauptungen.
      console.error(`thinking_state_update_failed: ${error instanceof Error ? error.message : error}`);
      return [];
    }
    if (!parseThinkingStateUpdates(raw).length) {
      console.error(`thinking_state_update_unparsable: ${raw.slice(0, 300)}`);
    }

    const updates = parseThinkingStateUpdates(raw).filter((update) => THINKING_STATE_FILES.includes(update.relativePath));
    for (const update of updates) {
      const target = safeRelativeOutputPath(projectDir, update.relativePath);
      await fs.mkdir(path.dirname(path.join(projectDir, target)), { recursive: true });
      await fs.writeFile(path.join(projectDir, target), update.content, "utf8");
    }
    return updates.map((update) => update.relativePath);
  }

  async requestTask(input: HarnessTaskRequest): Promise<HarnessTaskResult> {
    if (input.service !== "worker") throw new Error("unsupported_harness_task_service");
    if (input.capability !== "create_student_instruction" && input.capability !== "create_board_material") {
      throw new Error("unsupported_worker_capability");
    }
    const projectDir = input.session.workspaceRoot;
    await assertProjectDirectory(projectDir, input.session.workspaceRoot);
    const expectedPath = safeRelativeOutputPath(projectDir, input.expectedOutput.relativePath);

    const workspaceContext = await this.readWorkspaceContext(projectDir);
    const prompt = buildWorkerPrompt(input, { kernelReferencePath: this.kernelReferencePath(), kernelWritableDescription: "keine im aktuellen Lauf" });

    let output: string;
    try {
      output = readClientResult(await this.llm([
        { role: "system", content: prompt },
        { role: "user", content: `Aktueller Planungsraum:\n\n${workspaceContext}` }
      ])).text;
    } catch (error) {
      console.error(`Worker task failed: ${error instanceof Error ? error.message : error}`);
      throw new Error("worker_runtime_failed");
    }

    output = normalizeOutput(output);
    if (/^BLOCKED\b/i.test(output)) throw new Error("worker_blocked_by_capability_contract");

    await fs.mkdir(path.dirname(path.join(projectDir, expectedPath)), { recursive: true });
    await fs.writeFile(path.join(projectDir, expectedPath), output, "utf8");

    return {
      summary: "Der Worker hat den angeforderten Entwurf im Planungsraum abgelegt.",
      workspaceUpdates: [],
      events: [{ type: "workspace_update", relativePath: expectedPath }]
    };
  }

  async reviewTask(input: { session: HarnessSession; space: import("@ptspace/shared").PlanningSpace; capability: string; expectedOutput: { type: string; relativePath: string }; context: Record<string, unknown> }): Promise<HarnessReviewResult> {
    const projectDir = input.session.workspaceRoot;
    await assertProjectDirectory(projectDir, input.session.workspaceRoot);
    const temporaryParent = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-review-workspace-"));
    const reviewProjectDir = path.join(temporaryParent, "workspace");
    try {
      await copyProjectForReview(projectDir, reviewProjectDir);
      const expectedPath = safeRelativeOutputPath(reviewProjectDir, input.expectedOutput.relativePath);
      try {
        await fs.access(path.join(reviewProjectDir, expectedPath));
      } catch {
        return { status: "blocked", note: "Der zurückgekehrte Entwurf konnte für die fachliche Prüfung nicht geöffnet werden." };
      }

      const draftContent = await fs.readFile(path.join(reviewProjectDir, expectedPath), "utf8");
      const prompt = buildReviewPrompt(input, expectedPath);
      let output: string;
      try {
        output = readClientResult(await this.llm([
          { role: "system", content: prompt },
          { role: "user", content: draftContent }
        ])).text;
      } catch {
        return { status: "blocked", note: "Die fachliche Prüfung konnte noch nicht sicher abgeschlossen werden." };
      }
      return parseReviewReply(normalizeOutput(output)) ?? {
        status: "blocked",
        note: "Die fachliche Prüfung hat kein prüfbares Ergebnis geliefert."
      };
    } finally {
      await fs.rm(temporaryParent, { recursive: true, force: true });
    }
  }

  async *getEvents(_session: HarnessSession): AsyncIterable<HarnessEvent> {
    yield {
      type: "status",
      status: "waiting_for_backend_policy",
      message: "Die nächste Ausführungsstufe wartet auf Policy-Freigaben."
    };
  }

  async simulatePolicy(workspaceRoot: string): Promise<HarnessPolicySimulationResult> {
    const requests = this.createSimulationRequests(workspaceRoot);
    return {
      decisions: requests.map((request) => ({ request, decision: this.options.policy.decide(request) }))
    };
  }

  async stopSession(_session: HarnessSession): Promise<void> {
    return;
  }

  private failedResult(message: string, usage?: RuntimeUsage): HarnessMessageResult {
    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: message, createdAt: new Date().toISOString() } as ConversationMessage,
      workspaceUpdates: [],
      ...(usage ? { usage } : {}),
      events: [{ type: "status", status: "failed", message }]
    };
  }

  private teacherFacingError(error: unknown): string {
    const code = error instanceof Error ? error.message : String(error);
    if (code === "llm_api_key_missing") {
      return "Die Modellverbindung ist noch nicht vollständig freigegeben. Bitte die Administration informieren.";
    }
    if (/abort|timeout/i.test(code)) {
      return "Die Bearbeitung hat zu lange gedauert. Versuche es bitte erneut.";
    }
    return "Die geschützte Ausführung konnte noch nicht abgeschlossen werden. Die Modellverbindung braucht eine freigegebene Konfiguration.";
  }

  /** Liest die kanonischen Denkstand-Dateien als Modellkontext (nur lesend). */
  private async readWorkspaceContext(projectDir: string): Promise<string> {
    const files = ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"];
    const parts: string[] = [];
    for (const file of files) {
      try {
        const content = await fs.readFile(path.join(projectDir, file), "utf8");
        parts.push(`### ${file}\n${content}`);
      } catch {
        // Datei existiert noch nicht – überspringen.
      }
    }
    return parts.join("\n\n");
  }

  private kernelReferencePath(): string {
    return this.options.kernelDir ?? "pedagogical-thinking-space";
  }

  private async checkKernelAvailability(): Promise<HarnessAvailability | undefined> {
    if (!this.options.kernelDir) return undefined;
    try {
      await fs.access(path.join(this.options.kernelDir, "AGENTS.md"));
      await fs.access(path.join(this.options.kernelDir, "CRITICAL_FRIEND.de.md"));
    } catch {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Die pädagogische Engine ist für diese Ausführungsstufe noch nicht vollständig verfügbar."
      };
    }
    return undefined;
  }

  private createSimulationRequests(workspaceRoot: string): HarnessPermissionRequest[] {
    return [
      {
        type: "file",
        file: { workspaceRoot, targetPath: path.join(workspaceRoot, "learning-design.md"), operation: "write" }
      },
      {
        type: "file",
        file: { workspaceRoot, targetPath: path.join(workspaceRoot, "..", "outside.txt"), operation: "read" }
      },
      { type: "network", url: this.options.baseUrl },
      { type: "secret", name: "PTSPACE_LLM_API_KEY" },
      {
        type: "pedagogical_question",
        question: "Soll der erste Entwurf eher einen offenen Gesprächseinstieg oder eine strukturierte Sicherung vorbereiten?"
      }
    ];
  }
}
