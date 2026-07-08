import fs from "node:fs";
import path from "node:path";

export type HarnessKind = "mock" | "opencode-docker";
export type OpenCodeRunnerKind = "docker" | "local";

export type AppConfig = {
  port: number;
  dataDir: string;
  workspacesDir: string;
  harness: HarnessKind;
  realHarnessEnabled: boolean;
  openCode: {
    runner: OpenCodeRunnerKind;
    dockerImage: string;
    command: string;
    allowNetwork: boolean;
    timeoutMs: number;
    model?: string;
  };
};

function findProjectRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(startDir);
    current = parent;
  }
}

function booleanEnv(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function loadConfig(): AppConfig {
  const root = findProjectRoot(process.cwd());
  return {
    port: Number(process.env.BACKEND_PORT ?? 5174),
    dataDir: path.resolve(root, process.env.PTSPACE_DATA_DIR ?? ".ptspace-data"),
    workspacesDir: path.resolve(root, process.env.PTSPACE_WORKSPACES_DIR ?? "workspaces"),
    harness: (process.env.PTSPACE_HARNESS as HarnessKind | undefined) ?? "mock",
    realHarnessEnabled: booleanEnv("PTSPACE_REAL_HARNESS_ENABLED"),
    openCode: {
      runner: (process.env.PTSPACE_OPENCODE_RUNNER as OpenCodeRunnerKind | undefined) ?? "docker",
      dockerImage: process.env.PTSPACE_OPENCODE_DOCKER_IMAGE ?? "",
      command: process.env.PTSPACE_OPENCODE_COMMAND ?? "opencode",
      allowNetwork: booleanEnv("PTSPACE_OPENCODE_ALLOW_NETWORK"),
      timeoutMs: Number(process.env.PTSPACE_OPENCODE_TIMEOUT_MS ?? 120000),
      model: process.env.PTSPACE_OPENCODE_MODEL || undefined
    }
  };
}
