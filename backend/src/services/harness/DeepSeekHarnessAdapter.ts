import path from "node:path";
import { ConversationMessage, RuntimeUsage, emptyRuntimeUsage } from "@ptspace/shared";
import { PermissionPolicy, HarnessPermissionRequest } from "../policy/PermissionPolicy.js";
import {
  HarnessAdapter,
  HarnessAvailability,
  HarnessEvent,
  HarnessMessageResult,
  HarnessPolicySimulationResult,
  HarnessSession,
  HarnessTaskRequest,
  HarnessTaskResult,
  SendHarnessMessageInput
} from "./HarnessAdapter.js";
import { normalizeOutput, toTeacherFacingReply } from "./replyTranslation.js";
import { CRITICAL_FRIEND_INSTRUCTIONS } from "./prompts.js";
import { loadKernelContext } from "./kernelContext.js";

/**
 * DeepSeek Harness Adapter (L5b.1 – Integration Spike).
 *
 * Evaluationskandidat für die adaptive Runtime. Diese Integration ist bewusst
 * dünn gehalten und kapselt ALLE DeepSeek-spezifischen Konzepte hinter der
 * PTS-eigenen `HarnessAdapter`-Grenze. Es dürfen keine DeepSeek-Typen in die
 * PTS-Domain oder das Frontend gelangen.
 *
 * Wichtige Architekturregeln (EXECUTION_ARCHITECTURE.md, AGENTS.md):
 * - Der Planungsraum bleibt ohne DeepSeek-Session rekonstruierbar; die Session
 *   ist operativer, kein kanonischer Zustand.
 * - Das Backend bleibt die autoritative Policy-Schicht.
 * - Provider-Secrets gelangen niemals in Modellkontext, Workspace oder
 *   teacher-facing Fehlermeldungen.
 *
 * Upstream-Risiko: DeepSeek Harness befindet sich in aktiver Entwicklung. Die
 * verwendete Version wird über `DeepSeekHarnessAdapterOptions.pinnedVersion`
 * dokumentiert (siehe docs/harness-deepseek.md). Der reale Transport wird über
 * `runtime` injiziert, damit die Adaptergrenze ohne echten Upstream testbar
 * bleibt und keine instabilen API-Details hart verdrahtet werden.
 */

/** Runtime-neutrales, minimales Vertragsobjekt einer DeepSeek-Session. */
export type DeepSeekRuntimeSession = { sessionId: string };

/** Rohantwort eines DeepSeek-Turns, auf das PTS-neutrale Minimum reduziert. */
export type DeepSeekRuntimeTurn = {
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number; cachedTokens?: number; toolCalls?: number };
};

/**
 * Schmale Transport-Grenze zur DeepSeek-Runtime. Nur die tatsächlich benötigten
 * Operationen sind exponiert. Kein DeepSeek-Agent-Loop-Event wird nach außen
 * gereicht.
 */
export interface DeepSeekRuntimeTransport {
  isAvailable(): Promise<boolean>;
  createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<DeepSeekRuntimeSession>;
  sendTurn(input: { sessionId: string; message: string; context?: string }): Promise<DeepSeekRuntimeTurn>;
  resumeSession?(sessionId: string): Promise<boolean>;
  stopSession(sessionId: string): Promise<void>;
}

export type DeepSeekHarnessAdapterOptions = {
  enabled: boolean;
  policy: PermissionPolicy;
  apiKeyAvailable: boolean;
  /** Gepinnte DeepSeek-Harness-Version/Commit (Dokumentations- und Diagnosezweck). */
  pinnedVersion: string;
  kernelDir?: string;
  /** Injizierbarer Transport. Fehlt er, ist der Adapter „requires_setup“. */
  runtime?: DeepSeekRuntimeTransport;
};

export class DeepSeekHarnessAdapter implements HarnessAdapter {
  id = "deepseek";
  label = "Adaptive Runtime (DeepSeek)";
  mode = "external" as const;
  private readonly sessionMap = new Map<string, string>();

  constructor(private readonly options: DeepSeekHarnessAdapterOptions) {}

