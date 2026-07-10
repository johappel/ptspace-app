import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEmptyLearningDesign } from "@ptspace/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OpenCodeDockerAdapter, summarizeSimulation } from "../src/services/harness/OpenCodeDockerAdapter.js";
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

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-opencode-adapter-"));
  projectDir = path.join(tempRoot, "project");
  kernelDir = path.join(tempRoot, "kernel");
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(kernelDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, "learning-design.md"), "# Test\n", "utf8");
  await fs.writeFile(path.join(kernelDir, "AGENTS.md"), "# Kernel-Regeln\n", "utf8");
  await fs.writeFile(path.join(kernelDir, "CRITICAL_FRIEND.de.md"), "# Critical Friend\n", "utf8");
  await fs.writeFile(path.join(kernelDir, "LEARNING_DESIGN.de.md"), "# Learning Design\n", "utf8");
  await fs.writeFile(path.join(kernelDir, "ORCHESTRATION.md"), "# Orchestration\n", "utf8");
  await fs.mkdir(path.join(kernelDir, "capabilities", "workers"), { recursive: true });
  await fs.writeFile(
    path.join(kernelDir, "capabilities", "workers", "CREATE_STUDENT_INSTRUCTION.md"),
    "# Worker Capability\n",
    "utf8"
  );
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("OpenCodeDockerAdapter", () => {
  it("stays unavailable for real execution until explicitly enabled", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: false,
      policy: new PermissionPolicy(),
      runner: "local",
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000
    });

    await expect(adapter.checkAvailability()).resolves.toMatchObject({ status: "requires_admin_configuration" });
    await expect(adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: tempRoot })).rejects.toThrow(
      "opencode_docker_adapter_not_enabled"
    );
  });

  it("requires a configured image for the docker runner", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "docker",
      kernelDir,
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000
    });

    await expect(adapter.checkAvailability()).resolves.toMatchObject({ status: "requires_setup" });
  });

  it("requires the pedagogical kernel for enabled execution", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async () => ({ exitCode: 0, stdout: "opencode", stderr: "" })
    });

    await expect(adapter.checkAvailability()).resolves.toMatchObject({ status: "requires_setup" });
  });

  it("simulates backend policy boundaries", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      kernelDir,
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async () => ({ exitCode: 0, stdout: "opencode", stderr: "" })
    });

    const simulation = await adapter.simulatePolicy(tempRoot);
    expect(summarizeSimulation(simulation)).toEqual({
      allow: 1,
      deny: 2,
      requires_admin_approval: 2,
      ask_critical_friend: 1
    });
  });

  it("runs through the common adapter boundary and reports workspace changes", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      kernelDir,
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async (_command, _args, options) => {
        await fs.appendFile(path.join(options.cwd, "learning-design.md"), "\nTestlauf abgeschlossen.\n", "utf8");
        return { exitCode: 0, stdout: "Testlauf abgeschlossen.", stderr: "" };
      }
    });

    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({
      session,
      message: "Bitte prüfe den Test-Planungsraum.",
      history: [],
      space: testSpace()
    });

    expect(result.reply.text).toContain("Testlauf abgeschlossen");
    expect(result.events).toContainEqual({ type: "workspace_update", relativePath: "learning-design.md" });
  });

  it("does not silently confirm persistence when no thinking-state file changed", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      kernelDir,
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async (_command, args) => {
        if (args.includes("--version")) return { exitCode: 0, stdout: "opencode", stderr: "" };
        return { exitCode: 0, stdout: "Der Denkstand ist festgehalten.", stderr: "" };
      }
    });
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({ session, message: "Bitte halte das fest.", space: testSpace() });
    expect(result.reply.text).toContain("technisch noch nicht dauerhaft");
  });

  it("marks curriculum claims as unverified without a Knowledge result", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      kernelDir,
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async (_command, args) => {
        if (args.includes("--version")) return { exitCode: 0, stdout: "opencode", stderr: "" };
        return { exitCode: 0, stdout: "Der NRW-Kernlehrplan ordnet das IF5 zu.", stderr: "" };
      }
    });
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({ session, message: "Wo steht das im Lehrplan?", space: testSpace() });
    expect(result.reply.text).toContain("nicht durch einen Knowledge-Auftrag");
  });

  it("runs a Worker task through the harness and requires the expected artefact", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      kernelDir,
      command: "opencode",
      allowNetwork: true,
      timeoutMs: 10000,
      runProcess: async (_command, args, options) => {
        if (args.includes("--version")) return { exitCode: 0, stdout: "opencode", stderr: "" };
        expect(args.at(-1)).toContain("CREATE_STUDENT_INSTRUCTION.md");
        await fs.mkdir(path.join(options.cwd, "drafts"), { recursive: true });
        await fs.writeFile(
          path.join(options.cwd, "drafts", "student-instruction.md"),
          "# Entwurf: Arbeitsauftrag\n\n## Auftrag\nPrüft die Situation.\n\n## Vorgehen\nArbeitet zu zweit.\n\n## Rückmeldung oder Ergebnis\nNotiert eine Frage.\n\n> Status: Entwurf",
          "utf8"
        );
        return { exitCode: 0, stdout: "done", stderr: "" };
      }
    });
    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.requestTask({
      session,
      space: testSpace(),
      service: "worker",
      capability: "create_student_instruction",
      reason: "Eine Entscheidung ist getroffen.",
      input: { learningDesign: "learning-design.md" },
      expectedOutput: { type: "student_instruction", relativePath: "drafts/student-instruction.md" },
      constraints: { language: "de" }
    });
    expect(result.events).toContainEqual({ type: "workspace_update", relativePath: "drafts/student-instruction.md" });
  });


  it("does not expose the full kernel to external providers without explicit admin approval", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "docker",
      kernelDir,
      dockerImage: "ptspace/opencode-test:1.17.13",
      command: "opencode",
      allowNetwork: true,
      timeoutMs: 10000,
      provider: "openrouter",
      openRouterApiKeyAvailable: true,
      runProcess: async () => ({ exitCode: 0, stdout: "docker", stderr: "" })
    });

    await expect(adapter.checkAvailability()).resolves.toMatchObject({ status: "requires_admin_configuration" });
  });
  it("passes OpenRouter secret and pedagogical kernel to docker without exposing secret value", async () => {
    const previousKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-secret-value";

    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "docker",
      kernelDir,
      dockerImage: "ptspace/opencode-test:1.17.13",
      command: "opencode",
      allowNetwork: true,
      timeoutMs: 10000,
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openrouter/tencent/hy3:free",
      openRouterApiKeyAvailable: true,
      externalKernelContextEnabled: true,
      runProcess: async (command, args, options) => {
        if (args.includes("--version")) return { exitCode: 0, stdout: "docker", stderr: "" };
        expect(command).toBe("docker");
        expect(options.env?.OPENROUTER_API_KEY).toBe("test-secret-value");
        expect(args).toContain("--volume");
        expect(args).toContain(`${kernelDir}:/ptspace-kernel:ro`);
        expect(args.some((arg) => arg.includes("/root/.local/share/opencode/auth.json:ro"))).toBe(true);
        expect(args).not.toContain("--env");
        expect(args).not.toContain("OPENROUTER_API_KEY");
        expect(args).not.toContain("test-secret-value");
        expect(args[args.indexOf("ptspace/opencode-test:1.17.13") + 1]).toBe("run");
        const prompt = args.at(-1) ?? "";
        expect(prompt).toContain("/ptspace-kernel");
        expect(prompt).toContain("AGENTS.md");
        return { exitCode: 0, stdout: '{"type":"text","part":{"type":"text","text":"Docker-Test abgeschlossen. Siehe learning-design.md und next-steps.md."}}', stderr: "" };
      }
    });

    try {
      const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
      const result = await adapter.sendMessage({
        session,
        message: "Bitte prüfe den Test-Planungsraum.",
        history: [],
        space: testSpace()
      });

      expect(result.reply.text).toContain("Docker-Test abgeschlossen");
      expect(result.reply.text).toContain("den Denkstand");
      expect(result.reply.text).toContain("die nächsten Schritte");
      expect(result.reply.text).not.toContain("learning-design.md");
      expect(result.reply.text).not.toContain("next-steps.md");
    } finally {
      if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previousKey;
    }
  });


  it("can expose configured kernel work areas as writable docker overlays", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "docker",
      kernelDir,
      kernelWriteEnabled: true,
      kernelWritableDirs: ["capabilities", "knowledge", "services", "..", "bad/path"],
      dockerImage: "ptspace/opencode-test:1.17.13",
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      provider: "local",
      openRouterApiKeyAvailable: false,
      runProcess: async (_command, args) => {
        if (args.includes("--version")) return { exitCode: 0, stdout: "docker", stderr: "" };
        expect(args).toContain(`${kernelDir}:/ptspace-kernel:ro`);
        expect(args).toContain(`${path.join(kernelDir, "capabilities")}:/ptspace-kernel/capabilities:rw`);
        expect(args).toContain(`${path.join(kernelDir, "knowledge")}:/ptspace-kernel/knowledge:rw`);
        expect(args).toContain(`${path.join(kernelDir, "services")}:/ptspace-kernel/services:rw`);
        expect(args.some((arg) => arg.includes("..:/ptspace-kernel"))).toBe(false);
        expect(args.some((arg) => arg.includes("bad/path"))).toBe(false);
        const prompt = args.at(-1) ?? "";
        expect(prompt).toContain("/ptspace-kernel/capabilities");
        expect(prompt).toContain("/ptspace-kernel/knowledge");
        expect(prompt).toContain("/ptspace-kernel/services");
        return { exitCode: 0, stdout: "Kernel-Zonen geprüft.", stderr: "" };
      }
    });

    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    await adapter.sendMessage({
      session,
      message: "Bitte prüfe die Kernel-Zonen.",
      history: [],
      space: testSpace()
    });
  });
  it("keeps a failed runtime teacher-facing", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      kernelDir,
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async (_command, args) => {
        if (args.includes("--version")) return { exitCode: 0, stdout: "opencode", stderr: "" };
        return { exitCode: 1, stdout: "", stderr: "technical provider error" };
      }
    });

    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: projectDir });
    const result = await adapter.sendMessage({
      session,
      message: "Bitte prüfe den Test-Planungsraum.",
      history: [],
      space: testSpace()
    });

    expect(result.reply.text).toContain("Die geschützte Testausführung konnte noch nicht abgeschlossen werden");
    expect(result.reply.text).not.toContain("technical provider error");
  });
});
