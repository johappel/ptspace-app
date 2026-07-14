import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

// Phase 11 (T-1103..T-1107): End-to-end-Flüsse auf API-Ebene. Es gibt keine
// Browser-E2E-Umgebung; die verbindlichen Garantien des Refactorings liegen im
// Backend (kanonische Artefakte, Vorschläge ohne stille Änderung, Board-Verschiebung
// ohne Worker). Deshalb werden die Abläufe deterministisch über die HTTP-Routen geprüft.

let tempRoot: string;
const oldEnv: Record<string, string | undefined> = {};
const envKeys = ["PTSPACE_DATA_DIR", "PTSPACE_WORKSPACES_DIR", "PTSPACE_PLANNING_WORKSPACES_DIR", "PTSPACE_HARNESS", "PTSPACE_REAL_HARNESS_ENABLED"];

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-e2e-test-"));
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

type App = Awaited<ReturnType<typeof buildApp>>;

async function createSpace(app: App): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/planning-spaces",
    payload: { title: "Hoffnung trotz Krise", subject: "Religion", targetGroup: "Klasse 9", initialIdea: "Handeln trotz Ohnmacht." }
  });
  return response.json<{ id: string }>().id;
}

function moment(id: string, title: string, kind = "impulse") {
  return { id, title, kind, didacticPurpose: "", learningActivity: "", expectedExperience: "", materialNeeds: [], materialIds: [], openQuestions: [], status: "draft" };
}

async function putLandscape(app: App, id: string, moments: ReturnType<typeof moment>[], transitions: unknown[] = []) {
  return app.inject({
    method: "PUT",
    url: `/api/planning-spaces/${id}/learning-landscape`,
    payload: { schema: "ptspace.learning-landscape/v1", title: "Lernlandschaft", structure: "linear", moments, transitions }
  });
}

