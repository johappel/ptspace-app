import { describe, expect, it } from "vitest";
import path from "node:path";
import { PermissionPolicy } from "../src/services/policy/PermissionPolicy.js";

describe("PermissionPolicy", () => {
  const policy = new PermissionPolicy();
  const workspaceRoot = path.resolve("workspaces", "space-1");

  it("allows file work inside the planning-space workspace", () => {
    const decision = policy.decide({
      type: "file",
      file: {
        workspaceRoot,
        targetPath: path.join(workspaceRoot, "project", "learning-design.md"),
        operation: "write"
      }
    });

    expect(decision.decision).toBe("allow");
  });

  it("denies file work outside the planning-space workspace", () => {
    const decision = policy.decide({
      type: "file",
      file: {
        workspaceRoot,
        targetPath: path.resolve("AGENTS.md"),
        operation: "read"
      }
    });

    expect(decision.decision).toBe("deny");
    expect(decision.reason).toBe("outside_workspace");
  });

  it("does not allow secrets through the planning dialog", () => {
    const decision = policy.decide({ type: "secret", name: "ELEVENLABS_API_KEY" });

    expect(decision.decision).toBe("deny");
  });

  it("requires admin approval for shell commands", () => {
    const decision = policy.decide({ type: "command", command: "npm install" });

    expect(decision.decision).toBe("requires_admin_approval");
  });
});
