import { describe, expect, it } from "vitest";
import { DshOpenAiRuntimeTransport } from "../src/services/harness/DshOpenAiRuntimeTransport.js";

type FetchArgs = { url: string; init?: RequestInit };

/** Baut einen Fake-fetch, der GET (/healthz) und POST (/v1/chat/completions) unterscheidet. */
function fakeFetch(handlers: {
  get?: () => Response | Promise<Response>;
  post?: (body: Record<string, unknown>) => Response | Promise<Response>;
}): { fetchImpl: typeof fetch; calls: FetchArgs[]; bodies: Array<Record<string, unknown>> } {
  const calls: FetchArgs[] = [];
  const bodies: Array<Record<string, unknown>> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if ((init?.method ?? "GET") === "GET") {
      return handlers.get ? handlers.get() : new Response("ok", { status: 200 });
    }
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    bodies.push(body);
    if (handlers.post) return handlers.post(body);
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Antwort." } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as unknown as typeof fetch;
  return { fetchImpl, calls, bodies };
}

describe("DshOpenAiRuntimeTransport", () => {
  it("prüft Erreichbarkeit über /healthz", async () => {
    const { fetchImpl, calls } = fakeFetch({ get: () => new Response("ok", { status: 200 }) });
    const transport = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110", fetchImpl });
    expect(await transport.isAvailable()).toBe(true);
    expect(calls[0]?.url).toBe("http://127.0.0.1:3110/healthz");
    expect(calls[0]?.init?.method).toBe("GET");
  });

  it("meldet unavailable bei Netzwerkfehler", async () => {
    const fetchImpl = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    const transport = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110", fetchImpl });
    expect(await transport.isAvailable()).toBe(false);
  });

  it("minted eine PTS-lokale Session-ID ohne Serveraufruf für die Session selbst", async () => {
    const { fetchImpl, calls } = fakeFetch({});
    const transport = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110", fetchImpl });
    const session = await transport.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    expect(session.sessionId).toContain("space-1");
    // Nur der healthz-Check aus createSession, kein Session-RPC.
    expect(calls).toHaveLength(1);
  });

  it("sendet einen blockierenden Chat-Completion-Turn mit Kontext-Präfix und mappt Usage", async () => {
    const { fetchImpl, bodies } = fakeFetch({});
    const transport = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110/", fetchImpl });
    const turn = await transport.sendTurn({ sessionId: "s1", message: "Aufgabe.", context: "Verlauf." });
    expect(turn.text).toBe("Antwort.");
    expect(turn.usage?.inputTokens).toBe(10);
    expect(turn.usage?.outputTokens).toBe(5);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.model).toBe("dsh-headless");
    expect(bodies[0]?.stream).toBe(false);
    const messages = bodies[0]?.messages as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe("user");
    expect(messages[0]?.content).toBe("Verlauf.\n\n---\n\nAufgabe.");
  });

  it("wirft deepseek_empty_response bei leerer Antwort", async () => {
    const { fetchImpl } = fakeFetch({
      post: () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    });
    const transport = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s1", message: "Hi" })).rejects.toThrow("deepseek_empty_response");
  });

  it("bildet HTTP-Fehler als deepseek_http_<status> ab", async () => {
    const { fetchImpl } = fakeFetch({ post: () => new Response("boom", { status: 502 }) });
    const transport = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110", fetchImpl });
    await expect(transport.sendTurn({ sessionId: "s1", message: "Hi" })).rejects.toThrow("deepseek_http_502");
  });

  it("reicht ein konfiguriertes Bearer-Token weiter", async () => {
    const { fetchImpl, calls } = fakeFetch({});
    const transport = new DshOpenAiRuntimeTransport({
      baseUrl: "http://127.0.0.1:3110",
      apiKey: "secret",
      fetchImpl
    });
    await transport.sendTurn({ sessionId: "s1", message: "Hi" });
    const headers = calls[calls.length - 1]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer secret");
  });

  it("resumeSession folgt der Adapter-Erreichbarkeit", async () => {
    const down = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
    const ok = fakeFetch({});
    const transportOk = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110", fetchImpl: ok.fetchImpl });
    const transportDown = new DshOpenAiRuntimeTransport({ baseUrl: "http://127.0.0.1:3110", fetchImpl: down });
    expect(await transportOk.resumeSession("s1")).toBe(true);
    expect(await transportDown.resumeSession("s1")).toBe(false);
  });
});
