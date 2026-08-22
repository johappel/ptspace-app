import fs from "node:fs/promises";
import path from "node:path";

// Harness-unabhängige Workspace-Beobachtung: Snapshot/Diff zur Änderungserkennung,
// Pfad-Guard für Worker-Outputs und isolierte Kopie für die fachliche Prüfung.

export type FileSnapshot = Map<string, string>;

export function safeRelativeOutputPath(workspaceRoot: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const target = path.resolve(workspaceRoot, normalized);
  const relative = path.relative(path.resolve(workspaceRoot), target).replace(/\\/g, "/");
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("worker_output_outside_workspace");
  return relative;
}

export async function assertProjectDirectory(projectDir: string, workspaceRoot: string): Promise<void> {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedProject = path.resolve(projectDir);
  if (resolvedProject !== resolvedRoot) throw new Error("opencode_project_dir_must_be_workspace_root");
  await fs.access(resolvedProject);
}

export async function snapshotProject(projectDir: string): Promise<FileSnapshot> {
  const snapshot: FileSnapshot = new Map();
  await collectFiles(projectDir, projectDir, snapshot);
  return snapshot;
}

export async function copyProjectForReview(sourceDir: string, targetDir: string): Promise<void> {
  await fs.cp(sourceDir, targetDir, {
    recursive: true,
    filter: (entry) => {
      const name = path.basename(entry);
      return name !== '.git' && name !== 'node_modules';
    }
  });
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
    // Workspace-Änderungserkennung über Größe + mtime statt vollständigem
    // UTF-8-Inhalt (ARCHITECTURE-SESSION-MODEL Abschnitt 13, TASK 9).
    // Das vermeidet das vollständige Einlesen von Binärdateien und ist schneller.
    const stat = await fs.stat(fullPath);
    snapshot.set(relativePath, `${stat.size}:${Math.floor(stat.mtimeMs)}`);
  }
}

export function diffSnapshots(before: FileSnapshot, after: FileSnapshot): string[] {
  const changed = new Set<string>();
  for (const [file, fingerprint] of after) {
    if (before.get(file) !== fingerprint) changed.add(file);
  }
  for (const file of before.keys()) {
    if (!after.has(file)) changed.add(file);
  }
  return [...changed].sort();
}