describe("Refactoring-Flüsse (E2E über die API)", () => {
  it("T-1103: Gespräch → Lernmoment-Vorschlag → Zustimmung → Node sichtbar → Reload → weiterhin vorhanden", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);

      // Vorschlag aus dem Gespräch – noch keine kanonische Änderung.
      const proposed = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${id}/proposals`,
        payload: { kind: "learning_moment", note: "Eigene Position sichtbar machen" }
      });
      expect(proposed.statusCode).toBe(200);
      const { proposal } = proposed.json<{ proposal: { moment: ReturnType<typeof moment> } }>();
      expect(proposal.moment.id).toBeTruthy();

      // Zustimmung: der vorgeschlagene Lernmoment wird bewusst übernommen.
      const applied = await putLandscape(app, id, [proposal.moment]);
      expect(applied.statusCode).toBe(200);

      // Reload: der Lernmoment ist weiterhin kanonisch vorhanden.
      const reload = await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/learning-landscape` });
      const landscape = reload.json<{ moments: Array<{ id: string }> }>();
      expect(landscape.moments.map((entry) => entry.id)).toContain(proposal.moment.id);
    } finally {
      await app.close();
    }
  });

  it("T-1104: Lernmoment → Platzierung bestätigen → speichern → Reload → gleiche Position und Dauer", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      await putLandscape(app, id, [moment("lm-impuls", "Bildimpuls")]);

      const placement = {
        schema: "ptspace.temporal-plan/v1", title: "Plan", landscape: "learning-landscape.md",
        windows: [{ id: "tw-01", title: "Stunde 1", kind: "lesson", durationMinutes: 45, note: "" }],
        placements: [{ id: "tp-01", momentId: "lm-impuls", windowId: "tw-01", startMinute: 12, durationMinutes: 9, dramaturgicalRole: "opening", mode: "common", note: "" }]
      };
      const saved = await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/temporal-plan`, payload: placement });
      expect(saved.statusCode).toBe(200);

      const reload = await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/temporal-plan` });
      const reloaded = reload.json<typeof placement>();
      expect(reloaded.placements[0]).toMatchObject({ startMinute: 12, durationMinutes: 9, momentId: "lm-impuls", windowId: "tw-01" });
    } finally {
      await app.close();
    }
  });

  it("T-1105: Materialbedarf → Board-Vorschlag → Zustimmung → Entwurf beauftragen → Ergebnis → Review → Freigabe", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      await putLandscape(app, id, [moment("lm-impuls", "Bildimpuls")]);

      // Zustimmung zum Board-Vorschlag: die Karte wird kanonisch aufgenommen.
      const cardProposed = {
        schema: "ptspace.planning-board/v1",
        items: [{ id: "pb-1", title: "Arbeitsblatt zum Impuls", kind: "produce", column: "prepare", status: "proposed", relatedNodes: ["lm-impuls"], relatedWindows: [], materialIds: [], materialNeed: "Bildimpuls mit Leitfragen", expectedResult: "Ein differenziertes Arbeitsblatt als Entwurf.", requiresTeacherApproval: true, serviceRequestId: "", reviewedAt: "", reviewedBy: "" }]
      };
      expect((await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/planning-board`, payload: cardProposed })).statusCode).toBe(200);

      // Entwurf beauftragen: gebundener Materialauftrag.
      const sr = await app.inject({
        method: "POST",
        url: `/api/planning-spaces/${id}/service-requests/board-material`,
        payload: { boardItemId: "pb-1", title: "Arbeitsblatt zum Impuls", relatedMoments: ["lm-impuls"], expectedResult: "Ein Entwurf.", reason: "Für dieses Arbeitsvorhaben soll ein erster, ausdrücklich noch zu prüfender Entwurf entstehen." }
      });
      expect(sr.statusCode).toBe(201);
      const requestId = sr.json<{ serviceRequest: { id: string } }>().serviceRequest.id;

      // Worker-Ergebnis kommt als prüfbarer Entwurf zurück, nicht als unterrichtsfertig.
      const approved = await app.inject({ method: "POST", url: `/api/planning-spaces/${id}/service-requests/${requestId}/approve` });
      expect(approved.statusCode).toBe(200);
      expect(approved.json<{ material: { status: string } }>().material.status).toBe("review_needed");

      // Fachliche Freigabe: Zeitpunkt und prüfende Rolle werden dokumentiert.
      const released = {
        schema: "ptspace.planning-board/v1",
        items: [{ ...cardProposed.items[0], column: "ready", status: "ready", materialIds: ["materials/pb-1.md"], serviceRequestId: requestId, reviewedAt: new Date().toISOString(), reviewedBy: "Lehrkraft" }]
      };
      expect((await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/planning-board`, payload: released })).statusCode).toBe(200);

      const board = (await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/planning-board` })).json<{ items: Array<{ status: string; reviewedBy: string }> }>();
      expect(board.items[0]).toMatchObject({ status: "ready", reviewedBy: "Lehrkraft" });
    } finally {
      await app.close();
    }
  });

  it("T-1106: Eine reine Board-Verschiebung erzeugt keinen Service Request und keine Worker-Ausführung", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      const board = {
        schema: "ptspace.planning-board/v1",
        items: [{ id: "pb-1", title: "Lehrplanbezug prüfen", kind: "clarify", column: "clarify", status: "proposed", relatedNodes: [], relatedWindows: [], materialIds: [], materialNeed: "", expectedResult: "", requiresTeacherApproval: true, serviceRequestId: "", reviewedAt: "", reviewedBy: "" }]
      };
      await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/planning-board`, payload: board });

      const before = (await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/service-requests` })).json<{ requests: unknown[] }>();
      expect(before.requests).toHaveLength(0);

      // Karte nur in eine andere Spalte verschieben.
      const moved = { schema: "ptspace.planning-board/v1", items: [{ ...board.items[0], column: "prepare" }] };
      expect((await app.inject({ method: "PUT", url: `/api/planning-spaces/${id}/planning-board`, payload: moved })).statusCode).toBe(200);

      const after = (await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/service-requests` })).json<{ requests: unknown[] }>();
      expect(after.requests).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it("T-1107: Vorschläge des Critical Friend ändern Landschaft, Zeitplanung und Board nicht ohne Zustimmung", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      await putLandscape(app, id, [moment("lm-impuls", "Bildimpuls"), moment("lm-position", "Position", "positioning")]);
      await app.inject({
        method: "PUT", url: `/api/planning-spaces/${id}/temporal-plan`,
        payload: { schema: "ptspace.temporal-plan/v1", title: "Plan", landscape: "learning-landscape.md", windows: [{ id: "tw-01", title: "Stunde 1", kind: "lesson", durationMinutes: 45, note: "" }], placements: [] }
      });
      await app.inject({
        method: "PUT", url: `/api/planning-spaces/${id}/planning-board`,
        payload: { schema: "ptspace.planning-board/v1", items: [{ id: "pb-1", title: "Karte", kind: "clarify", column: "clarify", status: "proposed", relatedNodes: [], relatedWindows: [], materialIds: [], materialNeed: "", expectedResult: "", requiresTeacherApproval: true, serviceRequestId: "", reviewedAt: "", reviewedBy: "" }] }
      });

      const snapshot = async () => ({
        landscape: (await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/learning-landscape` })).body,
        temporal: (await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/temporal-plan` })).body,
        board: (await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/planning-board` })).body
      });
      const before = await snapshot();

      for (const kind of ["learning_moment", "transition", "temporal_placement", "board_item"]) {
        const response = await app.inject({ method: "POST", url: `/api/planning-spaces/${id}/proposals`, payload: { kind } });
        expect(response.statusCode).toBe(200);
      }

      const after = await snapshot();
      expect(after).toEqual(before);
    } finally {
      await app.close();
    }
  });
});
