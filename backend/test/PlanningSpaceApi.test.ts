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

  it("requires export approval before markdown export", async () => {
    const app = await buildApp();
    try {
      const createResponse = await app.inject({ method: "POST", url: "/api/planning-spaces", payload: { title: "Exportprüfung" } });
      const space = createResponse.json<{ id: string }>();
      const blockedResponse = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/export/markdown` });
      expect(blockedResponse.statusCode).toBe(409);

      const approvalResponse = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/export-approvals`,
        payload: { exportType: "markdown", approvedBy: "Lehrkraft", sensitiveFindingsReviewed: true }
      });
      expect(approvalResponse.statusCode).toBe(201);

      const exportResponse = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/export/markdown` });
      expect(exportResponse.statusCode).toBe(200);
      expect(exportResponse.body).toContain("Dieser Export enthält den kuratierten Denkstand");
    } finally {
      await app.close();
    }
  });

  it("exports OKF markdown after OKF approval", async () => {
    const app = await buildApp();
    try {
      const createResponse = await app.inject({ method: "POST", url: "/api/planning-spaces", payload: { title: "OKF Prüfung", subject: "Religion" } });
      const space = createResponse.json<{ id: string }>();
      await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/export-approvals`,
        payload: { exportType: "okf_markdown", approvedBy: "Lehrkraft", sensitiveFindingsReviewed: true }
      });
      const okfResponse = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/export/okf` });
      expect(okfResponse.statusCode).toBe(200);
      expect(okfResponse.body).toContain("type: learning_design");
      expect(okfResponse.body).toContain("contains_raw_chat: false");
    } finally {
      await app.close();
    }
  });

  it("blocks export when curated state contains particularly sensitive content", async () => {
    const app = await buildApp();
    try {
      const createResponse = await app.inject({ method: "POST", url: "/api/planning-spaces", payload: { title: "Sensible Prüfung" } });
      const space = createResponse.json<{ id: string }>();
      await fs.writeFile(path.join(tempRoot, "workspaces", space.id, "project", "decisions.md"), "# Entscheidungen\n\nADHS ist bekannt.\n", "utf8");
      await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/export-approvals`,
        payload: { exportType: "markdown", approvedBy: "Lehrkraft", sensitiveFindingsReviewed: true }
      });

      const exportResponse = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/export/markdown` });
      expect(exportResponse.statusCode).toBe(409);
      expect(exportResponse.json().message).toContain("sensible Hinweise");
    } finally {
      await app.close();
    }
  });
});