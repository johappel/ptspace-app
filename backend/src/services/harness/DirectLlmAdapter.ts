import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConversationMessage } from "@ptspace/shared";
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

export type LlmClient = (messages: LlmChatMessage[]) => Promise<string>;

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
        body: JSON.stringify({ model: options.model, messages }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`llm_http_${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return payload.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timer);
    }
  };
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

    let conversationContext = input.conversationContext ?? "";
    if (!conversationContext) {
      try {
        conversationContext = await fs.readFile(path.join(projectDir, "conversation-summary.md"), "utf8");
      } catch {
        // Kein Gesprächskontext vorhanden – erster Turn.
      }
    }

    const workspaceContext = await this.readWorkspaceContext(projectDir);
    const prompt = buildCriticalFriendPrompt(
      input.message,
      { kernelReferencePath: this.kernelReferencePath(), kernelWritableDescription: "keine im aktuellen Lauf" },
      conversationContext
    );

    let replyText: string;
    try {
      replyText = await this.llm([
        { role: "system", content: prompt },
        { role: "user", content: workspaceContext ? `Aktueller Planungsraum:\n\n${workspaceContext}\n\nNachricht der Lehrkraft: ${input.message}` : input.message }
      ]);
    } catch (error) {
      return this.failedResult(this.teacherFacingError(error));
    }

    replyText = toTeacherFacingReply(normalizeOutput(replyText));
    if (!replyText) {
      return this.failedResult("Die geschützte Ausführung hat keine fachliche Antwort geliefert. Ich breche hier ab, statt einen Denkstand nur scheinbar zu aktualisieren.");
    }

    const after = await snapshotProject(projectDir);
    const changedFiles = diffSnapshots(before, after);
    replyText = guardUnsupportedClaims(replyText, changedFiles);

    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: replyText, createdAt: new Date().toISOString() } as ConversationMessage,
      workspaceUpdates: [],
      events: [
        { type: "status", status: "ready", message: replyText },
        ...changedFiles.map((relativePath): HarnessEvent => ({ type: "workspace_update", relativePath }))
      ]
    };
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
      output = await this.llm([
        { role: "system", content: prompt },
        { role: "user", content: `Aktueller Planungsraum:\n\n${workspaceContext}` }
      ]);
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
        output = await this.llm([
          { role: "system", content: prompt },
          { role: "user", content: draftContent }
        ]);
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

  private failedResult(message: string): HarnessMessageResult {
    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: message, createdAt: new Date().toISOString() } as ConversationMessage,
      workspaceUpdates: [],
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
