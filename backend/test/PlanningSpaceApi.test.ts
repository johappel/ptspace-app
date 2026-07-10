import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let tempRoot: string;
let oldEnv: Record<string, string | undefined>;

const envKeys = [
  "PTSPACE_DATA_DIR",
  "PTSPACE_WORKSPACES_DIR",
  "PTSPACE_HARNESS",
  "PTSPACE_REAL_HARNESS_ENABLED",
  "PTSPACE_OPENCODE_RUNNER",
  "PTSPACE_OPENCODE_DOCKER_IMAGE",
  "PTSPACE_OPENCODE_ALLOW_NETWORK",
  "PTSPACE_OPENCODE_MODEL",
  "OPENROUTER_API_KEY"
];

beforeEach(async () => {
  oldEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-app-test-"));
  process.env.PTSPACE_DATA_DIR = path.join(tempRoot, "data");
  process.env.PTSPACE_WORKSPACES_DIR = path.join(tempRoot, "workspaces");
  process.env.PTSPACE_HARNESS = "mock";
  process.env.PTSPACE_REAL_HARNESS_ENABLED = "false";
  delete process.env.OPENROUTER_API_KEY;
});

afterEach(async () => {
  for (const key of envKeys) {
    const value = oldEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("planning-space API", () => {
  it("creates an isolated workspace and responds through mock adapter", async () => {
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

      const conversationResponse = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${space.id}/conversation`,
        payload: { message: "Ich möchte das Lernanliegen klären." }
      });
      expect(conversationResponse.statusCode).toBe(200);
      expect(conversationResponse.json().reply.text).toContain("Lernerfahrung");

      const thinkingResponse = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/thinking-state` });
      expect(thinkingResponse.statusCode).toBe(200);
      expect(thinkingResponse.json().cards).toHaveLength(3);
    } finally {
      await app.close();
    }
  });

  it("requires export approval before markdown export", async () => {
    const app = await buildApp();
    try {
      const createResponse = await app.inject({ method: "POST", url: "/api/planning-spaces", payload: { title: "Export Test" } });
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
      const createResponse = await app.inject({ method: "POST", url: "/api/planning-spaces", payload: { title: "OKF Test" } });
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

  it("shows paragraph-based learning design and reads decisions from the correct file", async () => {
    const app = await buildApp();
    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/planning-spaces",
        payload: { title: "Denkstand Test", subject: "Religion", targetGroup: "Klasse 9" }
      });
      const space = createResponse.json<{ id: string }>();
      const project = path.join(tempRoot, "workspaces", space.id, "project");
      await fs.writeFile(
        path.join(project, "learning-design.md"),
        "# Denkstand\n\n## Lernanliegen\nJugendliche entwickeln trotz Ohnmacht neue Handlungsmöglichkeiten.\n",
        "utf8"
      );
      await fs.writeFile(
        path.join(project, "decisions.md"),
        "# Entscheidungen\n\n- Die Lernreise beginnt bei der Erfahrung politischer Ohnmacht.\n",
        "utf8"
      );
      await fs.writeFile(
        path.join(project, "open-questions.md"),
        "# Offene Fragen\n\n- Welche religiösen Hoffnungstraditionen tragen?\n",
        "utf8"
      );
      const response = await app.inject({ method: "GET", url: `/api/planning-spaces/${space.id}/thinking-state` });
      const cards = response.json<{ cards: Array<{ id: string; previewItems: string[] }> }>().cards;
      expect(cards.find((card) => card.id === "denkstand")?.previewItems).toContain(
        "Lernanliegen: Jugendliche entwickeln trotz Ohnmacht neue Handlungsmöglichkeiten."
      );
      expect(cards.find((card) => card.id === "offene-entscheidungen")?.previewItems).toContain(
        "Die Lernreise beginnt bei der Erfahrung politischer Ohnmacht."
      );
    } finally {
      await app.close();
    }
  });
});
