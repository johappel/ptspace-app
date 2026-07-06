import fs from "node:fs";
import path from "node:path";

export type AppConfig = {
  port: number;
  dataDir: string;
  workspacesDir: string;
  harness: "mock";
};

function findProjectRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function loadConfig(): AppConfig {
  const root = findProjectRoot(process.cwd());
  return {
    port: Number(process.env.BACKEND_PORT ?? 5174),
    dataDir: path.resolve(root, process.env.PTSPACE_DATA_DIR ?? ".ptspace-data"),
    workspacesDir: path.resolve(root, process.env.PTSPACE_WORKSPACES_DIR ?? "workspaces"),
    harness: "mock"
  };
}