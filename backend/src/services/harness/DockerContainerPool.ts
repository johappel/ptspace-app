/**
 * Docker Container Pool (CHAT-PERFORMANCE-TASKS TASK 8).
 *
 * Statt für jede Nachricht `docker run --rm` zu starten (Container-Cold-Start
 * pro Turn), hält der Pool langlebige Container pro Workspace vor und führt
 * Befehle per `docker exec` aus. Inaktive Container werden nach einem Timeout
 * gestoppt.
 *
 * Sicherheit (AGENTS.md, Abschnitt 7): Der Pool installiert keine Runtime,
 * verändert keine Images und mountet ausschließlich das übergebene
 * Workspace-Verzeichnis. Er entscheidet keine Policies – das bleibt Aufgabe des
 * Backends. Der ProcessRunner ist injizierbar, damit die Lebenszyklus-Logik
 * ohne echten Docker-Daemon testbar ist.
 */

export type PoolProcessResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

export type PoolProcessRunner = (
  command: string,
  args: string[],
  options: { timeoutMs: number; env?: NodeJS.ProcessEnv }
) => Promise<PoolProcessResult>;

export type DockerContainerPoolOptions = {
  image: string;
  runProcess: PoolProcessRunner;
  allowNetwork?: boolean;
  idleTimeoutMs?: number;
  startTimeoutMs?: number;
  execTimeoutMs?: number;
  maxContainers?: number;
  clock?: () => number;
  /** Zusätzliche `docker run`-Argumente (z. B. read-only Kernel-Mounts). */
  extraRunArgs?: string[];
};

export type PooledContainer = {
  containerId: string;
  workspaceRoot: string;
  createdAtMs: number;
  lastUsedAtMs: number;
  busy: boolean;
};

export type ExecResult = PoolProcessResult & { containerId: string };

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_START_TIMEOUT_MS = 60 * 1000;
const DEFAULT_EXEC_TIMEOUT_MS = 120 * 1000;
const DEFAULT_MAX_CONTAINERS = 8;

export class DockerContainerPool {
  private readonly containers = new Map<string, PooledContainer>();
  private readonly image: string;
  private readonly runProcess: PoolProcessRunner;
  private readonly allowNetwork: boolean;
  private readonly idleTimeoutMs: number;
  private readonly startTimeoutMs: number;
  private readonly execTimeoutMs: number;
  private readonly maxContainers: number;
  private readonly clock: () => number;
  private readonly extraRunArgs: string[];

  constructor(options: DockerContainerPoolOptions) {
    this.image = options.image;
    this.runProcess = options.runProcess;
    this.allowNetwork = options.allowNetwork ?? false;
    this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.startTimeoutMs = options.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS;
    this.execTimeoutMs = options.execTimeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS;
    this.maxContainers = options.maxContainers ?? DEFAULT_MAX_CONTAINERS;
    this.clock = options.clock ?? (() => Date.now());
    this.extraRunArgs = options.extraRunArgs ?? [];
  }

  /** Führt einen Befehl im (bei Bedarf neu gestarteten) Container des Workspaces aus. */
  async exec(workspaceRoot: string, command: string[], env?: NodeJS.ProcessEnv): Promise<ExecResult> {
    await this.reapIdle();
    const container = await this.acquire(workspaceRoot);
    container.busy = true;
    try {
      const result = await this.runProcess(
        "docker",
        ["exec", "-w", "/workspace", container.containerId, ...command],
        { timeoutMs: this.execTimeoutMs, env }
      );
      container.lastUsedAtMs = this.clock();
      return { ...result, containerId: container.containerId };
    } finally {
      container.busy = false;
    }
  }

  private async acquire(workspaceRoot: string): Promise<PooledContainer> {
    const existing = this.containers.get(workspaceRoot);
    if (existing && (await this.isRunning(existing.containerId))) {
      existing.lastUsedAtMs = this.clock();
      return existing;
    }
    if (existing) this.containers.delete(workspaceRoot);
    await this.enforceCapacity();
    return this.start(workspaceRoot);
  }

  private async start(workspaceRoot: string): Promise<PooledContainer> {
    const networkArgs = this.allowNetwork ? [] : ["--network", "none"];
    const args = [
      "run",
      "-d",
      "--rm",
      ...networkArgs,
      "-v",
      `${workspaceRoot}:/workspace`,
      ...this.extraRunArgs,
      this.image,
      "sleep",
      "infinity"
    ];
    const result = await this.runProcess("docker", args, { timeoutMs: this.startTimeoutMs });
    if (result.exitCode !== 0) {
      throw new Error(`docker_container_start_failed: ${result.stderr.trim() || result.exitCode}`);
    }
    const containerId = result.stdout.trim().split(/\s+/).pop() ?? "";
    if (!containerId) throw new Error("docker_container_start_no_id");
    const now = this.clock();
    const container: PooledContainer = {
      containerId,
      workspaceRoot,
      createdAtMs: now,
      lastUsedAtMs: now,
      busy: false
    };
    this.containers.set(workspaceRoot, container);
    return container;
  }

  private async isRunning(containerId: string): Promise<boolean> {
    const result = await this.runProcess(
      "docker",
      ["inspect", "-f", "{{.State.Running}}", containerId],
      { timeoutMs: this.startTimeoutMs }
    );
    return result.exitCode === 0 && result.stdout.trim() === "true";
  }

  private async enforceCapacity(): Promise<void> {
    if (this.containers.size < this.maxContainers) return;
    const idle = [...this.containers.values()]
      .filter((container) => !container.busy)
      .sort((a, b) => a.lastUsedAtMs - b.lastUsedAtMs);
    const victim = idle[0];
    if (victim) await this.stop(victim.workspaceRoot);
  }

  /** Stoppt Container, deren Leerlaufzeit das Timeout überschreitet. */
  async reapIdle(): Promise<string[]> {
    const now = this.clock();
    const stopped: string[] = [];
    for (const [workspaceRoot, container] of [...this.containers]) {
      if (container.busy) continue;
      if (now - container.lastUsedAtMs > this.idleTimeoutMs) {
        await this.stop(workspaceRoot);
        stopped.push(container.containerId);
      }
    }
    return stopped;
  }

  async stop(workspaceRoot: string): Promise<void> {
    const container = this.containers.get(workspaceRoot);
    if (!container) return;
    this.containers.delete(workspaceRoot);
    try {
      await this.runProcess("docker", ["stop", "-t", "2", container.containerId], {
        timeoutMs: this.startTimeoutMs
      });
    } catch {
      // Container ist möglicherweise bereits beendet – kein harter Fehler.
    }
  }

  /** Stoppt alle Container (sauberes Shutdown). */
  async shutdown(): Promise<void> {
    await Promise.all([...this.containers.keys()].map((workspaceRoot) => this.stop(workspaceRoot)));
  }

  get size(): number {
    return this.containers.size;
  }
}
