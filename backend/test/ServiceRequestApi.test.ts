import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let tempRoot: string;
const oldEnv: Record<string, string | undefined> = {};

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-service-api-test-"));
  for (const key of ["PTSPACE_DATA_DIR", "PTSPACE_WORKSPACES_DIR", "PTSPACE_PLANNING_WORKSPACES_DIR", "PTSPACE_HARNESS", "PTSPACE_REAL_HARNESS_ENABLED"]) oldEnv[key] = process.env[key];
  process.env.PTSPACE_DATA_DIR = path.join(tempRoot, "data");
  process.env.PTSPACE_WORKSPACES_DIR = path.join(tempRoot, "workspaces");
  process.env.PTSPACE_PLANNING_WORKSPACES_DIR = path.join(tempRoot, "planning-workspaces");
  process.env.PTSPACE_HARNESS = "mock";
  process.env.PTSPACE_REAL_HARNESS_ENABLED = "false";
});

afterEach(async () => {
  for (const [key, value] of Object.entries(oldEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("service-request API", () => {
  it("keeps proposal, approval, execution and review visible as one guarded lifecycle", async () => {
    const app = await buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: {
          title: "Klimakrise und Hoffnung",
          subject: "Religion",
          targetGroup: "Klasse 9",
          initialIdea: "Jugendliche sollen trotz Ohnmacht wieder Lust auf verantwortliches Handeln entwickeln."
        }
      });
      expect(created.statusCode).toBe(201);
      const space = created.json<{ id: string; workspaceSlug: string }>();

      const proposed = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/service-requests/student-instruction`,
        payload: { reason: "Das Lernanliegen ist geklärt und ein erster Arbeitsauftrag kann geprüft werden." }
      });
      expect(proposed.statusCode).toBe(201);
      const proposal = proposed.json<{ serviceRequest: { id: string; status: string }; nextStep: { requiresTeacherApproval: boolean } }>();
      expect(proposal.serviceRequest.status).toBe("proposed");
      expect(proposal.nextStep.requiresTeacherApproval).toBe(true);

      const approved = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/service-requests/${proposal.serviceRequest.id}/approve`
      });
      expect(approved.statusCode).toBe(200);
      const result = approved.json<{ serviceRequest: { status: string; returnTo: string }; material: { status: string }; teacherFacingMessage: string }>();
      expect(result.serviceRequest.status).toBe("reviewed");
      expect(result.serviceRequest.returnTo).toBe("critical_friend");
      expect(result.material.status).toBe("review_needed");
      expect(result.teacherFacingMessage).toContain("Du entscheidest");

      const draft = await fs.readFile(path.join(tempRoot, "planning-workspaces", space.workspaceSlug, "drafts", "student-instruction.md"), "utf8");
      expect(draft).toContain("Status: Entwurf");
    } finally {
      await app.close();
    }
  });
});
