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
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-artifacts-api-"));
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

async function createSpace(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
  const response = await app.inject({ method: "POST", url: "/api/planning-spaces", payload: { title: "Zeit und Dramaturgie", subject: "Religion", targetGroup: "Klasse 9" } });
  return response.json<{ id: string }>().id;
}

describe("planning artifact resource API", () => {
  it("stores and reloads a learning landscape and creates a git version", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      const landscape = {
        schema: "ptspace.learning-landscape/v1",
        title: "Lernlandschaft",
        structure: "linear",
        moments: [
          { id: "lm-impuls", title: "Impuls", kind: "impulse", didacticPurpose: "wecken", learningActivity: "Bild zeigen", expectedExperience: "Neugier", materialNeeds: ["Bildimpuls"], materialIds: [], openQuestions: ["Welches Bild?"], status: "draft" },
          { id: "lm-position", title: "Position", kind: "positioning", didacticPurpose: "sichtbar", learningActivity: "Raumlinie", expectedExperience: "Unterschiede", materialNeeds: [], materialIds: [], openQuestions: [], status: "in_progress" }
        ],
        transitions: [{ id: "t1", from: "lm-impuls", to: "lm-position", kind: "choice", rationale: "Perspektivwahl" }]
      };
      const put = await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/learning-landscape`, payload: landscape });
      expect(put.statusCode).toBe(200);
      expect(put.json<{ version: unknown }>().version).toBeTruthy();

      const get = await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/learning-landscape` });
      expect(get.statusCode).toBe(200);
      const reloaded = get.json<typeof landscape>();
      expect(reloaded.moments).toHaveLength(2);
      expect(reloaded.moments[0].materialNeeds).toEqual(["Bildimpuls"]);
      expect(reloaded.moments[0].openQuestions).toEqual(["Welches Bild?"]);
      expect(reloaded.transitions[0].rationale).toBe("Perspektivwahl");
    } finally {
      await app.close();
    }
  });

  it("stores a temporal plan and rejects placements with unknown moment references", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      await app.inject({
        method: "PUT",
        url: `/api/planning-spaces/${id}/learning-landscape`,
        payload: {
          schema: "ptspace.learning-landscape/v1", title: "L", structure: "linear",
          moments: [{ id: "lm-impuls", title: "Impuls", kind: "impulse", didacticPurpose: "", learningActivity: "", expectedExperience: "", materialNeeds: [], materialIds: [], openQuestions: [], status: "draft" }],
          transitions: []
        }
      });

      const valid = {
        schema: "ptspace.temporal-plan/v1", title: "Plan", landscape: "learning-landscape.md",
        windows: [{ id: "tw-01", title: "Stunde 1", kind: "lesson", durationMinutes: 45, note: "" }],
        placements: [{ id: "tp-01", momentId: "lm-impuls", windowId: "tw-01", startMinute: 0, durationMinutes: 8, dramaturgicalRole: "opening", mode: "common", note: "" }]
      };
      const putValid = await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/temporal-plan`, payload: valid });
      expect(putValid.statusCode).toBe(200);

      const get = await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/temporal-plan` });
      expect(get.json<typeof valid>().placements[0]).toMatchObject({ momentId: "lm-impuls", startMinute: 0, durationMinutes: 8 });

      const invalid = { ...valid, placements: [{ ...valid.placements[0], momentId: "lm-ghost" }] };
      const putInvalid = await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/temporal-plan`, payload: invalid });
      expect(putInvalid.statusCode).toBe(422);
    } finally {
      await app.close();
    }
  });

  it("keeps layout changes out of the git version history", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      const before = await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/room-overview` });
      const versionsBefore = before.json<{ versions: unknown[] }>().versions.length;

      const layout = await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/learning-landscape-layout`, payload: { nodes: [{ id: "lm-impuls", x: 10, y: 20 }] } });
      expect(layout.statusCode).toBe(200);

      const after = await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/room-overview` });
      const versionsAfter = after.json<{ versions: unknown[] }>().versions.length;
      expect(versionsAfter).toBe(versionsBefore);
    } finally {
      await app.close();
    }
  });
});
