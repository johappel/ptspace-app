import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let tempRoot: string;
let oldEnv: Record<string, string | undefined>;
const envKeys = ["PTSPACE_DATA_DIR", "PTSPACE_WORKSPACES_DIR", "PTSPACE_PLANNING_WORKSPACES_DIR", "PTSPACE_HARNESS", "PTSPACE_REAL_HARNESS_ENABLED"];

beforeEach(async () => {
  oldEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-marker-api-"));
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

async function createSpace(app: Awaited<ReturnType<typeof buildApp>>): Promise<{ id: string; workspaceSlug: string }> {
  const response = await app.inject({ method: "POST", url: "/api/planning-spaces", payload: { title: "Markerraum", subject: "Religion", targetGroup: "Klasse 9" } });
  return response.json<{ id: string; workspaceSlug: string }>();
}

async function seedConversation(spaceId: string): Promise<void> {
  const directory = path.join(tempRoot, "workspaces", spaceId, "project");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "messages.json"), JSON.stringify([{ id: "msg-source", author: "teacher", text: "Diesen Gedanken halten wir fest.", createdAt: new Date().toISOString() }]), "utf8");
}

async function seedBoard(app: Awaited<ReturnType<typeof buildApp>>, spaceId: string, status = "proposed") {
  return app.inject({
    method: "PUT",
    url: `/api/planning-spaces/${spaceId}/planning-board`,
    payload: {
      schema: "ptspace.planning-board/v1",
      items: [{ id: "pb-marker", title: "Arbeitsvorhaben", kind: "produce", column: status === "discarded" ? "review" : "prepare", status, relatedNodes: [], relatedWindows: [], materialIds: [], materialNeed: "", expectedResult: "", requiresTeacherApproval: true, serviceRequestId: "", reviewedAt: "", reviewedBy: "" }]
    }
  });
}

describe("conversation marker API", () => {
  it("persists a valid marker, exposes it in room-overview and rejects foreign references", async () => {
    const app = await buildApp();
    try {
      const space = await createSpace(app);
      await seedConversation(space.id);
      await seedBoard(app, space.id);

      const created = await app.inject({ method: "POST", url: `/api/planning-spaces/${space.id}/conversation-markers`, payload: { sourceMessageId: "msg-source", kind: "captured_note", targetType: "board_item", targetId: "pb-marker", label: "Aus dem Gespräch festgehalten" } });
      expect(created.statusCode).toBe(201);
      expect(created.json().marker).toMatchObject({ planningSpaceId: space.id, sourceMessageId: "msg-source", targetId: "pb-marker", status: "active" });

      const overview = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/room-overview` });
      expect(overview.json().conversationMarkers).toHaveLength(1);
      const reloaded = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/conversation-markers` });
      expect(reloaded.json().markers[0].sourceMessageId).toBe("msg-source");

      const foreign = await app.inject({ method: "POST", url: `/api/planning-spaces/${space.id}/conversation-markers`, payload: { sourceMessageId: "msg-source", kind: "open_decision", targetType: "board_item", targetId: "pb-marker", targetPlanningSpaceId: "space-other", label: "Fremder Bezug" } });
      expect(foreign.statusCode).toBe(409);
    } finally {
      await app.close();
    }
  });

  it("rejects unknown sources and removes discarded targets from the active read model", async () => {
    const app = await buildApp();
    try {
      const space = await createSpace(app);
      await seedConversation(space.id);
      await seedBoard(app, space.id);
      const unknownSource = await app.inject({ method: "POST", url: `/api/planning-spaces/${space.id}/conversation-markers`, payload: { sourceMessageId: "msg-unknown", kind: "captured_note", targetType: "board_item", targetId: "pb-marker", label: "Ungültige Quelle" } });
      expect(unknownSource.statusCode).toBe(422);
      const created = await app.inject({ method: "POST", url: `/api/planning-spaces/${space.id}/conversation-markers`, payload: { sourceMessageId: "msg-source", kind: "work_started", targetType: "board_item", targetId: "pb-marker", label: "Vorbereitung begonnen" } });
      const markerId = created.json().marker.id;
      await seedBoard(app, space.id, "discarded");
      const active = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/conversation-markers` });
      expect(active.json().markers).toHaveLength(0);
      const stored = JSON.parse(await fs.readFile(path.join(tempRoot, "workspaces", space.id, "project", "conversation-markers.json"), "utf8"));
      expect(stored.markers.find((marker: { id: string }) => marker.id === markerId).status).toBe("discarded");
    } finally {
      await app.close();
    }
  });

  it("links a recorded decision to its originating conversation message", async () => {
    const app = await buildApp();
    try {
      const space = await createSpace(app);
      await seedConversation(space.id);

      const recorded = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/decisions`,
        payload: { decision: "Wir beginnen mit einem Bildimpuls.", reason: "Der Einstieg oeffnet die Frage, ohne die Antwort vorwegzunehmen." }
      });
      expect(recorded.statusCode).toBe(200);
      const decision = recorded.json<{ decision: { id: string; title: string } }>().decision;

      const created = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/conversation-markers`,
        payload: {
          sourceMessageId: "msg-source",
          kind: "open_decision",
          targetType: "decision",
          targetId: decision.id,
          label: decision.title
        }
      });
      expect(created.statusCode).toBe(201);
      expect(created.json().marker).toMatchObject({
        sourceMessageId: "msg-source",
        kind: "open_decision",
        targetType: "decision",
        targetId: decision.id,
        status: "active"
      });

      const overview = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/room-overview` });
      expect(overview.json().decisions).toContainEqual({ id: decision.id, title: decision.title });
      expect(overview.json().conversationMarkers).toHaveLength(1);
    } finally {
      await app.close();
    }
  });
});
