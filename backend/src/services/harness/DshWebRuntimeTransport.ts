import {
  DeepSeekRuntimeSession,
  DeepSeekRuntimeTransport,
  DeepSeekRuntimeTurn
} from "./DeepSeekHarnessAdapter.js";

/**
 * Realer `DeepSeekRuntimeTransport` gegen eine lokal laufende `dsh web`-Instanz
 * (DeepSeek Harness, `npx @deepseek-ai/dsh web`, Default `http://127.0.0.1:3080`).
 *
 * DeepSeek Harness treibt Sessions über **JSON-RPC 2.0** an (Python-SDK:
 * „driving DeepSeek Harness over JSON-RPC“). Session-IDs sind aufruferseitig
 * gewählt; ein Turn liefert eine RunResult-artige Antwort mit `final_response`,
 * `finish_reason` und optionaler `usage`.
 *
 * Diese Datei ist die EINZIGE Stelle mit DSH-spezifischem Transportwissen. Sie
 * bleibt hinter der PTS-eigenen `DeepSeekRuntimeTransport`-Grenze; es gelangen
 * keine DSH-Typen in Adapter, Domain oder Frontend.
 *
 * Developer-Preview-Risiko: DSH ist in aktiver Entwicklung und kündigt
 * kompatibilitätsbrechende Änderungen an. Deshalb sind RPC-Pfad und
 * Methodennamen konfigurierbar (mit dokumentierten Defaults), damit ein Betrieb
 * sie ohne Codeänderung an die laufende Version angleichen kann. Die Antwort-
 * und Usage-Auswertung ist bewusst tolerant (mehrere plausible Feldnamen).
 */

export type DshWebRuntimeTransportOptions = {
  /** Basis-URL der laufenden dsh-web-Instanz. */
  baseUrl: string;
  /** JSON-RPC-Endpunktpfad relativ zur Basis-URL. */
  rpcPath?: string;
  /** Optionales Bearer-Token, falls die Instanz eines verlangt (lokal meist nicht). */
  apiKey?: string;
  /** Modell-ID, die die dsh-Komposition auflöst (optional; dsh hat einen Default). */
  model?: string;
  timeoutMs?: number;
  /** JSON-RPC-Methodennamen; überschreibbar für abweichende dsh-Versionen. */
  methods?: {
    run?: string;
    resume?: string;
    stop?: string;
  };
  /** Injizierbar für Tests. */
  fetchImpl?: typeof fetch;
};

const DEFAULT_METHODS = {
  run: "session.run",
  resume: "session.resume",
  stop: "session.stop"
} as const;

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: number | string | null;
  result?: unknown;
  error?: { code?: number; message?: string };
};

export class DshWebRuntimeTransport implements DeepSeekRuntimeTransport {
  private readonly baseUrl: string;
  private readonly rpcUrl: string;
  private readonly timeoutMs: number;
  private readonly methods: { run: string; resume: string; stop: string };
  private readonly doFetch: typeof fetch;
  private rpcId = 0;

  constructor(private readonly options: DshWebRuntimeTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    const rpcPath = options.rpcPath ?? "/rpc";
    this.rpcUrl = `${this.baseUrl}${rpcPath.startsWith("/") ? "" : "/"}${rpcPath}`;
    this.timeoutMs = options.timeoutMs ?? 120000;
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
   * Session-IDs sind in DSH aufruferseitig gewählt. Wir leiten eine stabile,
   * persistente ID pro Planungsraum ab, damit ein Resume nach Backend-Neustart
   * dieselbe DSH-Session anspricht.
   */
  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<DeepSeekRuntimeSession> {
    return { sessionId: `pts-${input.planningSpaceId}` };
  }

  async sendTurn(input: { sessionId: string; message: string; context?: string }): Promise<DeepSeekRuntimeTurn> {
    const prompt = input.context ? `${input.context}\n\n---\n\n${input.message}` : input.message;
    const params: Record<string, unknown> = { session_id: input.sessionId, prompt };
    if (this.options.model) params.model = this.options.model;
    const result = await this.call(this.methods.run, params);
    const text = extractText(result);
    if (finishedWithError(result) && !text) {
      throw new Error("deepseek_run_finished_error");
    }
    return { text, usage: extractUsage(result) };
  }

  /** Ein persistenter dsh-Prozess hält die Session; Resume gelingt, solange er läuft. */
  async resumeSession(_sessionId: string): Promise<boolean> {
    return this.isAvailable();
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      await this.call(this.methods.stop, { session_id: sessionId });
    } catch {
      // Ein fehlendes/abweichendes stop darf den Lifecycle nicht hart brechen.
    }
  }

  private async call(method: string, params: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;
      const response = await this.doFetch(this.rpcUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ jsonrpc: "2.0", id: ++this.rpcId, method, params }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`deepseek_http_${response.status}`);
      const payload = (await response.json()) as JsonRpcResponse;
      if (payload.error) throw new Error(`deepseek_rpc_${payload.error.code ?? "error"}`);
      return payload.result;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Tolerante Textextraktion aus einer RunResult-artigen JSON-RPC-Antwort. */
function extractText(result: unknown): string {
  if (typeof result === "string") return result.trim();
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    for (const key of ["final_response", "finalResponse", "text", "message"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

function finishedWithError(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const record = result as Record<string, unknown>;
  const reason = record.finish_reason ?? record.finishReason;
  return reason === "error";
}

/** Mappt mehrere plausible DSH-Usage-Feldnamen auf das PTS-neutrale Minimum. */
function extractUsage(result: unknown): DeepSeekRuntimeTurn["usage"] {
  if (!result || typeof result !== "object") return undefined;
  const usage = (result as Record<string, unknown>).usage;
  if (!usage || typeof usage !== "object") return undefined;
  const record = usage as Record<string, unknown>;
  const num = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return undefined;
  };
  const mapped = {
    inputTokens: num("input_tokens", "inputTokens", "prompt_tokens", "promptTokens"),
    outputTokens: num("output_tokens", "outputTokens", "completion_tokens", "completionTokens"),
    cachedTokens: num("cached_tokens", "cachedTokens"),
    toolCalls: num("tool_calls", "toolCalls")
  };
  const hasAny = Object.values(mapped).some((value) => value !== undefined);
  return hasAny ? mapped : undefined;
}
