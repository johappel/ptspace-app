import {
  DeepSeekRuntimeSession,
  DeepSeekRuntimeTransport,
  DeepSeekRuntimeTurn
} from "./DeepSeekHarnessAdapter.js";

/**
 * Realer `DeepSeekRuntimeTransport` gegen eine lokal laufende `dsh web`-Instanz
 * (DeepSeek Harness, `npx @deepseek-ai/dsh web`, Default `http://127.0.0.1:3080`).
 *
 * Wire-Protokoll (live gegen dsh web rev 8b2404a806ca verifiziert):
 * - Unary-Aufrufe sind `POST /api/<method>` mit einem `client-request`-Envelope:
 *   `{ type: "client-request", rpcId: <uuid>, method: "session.create" | ...,
 *   payload: {...} }`.
 * - Die Antwort ist ein `server-response`: `{ type, rpcId, result: { ok, value }
 *   | { ok:false, error } }`.
 * - Ein Turn besteht aus drei Schritten:
 *     1. `session.create` (payload `{ cwd }`) → `{ sessionId }`
 *     2. `session.prompt`  (payload `{ sessionId, mode:"queue",
 *        content:[{type:"text",text}], clientTimeZone }`) → `{ accepted:true }`
 *     3. Polling von `session.history` (payload `{ sessionId }`) bis ein Event
 *        `turn/end` erscheint; die Antwort steht im letzten
 *        `assistant/message`-Event (`message.content[].text` der Blöcke vom Typ
 *        `text`), Usage in `assistant/chunk` mit `chunk.type === "usage"`.
 * - Session-IDs werden vom Host gemintet; Resume = dieselbe ID erneut nutzen.
 *
 * Diese Datei ist die EINZIGE Stelle mit DSH-spezifischem Transportwissen. Sie
 * bleibt hinter der PTS-eigenen `DeepSeekRuntimeTransport`-Grenze; es gelangen
 * keine DSH-Typen in Adapter, Domain oder Frontend.
 *
 * Developer-Preview-Risiko: DSH ist in aktiver Entwicklung und kündigt
 * kompatibilitätsbrechende Änderungen an. Deshalb sind API-Pfadpräfix und
 * Methodennamen konfigurierbar (mit dokumentierten Defaults), damit ein Betrieb
 * sie ohne Codeänderung an die laufende Version angleichen kann. Die Antwort-
 * und Usage-Auswertung ist bewusst tolerant (mehrere plausible Feldnamen).
 */

export type DshWebRuntimeTransportOptions = {
  /** Basis-URL der laufenden dsh-web-Instanz. */
  baseUrl: string;
  /** API-Pfadpräfix für unary Aufrufe (Default `/api`). */
  apiPrefix?: string;
  /** Optionales Bearer-Token, falls die Instanz eines verlangt (lokal meist nicht). */
  apiKey?: string;
  timeoutMs?: number;
  /** Abstand zwischen History-Polls in ms (Default 750). */
  pollIntervalMs?: number;
  /**
   * Mindest-Wartezeit auf ein `turn/end`, bevor ein Timeout gemeldet wird. Ein
   * DSH-Agent-Turn kann mehrere Minuten laufen (Recherche, Skills, Tool-Calls);
   * solange das Session-Log weiterwächst, läuft der Turn noch.
   */
  minTurnWaitMs?: number;
  /** Methodennamen; überschreibbar für abweichende dsh-Versionen. */
  methods?: {
    create?: string;
    prompt?: string;
    history?: string;
    cancel?: string;
  };
  /**
   * Verhalten bei einer Agent-Rückfrage (`ask_user_question`): Der PTS-Transport
   * kann keine interaktiven Fragen beantworten. "cancel" (Default) bricht die
   * Frage ab, sodass der Agent den Turn selbstständig beendet; der Text aus
   * bereits vorhandenen Assistant-Nachrichten wird dann trotzdem geliefert.
   */
  onQuestion?: "cancel";
  /** Injizierbar für Tests. */
  fetchImpl?: typeof fetch;
};

const DEFAULT_METHODS = {
  create: "session.create",
  prompt: "session.prompt",
  history: "session.history",
  cancel: "session.cancel"
} as const;

type ClientRequest = {
  type: "client-request";
  rpcId: string;
  method: string;
  payload: Record<string, unknown>;
};

type ServerResponse = {
  type?: string;
  rpcId?: string;
  result: { ok: boolean; value?: unknown; error?: { code?: string; message?: string } };
};

