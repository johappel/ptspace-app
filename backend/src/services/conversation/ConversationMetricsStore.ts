import { ConversationMetrics } from "./ConversationMetrics.js";

/**
 * In-Memory-Ringpuffer für Chat-Turn-Metriken
 * (CHAT-PERFORMANCE-TASKS TASK 18, ARCHITECTURE-SESSION-MODEL Abschnitt 16/17).
 *
 * Speichert die letzten Turns eines Prozesses, damit ein Dev-Dashboard
 * Antwortzeiten, Promptgrößen und Cache-Trefferquoten anzeigen kann. Die Daten
 * sind flüchtig (kein Persistenz-Ziel) – der Workspace bleibt Single Source of
 * Truth, hier landen nur Betriebsmetriken.
 */

export type RecordedMetric = ConversationMetrics & {
  planningSpaceId: string;
};

export type MetricsAggregate = {
  turns: number;
  avgTotalMs: number;
  p95TotalMs: number;
  avgFirstTokenMs?: number;
  avgPromptTokens?: number;
  sessionReuseRate: number;
  cacheHitRate: number;
};

const DEFAULT_CAPACITY = 100;

function percentile(sortedValues: number[], fraction: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.floor(fraction * sortedValues.length));
  return sortedValues[index];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export class ConversationMetricsStore {
  private readonly buffer: RecordedMetric[] = [];

  constructor(private readonly capacity: number = DEFAULT_CAPACITY) {}

  record(planningSpaceId: string, metrics: ConversationMetrics): void {
    this.buffer.push({ ...metrics, planningSpaceId });
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
  }

  recent(limit = 20): RecordedMetric[] {
    return this.buffer.slice(-limit).reverse();
  }

  aggregate(): MetricsAggregate {
    const turns = this.buffer.length;
    if (turns === 0) {
      return { turns: 0, avgTotalMs: 0, p95TotalMs: 0, sessionReuseRate: 0, cacheHitRate: 0 };
    }
    const totals = this.buffer.map((metric) => metric.totalMs).sort((a, b) => a - b);
    const firstTokens = this.buffer
      .map((metric) => metric.firstTokenMs)
      .filter((value): value is number => value !== undefined);
    const promptTokens = this.buffer
      .map((metric) => metric.promptTokens)
      .filter((value): value is number => value !== undefined);

    const sessionReuses = this.buffer.filter((metric) => metric.cacheHits.includes("runtime_session")).length;
    const totalHits = this.buffer.reduce((sum, metric) => sum + metric.cacheHits.length, 0);
    const totalLookups = this.buffer.reduce(
      (sum, metric) => sum + metric.cacheHits.length + metric.cacheMisses.length,
      0
    );

    return {
      turns,
      avgTotalMs: Math.round(average(totals)),
      p95TotalMs: Math.round(percentile(totals, 0.95)),
      avgFirstTokenMs: firstTokens.length ? Math.round(average(firstTokens)) : undefined,
      avgPromptTokens: promptTokens.length ? Math.round(average(promptTokens)) : undefined,
      sessionReuseRate: turns ? Number((sessionReuses / turns).toFixed(3)) : 0,
      cacheHitRate: totalLookups ? Number((totalHits / totalLookups).toFixed(3)) : 0
    };
  }

  clear(): void {
    this.buffer.length = 0;
  }

  get size(): number {
    return this.buffer.length;
  }
}
