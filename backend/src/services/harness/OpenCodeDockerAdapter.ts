import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { ConversationMessage, PolicyDecision } from "@ptspace/shared";
import { HarnessPermissionRequest, PermissionPolicy } from "../policy/PermissionPolicy.js";
import {
  HarnessAdapter,
  HarnessAvailability,
  HarnessEvent,
  HarnessMessageResult,
  HarnessPolicySimulationResult,
  HarnessSession,
  SendHarnessMessageInput
} from "./HarnessAdapter.js";

export type OpenCodeRunnerKind = "docker" | "local";

export type OpenCodeDockerAdapterOptions = {
  enabled: boolean;
  policy: PermissionPolicy;
  runner: OpenCodeRunnerKind;
  dockerImage?: string;
  command: string;
  allowNetwork: boolean;
  timeoutMs: number;
  model?: string;
  runProcess?: ProcessRunner;
};

type ProcessRunner = (command: string, args: string[], options: ProcessRunnerOptions) => Promise<ProcessResult>;

type ProcessRunnerOptions = {
  cwd: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
};

type ProcessResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

type FileSnapshot = Map<string, string>;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOutput(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "").trim();
}

export class OpenCodeDockerAdapter implements HarnessAdapter {
  id = "opencode-docker";
  label = "Integrierter geschützter Harness";
  mode = "docker" as const;

  private readonly runProcess: ProcessRunner;

  constructor(private readonly options: OpenCodeDockerAdapterOptions) {
    this.runProcess = options.runProcess ?? runProcess;
  }

  async checkAvailability(): Promise<HarnessAvailability> {
    if (!this.options.enabled) {
      return {
        status: "requires_admin_configuration",
        teacherFacingMessage: "Die nächste Ausführungsstufe ist vorbereitet, aber noch nicht freigegeben."
      };
    }
    if (this.options.runner === "docker" && !this.options.dockerImage) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Für den geschützten Test fehlt noch das freigegebene opencode-Container-Image."
      };
    }
    const tool = this.options.runner === "docker" ? "docker" : this.options.command;
    const available = await commandAvailable(tool, this.runProcess);
    if (!available) {
      return {
        status: "unavailable",
        teacherFacingMessage: "Die vorbereitete Ausführungsumgebung ist auf diesem System nicht verfügbar."
      };
    }
    return {
      status: "ready",
      teacherFacingMessage: "Die geschützte Testausführung ist vorbereitet. Nutze sie nur mit einem nicht-sensiblen Test-Planungsraum."
    };
  }

  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<HarnessSession> {
    if (!this.options.enabled) throw new Error("opencode_docker_adapter_not_enabled");
    const availability = await this.checkAvailability();
    if (availability.status !== "ready") throw new Error(`opencode_docker_adapter_${availability.status}`);
    return {
      id: `opencode-session-${input.planningSpaceId}`,
      planningSpaceId: input.planningSpaceId,
      workspaceRoot: path.resolve(input.workspaceRoot)
    };
  }

  async sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult> {
    const projectDir = path.join(input.session.workspaceRoot, "project");
    await assertProjectDirectory(projectDir, input.session.workspaceRoot);
    const before = await snapshotProject(projectDir);
    const { command, args, cwd } = this.buildCommand(projectDir, input.message);
    const result = await this.runProcess(command, args, {
      cwd,
      timeoutMs: this.options.timeoutMs,
      env: process.env
    });
    const after = await snapshotProject(projectDir);
    const changedFiles = diffSnapshots(before, after);
    const stdout = normalizeOutput(result.stdout);
    const stderr = normalizeOutput(result.stderr);
    const replyText = createReplyText(result, stdout, stderr);

    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: replyText, createdAt: nowIso() },
      workspaceUpdates: [],
      events: [
        { type: "status", status: result.exitCode === 0 ? "ready" : "failed", message: replyText },
        ...changedFiles.map((relativePath): HarnessEvent => ({ type: "workspace_update", relativePath }))
      ]
    };
  }

  async *getEvents(_session: HarnessSession): AsyncIterable<HarnessEvent> {
    yield {
      type: "status",
      status: "waiting_for_backend_policy",
      message: "Die nächste Ausführungsstufe wartet auf Policy-Freigaben."
    };
  }

  async simulatePolicy(workspaceRoot: string): Promise<HarnessPolicySimulationResult> {
    const requests = this.createSimulationRequests(workspaceRoot);
    return {
      decisions: requests.map((request) => ({ request, decision: this.options.policy.decide(request) }))
    };
  }

  async stopSession(_session: HarnessSession): Promise<void> {
    return;
  }

  private buildCommand(projectDir: string, message: string): { command: string; args: string[]; cwd: string } {
    const guardedMessage = [
      "Arbeite ausschließlich im aktuellen Planungsraum.",
      "Verändere nur kuratierte Markdown-Dateien wie learning-design.md, decisions.md, open-questions.md oder next-steps.md.",
      "Speichere keine personenbezogenen Daten, Secrets, Tokens oder technischen Logs.",
      "Antworte knapp als Critical Friend in pädagogischer Sprache.",
      "",
      message
    ].join("\n");
    const modelArgs = this.options.model ? ["--model", this.options.model] : [];
    if (this.options.runner === "docker") {
      return {
        command: "docker",
        cwd: projectDir,
        args: [
          "run",
          "--rm",
          this.options.allowNetwork ? "--network=bridge" : "--network=none",
          "--volume",
          `${projectDir}:/workspace`,
          "--workdir",
          "/workspace",
          this.options.dockerImage ?? "",
          "opencode",
          "run",
          "--pure",
          "--format",
          "json",
          "--dir",
          "/workspace",
          ...modelArgs,
          guardedMessage
        ]
      };
    }
    return {
      command: this.options.command,
      cwd: projectDir,
      args: ["run", "--pure", "--format", "json", "--dir", projectDir, ...modelArgs, guardedMessage]
    };
  }

  private createSimulationRequests(workspaceRoot: string): HarnessPermissionRequest[] {
    return [
      {
        type: "file",
        file: { workspaceRoot, targetPath: path.join(workspaceRoot, "project", "learning-design.md"), operation: "write" }
      },
      {
        type: "file",
        file: { workspaceRoot, targetPath: path.join(workspaceRoot, "..", "outside.txt"), operation: "read" }
      },
      { type: "command", command: "opencode run" },
      { type: "network", url: "https://example.invalid" },
      { type: "secret", name: "OPENAI_API_KEY" },
      {
        type: "pedagogical_question",
        question: "Soll der erste Entwurf eher einen offenen Gesprächseinstieg oder eine strukturierte Sicherung vorbereiten?"
      }
    ];
  }
}

