import path from "node:path";
import { describe, expect, it } from "vitest";
import { OpenCodeDockerAdapter, summarizeSimulation } from "../src/services/harness/OpenCodeDockerAdapter.js";
import { PermissionPolicy } from "../src/services/policy/PermissionPolicy.js";

describe("OpenCodeDockerAdapter", () => {
  const workspaceRoot = path.resolve("workspaces", "space-1");

  it("stays unavailable for real execution until explicitly enabled", async () => {
    const adapter = new OpenCodeDockerAdapter({ enabled: false, policy: new PermissionPolicy() });

    await expect(adapter.checkAvailability()).resolves.toMatchObject({
      status: "requires_admin_configuration"
    });
    await expect(adapter.createSession({ planningSpaceId: "space-1", workspaceRoot })).rejects.toThrow(
      "opencode_docker_adapter_not_enabled"
    );
  });

  it("simulates all backend policy outcomes before real harness execution", async () => {
    const adapter = new OpenCodeDockerAdapter({ enabled: false, policy: new PermissionPolicy() });

    const result = await adapter.simulatePolicy(workspaceRoot);
    const summary = summarizeSimulation(result);

    expect(summary.allow).toBeGreaterThan(0);
    expect(summary.deny).toBeGreaterThan(0);
    expect(summary.requires_admin_approval).toBeGreaterThan(0);
    expect(summary.ask_critical_friend).toBeGreaterThan(0);
  });
});
