import {
  DeepSeekRuntimeSession,
  DeepSeekRuntimeTransport,
  DeepSeekRuntimeTurn
} from "./DeepSeekHarnessAdapter.js";

/**
 * Realer `DeepSeekRuntimeTransport` gegen den OpenAI-kompatiblen Headless-Adapter
 * für den DeepSeek Harness (`dsh-openai-adapter`, siehe
 * `F:\code\deepseek-harness\headless\dsh-openai-adapter`).
 *
 * Motivation: Der bisherige `DshWebRuntimeTransport` spricht das instabile
 * `dsh web`-RPC-Protokoll und muss Agent-Turns per History-Polling beobachten.
 * In der Praxis blieben Turns hängen oder liefen in mehrminütige Timeouts, ohne
 * dass eine Antwort ankommt. Der Headless-Adapter ist dagegen zustandslos pro
 * Request: Ein Aufruf von `POST /v1/chat/completions` spawnt einen frischen
 * Headless-Turn und blockiert, bis die fertige Antwort vorliegt. Kein Polling,
 * keine Session-Korrelation, kein Event-Scraping.
 *
 * Wire-Protokoll (OpenAI-kompatibel):
 * - `GET /healthz` → Erreichbarkeit (auch ohne API-Key).
 * - `GET /v1/models` → Modellliste (`dsh-headless`, `dsh`).
 * - `POST /v1/chat/completions` mit `{ model, messages: [{role:"user",
 *   content:"..."}] }` → `{ choices:[{message:{content}}], usage?, dsh_meta? }`.
 *
 * Session-Semantik: Der Adapter ist zustandslos; es gibt kein serverseitiges
 * Sitzungs-Mapping. Der PTS-seitige Kontext (Konversationsverlauf) wird als
 * ein einziger User-Prompt übergeben – der Harness-Gedächtnis-Loop innerhalb
 * eines Turns (Tools, Skills, Workspace) bleibt voll erhalten. `createSession`
 * minted daher eine rein PTS-lokale ID; `resumeSession` prüft nur die
 * Erreichbarkeit. Das ist bewusst: Die Session ist operativ, kein kanonischer
 * Zustand (EXECUTION_ARCHITECTURE.md).
 *
 * Diese Datei ist die EINZIGE Stelle mit DSH-spezifischem Transportwissen. Es
 * gelangen keine DSH-Typen in Adapter, Domain oder Frontend.
 */

export type DshOpenAiRuntimeTransportOptions = {
  /** Basis-URL des dsh-openai-adapters, z. B. `http://127.0.0.1:3110`. */
  baseUrl: string;
  /** Modellname (Default `dsh-headless`). */
  model?: string;
  /** Optionales Bearer-Token, falls der Adapter `ADAPTER_API_KEY` erzwingt. */
  apiKey?: string;
  /** Timeout pro Turn. Headless-Turns können mehrere Minuten laufen. */
  timeoutMs?: number;
  /** Injizierbar für Tests. */
  fetchImpl?: typeof fetch;
};

export class DshOpenAiRuntimeTransport implements DeepSeekRuntimeTransport {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly doFetch: typeof fetch;

  constructor(private readonly options: DshOpenAiRuntimeTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.model = options.model ?? "dsh-headless";
    this.timeoutMs = options.timeoutMs ?? 600000;
    this.doFetch = options.fetchImpl ?? fetch;
  }

  /** Reine Erreichbarkeitsprüfung über `/healthz` (kein Modellaufruf). */
  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 5000));
    try {
      const response = await this.doFetch(`${this.baseUrl}/healthz`, {
        method: "GET",
        signal: controller.signal,
        ...(this.options.apiKey ? { headers: { authorization: `Bearer ${this.options.apiKey}` } } : {})
      });
      return response.ok || response.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Minted eine rein PTS-lokale Session-ID. Der Headless-Adapter ist zustandslos;
   * die ID dient nur der PTS-internen Korrelation (Adapter-Sessionmap, Logs).
   */
  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<DeepSeekRuntimeSession> {
    if (!(await this.isAvailable())) throw new Error("deepseek_web_unreachable");
    return { sessionId: `dsh-headless-${input.planningSpaceId}-${Date.now().toString(36)}` };
  }

  async sendTurn(input: { sessionId: string; message: string; context?: string }): Promise<DeepSeekRuntimeTurn> {
    // Kontext (Konversationsverlauf) wird als Präfix in den Prompt übergeben –
    // der zustandslose Adapter kennt keinen Verlauf.
    const prompt = input.context ? `${input.context}\n\n---\n\n${input.message}` : input.message;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;
      const response = await this.doFetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages: [{ role: "user", content: prompt }]
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`deepseek_http_${response.status}`);
      const body = (await response.json()) as OpenAiChatResponse;
      const text = body.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("deepseek_empty_response");
      return { text, usage: mapUsage(body.usage) };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Zustandslos: nutzbar, solange der Adapter erreichbar ist. */
  async resumeSession(_sessionId: string): Promise<boolean> {
    return this.isAvailable();
  }

  /** Nichts zu stoppen – jeder Request ist ein eigener Prozess. */
  async stopSession(_sessionId: string): Promise<void> {}

}

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: Record<string, unknown>;
};

/** Mappt OpenAI-Usage tolerant auf das PTS-neutrale Usage-Objekt. */
function mapUsage(raw: Record<string, unknown> | undefined): DeepSeekRuntimeTurn["usage"] {
  if (!raw || typeof raw !== "object") return undefined;
  const num = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return undefined;
  };
  const mapped = {
    inputTokens: num("prompt_tokens", "inputTokens"),
    outputTokens: num("completion_tokens", "outputTokens"),
    cachedTokens: num("cached_tokens", "cachedTokens"),
    toolCalls: num("tool_calls", "toolCalls")
  };
  return Object.values(mapped).some((value) => value !== undefined) ? mapped : undefined;
}