/** Ein Event aus dem Session-Log (History-Eintrag). */
type HistoryEntry = {
  event: { type: string; seq: number; data?: Record<string, unknown> };
};

export class DshWebRuntimeTransport implements DeepSeekRuntimeTransport {
  private readonly baseUrl: string;
  private readonly apiUrl: (method: string) => string;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly minTurnWaitMs: number;
  private readonly methods: { create: string; prompt: string; history: string; cancel: string };
  private readonly doFetch: typeof fetch;

  constructor(private readonly options: DshWebRuntimeTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    const prefix = options.apiPrefix ?? "/api";
    this.apiUrl = (method) => `${this.baseUrl}${prefix}/${method}`;
    this.timeoutMs = options.timeoutMs ?? 120000;
    this.pollIntervalMs = options.pollIntervalMs ?? 750;
    this.minTurnWaitMs = options.minTurnWaitMs ?? this.timeoutMs;
    this.methods = { ...DEFAULT_METHODS, ...options.methods };
    this.doFetch = options.fetchImpl ?? fetch;
  }

  /** Reine Erreichbarkeitsprüfung der Web-Instanz (kein Modellaufruf). */
  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 5000));
    try {
      const response = await this.doFetch(this.baseUrl, { method: "GET", signal: controller.signal });
      // Jede HTTP-Antwort belegt, dass die dsh-web-Instanz läuft.
      return response.ok || response.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Legt eine DSH-Session im Workspace des Planungsraums an. Die Session-ID
   * wird vom Host gemintet und vom PTS persistiert (Resume nach Neustart).
   */
  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<DeepSeekRuntimeSession> {
    const result = await this.call<{ sessionId?: string }>(this.methods.create, { cwd: input.workspaceRoot });
    if (!result?.sessionId) throw new Error("deepseek_create_no_session_id");
    return { sessionId: result.sessionId };
  }

  async sendTurn(input: { sessionId: string; message: string; context?: string }): Promise<DeepSeekRuntimeTurn> {
    // Schnelle Verfügbarkeitsprüfung: Ist die dsh-web-Instanz weg (Absturz,
    // Neustart), soll das sofort eine verständliche Fehlermeldung erzeugen,
    // statt dass der Turn im Verbindungsversuch hängen bleibt.
    if (!(await this.isAvailable())) {
      throw new Error("deepseek_web_unreachable");
    }
    const prompt = input.context ? `${input.context}\n\n---\n\n${input.message}` : input.message;
    const promptResponse = await this.call<{ accepted?: unknown }>(this.methods.prompt, {
      sessionId: input.sessionId,
      mode: "queue",
      content: [{ type: "text", text: prompt }],
      ...(timeZone() ? { clientTimeZone: timeZone() } : {})
    });
    if (promptResponse?.accepted !== true) throw new Error("deepseek_prompt_not_accepted");

    let deadline = Date.now() + Math.max(this.timeoutMs, this.minTurnWaitMs);
    let baselineSeq = -1;
    let assistantText = "";
    let usage: DeepSeekRuntimeTurn["usage"];
    let turnEnded = false;
    let lastSeqSeen = -1;
    /** rpcIds von Rückfragen, die wir bereits abgebrochen haben (nicht doppelt senden). */
    const cancelledQuestions = new Set<string>();

    while (Date.now() < deadline) {
      await sleep(this.pollIntervalMs);
      const history = await this.call<{ events?: HistoryEntry[] }>(this.methods.history, {
        sessionId: input.sessionId
      });
      for (const entry of history?.events ?? []) {
        const event = entry.event;
        if (!event || event.seq <= baselineSeq) continue;
        baselineSeq = event.seq;
        if (event.type === "assistant/message") {
          assistantText = extractAssistantText(event.data) || assistantText;
        } else if (event.type === "assistant/chunk") {
          usage = extractUsage(event.data) ?? usage;
        } else if (event.type === "turn/end") {
          turnEnded = true;
        }
      }
      // Fortschreiten verlängert die Wartezeit: Ein aktiver Agent-Turn (Streaming,
      // Recherche, Tools) ist kein Timeout-Fall, solange neue Events eintreffen.
      if (baselineSeq > lastSeqSeen) {
        lastSeqSeen = baselineSeq;
        deadline = Date.now() + Math.max(this.timeoutMs, this.minTurnWaitMs);
      }
      if (turnEnded) break;

      // Rückfragen abbrechen, damit der Turn nicht endlos auf eine Antwort wartet,
      // die der PTS-Transport strukturell nicht geben kann.
      if (this.options.onQuestion !== undefined ? this.options.onQuestion === "cancel" : true) {
        for (const entry of history?.events ?? []) {
          const event = entry.event;
          if (!event || event.type !== "tool/call") continue;
          const call = extractToolCall(event.data);
          if (!call || call.name !== "ask_user_question" || cancelledQuestions.has(call.callId)) continue;
          cancelledQuestions.add(call.callId);
          await this.cancelQuestion(input.sessionId, call.callId).catch(() => undefined);
        }
      }
    }

    if (!turnEnded) throw new Error("deepseek_turn_timeout");
    const text = assistantText.trim();
    if (!text) throw new Error("deepseek_empty_response");
    return { text, usage };
  }

  /** Eine persistente dsh-Prozess-Session bleibt nutzbar, solange der Host läuft. */
  async resumeSession(_sessionId: string): Promise<boolean> {
    return this.isAvailable();
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      await this.call(this.methods.cancel, { sessionId });
    } catch {
      // Ein fehlendes/abweichendes cancel darf den Lifecycle nicht hart brechen.
    }
  }

  /**
   * Bricht eine offene Agent-Rückfrage ab (`client-response` mit error
   * "cancelled" auf `/api/respond`). Der Host löst den Tool-Call dann als
   * abgebrochen auf und der Agent beendet den Turn selbstständig.
   */
  private async cancelQuestion(sessionId: string, callId: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 10000));
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;
      // rpcId: Der Host korreliert die Antwort über die pending-Tabelle; wir
      // nutzen die callId als Echo-Token (der Host validiert sie gegen die
      // offene Frage und lehnt fremde ids mit not-pending ab).
      await this.doFetch(`${this.baseUrl}${this.options.apiPrefix ?? "/api"}/respond`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "client-response",
          rpcId: callId,
          result: {
            ok: false,
            error: { code: "cancelled", message: "Die Lehrkraft kann hier gerade nicht antworten.", details: {} }
          }
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async call<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const request: ClientRequest = {
      type: "client-request",
      rpcId: randomId(),
      method,
      payload
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;
      const response = await this.doFetch(this.apiUrl(method), {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`deepseek_http_${response.status}`);
      const full = (await response.json()) as ServerResponse;
      if (full.rpcId && full.rpcId !== request.rpcId) throw new Error("deepseek_rpc_id_mismatch");
      if (!full.result?.ok) {
        const code = full.result?.error?.code ?? "error";
        throw new Error(`deepseek_rpc_${code}`);
      }
      return (full.result.value ?? {}) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function randomId(): string {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `rpc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Extrahiert den Text aus einem `assistant/message`-Event: alle Blöcke vom Typ
 * `text` aus `data.message.content`, tolerant verkettet.
 */
function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const message = (data as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return "";
  const content = (message as Record<string, unknown>).content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (block && typeof block === "object" && (block as Record<string, unknown>).type === "text") {
      const text = (block as Record<string, unknown>).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("");
}

/** Extrahiert Name und callId aus einem `tool/call`-Event. */
function extractToolCall(data: unknown): { name: string; callId: string } | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const name = record.name;
  const callId = record.callId;
  if (typeof name !== "string" || typeof callId !== "string") return undefined;
  return { name, callId };
}

/** Mappt Usage aus einem `assistant/chunk`-Event (`chunk.type === "usage"`). */
function extractUsage(data: unknown): DeepSeekRuntimeTurn["usage"] {
  if (!data || typeof data !== "object") return undefined;
  const chunk = (data as Record<string, unknown>).chunk;
  if (!chunk || typeof chunk !== "object") return undefined;
  const record = chunk as Record<string, unknown>;
  if (record.type !== "usage") return undefined;
  const raw = record.usage;
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const num = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return undefined;
  };
  const mapped = {
    inputTokens: num("inputTokens", "input_tokens", "prompt_tokens"),
    outputTokens: num("outputTokens", "output_tokens", "completion_tokens"),
    cachedTokens: num("cachedTokens", "cached_tokens"),
    toolCalls: num("toolCalls", "tool_calls")
  };
  return Object.values(mapped).some((value) => value !== undefined) ? mapped : undefined;
}
