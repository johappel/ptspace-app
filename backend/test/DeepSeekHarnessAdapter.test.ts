import { describe, expect, it } from "vitest";
import { createEmptyLearningDesign } from "@ptspace/shared";
import {
  DeepSeekHarnessAdapter,
  DeepSeekRuntimeTransport,
  DeepSeekRuntimeTurn
} from "../src/services/harness/DeepSeekHarnessAdapter.js";
import { PermissionPolicy } from "../src/services/policy/PermissionPolicy.js";

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
    materials: []
  };
}

function fakeRuntime(overrides: Partial<DeepSeekRuntimeTransport> = {}): { runtime: DeepSeekRuntimeTransport; calls: string[] } {
  const calls: string[] = [];
  const runtime: DeepSeekRuntimeTransport = {
    async isAvailable() {
      calls.push("isAvailable");
      return true;
    },
    async createSession(input) {
      calls.push("createSession");
      return { sessionId: `ds-${input.planningSpaceId}` };
    },
    async sendTurn(): Promise<DeepSeekRuntimeTurn> {
      calls.push("sendTurn");
      return { text: "Ich schaue dazu nach einer bewusst anderen Perspektive.", usage: { inputTokens: 120, outputTokens: 40, toolCalls: 1 } };
    },
    async stopSession() {
      calls.push("stopSession");
    },
    ...overrides
  };
  return { runtime, calls };
}

function makeAdapter(overrides: Partial<ConstructorParameters<typeof DeepSeekHarnessAdapter>[0]> = {}, runtime?: DeepSeekRuntimeTransport) {
  return new DeepSeekHarnessAdapter({
    enabled: true,
    policy: new PermissionPolicy(),
    apiKeyAvailable: true,
    pinnedVersion: "test-0.0.0",
    runtime,
    ...overrides
  });
}

describe("DeepSeekHarnessAdapter", () => {
  it("fordert Admin-Konfiguration, wenn nicht freigegeben", async () => {
    const adapter = makeAdapter({ enabled: false });
    expect((await adapter.checkAvailability()).status).toBe("requires_admin_configuration");
  });

  it("fordert Setup, wenn kein Key vorhanden ist", async () => {
    const adapter = makeAdapter({ apiKeyAvailable: false });
    expect((await adapter.checkAvailability()).status).toBe("requires_setup");
  });

  it("fordert Setup, wenn kein Transport verbunden ist", async () => {
    const adapter = makeAdapter();
    expect((await adapter.checkAvailability()).status).toBe("requires_setup");
  });

  it("meldet unavailable, wenn die Runtime nicht erreichbar ist", async () => {
    const { runtime } = fakeRuntime({ isAvailable: async () => false });
    const adapter = makeAdapter({}, runtime);
    expect((await adapter.checkAvailability()).status).toBe("unavailable");
  });

  it("ist bereit, wenn Key, Freigabe und Transport vorhanden sind", async () => {
    const { runtime } = fakeRuntime();
    const adapter = makeAdapter({}, runtime);
    expect((await adapter.checkAvailability()).status).toBe("ready");
  });

  it("erstellt eine persistente Session und wiederverwendet sie über Resume", async () => {
    let resumeCount = 0;
    const { runtime, calls } = fakeRuntime({
      resumeSession: async () => {
        resumeCount += 1;
        return true;
      }
    });
    const adapter = makeAdapter({}, runtime);
    const first = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    const second = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    expect(first.id).toBe(second.id);
    expect(resumeCount).toBe(1);
    expect(calls.filter((call) => call === "createSession")).toHaveLength(1);
  });

  it("führt einen Turn aus, übersetzt Events und erfasst Runtime-Usage", async () => {
    const { runtime } = fakeRuntime();
    const adapter = makeAdapter({}, runtime);
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    const result = await adapter.sendMessage({ session, space: testSpace() as never, message: "Welche Perspektive fehlt?" });
    expect(result.reply.author).toBe("critical_friend");
    expect(result.reply.text).toContain("Perspektive");
    expect(result.usage?.modelCalls).toBe(1);
    expect(result.usage?.inputTokens).toBe(120);
    expect(result.usage?.outputTokens).toBe(40);
    expect(result.usage?.toolCalls).toBe(1);
    expect(result.events.some((event) => event.type === "status" && event.status === "ready")).toBe(true);
  });

  it("liefert bei Runtime-Fehler eine teacher-facing Antwort ohne technische Details", async () => {
    const { runtime } = fakeRuntime({ sendTurn: async () => { throw new Error("deepseek internal 500 stacktrace"); } });
    const adapter = makeAdapter({}, runtime);
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    const result = await adapter.sendMessage({ session, space: testSpace() as never, message: "Hallo" });
    expect(result.reply.text).not.toContain("stacktrace");
    expect(result.reply.text).not.toContain("500");
    expect(result.events.some((event) => event.type === "status" && event.status === "failed")).toBe(true);
  });

  it("stoppt die Session und vergisst die persistente Zuordnung", async () => {
    const { runtime, calls } = fakeRuntime();
    const adapter = makeAdapter({}, runtime);
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    await adapter.stopSession(session);
    expect(calls).toContain("stopSession");
    // Nach stop entsteht wieder eine neue Session statt eines Resume.
    await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    expect(calls.filter((call) => call === "createSession")).toHaveLength(2);
  });

  it("simuliert Backend-Policy-Grenzen (Secret bleibt verweigert)", async () => {
    const { runtime } = fakeRuntime();
    const adapter = makeAdapter({}, runtime);
    const simulation = await adapter.simulatePolicy("/tmp/space-1");
    const secretDecision = simulation.decisions.find((entry) => entry.request.type === "secret");
    expect(secretDecision?.decision.decision).toBe("deny");
  });

  it("lehnt Worker-Tasks im Spike bewusst ab (Direct LLM bleibt Baseline)", async () => {
    const { runtime } = fakeRuntime();
    const adapter = makeAdapter({}, runtime);
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    await expect(adapter.requestTask({
      session,
      space: testSpace() as never,
      service: "worker",
      capability: "create_student_instruction",
      reason: "Test",
      input: {},
      expectedOutput: { type: "student_instruction", relativePath: "drafts/x.md" },
      constraints: {}
    })).rejects.toThrow("deepseek_adapter_task_not_supported");
  });

  it("dokumentiert die gepinnte Upstream-Version", () => {
    const adapter = makeAdapter({ pinnedVersion: "deepseek-harness@abc123" });
    expect(adapter.pinnedVersion()).toBe("deepseek-harness@abc123");
  });
});