  async checkAvailability(): Promise<HarnessAvailability> {
    if (!this.options.enabled) {
      return {
        status: "requires_admin_configuration",
        teacherFacingMessage: "Die adaptive Ausführungsstufe ist vorbereitet, aber noch nicht freigegeben."
      };
    }
    if (!this.options.apiKeyAvailable) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Für die adaptive Ausführungsstufe fehlt noch die freigegebene Zugangs-Konfiguration."
      };
    }
    if (!this.options.runtime) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Die adaptive Ausführungsumgebung ist auf diesem System noch nicht verbunden."
      };
    }
    const available = await this.options.runtime.isAvailable().catch(() => false);
    if (!available) {
      return {
        status: "unavailable",
        teacherFacingMessage: "Die adaptive Ausführungsumgebung ist derzeit nicht verfügbar."
      };
    }
    return {
      status: "ready",
      teacherFacingMessage: "Die geschützte adaptive Ausführung ist vorbereitet. Nutze sie nur mit einem nicht-sensiblen Test-Planungsraum."
    };
  }

  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<HarnessSession> {
    if (!this.options.enabled) throw new Error("deepseek_adapter_not_enabled");
    const availability = await this.checkAvailability();
    if (availability.status !== "ready") throw new Error(`deepseek_adapter_${availability.status}`);
    const runtime = this.options.runtime!;
    const workspaceRoot = path.resolve(input.workspaceRoot);
    // Resume vor Neuanlage: nach Backend-Neustart persistente Session wiederverwenden.
    const existing = this.sessionMap.get(input.planningSpaceId);
    if (existing && runtime.resumeSession && (await runtime.resumeSession(existing).catch(() => false))) {
      return { id: existing, planningSpaceId: input.planningSpaceId, workspaceRoot };
    }
    const created = await runtime.createSession({ planningSpaceId: input.planningSpaceId, workspaceRoot });
    this.sessionMap.set(input.planningSpaceId, created.sessionId);
    return { id: created.sessionId, planningSpaceId: input.planningSpaceId, workspaceRoot };
  }

  async sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult> {
    const runtime = this.options.runtime;
    if (!runtime) return this.failedResult("Die adaptive Ausführungsumgebung ist noch nicht verbunden.");
    const startedAt = Date.now();
    const usage = emptyRuntimeUsage();
    // DSH erhält keinen System-Prompt-Kanal; Haltung und Kernel-Inhalt werden
    // deshalb providerneutral in den Turn-Kontext eingebettet (kein DSH-Typ leakt).
    const kernelContext = await loadKernelContext(this.options.kernelDir);
    const framedContext = [CRITICAL_FRIEND_INSTRUCTIONS, kernelContext, input.conversationContext]
      .filter((part) => part && part.trim().length > 0)
      .join("\n\n");
    let turn: DeepSeekRuntimeTurn;
    try {
      turn = await runtime.sendTurn({
        sessionId: input.session.id,
        message: input.message,
        context: framedContext || undefined
      });
    } catch (error) {
      usage.runtimeMs = Date.now() - startedAt;
      return this.failedResult(this.teacherFacingError(error), usage);
    }
    this.accumulateUsage(usage, turn);
    usage.runtimeMs = Date.now() - startedAt;
    const replyText = toTeacherFacingReply(normalizeOutput(turn.text));
    if (!replyText) {
      return this.failedResult(
        "Die adaptive Ausführung hat keine fachliche Antwort geliefert. Ich breche hier ab, statt einen Denkstand nur scheinbar zu aktualisieren.",
        usage
      );
    }
    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: replyText, createdAt: new Date().toISOString() } as ConversationMessage,
      workspaceUpdates: [],
      usage,
      events: [{ type: "status", status: "ready", message: replyText }]
    };
  }

  async requestTask(_input: HarnessTaskRequest): Promise<HarnessTaskResult> {
    // Worker-/Review-Ausführung wird im Spike bewusst nicht über DeepSeek
    // geführt (Direct LLM bleibt Baseline dafür). Wird die adaptive Runtime
    // später für Worker evaluiert, erhält sie hier einen eigenen bounded Flow.
    throw new Error("deepseek_adapter_task_not_supported");
  }

  async *getEvents(_session: HarnessSession): AsyncIterable<HarnessEvent> {
    yield {
      type: "status",
      status: "waiting_for_backend_policy",
      message: "Die adaptive Ausführungsstufe wartet auf Policy-Freigaben."
    };
  }

  async simulatePolicy(workspaceRoot: string): Promise<HarnessPolicySimulationResult> {
    const requests = this.createSimulationRequests(workspaceRoot);
    return {
      decisions: requests.map((request) => ({ request, decision: this.options.policy.decide(request) }))
    };
  }

  async stopSession(session: HarnessSession): Promise<void> {
    const runtime = this.options.runtime;
    if (!runtime) return;
    try {
      await runtime.stopSession(session.id);
    } finally {
      this.sessionMap.delete(session.planningSpaceId);
    }
  }

  /** Für Diagnose/Doku: welche Upstream-Version ist gepinnt. */
  pinnedVersion(): string {
    return this.options.pinnedVersion;
  }

  private accumulateUsage(target: RuntimeUsage, turn: DeepSeekRuntimeTurn): void {
    target.modelCalls += 1;
    if (!turn.usage) return;
    if (turn.usage.inputTokens !== undefined) target.inputTokens = (target.inputTokens ?? 0) + turn.usage.inputTokens;
    if (turn.usage.outputTokens !== undefined) target.outputTokens = (target.outputTokens ?? 0) + turn.usage.outputTokens;
    if (turn.usage.cachedTokens !== undefined) target.cachedTokens = (target.cachedTokens ?? 0) + turn.usage.cachedTokens;
    if (turn.usage.toolCalls !== undefined) target.toolCalls += turn.usage.toolCalls;
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
    if (/deepseek_web_unreachable/i.test(code)) {
      return "Die adaptive Ausführungsumgebung ist derzeit nicht erreichbar. Starte sie und versuche es erneut.";
    }
    if (/abort|timeout/i.test(code)) {
      return "Die adaptive Bearbeitung hat zu lange gedauert. Versuche es bitte erneut.";
    }
    return "Die adaptive Ausführung konnte noch nicht sicher abgeschlossen werden.";
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
      { type: "network", url: "https://api.deepseek.example/v1" },
      { type: "secret", name: "PTSPACE_LLM_API_KEY" },
      {
        type: "pedagogical_question",
        question: "Soll die Recherche eine bewusst kontrastierende Perspektive erschließen?"
      }
    ];
  }
}
