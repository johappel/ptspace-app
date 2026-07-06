import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let tempRoot: string;
let oldDataDir: string | undefined;
let oldWorkspaceDir: string | undefined;

beforeEach(async () => {
  oldDataDir = process.env.PTSPACE_DATA_DIR;
  oldWorkspaceDir = process.env.PTSPACE_WORKSPACES_DIR;
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-app-test-"));
  process.env.PTSPACE_DATA_DIR = path.join(tempRoot, "data");
  process.env.PTSPACE_WORKSPACES_DIR = path.join(tempRoot, "workspaces");
});

afterEach(async () => {
  if (oldDataDir === undefined) delete process.env.PTSPACE_DATA_DIR;
  else process.env.PTSPACE_DATA_DIR = oldDataDir;
  if (oldWorkspaceDir === undefined) delete process.env.PTSPACE_WORKSPACES_DIR;
  else process.env.PTSPACE_WORKSPACES_DIR = oldWorkspaceDir;
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("planning-space API", () => {
  it("creates an isolated workspace and responds through the mock adapter", async () => {
    const app = await buildApp();
    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: {
          title: "Hoffnung und Entscheidung",
          subject: "Religion",
          targetGroup: "Klasse 9",
          initialIdea: "Eine verantwortliche Entscheidungssituation durchdenken."
        }
      });
      expect(createResponse.statusCode).toBe(201);
      const space = createResponse.json<{ id: string }>();
      await expect(fs.stat(path.join(tempRoot, "workspaces", space.id, "project", "learning-design.md"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(tempRoot, "workspaces", space.id, ".git"))).resolves.toBeTruthy();

      const conversationResponse = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/conversation`,
        payload: { message: "Wir klären erst das Lernanliegen." }
      });
      expect(conversationResponse.statusCode).toBe(200);
      expect(conversationResponse.json().reply.text).toContain("nächsten Schritt");

      const stateResponse = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/thinking-state` });
      expect(stateResponse.statusCode).toBe(200);
      expect(JSON.stringify(stateResponse.json())).toContain("Lernanliegen in einem Satz formulieren");
    } finally {
      await app.close();
    }
  });

  it("exports the curated planning state without raw chat or service requests", async () => {
    const app = await buildApp();
    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: { title: "Exportprüfung", initialIdea: "Kuratiert exportieren." }
      });
      const space = createResponse.json<{ id: string }>();
      await fs.writeFile(
        path.join(tempRoot, "workspaces", space.id, "project", "decisions.md"),
        "# Entscheidungen\n\nBleibt sichtbar.\n\n# Service Requests\nservice-request: sr-secret\nAPI_KEY=123\n",
        "utf8"
      );

      const exportResponse = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/export/markdown` });
      expect(exportResponse.statusCode).toBe(200);
      expect(exportResponse.body).toContain("Bleibt sichtbar.");
      expect(exportResponse.body).not.toContain("service-request");
      expect(exportResponse.body).not.toContain("API_KEY");
      expect(Number(exportResponse.headers["x-ptspace-export-filtered-lines"])).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});