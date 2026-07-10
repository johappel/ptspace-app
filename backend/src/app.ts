import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import { PlanningSpaceStore } from "./storage/PlanningSpaceStore.js";
import { ExportApprovalStore } from "./storage/ExportApprovalStore.js";
import { ConversationStore } from "./storage/ConversationStore.js";
import { WorkspaceManager } from "./services/workspace/WorkspaceManager.js";
import { HarnessAdapter } from "./services/harness/HarnessAdapter.js";
import { MockHarnessAdapter } from "./services/harness/MockHarnessAdapter.js";
import { OpenCodeDockerAdapter } from "./services/harness/OpenCodeDockerAdapter.js";
import { GitManager } from "./services/git/GitManager.js";
import { ExportFilter } from "./services/export/ExportFilter.js";
import { OkfExporter } from "./services/okf/OkfExporter.js";
import { PermissionPolicy } from "./services/policy/PermissionPolicy.js";
import { SensitiveContentScanner } from "./services/privacy/SensitiveContentScanner.js";
import { ServiceRequestWorkflow } from "./services/serviceRequests/ServiceRequestWorkflow.js";
import { planningSpaceRoutes } from "./routes/planningSpaces.js";
import { conversationRoutes } from "./routes/conversation.js";
import { thinkingStateRoutes } from "./routes/thinkingState.js";
import { exportRoutes } from "./routes/exports.js";
import { sensitiveContentRoutes } from "./routes/sensitiveContent.js";
import { serviceRequestRoutes } from "./routes/serviceRequests.js";

function createHarness(config: ReturnType<typeof loadConfig>, policy: PermissionPolicy): HarnessAdapter {
  if (config.harness === "opencode-docker") {
    return new OpenCodeDockerAdapter({
      enabled: config.realHarnessEnabled,
      policy,
      runner: config.openCode.runner,
      dockerImage: config.openCode.dockerImage,
      command: config.openCode.command,
      allowNetwork: config.openCode.allowNetwork,
      timeoutMs: config.openCode.timeoutMs,
      kernelDir: config.kernelDir,
      kernelWriteEnabled: config.kernelWriteEnabled,
      kernelWritableDirs: config.kernelWritableDirs,
      provider: config.openCode.provider,
      baseUrl: config.openCode.baseUrl,
      model: config.openCode.model,
      openRouterApiKeyAvailable: config.openCode.openRouterApiKeyAvailable,
      externalKernelContextEnabled: config.openCode.externalKernelContextEnabled
    });
  }
  return new MockHarnessAdapter();
}

export async function buildApp() {
  const config = loadConfig();
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.mkdir(config.workspacesDir, { recursive: true });

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const store = new PlanningSpaceStore(config.dataDir);
  const approvals = new ExportApprovalStore(config.dataDir);
  const conversation = new ConversationStore(config.workspacesDir);
  const workspace = new WorkspaceManager(config.planningWorkspacesDir);
  const policy = new PermissionPolicy();
  const harness = createHarness(config, policy);
  const git = new GitManager();
  const exportFilter = new ExportFilter();
  const okf = new OkfExporter();
  const scanner = new SensitiveContentScanner();
  const serviceWorkflow = new ServiceRequestWorkflow(workspace, harness);

  app.get("/health", async () => ({
    status: "ok",
    harness: harness.mode,
    harnessId: harness.id,
    harnessAvailability: await harness.checkAvailability()
  }));

  await app.register(planningSpaceRoutes, { prefix: "/api", store, workspace, git });
  await app.register(conversationRoutes, { prefix: "/api", store, workspace, git, harness, conversation });
  await app.register(thinkingStateRoutes, { prefix: "/api", store, workspace });
  await app.register(serviceRequestRoutes, { prefix: "/api", store, workspace, git, workflow: serviceWorkflow });
  await app.register(exportRoutes, { prefix: "/api", store, approvals, workspace, exportFilter, okf, scanner });
  await app.register(sensitiveContentRoutes, { prefix: "/api", scanner });

  return app;
}

const isEntry = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntry) {
  const app = await buildApp();
  const config = loadConfig();
  await app.listen({ port: config.port, host: "0.0.0.0" });
}
