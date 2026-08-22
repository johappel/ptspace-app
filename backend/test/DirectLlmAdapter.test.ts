import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEmptyLearningDesign } from "@ptspace/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DirectLlmAdapter, type LlmChatMessage } from "../src/services/harness/DirectLlmAdapter.js";
import { PermissionPolicy } from "../src/services/policy/PermissionPolicy.js";

let tempRoot: string;
let projectDir: string;
let kernelDir: string;

function testSpace() {
  return {
    id: "space-1",
    title: "Test",
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

function makeAdapter(
  llmReply: (messages: LlmChatMessage[]) => string | Promise<string>,
  overrides: Partial<ConstructorParameters<typeof DirectLlmAdapter>[0]> = {}
) {
  return adapterWithClient(async (messages) => llmReply(messages), overrides);
}

/** Adapter mit injiziertem Fake-LlmClient (ersetzt den Default-Client). */
function adapterWithClient(client: (messages: LlmChatMessage[]) => Promise<string>, overrides: Partial<ConstructorParameters<typeof DirectLlmAdapter>[0]> = {}) {
  const adapter = new DirectLlmAdapter({
    enabled: true,
    policy: new PermissionPolicy(),
    baseUrl: "https://llm.example/api/v1",
    model: "test-model",
    apiKeyAvailable: true,
    timeoutMs: 5000,
    fetchImpl: (async () => new Response("{}")) as unknown as typeof fetch,
    ...overrides
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adapter as any).llm = client;
  return adapter;
}

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-direct-llm-"));
  projectDir = path.join(tempRoot, "project");
  kernelDir = path.join(tempRoot, "kernel");
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(kernelDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, "learning-design.md"), "# Test\n", "utf8");
  await fs.writeFile(path.join(kernelDir, "AGENTS.md"), "# Kernel-Regeln\n", "utf8");
  await fs.writeFile(path.join(kernelDir, "CRITICAL_FRIEND.de.md"), "# Critical Friend\n", "utf8");
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("DirectLlmAdapter", () => {
  it("ist bereit, wenn Key und Modell konfiguriert sind", async () => {
    const adapter = adapterWithClient(async () => "");
    const availability = await adapter.checkAvailability();
    expect(availability.status).toBe("ready");
  });

  it("fordert Setup an, wenn kein API-Key vorhanden ist", async () => {
    const adapter = adapterWithClient(async () => "", { apiKeyAvailable: false });
    const availability = await adapter.checkAvailability();
    expect(availability.status).toBe("requires_setup");
  });

  it("fordert Admin-Konfiguration, wenn nicht freigegeben", async () => {
    const adapter = adapterWithClient(async () => "", { enabled: false });
    const availability = await adapter.checkAvailability();
    expect(availability.status).toBe("requires_admin_configuration");
  });

  it("liefert die Modellantwort als lehrkraftfreundliche Reply", async () => {
    const adapter = adapterWithClient(async () => "Ein ruhiger Einstieg über eine Alltagsfrage bietet sich an.");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({ session, space: testSpace() as never, message: "Wie starte ich die Stunde?" });
    expect(result.reply.author).toBe("critical_friend");
    expect(result.reply.text).toContain("ruhiger Einstieg");
  });

  it("übersetzt technische Dateinamen in pädagogische Begriffe", async () => {
    const adapter = adapterWithClient(async () => "Ich habe deinen Gedanken in learning-design.md festgehalten.");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({ session, space: testSpace() as never, message: "Halte das fest." });
    expect(result.reply.text).toContain("Denkstand");
    expect(result.reply.text).not.toContain("learning-design.md");
  });

  it("hängt einen Hinweis an, wenn Persistenz behauptet, aber nichts geschrieben wurde", async () => {
    const adapter = adapterWithClient(async () => "Deine Entscheidung wurde festgehalten.");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({ session, space: testSpace() as never, message: "Merke dir das." });
    expect(result.reply.text).toContain("noch nicht dauerhaft im Denkstand gespeichert");
  });

  it("liefert eine teacher-facing Fehlermeldung bei fehlender Modellverbindung", async () => {
    const adapter = adapterWithClient(async () => {
      throw new Error("llm_api_key_missing");
    });
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({ session, space: testSpace() as never, message: "Hallo" });
    expect(result.reply.text).toContain("Administration informieren");
  });

  it("schreibt Worker-Output in die erwartete Datei innerhalb des Workspaces", async () => {
    const adapter = adapterWithClient(async () => "# Entwurf\n\nStatus: Entwurf\n");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.requestTask({
      session,
      space: testSpace() as never,
      service: "worker",
      capability: "create_student_instruction",
      reason: "Test",
      input: {},
      expectedOutput: { type: "student_instruction", relativePath: "drafts/anleitung.md" },
      constraints: {}
    });
    expect(result.events.some((event) => event.type === "workspace_update" && event.relativePath === "drafts/anleitung.md")).toBe(true);
    const written = await fs.readFile(path.join(projectDir, "drafts", "anleitung.md"), "utf8");
    expect(written).toContain("# Entwurf");
  });

  it("lehnt Worker-Outputs außerhalb des Workspaces ab", async () => {
    const adapter = adapterWithClient(async () => "# Entwurf\n");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    await expect(adapter.requestTask({
      session,
      space: testSpace() as never,
      service: "worker",
      capability: "create_student_instruction",
      reason: "Test",
      input: {},
      expectedOutput: { type: "student_instruction", relativePath: "../outside.md" },
      constraints: {}
    })).rejects.toThrow("worker_output_outside_workspace");
  });

  it("bricht ab, wenn der Worker BLOCKED antwortet", async () => {
    const adapter = adapterWithClient(async () => "BLOCKED");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    await expect(adapter.requestTask({
      session,
      space: testSpace() as never,
      service: "worker",
      capability: "create_board_material",
      reason: "Test",
      input: {},
      expectedOutput: { type: "board_material", relativePath: "materials/board.md" },
      constraints: {}
    })).rejects.toThrow("worker_blocked_by_capability_contract");
  });

  it("wertet das Review-Protokoll STATUS/NOTE aus", async () => {
    const adapter = adapterWithClient(async () => "STATUS: PASSED\nNOTE: Der Entwurf passt zur Lerngruppe.");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    await fs.mkdir(path.join(projectDir, "drafts"), { recursive: true });
    await fs.writeFile(path.join(projectDir, "drafts", "anleitung.md"), "# Entwurf\n", "utf8");
    const review = await adapter.reviewTask({
      session,
      space: testSpace() as never,
      capability: "create_student_instruction",
      expectedOutput: { type: "student_instruction", relativePath: "drafts/anleitung.md" },
      context: {}
    });
    expect(review.status).toBe("passed");
    expect(review.note).toContain("Lerngruppe");
  });

  it("blockiert die Prüfung, wenn der Entwurf fehlt", async () => {
    const adapter = adapterWithClient(async () => "STATUS: PASSED\nNOTE: ok");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const review = await adapter.reviewTask({
      session,
      space: testSpace() as never,
      capability: "create_student_instruction",
      expectedOutput: { type: "student_instruction", relativePath: "drafts/fehlt.md" },
      context: {}
    });
    expect(review.status).toBe("blocked");
  });

  it("blockiert die Prüfung, wenn kein prüfbares Ergebnis geliefert wird", async () => {
    const adapter = adapterWithClient(async () => "Ich bin mir unsicher.");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    await fs.mkdir(path.join(projectDir, "drafts"), { recursive: true });
    await fs.writeFile(path.join(projectDir, "drafts", "anleitung.md"), "# Entwurf\n", "utf8");
    const review = await adapter.reviewTask({
      session,
      space: testSpace() as never,
      capability: "create_student_instruction",
      expectedOutput: { type: "student_instruction", relativePath: "drafts/anleitung.md" },
      context: {}
    });
    expect(review.status).toBe("blocked");
  });

  it("verändert den Workspace während der Prüfung nicht", async () => {
    const adapter = adapterWithClient(async () => "STATUS: PASSED\nNOTE: ok");
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    await fs.mkdir(path.join(projectDir, "drafts"), { recursive: true });
    await fs.writeFile(path.join(projectDir, "drafts", "anleitung.md"), "# Entwurf\n", "utf8");
    await adapter.reviewTask({
      session,
      space: testSpace() as never,
      capability: "create_student_instruction",
      expectedOutput: { type: "student_instruction", relativePath: "drafts/anleitung.md" },
      context: {}
    });
    const entries = await fs.readdir(projectDir);
    expect(entries).not.toContain("review-workspace");
  });
});
