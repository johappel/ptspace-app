import path from "node:path";

export type AppConfig = {
  port: number;
  dataDir: string;
  workspacesDir: string;
  harness: "mock";
};

export function loadConfig(): AppConfig {
  const root = process.cwd();
  return {
    port: Number(process.env.BACKEND_PORT ?? 5174),
    dataDir: path.resolve(root, process.env.PTSPACE_DATA_DIR ?? ".ptspace-data"),
    workspacesDir: path.resolve(root, process.env.PTSPACE_WORKSPACES_DIR ?? "workspaces"),
    harness: "mock"
  };
}
