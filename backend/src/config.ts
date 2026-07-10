import fs from "node:fs";
import path from "node:path";

export type HarnessKind = "mock" | "opencode-docker";
export type OpenCodeRunnerKind = "docker" | "local";

export type AppConfig = {
  port: number;
  dataDir: string;
  workspacesDir: string;
  planningWorkspacesDir: string;
  kernelDir: string;
  kernelWriteEnabled: boolean;
  kernelWritableDirs: string[];
  harness: HarnessKind;
  realHarnessEnabled: boolean;
  openCode: {
    runner: OpenCodeRunnerKind;
    dockerImage: string;
    command: string;
    allowNetwork: boolean;
    timeoutMs: number;
    provider: string;
    baseUrl: string;
    model?: string;
    openRouterApiKeyAvailable: boolean;
    externalKernelContextEnabled: boolean;
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

function loadDotEnv(root: string): void {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function booleanEnv(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function normalizedModel(provider: string, model?: string): string | undefined {
  if (!model) return undefined;
  // opencode 1.17.13 has built-in providers (opencode/*) that do not need a
  // provider prefix and do not use external providers like openrouter.
  if (model.includes("/")) return model;
  return `${provider}/${model}`;
}

export function loadConfig(): AppConfig {
  const root = findProjectRoot(process.cwd());
  loadDotEnv(root);
  const configuredModel = process.env.PTSPACE_OPENCODE_MODEL;
  // opencode 1.17.13 uses built-in providers (opencode/*) and does not support
  // external providers like openrouter. Derive the provider from the model.
  const provider = configuredModel?.startsWith("opencode/")
    ? "opencode"
    : process.env.PTSPACE_OPENCODE_PROVIDER ?? "openrouter";

  const kernelDir = path.resolve(root, process.env.PTSPACE_KERNEL_DIR ?? "../pedagogical-thinking-space");
  return {
    port: Number(process.env.PORT ?? 5174),
    dataDir: path.resolve(root, process.env.PTSPACE_DATA_DIR ?? "backend/data"),
    workspacesDir: path.resolve(root, process.env.PTSPACE_WORKSPACES_DIR ?? "backend/workspaces"),
    planningWorkspacesDir: path.resolve(
      root,
      process.env.PTSPACE_PLANNING_WORKSPACES_DIR ?? path.join(kernelDir, "workspace")
    ),
    kernelDir,
    kernelWriteEnabled: booleanEnv("PTSPACE_KERNEL_WRITE_ENABLED", false),
    kernelWritableDirs: (process.env.PTSPACE_KERNEL_WRITABLE_DIRS ?? "capabilities,knowledge,queue,services,workspace").split(",").map((entry) => entry.trim()).filter(Boolean),
    harness: (process.env.PTSPACE_HARNESS as HarnessKind | undefined) ?? "mock",
    realHarnessEnabled: booleanEnv("PTSPACE_REAL_HARNESS_ENABLED", false),
    openCode: {
      runner: (process.env.PTSPACE_OPENCODE_RUNNER as OpenCodeRunnerKind | undefined) ?? "docker",
      dockerImage: process.env.PTSPACE_OPENCODE_DOCKER_IMAGE ?? "ptspace/opencode-test:1.17.13",
      command: process.env.PTSPACE_OPENCODE_COMMAND ?? "opencode",
      allowNetwork: booleanEnv("PTSPACE_OPENCODE_ALLOW_NETWORK", false),
      timeoutMs: Number(process.env.PTSPACE_OPENCODE_TIMEOUT_MS ?? 120000),
      provider,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      model: normalizedModel(provider, process.env.PTSPACE_OPENCODE_MODEL),
      openRouterApiKeyAvailable: Boolean(process.env.OPENROUTER_API_KEY),
      externalKernelContextEnabled: booleanEnv("PTSPACE_EXTERNAL_KERNEL_CONTEXT_ENABLED", false)
    }
  };
}
