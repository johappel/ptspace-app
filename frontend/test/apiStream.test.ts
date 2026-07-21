import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/lib/api";

/**
 * Regression coverage for the reported symptom "newly sent messages are not
 * delivered". The bug class lives in the client-side SSE parsing: if the
 * `complete` event is not read from the stream, the Critical Friend reply never
 * appears even though the backend answered. These tests exercise the real
 * parser with a mocked streaming fetch.
 */

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    }
  });
}

function mockStreamResponse(chunks: string[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(sseStream(chunks), {
        status: 200,
        headers: { "content-type": "text/event-stream" }
      })
    )
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api.sendMessageStream", () => {
  it("delivers the Critical Friend reply and teacher message id from the stream", async () => {
    mockStreamResponse([
      "event: status\ndata: {\"status\":\"thinking\"}\n\n",
      "event: complete\ndata: {\"teacherMessageId\":\"msg-1-teacher\",\"reply\":{\"id\":\"reply-1\",\"author\":\"critical_friend\",\"text\":\"Lass uns das Lernanliegen klären.\",\"createdAt\":\"2026-07-21T10:00:00.000Z\"}}\n\n"
    ]);

    const statuses: string[] = [];
    let received: { text: string } | null = null;
    let teacherId: string | undefined;

    const result = await api.sendMessageStream("space-1", "Wir denken weiter.", {
      onStatus: (status) => statuses.push(status),
      onComplete: (reply, teacherMessageId) => {
        received = reply;
        teacherId = teacherMessageId;
      }
    });

    expect(result.completed).toBe(true);
    expect(statuses).toContain("thinking");
    expect(received).not.toBeNull();
    expect(received!.text).toContain("Lernanliegen");
    expect(teacherId).toBe("msg-1-teacher");
  });

  it("parses events even when the backend flushes them in a single buffered chunk", async () => {
    // Vite's dev proxy can buffer SSE and deliver every event at once. The
    // parser must still split on the blank-line delimiter and complete.
    mockStreamResponse([
      "event: status\ndata: {\"status\":\"preparing_context\"}\n\nevent: complete\ndata: {\"teacherMessageId\":\"msg-2\",\"reply\":{\"id\":\"reply-2\",\"author\":\"critical_friend\",\"text\":\"Antwort\",\"createdAt\":\"2026-07-21T10:00:00.000Z\"}}\n\n"
    ]);

    let completed = false;
    const result = await api.sendMessageStream("space-1", "Frage", {
      onComplete: () => {
        completed = true;
      }
    });

    expect(result.completed).toBe(true);
    expect(completed).toBe(true);
  });

  it("surfaces a teacher-facing error when the stream reports a failure", async () => {
    mockStreamResponse([
      "event: error\ndata: {\"message\":\"Die geschützte Testausführung konnte noch nicht abgeschlossen werden.\"}\n\n"
    ]);

    let errorMessage = "";
    const result = await api.sendMessageStream("space-1", "Frage", {
      onComplete: () => {
        throw new Error("onComplete should not be called on error");
      },
      onError: (message) => {
        errorMessage = message;
      }
    });

    expect(result.completed).toBe(false);
    expect(errorMessage).toContain("geschützte Testausführung");
  });

  it("reports a non-streaming failure response as an error instead of hanging", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Diesen Planungsraum habe ich nicht gefunden." }), {
          status: 404,
          headers: { "content-type": "application/json" }
        })
      )
    );

    let errorMessage = "";
    const result = await api.sendMessageStream("missing", "Frage", {
      onComplete: () => {
        throw new Error("onComplete should not be called for a 404");
      },
      onError: (message) => {
        errorMessage = message;
      }
    });

    expect(result.completed).toBe(false);
    expect(errorMessage).toContain("nicht gefunden");
  });
});
