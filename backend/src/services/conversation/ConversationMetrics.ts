/**
 * Performance-Instrumentierung eines Chat-Turns
 * (CHAT-PERFORMANCE-TASKS TASK 1 / 16, ARCHITECTURE-SESSION-MODEL Abschnitt 16).
 *
 * Der Collector misst Phasen mit einer monotonen Uhr und liefert am Ende
 * ein strukturiertes Metrikobjekt sowie ein menschenlesbares Performance-Log.
 */

export type ConversationMetrics = {
  requestStartedAt: string;
  contextBuildMs: number;
  sessionLookupMs: number;
  sessionStartupMs: number;
  firstTokenMs?: number;
  generationMs: number;
  persistenceMs: number;
  gitMs?: number;
  totalMs: number;
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  cacheHits: string[];
  cacheMisses: string[];
};

export type MetricPhase =
  | "contextBuild"
  | "sessionLookup"
  | "sessionStartup"
  | "generation"
  | "persistence"
  | "git";

const PHASE_TO_FIELD: Record<MetricPhase, keyof ConversationMetrics> = {
  contextBuild: "contextBuildMs",
  sessionLookup: "sessionLookupMs",
  sessionStartup: "sessionStartupMs",
  generation: "generationMs",
  persistence: "persistenceMs",
  git: "gitMs"
};

type Clock = () => number;

export class ConversationMetricsCollector {
  private readonly clock: Clock;
  private readonly startedAtMs: number;
  private readonly startedAtIso: string;
  private firstTokenMs?: number;
  private readonly durations = new Map<MetricPhase, number>();
  private readonly running = new Map<MetricPhase, number>();
  private readonly cacheHits: string[] = [];
  private readonly cacheMisses: string[] = [];
  private inputTokens?: number;
  private outputTokens?: number;
  private promptTokens?: number;

  constructor(clock: Clock = () => performance.now()) {
    this.clock = clock;
    this.startedAtMs = clock();
    this.startedAtIso = new Date().toISOString();
  }

  start(phase: MetricPhase): void {
    this.running.set(phase, this.clock());
  }

  end(phase: MetricPhase): number {
    const startedAt = this.running.get(phase);
    if (startedAt === undefined) return 0;
    const elapsed = this.clock() - startedAt;
    this.durations.set(phase, (this.durations.get(phase) ?? 0) + elapsed);
    this.running.delete(phase);
    return elapsed;
  }

  /** Bequemer Wrapper: misst eine (a)synchrone Operation. */
  async measure<T>(phase: MetricPhase, operation: () => Promise<T>): Promise<T> {
    this.start(phase);
    try {
      return await operation();
    } finally {
      this.end(phase);
    }
  }

  markFirstToken(): void {
    if (this.firstTokenMs === undefined) {
      this.firstTokenMs = this.clock() - this.startedAtMs;
    }
  }

  recordCacheHit(name: string): void {
    this.cacheHits.push(name);
  }

  recordCacheMiss(name: string): void {
    this.cacheMisses.push(name);
  }

  recordTokens(input: { inputTokens?: number; outputTokens?: number; promptTokens?: number }): void {
    if (input.inputTokens !== undefined) this.inputTokens = input.inputTokens;
    if (input.outputTokens !== undefined) this.outputTokens = input.outputTokens;
    if (input.promptTokens !== undefined) this.promptTokens = input.promptTokens;
  }

  finish(): ConversationMetrics {
    const round = (value: number | undefined) => (value === undefined ? undefined : Math.round(value));
    return {
      requestStartedAt: this.startedAtIso,
      contextBuildMs: Math.round(this.durations.get("contextBuild") ?? 0),
      sessionLookupMs: Math.round(this.durations.get("sessionLookup") ?? 0),
      sessionStartupMs: Math.round(this.durations.get("sessionStartup") ?? 0),
      firstTokenMs: round(this.firstTokenMs),
      generationMs: Math.round(this.durations.get("generation") ?? 0),
      persistenceMs: Math.round(this.durations.get("persistence") ?? 0),
      gitMs: this.durations.has("git") ? Math.round(this.durations.get("git")!) : undefined,
      totalMs: Math.round(this.clock() - this.startedAtMs),
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      promptTokens: this.promptTokens,
      cacheHits: [...this.cacheHits],
      cacheMisses: [...this.cacheMisses]
    };
  }

  /** Menschenlesbares Performance-Log (siehe TASK 1). */
  static formatLog(metrics: ConversationMetrics): string {
    const line = (label: string, value: number | undefined) =>
      value === undefined ? undefined : `${label.padEnd(24)}${String(value).padStart(6)} ms`;
    return [
      line("Context Build", metrics.contextBuildMs),
      line("Session Lookup", metrics.sessionLookupMs),
      line("Session Startup", metrics.sessionStartupMs),
      line("First Token", metrics.firstTokenMs),
      line("Generation", metrics.generationMs),
      line("Persistence", metrics.persistenceMs),
      line("Git Save", metrics.gitMs),
      line("Total", metrics.totalMs)
    ]
      .filter(Boolean)
      .join("\n");
  }
}
