import { describe, expect, it, vi } from "vitest";
import { DshWebRuntimeTransport } from "../src/services/harness/DshWebRuntimeTransport.js";

type FetchArgs = { url: string; init?: RequestInit };

type PostedRequest = {
  type: string;
  rpcId: string;
  method: string;
  payload: Record<string, unknown>;
};

/** Baut einen Fake-fetch, der GET (Erreichbarkeit) und POST (/api/<method>) unterscheidet. */
function fakeFetch(handlers: {
  get?: () => Response | Promise<Response>;
  call?: (request: PostedRequest) => Response | Promise<Response>;
}): { fetchImpl: typeof fetch; calls: FetchArgs[]; requests: PostedRequest[] } {
  const calls: FetchArgs[] = [];
  const requests: PostedRequest[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if ((init?.method ?? "GET") === "GET") {
      return handlers.get ? handlers.get() : new Response("<html></html>", { status: 200 });
    }
    const request = JSON.parse(String(init?.body ?? "{}")) as PostedRequest;
    requests.push(request);
    if (handlers.call) return handlers.call(request);
    return serverResponse(request.rpcId, { ok: true, value: {} });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls, requests };
}

function serverResponse(rpcId: string, result: unknown): Response {
  return new Response(JSON.stringify({ type: "server-response", rpcId, result }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function historyResponse(rpcId: string, events: Array<{ type: string; seq: number; data?: unknown }>): Response {
  return serverResponse(rpcId, {
    ok: true,
    value: { events: events.map((event) => ({ event })), hasMore: false }
  });
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

  it("legt eine Session über session.create mit cwd an und übernimmt die Host-Session-ID", async () => {
    const { fetchImpl, requests } = fakeFetch({
      call: (request) => {
        expect(request.type).toBe("client-request");
        expect(request.method).toBe("session.create");
        expect(request.payload.cwd).toBe("/tmp/space-1");
        return serverResponse(request.rpcId, { ok: true, value: { sessionId: "session-abc" } });
      }
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    const session = await transport.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    expect(session.sessionId).toBe("session-abc");
  });

  it("wirft, wenn session.create keine Session-ID liefert", async () => {
    const { fetchImpl } = fakeFetch({
      call: (request) => serverResponse(request.rpcId, { ok: true, value: {} })
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.createSession({ planningSpaceId: "s", workspaceRoot: "/tmp" })).rejects.toThrow(
      "deepseek_create_no_session_id"
    );
  });

  it("führt einen Turn aus: prompt akzeptieren, History pollen, Text + Usage extrahieren", async () => {
    let promptSeen: Record<string, unknown> | undefined;
    let historyCalls = 0;
    const { fetchImpl, requests } = fakeFetch({
      call: (request) => {
        if (request.method === "session.prompt") {
          promptSeen = request.payload;
          return serverResponse(request.rpcId, { ok: true, value: { accepted: true } });
        }
        if (request.method === "session.history") {
          historyCalls += 1;
          return historyResponse(request.rpcId, [
            { type: "turn/start", seq: 1 },
            {
              type: "assistant/chunk",
              seq: 2,
              data: { chunk: { type: "usage", usage: { inputTokens: 12238, outputTokens: 39 } } }
            },
            {
              type: "assistant/message",
              seq: 3,
              data: {
                message: {
                  role: "assistant",
                  content: [
                    { type: "reasoning", text: "Gedanke" },
                    { type: "text", text: "Ich prüfe eine bewusst andere Perspektive." }
                  ]
                }
              }
            },
            { type: "turn/end", seq: 4, data: { reason: { kind: "completed" } } }
          ]);
        }
        return serverResponse(request.rpcId, { ok: true, value: {} });
      }
    });
    const transport = new DshWebRuntimeTransport({
      baseUrl: "http://localhost:3080",
      pollIntervalMs: 1,
      fetchImpl
    });
    const turn = await transport.sendTurn({ sessionId: "session-abc", message: "Welche Perspektive fehlt?" });
    expect(turn.text).toBe("Ich prüfe eine bewusst andere Perspektive.");
    expect(turn.usage).toEqual({
      inputTokens: 12238,
      outputTokens: 39,
      cachedTokens: undefined,
      toolCalls: undefined
    });
    expect(promptSeen?.sessionId).toBe("session-abc");
    expect(promptSeen?.mode).toBe("queue");
    expect(JSON.stringify(promptSeen?.content)).toContain("Welche Perspektive fehlt?");
    expect(historyCalls).toBe(1);
    expect(requests.every((request) => request.type === "client-request")).toBe(true);
  });

  it("faltet den Gesprächskontext vor die Nachricht", async () => {
    let seenText = "";
    const { fetchImpl } = fakeFetch({
      call: (request) => {
        if (request.method === "session.prompt") {
          seenText = JSON.stringify(request.payload.content);
          return serverResponse(request.rpcId, { ok: true, value: { accepted: true } });
        }
        return historyResponse(request.rpcId, [
          {
            type: "assistant/message",
            seq: 1,
            data: { message: { content: [{ type: "text", text: "ok" }] } }
          },
          { type: "turn/end", seq: 2 }
        ]);
      }
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", pollIntervalMs: 1, fetchImpl });
    await transport.sendTurn({ sessionId: "s", message: "Frage", context: "Bisheriger Denkstand" });
    expect(seenText.startsWith("[{\"type\":\"text\",\"text\":\"Bisheriger Denkstand")).toBe(true);
    expect(seenText).toContain("Frage");
  });

  it("pollt weiter, bis turn/end erscheint", async () => {
    let historyCalls = 0;
    const { fetchImpl } = fakeFetch({
      call: (request) => {
        if (request.method === "session.prompt") {
          return serverResponse(request.rpcId, { ok: true, value: { accepted: true } });
        }
        historyCalls += 1;
        if (historyCalls === 1) {
          return historyResponse(request.rpcId, [{ type: "turn/start", seq: 1 }]);
        }
        return historyResponse(request.rpcId, [
          {
            type: "assistant/message",
            seq: 2,
            data: { message: { content: [{ type: "text", text: "fertig" }] } }
          },
          { type: "turn/end", seq: 3 }
        ]);
      }
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", pollIntervalMs: 1, fetchImpl });
    const turn = await transport.sendTurn({ sessionId: "s", message: "x" });
    expect(turn.text).toBe("fertig");
    expect(historyCalls).toBe(2);
  });

  it("wirft deepseek_turn_timeout, wenn der Turn nicht endet", async () => {
    vi.useFakeTimers();
    const { fetchImpl } = fakeFetch({
      call: (request) => {
        if (request.method === "session.prompt") {
          return serverResponse(request.rpcId, { ok: true, value: { accepted: true } });
        }
        return historyResponse(request.rpcId, [{ type: "turn/start", seq: 1 }]);
      }
    });
    const transport = new DshWebRuntimeTransport({
      baseUrl: "http://localhost:3080",
      timeoutMs: 50,
      pollIntervalMs: 10,
      fetchImpl
    });
    const pending = transport.sendTurn({ sessionId: "s", message: "x" });
    const expectation = expect(pending).rejects.toThrow("deepseek_turn_timeout");
    await vi.advanceTimersByTimeAsync(300);
    await expectation;
    vi.useRealTimers();
  });

  it("wirft, wenn session.prompt nicht akzeptiert wird", async () => {
    const { fetchImpl } = fakeFetch({
      call: (request) => serverResponse(request.rpcId, { ok: true, value: { accepted: false } })
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s", message: "x" })).rejects.toThrow("deepseek_prompt_not_accepted");
  });

  it("wirft eine generische Fehlermeldung bei RPC-Error", async () => {
    const { fetchImpl } = fakeFetch({
      call: (request) =>
        serverResponse(request.rpcId, { ok: false, error: { code: "session-not-found", message: "nope" } })
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s", message: "x" })).rejects.toThrow(
      /deepseek_rpc_session-not-found/
    );
  });

  it("wirft bei HTTP-Fehlerstatus des Aufrufs", async () => {
    const { fetchImpl } = fakeFetch({ call: () => new Response("nope", { status: 500 }) });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s", message: "x" })).rejects.toThrow("deepseek_http_500");
  });

  it("toleriert ein fehlendes cancel (kein harter Fehler)", async () => {
    const { fetchImpl } = fakeFetch({
      call: (request) =>
        request.method === "session.cancel"
          ? serverResponse(request.rpcId, { ok: false, error: { code: "bad-request" } })
          : serverResponse(request.rpcId, { ok: true, value: {} })
    });
    const transport = new DshWebRuntimeTransport({ baseUrl: "http://localhost:3080", fetchImpl });
    await expect(transport.stopSession("s")).resolves.toBeUndefined();
  });

  it("erlaubt konfigurierbaren API-Pfadpräfix und Methodennamen", async () => {
    const { fetchImpl, calls } = fakeFetch({
      call: (request) => {
        if (request.method === "agent.prompt") {
          return serverResponse(request.rpcId, { ok: true, value: { accepted: true } });
        }
        return historyResponse(request.rpcId, [
          { type: "assistant/message", seq: 1, data: { message: { content: [{ type: "text", text: "fertig" }] } } },
          { type: "turn/end", seq: 2 }
        ]);
      }
    });
    const transport = new DshWebRuntimeTransport({
      baseUrl: "http://localhost:3080",
      apiPrefix: "/v2",
      pollIntervalMs: 1,
      methods: { prompt: "agent.prompt", history: "agent.history" },
      fetchImpl
    });
    const turn = await transport.sendTurn({ sessionId: "s", message: "x" });
    expect(turn.text).toBe("fertig");
    expect(calls.some((call) => call.url === "http://localhost:3080/v2/agent.prompt")).toBe(true);
    expect(calls.some((call) => call.url === "http://localhost:3080/v2/agent.history")).toBe(true);
  });
});
