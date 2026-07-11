import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type VersionSnapshot = {
  label: string;
  committed: boolean;
  hash?: string;
};

export type VersionHistoryEntry = { label: string; hash: string; createdAt: string };

export class GitManager {
  async ensureRepository(workspaceRoot: string): Promise<void> {
    if (!(await this.isOwnRepository(workspaceRoot))) {
      await this.git(workspaceRoot, ["init"]);
      await this.git(workspaceRoot, ["config", "user.name", "ptspace-app"]);
      await this.git(workspaceRoot, ["config", "user.email", "ptspace-app@example.invalid"]);
    }
  }

  async saveVersion(workspaceRoot: string, label: string): Promise<VersionSnapshot> {
    await this.ensureRepository(workspaceRoot);
    await this.git(workspaceRoot, ["add", "--", "."]);
    const changed = await this.hasStagedChanges(workspaceRoot);
    if (!changed) {
      return { label, committed: false };
    }
    await this.git(workspaceRoot, ["commit", "-m", label]);
    const hash = (await this.git(workspaceRoot, ["rev-parse", "--short", "HEAD"])).trim();
    return { label, committed: true, hash };
  }

  async latestVersionLabel(workspaceRoot: string): Promise<string | null> {
    if (!(await this.isOwnRepository(workspaceRoot))) return null;
    try {
      return (await this.git(workspaceRoot, ["log", "-1", "--pretty=%s"])).trim() || null;
    } catch {
      return null;
    }
  }

  async listVersions(workspaceRoot: string, limit = 12): Promise<VersionHistoryEntry[]> {
    if (!(await this.isOwnRepository(workspaceRoot))) return [];
    try {
      const output = await this.git(workspaceRoot, ["log", `-${limit}`, "--pretty=format:%h%x1f%aI%x1f%s"]);
      return output.split("\n").filter(Boolean).map((line) => { const [hash, createdAt, label] = line.split("\u001f"); return { hash, createdAt, label }; });
    } catch { return []; }
  }

  private async isOwnRepository(workspaceRoot: string): Promise<boolean> {
    try {
      const topLevel = (await this.git(workspaceRoot, ["rev-parse", "--show-toplevel"])).trim();
      return path.resolve(topLevel) === path.resolve(workspaceRoot);
    } catch {
      return false;
    }
  }

  private async hasStagedChanges(workspaceRoot: string): Promise<boolean> {
    try {
      await this.git(workspaceRoot, ["diff", "--cached", "--quiet"]);
      return false;
    } catch {
      return true;
    }
  }

  private async git(cwd: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("git", args, { cwd });
    return stdout;
  }
}