async function commandAvailable(command: string, runner: ProcessRunner): Promise<boolean> {
  const result = await runner(command, ["--version"], { cwd: process.cwd(), timeoutMs: 10000 });
  return result.exitCode === 0;
}

async function assertProjectDirectory(projectDir: string, workspaceRoot: string): Promise<void> {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedProject = path.resolve(projectDir);
  const relative = path.relative(resolvedRoot, resolvedProject);
  if (relative !== "project") throw new Error("opencode_project_dir_must_be_workspace_project");
  await fs.access(resolvedProject);
}

async function snapshotProject(projectDir: string): Promise<FileSnapshot> {
  const snapshot: FileSnapshot = new Map();
  await collectFiles(projectDir, projectDir, snapshot);
  return snapshot;
}

async function collectFiles(root: string, current: string, snapshot: FileSnapshot): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, fullPath, snapshot);
      continue;
    }
    if (!entry.isFile()) continue;
    const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
    snapshot.set(relativePath, await fs.readFile(fullPath, "utf8"));
  }
}

function diffSnapshots(before: FileSnapshot, after: FileSnapshot): string[] {
  const changed = new Set<string>();
  for (const [file, content] of after) {
    if (before.get(file) !== content) changed.add(file);
  }
  for (const file of before.keys()) {
    if (!after.has(file)) changed.add(file);
  }
  return [...changed].sort();
}

function createReplyText(result: ProcessResult, stdout: string, stderr: string): string {
  if (result.exitCode === 0) {
    return stdout || "Ich habe den Test-Planungsraum geprüft und den Denkstand aktualisiert.";
  }
  const detail = stderr || stdout || "Die Ausführung wurde ohne verwertbare Rückmeldung beendet.";
  return `Die geschützte Testausführung konnte noch nicht abgeschlossen werden: ${detail}`;
}

function runProcess(command: string, args: string[], options: ProcessRunnerOptions): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      stderr += "\nZeitlimit der geschützten Testausführung erreicht.";
    }, options.timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ exitCode: 1, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({ exitCode, stdout, stderr });
    });
  });
}

export function summarizeSimulation(result: HarnessPolicySimulationResult): Record<PolicyDecision["decision"], number> {
  return result.decisions.reduce(
    (summary, item) => {
      summary[item.decision.decision] += 1;
      return summary;
    },
    { allow: 0, deny: 0, requires_admin_approval: 0, ask_critical_friend: 0 }
  );
}
