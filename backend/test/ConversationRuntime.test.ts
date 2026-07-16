import { describe, expect, it } from "vitest";
import { ConversationMetricsCollector } from "../src/services/conversation/ConversationMetrics.js";
import { TtlCache } from "../src/services/conversation/TtlCache.js";
import { SessionManager } from "../src/services/conversation/SessionManager.js";

describe("ConversationMetricsCollector", () => {
  it("measures phase durations with an injectable clock", () => {
    let now = 0;
    const clock = () => now;
    const metrics = new ConversationMetricsCollector(clock);
    metrics.start("contextBuild");
    now = 40;
    metrics.end("contextBuild");
    now = 100;
    const result = metrics.finish();
    expect(result.contextBuildMs).toBe(40);
    expect(result.totalMs).toBe(100);
  });

  it("records first token latency once", () => {
    let now = 0;
    const metrics = new ConversationMetricsCollector(() => now);
    now = 1200;
    metrics.markFirstToken();
    now = 1800;
    metrics.markFirstToken();
    expect(metrics.finish().firstTokenMs).toBe(1200);
  });

  it("tracks cache hits and misses", () => {
    const metrics = new ConversationMetricsCollector(() => 0);
    metrics.recordCacheHit("availability");
    metrics.recordCacheMiss("runtime_session");
    const result = metrics.finish();
    expect(result.cacheHits).toContain("availability");
    expect(result.cacheMisses).toContain("runtime_session");
  });

  it("formats a human readable performance log", () => {
    let now = 0;
    const metrics = new ConversationMetricsCollector(() => now);
    metrics.start("generation");
    now = 3400;
    metrics.end("generation");
    now = 3600;
    const log = ConversationMetricsCollector.formatLog(metrics.finish());
    expect(log).toContain("Generation");
    expect(log).toContain("Total");
  });
});

describe("TtlCache", () => {
  it("returns a cached value within the TTL", async () => {
    let now = 0;
    let calls = 0;
    const cache = new TtlCache<number>(1000, () => now);
    const loader = async () => {
      calls += 1;
      return 42;
    };
    const first = await cache.get(loader);
    expect(first.fromCache).toBe(false);
    now = 500;
    const second = await cache.get(loader);
    expect(second.fromCache).toBe(true);
    expect(calls).toBe(1);
  });

  it("reloads after the TTL expired", async () => {
    let now = 0;
    let calls = 0;
    const cache = new TtlCache<number>(1000, () => now);
    const loader = async () => {
      calls += 1;
      return calls;
    };
    await cache.get(loader);
    now = 2000;
    const result = await cache.get(loader);
    expect(result.fromCache).toBe(false);
    expect(calls).toBe(2);
  });

  it("deduplicates concurrent loads", async () => {
    let calls = 0;
    const cache = new TtlCache<number>(1000, () => 0);
    const loader = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 7;
    };
    const [a, b] = await Promise.all([cache.get(loader), cache.get(loader)]);
    expect(a.value).toBe(7);
    expect(b.value).toBe(7);
    expect(calls).toBe(1);
  });
});

describe("SessionManager", () => {
  const keyInput = { planningSpaceId: "space-1", provider: "mock", model: "mock", kernelHash: "sha256:abc" };

  it("reports a missing session before registration", () => {
    const manager = new SessionManager<{ workspaceRoot: string }>({ clock: () => 0 });
    expect(manager.lookup(keyInput)).toEqual({ reused: false, reason: "missing" });
  });

  it("reuses a registered session within the idle window", () => {
    let now = 0;
    const manager = new SessionManager<{ workspaceRoot: string }>({ idleTimeoutMs: 1000, clock: () => now });
    manager.register(keyInput, { workspaceRoot: "/tmp/space-1" });
    now = 500;
    const lookup = manager.lookup(keyInput);
    expect(lookup.reused).toBe(true);
  });

  it("expires a session after the idle timeout", () => {
    let now = 0;
    const manager = new SessionManager<{ workspaceRoot: string }>({ idleTimeoutMs: 1000, clock: () => now });
    manager.register(keyInput, { workspaceRoot: "/tmp/space-1" });
    now = 5000;
    const lookup = manager.lookup(keyInput);
    expect(lookup).toEqual({ reused: false, reason: "idle_expired" });
  });

  it("creates a new session when the kernel hash changes", () => {
    const manager = new SessionManager<{ workspaceRoot: string }>({ clock: () => 0 });
    manager.register(keyInput, { workspaceRoot: "/tmp/space-1" });
    const lookup = manager.lookup({ ...keyInput, kernelHash: "sha256:changed" });
    expect(lookup).toEqual({ reused: false, reason: "missing" });
  });

  it("reaps expired sessions", () => {
    let now = 0;
    const manager = new SessionManager<{ workspaceRoot: string }>({ idleTimeoutMs: 1000, clock: () => now });
    manager.register(keyInput, { workspaceRoot: "/tmp/space-1" });
    now = 5000;
    const reaped = manager.reapExpired();
    expect(reaped.length).toBe(1);
    expect(manager.size).toBe(0);
  });
});
