import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEmptyLearningDesign } from "@ptspace/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DirectLlmAdapter, type LlmChatMessage } from "../src/services/harness/DirectLlmAdapter.js";
import {
  DeepSeekHarnessAdapter,
  DeepSeekRuntimeTransport,
  DeepSeekRuntimeTurn
} from "../src/services/harness/DeepSeekHarnessAdapter.js";
import { buildContext } from "../src/services/conversation/ContextBuilder.js";
import { createContextBudget } from "../src/services/conversation/ContextBudget.js";
import { emptySummary } from "../src/services/conversation/ConversationSummaryService.js";
import { PermissionPolicy } from "../src/services/policy/PermissionPolicy.js";

// ZIEL-SPEZIFIKATION: verbindlicher Vertrag.
//
// Diese Tests sichern das Produktziel aus AGENTS.md/EXECUTION_ARCHITECTURE.md ab:
// Der Pedagogical Companion muss den pädagogischen Kernel (pedagogical-thinking-space)
// TATSÄCHLICH kennen. Für die Ausführungsstufen ohne Dateisystemzugriff
// (DirectLlm, DeepSeek/DSH) bedeutet das: der Kernel-INHALT muss im Modellkontext
// ankommen – nicht nur ein Pfad-String, den ein reines Chat-Modell nie lesen kann.
//
// Abgesichertes Verhalten (seit der Kernel-Injektion):
// - prompts.ts bettet den Kernel-Inhalt direkt in den Prompt ein.
// - DeepSeekHarnessAdapter ergänzt Critical-Friend-Haltung + Kernel im Turn-Kontext.
// - ContextBuilder reicht gelieferten Kernel-Inhalt in `conversationContext` durch.
//
// Schlägt ein Test hier fehl, ist die Kernel-Anbindung regressiv gebrochen.

// Ein Marker, der ausschließlich im DATEIINHALT des Kernels vorkommt – niemals in
// einem Pfad. So unterscheidet der Test "Kernel-Inhalt injiziert" von "nur Pfad genannt".
const KERNEL_MARKER = "KERNELINHALT_MARKER_9Q7X";

let tempRoot: string;
let projectDir: string;
let kernelDir: string;

function testSpace() {
  return {
    id: "space-1",
    title: "Wozu braucht es Religion?",
    subject: "Religion",
    targetGroup: "Klasse 9",
    status: "active" as const,
    participants: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    initialIdea: "",
    learningDesign: createEmptyLearningDesign(),
    openQuestions: [],
    decisions: [],
    nextSteps: [],
    materials: [],
    exports: []
  };
}

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-kernel-context-"));
  projectDir = path.join(tempRoot, "project");
  kernelDir = path.join(tempRoot, "kernel");
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(kernelDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, "learning-design.md"), "# Denkstand\n", "utf8");
  // Kernel-Fixture: der Marker steht im INHALT, nicht im Pfad.
  await fs.writeFile(
    path.join(kernelDir, "AGENTS.md"),
    `# Kernel-Regeln\n\n${KERNEL_MARKER}: Der Companion arbeitet pädagogisch, nicht als generischer Chatbot.\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(kernelDir, "CRITICAL_FRIEND.de.md"),
    `# Critical Friend\n\n${KERNEL_MARKER}: Haltung ist kollegial, ruhig, erfahren.\n`,
    "utf8"
  );
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("ZIEL: Der Kernel-Inhalt erreicht die Ausführungsstufe", () => {
  it("DirectLlm sendet den Kernel-INHALT (nicht nur den Pfad) in den Modellkontext", async () => {
    const captured: LlmChatMessage[][] = [];
    const adapter = new DirectLlmAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      baseUrl: "https://llm.example/api/v1",
      model: "test-model",
      apiKeyAvailable: true,
      timeoutMs: 5000,
      kernelDir,
      fetchImpl: (async () => new Response("{}")) as unknown as typeof fetch
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adapter as any).llm = async (messages: LlmChatMessage[]) => {
      captured.push(messages);
      // Zweiter (Denkstand-)Aufruf soll nichts schreiben.
      if (messages[0].content.includes("JSON")) return '{"updates": []}';
      return "Ein ruhiger Einstieg über eine Alltagsfrage bietet sich an.";
    };

    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    await adapter.sendMessage({ session, space: testSpace() as never, message: "Passt das eigentlich zum Lehrplan?" });

    const everythingSentToModel = captured.flat().map((message) => message.content).join("\n\n");
    // Aktuell nur der Pfad im Prompt -> der Kernel-Inhalt fehlt -> Modell "schwadroniert".
    expect(everythingSentToModel).toContain(KERNEL_MARKER);
  });

  it("DeepSeek/DSH erhält Kernel-INHALT UND Critical-Friend-Haltung im Turn", async () => {
    let capturedTurn: { sessionId: string; message: string; context?: string } | undefined;
    const runtime: DeepSeekRuntimeTransport = {
      async isAvailable() {
        return true;
      },
      async createSession(input) {
        return { sessionId: `ds-${input.planningSpaceId}` };
      },
      async sendTurn(input): Promise<DeepSeekRuntimeTurn> {
        capturedTurn = input;
        return { text: "Ich schaue dazu aus einer bewusst anderen Perspektive." };
      },
      async stopSession() {
        /* nichts zu tun */
      }
    };
    const adapter = new DeepSeekHarnessAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      apiKeyAvailable: true,
      pinnedVersion: "test-0.0.0",
      kernelDir,
      runtime
    });

    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    // Bewusst ohne conversationContext: Kernel & Haltung dürfen nicht davon abhängen.
    await adapter.sendMessage({ session, space: testSpace() as never, message: "Passt das zum Lehrplan?", conversationContext: "" });

    const payloadToModel = `${capturedTurn?.message ?? ""}\n${capturedTurn?.context ?? ""}`;
    // Aktuell erhält DSH weder Kernel-Inhalt noch Critical-Friend-Rahmen.
    expect(payloadToModel).toContain(KERNEL_MARKER);
    expect(payloadToModel).toContain("Critical Friend");
  });

  it("ContextBuilder bettet gelieferten Kernel-Inhalt in den Modellkontext ein", () => {
    const built = buildContext({
      kernelReference: { version: "v1", hash: "abc123" },
      summary: emptySummary("space-1"),
      allMessages: [],
      workspaceItems: [],
      currentMessage: "Passt das zum Lehrplan?",
      budget: createContextBudget(8000),
      kernelTokens: 1600,
      // Ziel-Vertrag: ein Aufrufer kann Kernel-Inhalt liefern; er muss im Kontext landen.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kernelContent: `## Kernel\n${KERNEL_MARKER}`
    } as never);

    // Das Budget wird bereits reserviert ...
    expect(built.profile.kernelTokens).toBeGreaterThan(0);
    // ... aber der Inhalt wird derzeit verworfen: genau das ist die Lücke.
    expect(built.conversationContext).toContain(KERNEL_MARKER);
  });
});
