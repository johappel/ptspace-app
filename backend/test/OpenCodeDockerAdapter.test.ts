import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyLearningDesign } from "@ptspace/shared";
import { OpenCodeDockerAdapter, summarizeSimulation } from "../src/services/harness/OpenCodeDockerAdapter.js";
import { PermissionPolicy } from "../src/services/policy/PermissionPolicy.js";

let tempRoot: string;
let projectDir: string;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-opencode-adapter-"));
  projectDir = path.join(tempRoot, "project");
  await fs.mkdir(projectDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, "learning-design.md"), "# Lernanliegen\n", "utf8");
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

    await expect(adapter.checkAvailability()).resolves.toMatchObject({
      status: "requires_admin_configuration"
    });
    await expect(adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: tempRoot })).rejects.toThrow(
      "opencode_docker_adapter_not_enabled"
    );
  });

  it("requires a configured image for docker runner", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "docker",
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async () => ({ exitCode: 0, stdout: "", stderr: "" })
    });

    await expect(adapter.checkAvailability()).resolves.toMatchObject({ status: "requires_setup" });
  });

  it("simulates all backend policy outcomes before real harness execution", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: false,
      policy: new PermissionPolicy(),
      runner: "local",
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000
    });

    const result = await adapter.simulatePolicy(tempRoot);
    const summary = summarizeSimulation(result);

    expect(summary.allow).toBeGreaterThan(0);
    expect(summary.deny).toBeGreaterThan(0);
    expect(summary.requires_admin_approval).toBeGreaterThan(0);
    expect(summary.ask_critical_friend).toBeGreaterThan(0);
  });

  it("runs against the project directory and reports changed curated files", async () => {
    const adapter = new OpenCodeDockerAdapter({
      enabled: true,
      policy: new PermissionPolicy(),
      runner: "local",
      command: "opencode",
      allowNetwork: false,
      timeoutMs: 10000,
      runProcess: async (_command, args, options) => {
        if (args.includes("--version")) {
          return { exitCode: 0, stdout: "opencode-test", stderr: "" };
        }
        expect(options.cwd).toBe(projectDir);
        expect(args).toContain("--pure");
        expect(args).toContain("--dir");
        await fs.appendFile(path.join(options.cwd, "learning-design.md"), "\n- Testlauf ergänzt\n", "utf8");
        return { exitCode: 0, stdout: "Testlauf abgeschlossen.", stderr: "" };
      }
    });

    const session = await adapter.createSession({ planningSpaceId: "space-1", workspaceRoot: tempRoot });
    const result = await adapter.sendMessage({
      session,
      message: "Bitte prüfe den Denkstand.",
      space: {
        id: "space-1",
        title: "Test",
        subject: "Religion",
        targetGroup: "Klasse 9",
        status: "active",
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
      }
    });

    expect(result.reply.text).toContain("Testlauf abgeschlossen");
    expect(result.events).toContainEqual({ type: "workspace_update", relativePath: "learning-design.md" });
  });
});
