import { describe, expect, it } from "vitest";
import { ConversationMetricsStore } from "../src/services/conversation/ConversationMetricsStore.js";
import { ConversationMetrics } from "../src/services/conversation/ConversationMetrics.js";

function metric(overrides: Partial<ConversationMetrics> = {}): ConversationMetrics {
  return {
    requestStartedAt: new Date().toISOString(),
    contextBuildMs: 10,
    sessionLookupMs: 1,
    sessionStartupMs: 0,
    generationMs: 100,
    persistenceMs: 5,
    totalMs: 120,
    cacheHits: [],
    cacheMisses: [],
    ...overrides
  };
}

describe("ConversationMetricsStore", () => {
  it("keeps only the most recent turns within capacity", () => {
    const store = new ConversationMetricsStore(3);
    for (let index = 0; index < 5; index += 1) {
      store.record("space-1", metric({ totalMs: index }));
    }
    expect(store.size).toBe(3);
    const recent = store.recent(10);
    expect(recent.map((entry) => entry.totalMs)).toEqual([4, 3, 2]);
  });

  it("aggregates averages, p95 and reuse/cache rates", () => {
    const store = new ConversationMetricsStore();
    store.record("space-1", metric({ totalMs: 100, firstTokenMs: 40, promptTokens: 1000, cacheHits: ["runtime_session", "availability"], cacheMisses: [] }));
    store.record("space-1", metric({ totalMs: 300, firstTokenMs: 60, promptTokens: 2000, cacheHits: ["availability"], cacheMisses: ["runtime_session"] }));

    const aggregate = store.aggregate();
    expect(aggregate.turns).toBe(2);
    expect(aggregate.avgTotalMs).toBe(200);
    expect(aggregate.avgFirstTokenMs).toBe(50);
    expect(aggregate.avgPromptTokens).toBe(1500);
    expect(aggregate.sessionReuseRate).toBe(0.5);
    // 3 hits von 4 lookups
    expect(aggregate.cacheHitRate).toBe(0.75);
  });

  it("returns a neutral aggregate without turns", () => {
    const store = new ConversationMetricsStore();
    expect(store.aggregate()).toEqual({ turns: 0, avgTotalMs: 0, p95TotalMs: 0, sessionReuseRate: 0, cacheHitRate: 0 });
  });
});
