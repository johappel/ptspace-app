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
    } catch {
      return {
        status: "requires_setup",
        teacherFacingMessage: "Die pädagogische Engine ist für diese Ausführungsstufe noch nicht vollständig verfügbar."
      };
    }
    return undefined;
  }

  private buildCommand(projectDir: string, message: string, secretMount?: DockerSecretMount, conversationContext?: string): { command: string; args: string[]; cwd: string } {
    const criticalFriendInstructions = `
## CRITICAL FRIEND – ROLLE UND HALTUNG

Du bist der Critical Friend in einem pädagogischen Denkraum.

### Deine Aufgabe
- Begleite die Lehrkraft in professionellem pädagogischem Denken
- Halte Denkprozesse sichtbar und strukturiert
- Fasse zusammen, markiere Dissens, hebe offene Entscheidungen hervor
- Schütze vor vorschneller Produktion und unreflektierten Entscheidungen

### Deine Haltung
- Kollegial, ruhig, erfahren
- Nicht: technischer Agent, Materialgenerator, Chatbot
- Sprich aus dem Schulalltag, nicht aus Agenten-/IT-Logik
- Keine generische KI-Floskeln

### Was du fragst und moderierst
✓ pädagogische Intention und Sinn
✓ Lernprozesse und -momente
✓ Zielgruppe und Kontexte
✓ Entscheidungen und Begründungen
✓ offene Fragen und Unsicherheiten
✓ Ton, Freigabe, Unterrichtseinsatz

### Was du NICHT fragst oder tust
✗ technische Risks und Permissions
✗ Shell-, Docker-, Paketbefehle
✗ API-Keys, Tokens, Secrets
✗ Provider-Freigaben
✗ Installation oder System-Konfiguration

### Sprache und Begriffe
- Nutze: Gespräch, Denkstand, Entscheidung, Entwurf, Material, Lernreise
- Nicht: Task, Agent, Render, Artifact, Service Request, Repository, Branch
- Nicht: "Soll ich das installieren?", "Docker ausführen?", "pip install?"

### Konversation führen
- Immer nur EIN sinnvoller nächster Schritt
- Keine Listenflut, keine Automationsvorschläge
- Behalte Kontext und Konsistenz
- Erkenne, wenn die Lehrkraft sich wiederholt oder widerspricht
`;

    const guardedMessage = [
      criticalFriendInstructions,
      "",
      "Arbeite ausschließlich im aktuellen Planungsraum.",
      `Nutze den pädagogischen Kernel als Engine-Kontext: ${this.kernelReferencePath()}.`,
      `Lies dort zuerst AGENTS.md, CRITICAL_FRIEND.de.md, LEARNING_DESIGN.de.md und ORCHESTRATION.md.`,
      `Beschreibbare Kernel-Arbeitsbereiche: ${this.kernelWritableDescription()}. Änderungen dort benötigen weiterhin den vorgesehenen Freigabe-Workflow.`,
      "Speichere keine personenbezogenen Daten, Secrets, Tokens oder technischen Logs.",
      "Wenn sich der pädagogische Denkstand verändert, aktualisiere vor deiner Antwort die passenden Dateien im aktuellen Planungsraum: learning-design.md, decisions.md, open-questions.md und next-steps.md.",
      "Sage nur, etwas sei festgehalten oder aktualisiert, wenn du die entsprechende Datei in diesem Lauf tatsächlich geändert hast.",
      "Behaupte keine Recherche oder Lehrplanprüfung ohne einen quellengeprüften Knowledge-Auftrag. Formuliere Modellwissen ausdrücklich als vorläufige Einordnung.",
      "Antworte knapp als Critical Friend in pädagogischer Sprache. Nenne keine Dateinamen, Pfade, Markdown-Dateien, technischen Werkzeuge oder Provider.",
      ...(conversationContext ? ["", "Bisheriger Gesprächskontext:", conversationContext] : []),
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
          guardedMessage
        ]
      };
    }
    return {
      command: this.options.command,
      cwd: projectDir,
      args: ["run", "--pure", "--auto", "--format", "json", "--dir", projectDir, ...modelArgs, guardedMessage]
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

async function assertProjectDirectory(projectDir: string, workspaceRoot: string): Promise<void> {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedProject = path.resolve(projectDir);
  if (resolvedProject !== resolvedRoot) throw new Error("opencode_project_dir_must_be_workspace_root");
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

function guardUnsupportedClaims(reply: string, changedFiles: string[]): string {
  const stateWasWritten = changedFiles.some((file) =>
    ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"].includes(file)
  );
  const knowledgeWasWritten = changedFiles.some((file) =>
    file.startsWith("knowledge-proposals/") || file.startsWith("service-requests/")
  );
  const claimsPersistence = /(?:denkstand|entscheidung|schritt).{0,40}(?:festgehalten|gespeichert|aktualisiert)/i.test(reply);
  const makesKnowledgeClaim = /(?:kernlehrplan|lehrplanbezug|curriculum|\bIF\s?\d)/i.test(reply);
  const notes: string[] = [];
  if (claimsPersistence && !stateWasWritten) {
    notes.push("Hinweis: Dieser Gedanke wurde im Gespräch formuliert, aber technisch noch nicht dauerhaft im Denkstand gespeichert.");
  }
  if (makesKnowledgeClaim && !knowledgeWasWritten) {
    notes.push("Hinweis: Die Lehrplaneinordnung ist noch nicht durch einen Knowledge-Auftrag mit überprüfbaren Quellen abgesichert.");
  }
  return notes.length ? [reply, ...notes].join("\n\n") : reply;
}

function toTeacherFacingReply(reply: string): string {
  return reply
    .replace(/`?(learning-design|conversation-summary)\.md`?/gi, "den Denkstand")
    .replace(/`?next-steps\.md`?/gi, "die nächsten Schritte")
    .replace(/`?open-questions\.md`?/gi, "die offenen Fragen")
    .replace(/`?decisions\.md`?/gi, "die offenen Entscheidungen")
    .replace(/`?service-requests?\/?`?/gi, "")
    .replace(/`?opencode`?/gi, "")
    .replace(/`?\/workspace\/?`?/gi, "")
    .replace(/`?\/ptspace-kernel\/?`?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
