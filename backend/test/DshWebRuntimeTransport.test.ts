import { describe, expect, it, vi } from "vitest";
import { DshWebRuntimeTransport } from "../src/services/harness/DshWebRuntimeTransport.js";

type FetchArgs = { url: string; init?: RequestInit };

/** Baut einen Fake-fetch, der GET (Erreichbarkeit) und POST (JSON-RPC) unterscheidet. */
function fakeFetch(handlers: {
  get?: () => Response | Promise<Response>;
  rpc?: (body: { method: string; params: Record<string, unknown> }) => Response | Promise<Response>;
}): { fetchImpl: typeof fetch; calls: FetchArgs[] } {
  const calls: FetchArgs[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if ((init?.method ?? "GET") === "GET") {
      return handlers.get ? handlers.get() : new Response("<html></html>", { status: 200 });
    }
    const body = JSON.parse(String(init?.body ?? "{}")) as { method: string; params: Record<string, unknown> };
    if (handlers.rpc) return handlers.rpc(body);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { final_response: "ok" } }), { status: 200 });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function jsonRpc(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("DshWebRuntimeTransport", () => {
  it("meldet Erreichbarkeit über einen HTTP-GET auf die Basis-URL", async () => {
    const { fetchImpl, calls } = fakeFetch({ get: () => new Response("ui", { status: 200 }) });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    expect(await transport.isAvailable()).toBe(true);
    expect(calls[0]?.url).toBe("http://localhost:3080");
    expect(calls[0]?.init?.method).toBe("GET");
  });

  it("meldet unavailable bei Netzwerkfehler", async () => {
    const fetchImpl = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    expect(await transport.isAvailable()).toBe(false);
  });

  it("leitet eine stabile, persistente Session-ID pro Planungsraum ab", async () => {
    const { fetchImpl } = fakeFetch({});
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    const session = await transport.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    expect(session.sessionId).toBe("pts-space-1");
  });

  it("sendet einen JSON-RPC-Turn und übersetzt final_response + usage", async () => {
    const { fetchImpl, calls } = fakeFetch({
      rpc: (body) => {
        expect(body.method).toBe("session.run");
        expect(body.params.session_id).toBe("pts-space-1");
        expect(String(body.params.prompt)).toContain("Welche Perspektive fehlt?");
        return jsonRpc({
          final_response: "Ich schaue nach einer bewusst anderen Perspektive.",
          finish_reason: "completed",
          usage: { input_tokens: 200, output_tokens: 60, tool_calls: 2 }
        });
      }
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    const turn = await transport.sendTurn({ sessionId: "pts-space-1", message: "Welche Perspektive fehlt?" });
    expect(turn.text).toContain("andere");
    expect(turn.usage).toEqual({ inputTokens: 200, outputTokens: 60, cachedTokens: undefined, toolCalls: 2 });
    expect(calls.some((call) => call.url === "http://localhost:3080/rpc")).toBe(true);
  });

  it("faltet den Gesprächskontext vor die Nachricht", async () => {
    let seenPrompt = "";
    const { fetchImpl } = fakeFetch({
      rpc: (body) => {
        seenPrompt = String(body.params.prompt);
        return jsonRpc({ final_response: "ok" });
      }
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await transport.sendTurn({ sessionId: "s", message: "Frage", context: "Bisheriger Denkstand" });
    expect(seenPrompt.startsWith("Bisheriger Denkstand")).toBe(true);
    expect(seenPrompt).toContain("Frage");
  });

  it("wirft bei finish_reason=error ohne Text", async () => {
    const { fetchImpl } = fakeFetch({ rpc: () => jsonRpc({ finish_reason: "error" }) });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s", message: "x" })).rejects.toThrow("deepseek_run_finished_error");
  });

  it("wirft eine generische Fehlermeldung bei JSON-RPC-Error", async () => {
    const { fetchImpl } = fakeFetch({
      rpc: () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "method not found" } }), { status: 200 })
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s", message: "x" })).rejects.toThrow(/deepseek_rpc/);
  });

  it("wirft bei HTTP-Fehlerstatus des RPC-Aufrufs", async () => {
    const { fetchImpl } = fakeFetch({ rpc: () => new Response("nope", { status: 500 }) });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s", message: "x" })).rejects.toThrow("deepseek_http_500");
  });

  it("toleriert ein fehlendes stop (kein harter Fehler)", async () => {
    const { fetchImpl } = fakeFetch({
      rpc: (body) => body.method === "session.stop"
        ? new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32601 } }), { status: 200 })
        : jsonRpc({ final_response: "ok" })
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.stopSession("s")).resolves.toBeUndefined();
  });

  it("erlaubt konfigurierbaren RPC-Pfad und Methodennamen", async () => {
    const { fetchImpl, calls } = fakeFetch({
      rpc: (body) => {
        expect(body.method).toBe("agent.prompt");
        return jsonRpc({ text: "fertig" });
      }
    });
    const transport = new DshWebRuntimeTransport({
      baseUrl: "http://localhost:3080",
      rpcPath: "/jsonrpc",
      methods: { run: "agent.prompt" },
      fetchImpl
    });
    const turn = await transport.sendTurn({ sessionId: "s", message: "x" });
    expect(turn.text).toBe("fertig");
    expect(calls.some((call) => call.url === "http://localhost:3080/jsonrpc")).toBe(true);
  });

  it("bricht einen hängenden Turn nach dem Timeout ab", async () => {
    vi.useFakeTimers();
    const fetchImpl = ((_url: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })) as unknown as typeof fetch;
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", timeoutMs: 50, fetchImpl });
    const pending = transport.sendTurn({ sessionId: "s", message: "x" });
    const expectation = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(60);
    await expectation;
    vi.useRealTimers();
  });
});
