import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import { PlanningSpaceStore } from "./storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "./services/workspace/WorkspaceManager.js";
import { MockHarnessAdapter } from "./services/harness/MockHarnessAdapter.js";
import { GitManager } from "./services/git/GitManager.js";
import { planningSpaceRoutes } from "./routes/planningSpaces.js";
import { conversationRoutes } from "./routes/conversation.js";
import { thinkingStateRoutes } from "./routes/thinkingState.js";
import { exportRoutes } from "./routes/exports.js";
import { ExportFilter } from "./services/export/ExportFilter.js";

export async function buildApp() {
  const config = loadConfig();
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.mkdir(config.workspacesDir, { recursive: true });

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const store = new PlanningSpaceStore(config.dataDir);
  const workspace = new WorkspaceManager(config.workspacesDir);
  const harness = new MockHarnessAdapter();
  const git = new GitManager();
  const exportFilter = new ExportFilter();

  app.get("/health", async () => ({ status: "ok", harness: harness.mode }));
  await app.register(planningSpaceRoutes, { prefix: "/api", store, workspace, git });
  await app.register(conversationRoutes, { prefix: "/api", store, workspace, git, harness });
  await app.register(thinkingStateRoutes, { prefix: "/api", store, workspace });
  await app.register(exportRoutes, { prefix: "/api", store, workspace, exportFilter });

  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = loadConfig();
  const app = await buildApp();
  await app.listen({ port: config.port, host: "0.0.0.0" });
}
