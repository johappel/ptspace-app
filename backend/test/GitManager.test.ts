import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GitManager } from "../src/services/git/GitManager.js";

const execFileAsync = promisify(execFile);

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-git-test-"));
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("GitManager", () => {
  it("initializes an own repository inside a path ignored by the outer repository", async () => {
    await execFileAsync("git", ["init"], { cwd: tempRoot });
    await fs.writeFile(path.join(tempRoot, ".gitignore"), "workspaces/\n", "utf8");

    const workspaceRoot = path.join(tempRoot, "workspaces", "space-1");
    await fs.mkdir(path.join(workspaceRoot, "project"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "project", "learning-design.md"), "# Denkstand\n", "utf8");

    const manager = new GitManager();
    const snapshot = await manager.saveVersion(workspaceRoot, "Planungsraum angelegt");
    const topLevel = (await execFileAsync("git", ["rev-parse", "--show-toplevel"], { cwd: workspaceRoot })).stdout.trim();

    expect(path.resolve(topLevel)).toBe(path.resolve(workspaceRoot));
    expect(snapshot.committed).toBe(true);
    expect(await manager.latestVersionLabel(workspaceRoot)).toBe("Planungsraum angelegt");
  });
});