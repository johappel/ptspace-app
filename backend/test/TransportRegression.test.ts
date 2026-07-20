import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let tempRoot: string;
const envKeys = [
  "PTSPACE_DATA_DIR",
  "PTSPACE_WORKSPACES_DIR",
  "PTSPACE_PLANNING_WORKSPACES_DIR",
  "PTSPACE_HARNESS",
  "PTSPACE_REAL_HARNESS_ENABLED"
];
let oldEnv: Record<string, string | undefined>;

beforeEach(async () => {
  oldEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-transport-regression-"));
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

describe("Transport-Regressionen", () => {
  it("behält Chatbeiträge und KI-Antworten und liefert CORS für API und SSE", async () => {
    const app = await buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        headers: { origin: "http://localhost:5173" },
        payload: { title: "Transportprüfung", subject: "Religion", targetGroup: "Klasse 9" }
      });
      const space = created.json<{ id: string }>();

      const listed = await app.inject({
        method: "GET",
        url: "/api/planning-spaces",
        headers: { origin: "http://localhost:5173" }
      });
      expect(listed.statusCode).toBe(200);
      expect(listed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

      const firstReply = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/conversation`,
        payload: { message: "Wir klären zuerst das Lernanliegen." }
      });
      expect(firstReply.statusCode).toBe(200);
      const first = firstReply.json<{ teacherMessageId: string; reply: { id: string; text: string } }>();
      expect(first.teacherMessageId).toMatch(/^msg-/);
      expect(first.reply.text).toContain("nächsten Schritt");

      const reloaded = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/messages` });
      expect(reloaded.json<{ messages: Array<{ id: string; author: string; text: string }> }>().messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: first.teacherMessageId, author: "teacher", text: "Wir klären zuerst das Lernanliegen." }),
          expect.objectContaining({ id: first.reply.id, author: "critical_friend", text: first.reply.text })
        ])
      );

      const streamed = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/conversation/stream`,
        headers: { origin: "http://localhost:5173" },
        payload: { message: "Wir denken über den nächsten Schritt weiter." }
      });
      expect(streamed.statusCode).toBe(200);
      expect(streamed.headers["content-type"]).toContain("text/event-stream");
      expect(streamed.headers["access-control-allow-origin"]).toBe("*");
      expect(streamed.body).toContain("event: complete");
      expect(streamed.body).toContain("teacherMessageId");

      const afterStream = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/messages` });
      expect(afterStream.json<{ messages: Array<{ author: string }> }>().messages.filter((message) => message.author === "teacher")).toHaveLength(2);
      expect(afterStream.json<{ messages: Array<{ author: string }> }>().messages.filter((message) => message.author === "critical_friend")).toHaveLength(2);
    } finally {
      await app.close();
    }
  });

  it("liefert geführte und Board-Materialien über ihre tatsächlichen Ausgabepfade", async () => {
    const app = await buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: { title: "Materialprüfung", subject: "Religion", targetGroup: "Klasse 9" }
      });
      const space = created.json<{ id: string; workspaceSlug: string }>();
      const projectRoot = path.join(tempRoot, "planning-workspaces", space.workspaceSlug);
      await fs.mkdir(path.join(projectRoot, "materials"), { recursive: true });
      await fs.writeFile(path.join(projectRoot, "materials", "pb-abc123.md"), "# Arbeitsblatt\n", "utf8");
      await fs.writeFile(path.join(projectRoot, "drafts", "student-instruction.md"), "# Arbeitsauftrag\n", "utf8");

      const boardMaterial = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/materials/material-pb-abc123` });
      expect(boardMaterial.statusCode).toBe(200);
      expect(boardMaterial.json<{ content: string; location: string }>().content).toContain("Arbeitsblatt");
      expect(boardMaterial.json<{ location: string }>().location).toBe("materials/pb-abc123.md");

      const guidedMaterial = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/materials/student-instruction` });
      expect(guidedMaterial.statusCode).toBe(200);
      expect(guidedMaterial.json<{ content: string }>().content).toContain("Arbeitsauftrag");
    } finally {
      await app.close();
    }
  });
});
