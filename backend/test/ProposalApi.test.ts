import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let tempRoot: string;
const oldEnv: Record<string, string | undefined> = {};

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-proposal-api-test-"));
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

describe("proposal API", () => {
  it("returns a structured board-item proposal without changing any canonical artifact", async () => {
    const app = await buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: { title: "Klimakrise und Hoffnung", subject: "Religion", targetGroup: "Klasse 9", initialIdea: "Handeln trotz Ohnmacht." }
      });
      const space = created.json<{ id: string; workspaceSlug: string }>();
      const boardPath = path.join(tempRoot, "planning-workspaces", space.workspaceSlug, "planning-board.yml");
      const before = await fs.readFile(boardPath, "utf8");

      const response = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/proposals`,
        payload: { kind: "board_item", note: "Lehrplanbezug prüfen" }
      });
      expect(response.statusCode).toBe(200);
      const { proposal } = response.json<{ proposal: { kind: string; boardItem: { requiresTeacherApproval: boolean }; rationale: string } }>();
      expect(proposal.kind).toBe("board_item");
      expect(proposal.boardItem.requiresTeacherApproval).toBe(true);
      expect(proposal.rationale.length).toBeGreaterThan(0);

      // Ohne Übernehmen bleibt das Planungsboard unverändert.
      const after = await fs.readFile(boardPath, "utf8");
      expect(after).toBe(before);
    } finally {
      await app.close();
    }
  });

  it("refuses a transition proposal when the landscape has fewer than two moments", async () => {
    const app = await buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: { title: "Kurzer Raum", subject: "Ethik", targetGroup: "Klasse 8", initialIdea: "Erste Idee." }
      });
      const space = created.json<{ id: string }>();
      const response = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/proposals`,
        payload: { kind: "transition" }
      });
      expect(response.statusCode).toBe(422);
    } finally {
      await app.close();
    }
  });
});
