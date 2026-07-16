import { describe, expect, it } from "vitest";
import { DockerContainerPool, PoolProcessResult } from "../src/services/harness/DockerContainerPool.js";

type Call = { command: string; args: string[] };

function fakeRunner(handlers?: {
  onRun?: () => PoolProcessResult;
  onInspect?: () => PoolProcessResult;
}) {
  const calls: Call[] = [];
  let containerCounter = 0;
  const runner = async (command: string, args: string[]): Promise<PoolProcessResult> => {
    calls.push({ command, args });
    const verb = args[0];
    if (verb === "run") {
      if (handlers?.onRun) return handlers.onRun();
      containerCounter += 1;
      return { exitCode: 0, stdout: `container-${containerCounter}\n`, stderr: "" };
    }
    if (verb === "inspect") {
      if (handlers?.onInspect) return handlers.onInspect();
      return { exitCode: 0, stdout: "true\n", stderr: "" };
    }
    if (verb === "exec") return { exitCode: 0, stdout: "ok", stderr: "" };
    if (verb === "stop") return { exitCode: 0, stdout: "", stderr: "" };
    return { exitCode: 0, stdout: "", stderr: "" };
  };
  return { runner, calls };
}

describe("DockerContainerPool", () => {
  it("starts a container once and reuses it for the same workspace", async () => {
    const { runner, calls } = fakeRunner();
    const pool = new DockerContainerPool({ image: "opencode:test", runProcess: runner, clock: () => 0 });

    const first = await pool.exec("/workspaces/space-1", ["echo", "hi"]);
    const second = await pool.exec("/workspaces/space-1", ["echo", "ho"]);

    expect(first.containerId).toBe("container-1");
    expect(second.containerId).toBe("container-1");
    expect(calls.filter((call) => call.args[0] === "run")).toHaveLength(1);
    expect(pool.size).toBe(1);
  });

  it("starts separate containers per workspace and mounts read-only network isolation", async () => {
    const { runner, calls } = fakeRunner();
    const pool = new DockerContainerPool({ image: "opencode:test", runProcess: runner, clock: () => 0 });

    await pool.exec("/workspaces/space-1", ["echo"]);
    await pool.exec("/workspaces/space-2", ["echo"]);

    expect(pool.size).toBe(2);
    const runCall = calls.find((call) => call.args[0] === "run");
    expect(runCall?.args).toContain("--network");
    expect(runCall?.args).toContain("none");
    expect(runCall?.args.join(" ")).toContain("/workspaces/space-1:/workspace");
  });

  it("reaps idle containers after the timeout", async () => {
    let now = 0;
    const { runner, calls } = fakeRunner();
    const pool = new DockerContainerPool({
      image: "opencode:test",
      runProcess: runner,
      idleTimeoutMs: 1000,
      clock: () => now
    });

    await pool.exec("/workspaces/space-1", ["echo"]);
    now = 5000;
    const stopped = await pool.reapIdle();

    expect(stopped).toEqual(["container-1"]);
    expect(pool.size).toBe(0);
    expect(calls.some((call) => call.args[0] === "stop")).toBe(true);
  });

  it("replaces a container that is no longer running", async () => {
    let running = true;
    const { runner } = fakeRunner({ onInspect: () => ({ exitCode: 0, stdout: running ? "true\n" : "false\n", stderr: "" }) });
    const pool = new DockerContainerPool({ image: "opencode:test", runProcess: runner, clock: () => 0 });

    const first = await pool.exec("/workspaces/space-1", ["echo"]);
    running = false;
    const second = await pool.exec("/workspaces/space-1", ["echo"]);

    expect(first.containerId).toBe("container-1");
    expect(second.containerId).toBe("container-2");
  });

  it("throws a descriptive error when the container fails to start", async () => {
    const { runner } = fakeRunner({ onRun: () => ({ exitCode: 1, stdout: "", stderr: "no daemon" }) });
    const pool = new DockerContainerPool({ image: "opencode:test", runProcess: runner, clock: () => 0 });
    await expect(pool.exec("/workspaces/space-1", ["echo"])).rejects.toThrow(/docker_container_start_failed/);
  });
});
