import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConversationMessage, PolicyDecision } from "@ptspace/shared";
import { HarnessPermissionRequest, PermissionPolicy } from "../policy/PermissionPolicy.js";
import {
  HarnessAdapter,
  HarnessAvailability,
  HarnessEvent,
  HarnessMessageResult,
  HarnessPolicySimulationResult,
  HarnessReviewResult,
  HarnessSession,
  HarnessTaskRequest,
  HarnessTaskResult,
  SendHarnessMessageInput
} from "./HarnessAdapter.js";
import {
  buildCriticalFriendPrompt,
  buildReviewPrompt,
  buildWorkerPrompt,
  type PromptContext
} from "./prompts.js";
import {
  guardUnsupportedClaims,
  normalizeOutput,
  parseReviewReply,
  toTeacherFacingReply
} from "./replyTranslation.js";
import {
  assertProjectDirectory,
  copyProjectForReview,
  diffSnapshots,
  safeRelativeOutputPath,
  snapshotProject
} from "./workspaceDiff.js";

export type OpenCodeRunnerKind = "docker" | "local";

export type OpenCodeDockerAdapterOptions = {
  enabled: boolean;
  policy: PermissionPolicy;
  runner: OpenCodeRunnerKind;
  dockerImage?: string;
  command: string;
  allowNetwork: boolean;
  timeoutMs: number;
  kernelDir?: string;
  kernelWriteEnabled?: boolean;
  kernelWritableDirs?: string[];
  model?: string;
  provider?: string;
  baseUrl?: string;
  openRouterApiKeyAvailable?: boolean;
  externalKernelContextEnabled?: boolean;
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

type DockerSecretMount = {
  tempDir: string;
  authFile: string;
};

function nowIso(): string {
  return new Date().toISOString();
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
    if (this.options.provider === "openrouter" && !this.options.openRouterApiKeyAvailable) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Für den OpenRouter-Test fehlt noch die freigegebene API-Key-Konfiguration."
      };
    }
    if (this.options.runner === "docker" && !this.options.dockerImage) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Für den geschützten Test fehlt noch das freigegebene opencode-Container-Image."
      };
    }
    const kernelStatus = await this.checkKernelAvailability();
    if (kernelStatus) return kernelStatus;
    if (this.options.provider === "openrouter" && !this.options.externalKernelContextEnabled) {
      return {
        status: "requires_admin_configuration",
        teacherFacingMessage: "Die pädagogische Engine ist verbunden, darf aber für externe Modellzugriffe noch nicht freigegeben werden."
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
    const projectDir = input.session.workspaceRoot;
    await assertProjectDirectory(projectDir, input.session.workspaceRoot);
    const before = await snapshotProject(projectDir);
    const secretMount = await this.prepareDockerSecretMount();
    
    // Use conversation context from input or read from file
    let conversationContext = input.conversationContext ?? "";
    if (!conversationContext) {
      try {
        const conversationSummaryPath = path.join(projectDir, "conversation-summary.md");
        conversationContext = await fs.readFile(conversationSummaryPath, "utf8");
      } catch {
        // Ignore if conversation summary does not exist yet
      }
    }
    
    let result: ProcessResult;
    try {
      const { command, args, cwd } = this.buildCommand(projectDir, input.message, secretMount, conversationContext);
      result = await this.runProcess(command, args, { cwd, timeoutMs: this.options.timeoutMs, env: process.env });
    } finally {
      if (secretMount) await fs.rm(secretMount.tempDir, { recursive: true, force: true });
    }
    const after = await snapshotProject(projectDir);
    const changedFiles = diffSnapshots(before, after);
    const stdout = normalizeOutput(result.stdout);
    const stderr = normalizeOutput(result.stderr);
    const reply = createReply(result, stdout, stderr);
    reply.text = guardUnsupportedClaims(reply.text, changedFiles);

    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: reply.text, createdAt: nowIso() },
      workspaceUpdates: [],
      events: [
        { type: "status", status: reply.ok ? "ready" : "failed", message: reply.text },
        ...changedFiles.map((relativePath): HarnessEvent => ({ type: "workspace_update", relativePath }))
      ]
    };
  }

  async requestTask(input: HarnessTaskRequest): Promise<HarnessTaskResult> {
    if (input.service !== "worker") throw new Error("unsupported_harness_task_service");
    if (input.capability !== "create_student_instruction" && input.capability !== "create_board_material") {
      throw new Error("unsupported_worker_capability");
    }
    const projectDir = input.session.workspaceRoot;
    await assertProjectDirectory(projectDir, input.session.workspaceRoot);
    const expectedPath = safeRelativeOutputPath(projectDir, input.expectedOutput.relativePath);
    const before = await snapshotProject(projectDir);
    const secretMount = await this.prepareDockerSecretMount();
    let result: ProcessResult;
    try {
      const prompt = this.workerPrompt(input);
      console.error(`WORKER PROMPT: ${JSON.stringify(prompt)}`);
      const { command, args, cwd } = this.buildRuntimeCommand(projectDir, prompt, secretMount);
      console.error(`DOCKER COMMAND ARGS: ${JSON.stringify(args)}`);
      result = await this.runProcess(command, args, { cwd, timeoutMs: this.options.timeoutMs, env: process.env });
    } finally {
      if (secretMount) await fs.rm(secretMount.tempDir, { recursive: true, force: true });
    }
    if (result.exitCode !== 0) {
      console.error(`Worker task failed. Exit code: ${result.exitCode}`);
      console.error(`STDOUT: ${result.stdout}`);
      console.error(`STDERR: ${result.stderr}`);
      throw new Error("worker_runtime_failed");
    }
    const after = await snapshotProject(projectDir);
    const changedFiles = diffSnapshots(before, after);
    if (!changedFiles.includes(expectedPath)) throw new Error("worker_did_not_produce_expected_output");
    return {
      summary: "Der Worker hat den angeforderten Entwurf im Planungsraum abgelegt.",
      workspaceUpdates: [],
      events: changedFiles.map((relativePath): HarnessEvent => ({ type: "workspace_update", relativePath }))
    };
  }

  async reviewTask(input: { session: HarnessSession; space: import("@ptspace/shared").PlanningSpace; capability: string; expectedOutput: { type: string; relativePath: string }; context: Record<string, unknown> }): Promise<HarnessReviewResult> {
    const projectDir = input.session.workspaceRoot;
    await assertProjectDirectory(projectDir, input.session.workspaceRoot);
    const temporaryParent = await fs.mkdtemp(path.join(os.tmpdir(), 'ptspace-review-workspace-'));
    const reviewProjectDir = path.join(temporaryParent, 'workspace');
    try {
      await copyProjectForReview(projectDir, reviewProjectDir);
      const expectedPath = safeRelativeOutputPath(reviewProjectDir, input.expectedOutput.relativePath);
    try {
      await fs.access(path.join(reviewProjectDir, expectedPath));
    } catch {
      return { status: "blocked", note: "Der zurückgekehrte Entwurf konnte für die fachliche Prüfung nicht geöffnet werden." };
    }

    // Die Prüfung darf nur lesen. Falls der Harness trotzdem schreibt, wird das
    // Ergebnis blockiert und nicht als fachliche Freigabe weitergereicht.
    const before = await snapshotProject(reviewProjectDir);
    const secretMount = await this.prepareDockerSecretMount();
    let result: ProcessResult;
    try {
      const prompt = this.reviewPrompt(input, expectedPath);
      const { command, args, cwd } = this.buildRuntimeCommand(reviewProjectDir, prompt, secretMount);
      result = await this.runProcess(command, args, { cwd, timeoutMs: this.options.timeoutMs, env: process.env });
    } finally {
      if (secretMount) await fs.rm(secretMount.tempDir, { recursive: true, force: true });
    }

    const changedFiles = diffSnapshots(before, await snapshotProject(reviewProjectDir));
    if (changedFiles.length > 0) {
      return { status: "blocked", note: "Die fachliche Prüfung hat den Planungsraum verändert und wurde deshalb nicht übernommen." };
    }
    if (result.exitCode !== 0) {
      return { status: "blocked", note: "Die fachliche Prüfung konnte noch nicht sicher abgeschlossen werden." };
    }
    return parseReviewReply(normalizeOutput(result.stdout)) ?? {
      status: "blocked",
      note: "Die fachliche Prüfung hat kein prüfbares Ergebnis geliefert."
    };
    } finally {
      await fs.rm(temporaryParent, { recursive: true, force: true });
    }
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

  private async checkKernelAvailability(): Promise<HarnessAvailability | undefined> {
    if (!this.options.kernelDir) {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Die pädagogische Engine ist für diese Ausführungsstufe noch nicht verbunden."
      };
    }
    try {
      await fs.access(path.join(this.options.kernelDir, "AGENTS.md"));
      await fs.access(path.join(this.options.kernelDir, "CRITICAL_FRIEND.de.md"));
      await fs.access(path.join(this.options.kernelDir, "LEARNING_DESIGN.de.md"));
      await fs.access(path.join(this.options.kernelDir, "ORCHESTRATION.md"));
      await fs.access(path.join(this.options.kernelDir, "capabilities", "workers", "CREATE_STUDENT_INSTRUCTION.md"));
      await fs.access(path.join(this.options.kernelDir, "capabilities", "workers", "CREATE_BOARD_MATERIAL.md"));
    } catch {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Die pädagogische Engine ist für diese Ausführungsstufe noch nicht vollständig verfügbar."
      };
    }
    return undefined;
  }

  private buildCommand(projectDir: string, message: string, secretMount?: DockerSecretMount, conversationContext?: string): { command: string; args: string[]; cwd: string } {
    const promptContext = this.promptContext();
    const guardedMessage = buildCriticalFriendPrompt(message, promptContext, conversationContext);
    return this.buildRuntimeCommand(projectDir, guardedMessage, secretMount);
  }

  private workerPrompt(input: HarnessTaskRequest): string {
    return buildWorkerPrompt(input, this.promptContext());
  }

  private reviewPrompt(input: { capability: string; expectedOutput: { type: string; relativePath: string }; context: Record<string, unknown> }, expectedPath: string): string {
    return buildReviewPrompt(input, expectedPath);
  }

  private promptContext(): PromptContext {
    return {
      kernelReferencePath: this.kernelReferencePath(),
      kernelWritableDescription: this.kernelWritableDescription()
    };
  }

  private buildRuntimeCommand(
    projectDir: string,
    prompt: string,
    secretMount?: DockerSecretMount,
    allowNetwork = this.options.allowNetwork
  ): { command: string; args: string[]; cwd: string } {
    const modelArgs = this.options.model ? ["--model", this.options.model] : [];
    if (this.options.runner === "docker") {
      return {
        command: "docker",
        cwd: projectDir,
        args: [
          "run",
          "--rm",
          allowNetwork ? "--network=bridge" : "--network=none",
          "--volume",
          `${projectDir}:/workspace`,
          "--workdir",
          "/workspace",
          ...this.kernelDockerArgs(),
          ...this.dockerSecretArgs(secretMount),
          this.options.dockerImage ?? "",
          "run",
          "--pure",
          "--auto",
          "--format",
          "json",
          "--dir",
          "/workspace",
          ...modelArgs,
          prompt
        ]
      };
    }
    return {
      command: this.options.command,
      cwd: projectDir,
      args: ["run", "--pure", "--auto", "--format", "json", "--dir", projectDir, ...modelArgs, prompt]
    };
  }

  private async prepareDockerSecretMount(): Promise<DockerSecretMount | undefined> {
    if (this.options.runner !== "docker") return undefined;
    if (this.options.provider !== "openrouter" || !this.options.openRouterApiKeyAvailable) return undefined;
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return undefined;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-opencode-auth-"));
    const authFile = path.join(tempDir, "auth.json");
    await fs.writeFile(authFile, JSON.stringify({ openrouter: { type: "api", key } }), "utf8");
    return { tempDir, authFile };
  }

  private kernelReferencePath(): string {
    if (this.options.runner === "docker") return "/ptspace-kernel";
    return this.options.kernelDir ?? "pedagogical-thinking-space";
  }

  private kernelDockerArgs(): string[] {
    if (this.options.runner !== "docker" || !this.options.kernelDir) return [];
    const args = ["--volume", `${this.options.kernelDir}:/ptspace-kernel:ro`];
    if (!this.options.kernelWriteEnabled) return args;
    for (const relativeDir of this.kernelWritableDirs()) {
      args.push("--volume", `${path.join(this.options.kernelDir, relativeDir)}:/ptspace-kernel/${relativeDir}:rw`);
    }
    return args;
  }

  private kernelWritableDirs(): string[] {
    return (this.options.kernelWritableDirs ?? []).filter((entry) => /^[a-zA-Z0-9_-]+$/.test(entry));
  }

  private kernelWritableDescription(): string {
    if (!this.options.kernelWriteEnabled) return "keine im aktuellen Lauf";
    const dirs = this.kernelWritableDirs();
    return dirs.length ? dirs.map((entry) => `/ptspace-kernel/${entry}`).join(", ") : "keine im aktuellen Lauf";
  }

  private dockerSecretArgs(secretMount?: DockerSecretMount): string[] {
    if (!secretMount) return [];
    return ["--volume", `${secretMount.authFile}:/root/.local/share/opencode/auth.json:ro`];
  }

  private createSimulationRequests(workspaceRoot: string): HarnessPermissionRequest[] {
    return [
      {
        type: "file",
        file: { workspaceRoot, targetPath: path.join(workspaceRoot, "learning-design.md"), operation: "write" }
      },
      {
        type: "file",
        file: { workspaceRoot, targetPath: path.join(workspaceRoot, "..", "outside.txt"), operation: "read" }
      },
      { type: "command", command: "opencode run" },
      { type: "network", url: "https://example.invalid" },
      { type: "secret", name: "OPENROUTER_API_KEY" },
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

function createReply(result: ProcessResult, stdout: string, _stderr: string): { ok: boolean; text: string } {
  if (result.exitCode !== 0) {
    return {
      ok: false,
      text: "Die geschützte Testausführung konnte noch nicht abgeschlossen werden. Die Runtime ist erreichbar, braucht aber eine freigegebene Modell- und Provider-Konfiguration."
    };
  }
  const text = toTeacherFacingReply(extractPlainReply(stdout));
  if (text) return { ok: true, text };
  return {
    ok: false,
    text: "Die geschützte Testausführung hat keine fachliche Antwort geliefert. Ich breche hier ab, statt einen Denkstand nur scheinbar zu aktualisieren."
  };
}

function extractPlainReply(stdout: string): string {
  const text = stdout.trim();
  if (!text || text.startsWith("<") || text.includes("<!DOCTYPE html")) return "";
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { text?: string; message?: string; type?: string; part?: { text?: string; type?: string } };
      const candidate = parsed.text ?? parsed.message ?? parsed.part?.text;
      const eventType = parsed.part?.type ?? parsed.type;
      if (candidate && eventType !== "debug") return candidate;
    } catch {
      // JSON event streams may contain non-message lines; fall back below.
    }
  }
  return lines.find((line) => !line.startsWith("{") && !line.startsWith("[")) ?? "";
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
