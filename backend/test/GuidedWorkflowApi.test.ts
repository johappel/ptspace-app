import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let tempRoot: string;
const oldEnv: Record<string, string | undefined> = {};
const envKeys = ["PTSPACE_DATA_DIR", "PTSPACE_WORKSPACES_DIR", "PTSPACE_PLANNING_WORKSPACES_DIR", "PTSPACE_HARNESS", "PTSPACE_REAL_HARNESS_ENABLED"];

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-guided-api-test-"));
  for (const key of envKeys) oldEnv[key] = process.env[key];
  process.env.PTSPACE_DATA_DIR = path.join(tempRoot, "data");
  process.env.PTSPACE_WORKSPACES_DIR = path.join(tempRoot, "workspaces");
  process.env.PTSPACE_PLANNING_WORKSPACES_DIR = path.join(tempRoot, "planning-workspaces");
  process.env.PTSPACE_HARNESS = "mock";
  process.env.PTSPACE_REAL_HARNESS_ENABLED = "false";
});

afterEach(async () => {
  for (const key of envKeys) {
    const value = oldEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("guided two-click workflow", () => {
  it("persists one proposal, starts background work and releases the returned result", async () => {
    const app = await buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: { title: "Geführter Arbeitsfluss", subject: "Religion", targetGroup: "Klasse 9", initialIdea: "Ein erster Entwurf soll gemeinsam geprüft werden." }
      });
      const space = created.json<{ id: string }>();

      const conversation = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/conversation`,
        payload: { message: "Können wir jetzt einen Arbeitsauftrag als Entwurf vorbereiten?" }
      });
      expect(conversation.statusCode).toBe(200);

      const before = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/room-overview` });
      const pending = before.json<{ attentionCard: { kind: string; primaryAction?: { targetId: string } } }>().attentionCard;
      expect(pending.kind).toBe("worker_proposal");
      expect(pending.primaryAction?.targetId).toMatch(/^guided-/);

      const accepted = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/guided-proposals/${pending.primaryAction?.targetId}/accept`
      });
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json().request.status).toBe("queued");
      const acceptedAgain = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/guided-proposals/${pending.primaryAction?.targetId}/accept`
      });
      expect(acceptedAgain.statusCode).toBe(200);
      expect(acceptedAgain.json().request.id).toBe(accepted.json().request.id);

      let returned: { status: string } | undefined;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/service-requests` });
        const request = response.json<{ requests: Array<{ status: string }> }>().requests[0];
        if (request?.status === "returned") {
          returned = request;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(returned?.status).toBe("returned");

      const resultOverview = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/room-overview` });
      const resultCard = resultOverview.json<{ attentionCard: { kind: string; primaryAction?: { targetId: string }; automaticCheck?: { status: string }; criticalFriendCheck?: { status: string } } }>().attentionCard;
      expect(resultCard.kind).toBe("result_review");
      expect(resultCard.automaticCheck?.status).toBe("passed");
      expect(resultCard.criticalFriendCheck?.status).toBe("passed");

      const reviewed = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/service-requests/${resultCard.primaryAction?.targetId}/review`,
        payload: { reviewedBy: "Lehrkraft" }
      });
      expect(reviewed.statusCode).toBe(200);
      expect(reviewed.json().serviceRequest.status).toBe("reviewed");
      expect(reviewed.json().planningBoard.items[0].status).toBe("ready");
      const reviewedAgain = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/service-requests/${resultCard.primaryAction?.targetId}/review`,
        payload: { reviewedBy: "Lehrkraft" }
      });
      expect(reviewedAgain.statusCode).toBe(200);
      expect(reviewedAgain.json().serviceRequest.status).toBe("reviewed");

      const markers = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/conversation-markers` });
      expect(markers.json().markers.map((marker: { kind: string }) => marker.kind)).toEqual(expect.arrayContaining(["work_started", "result_returned", "ready_for_class"]));
    } finally {
      await app.close();
    }
  });
});
