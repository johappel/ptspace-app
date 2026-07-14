import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanningSpace } from "@ptspace/shared";
import { WorkspaceManager } from "../src/services/workspace/WorkspaceManager.js";
import { parseTemporalPlan } from "../src/services/planning/TemporalPlanCodec.js";
import { parseLearningLandscape, parsePlanningBoard } from "../src/services/planning/PlanningArtifactCodec.js";

// Phase 10 (T-1000/T-1001/T-403): Bestehende Workspaces müssen ohne Datenverlust
// in das aktuelle Kernel-Format überführbar sein. Es existiert kein persistiertes
// Alt-Zeitformat (Zeitfenster/Platzierungen wurden nie in learning-landscape.md
// geschrieben); Zeitdaten leben jetzt kanonisch in temporal-plan.yml. Die Migration
// ist damit die Garantie, dass ein alter Workspace beim Öffnen valide neue Artefakte
// erhält und keine vorhandene Datei überschrieben oder verloren wird.

let tempRoot: string;
let workspace: WorkspaceManager;

const now = new Date().toISOString();

function legacySpace(): PlanningSpace {
  return {
    id: "space-legacy",
    workspaceSlug: "legacy-raum-religion",
    title: "Legacy Raum",
    subject: "Religion",
    targetGroup: "Klasse 9",
    initialIdea: "Vor dem Refactoring angelegter Planungsraum.",
    status: "active",
    participants: [],
    createdAt: now,
    updatedAt: now,
    learningDesign: {
      context: { subject: "Religion", grade: "Klasse 9", setting: "", constraints: [] },
      intention: { summary: "", learnersShould: { know: [], understand: [], experience: [], becomeAbleTo: [] } },
      learningJourney: { startingPoint: "", turningPoints: [] },
      reflection: { learnerReflection: [], teacherReflection: [], openQuestions: [] }
    },
    openQuestions: [],
    decisions: [],
    nextSteps: [],
    materials: []
  } as PlanningSpace;
}

const legacyFiles: Record<string, string> = {
  "learning-design.md": "# Denkstand\n\n## Thema\nHoffnung trotz Krise\n\n## Lernanliegen\nHandlungsfähigkeit trotz Ohnmacht.\n",
  "next-steps.md": "# Nächste Schritte\n\n- Lernanliegen in einem Satz formulieren\n- Zentrale Lernerfahrung beschreiben\n",
  "decisions.md": "# Offene Entscheidungen\n\n- Wir starten mit einem Bildimpuls statt mit einem Text.\n",
  "open-questions.md": "# Offene Fragen\n\n- Welche Lernerfahrung soll im Mittelpunkt stehen?\n"
};

async function seedLegacyWorkspace(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  for (const [file, content] of Object.entries(legacyFiles)) {
    await fs.writeFile(path.join(root, file), content, "utf8");
  }
}

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-migration-test-"));
  workspace = new WorkspaceManager(tempRoot);
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("Workspace-Migration in das aktuelle Kernel-Format", () => {
  it("öffnet einen alten Workspace, ergänzt valide neue Artefakte und lässt Legacy-Dateien unverändert", async () => {
    const space = legacySpace();
    const root = path.join(tempRoot, space.workspaceSlug!);
    await seedLegacyWorkspace(root);

    await workspace.ensureWorkspace(space);

    // Neue kanonische Artefakte existieren und sind gültig lesbar.
    const temporalPlan = parseTemporalPlan(await fs.readFile(path.join(root, "temporal-plan.yml"), "utf8"));
    expect(temporalPlan.windows).toHaveLength(0);
    expect(temporalPlan.placements).toHaveLength(0);

    const board = parsePlanningBoard(await fs.readFile(path.join(root, "planning-board.yml"), "utf8"));
    expect(board.items).toHaveLength(0);

    const landscape = parseLearningLandscape(await fs.readFile(path.join(root, "learning-landscape.md"), "utf8"));
    expect(landscape.schema).toBe("ptspace.learning-landscape/v1");

    // Keine vorhandene Legacy-Datei wurde überschrieben (keine stille Löschung).
    for (const [file, content] of Object.entries(legacyFiles)) {
      expect(await fs.readFile(path.join(root, file), "utf8")).toBe(content);
    }
  });

  it("ist wiederholbar: ein zweiter Öffnungsvorgang verändert keine Datei (bereits migriert)", async () => {
    const space = legacySpace();
    const root = path.join(tempRoot, space.workspaceSlug!);
    await seedLegacyWorkspace(root);

    await workspace.ensureWorkspace(space);
    const firstPass = await snapshotDirectory(root);

    await workspace.ensureWorkspace(space);
    const secondPass = await snapshotDirectory(root);

    expect(secondPass).toEqual(firstPass);
  });

  it("bewahrt eine vorhandene Lernlandschaft samt Lernmoment und erzeugt einen leeren Zeitplan", async () => {
    const space = legacySpace();
    const root = path.join(tempRoot, space.workspaceSlug!);
    await seedLegacyWorkspace(root);
    const existingLandscape = `---\nschema: ptspace.learning-landscape/v1\ntitle: Legacy Raum\nstructure: linear\n---\n\n# Lernlandschaft\n\n## lm-impuls – Bildimpuls\n\n- Typ: Impuls\n- Funktion: Irritation\n`;
    await fs.writeFile(path.join(root, "learning-landscape.md"), existingLandscape, "utf8");

    await workspace.ensureWorkspace(space);

    // Vorhandene semantische Datei bleibt unangetastet.
    expect(await fs.readFile(path.join(root, "learning-landscape.md"), "utf8")).toBe(existingLandscape);
    // Zeitdaten leben getrennt: ein neuer, gültiger, leerer Temporal Plan entsteht.
    const temporalPlan = parseTemporalPlan(await fs.readFile(path.join(root, "temporal-plan.yml"), "utf8"));
    expect(temporalPlan.placements).toHaveLength(0);
  });
});

async function snapshotDirectory(root: string): Promise<Record<string, string>> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const snapshot: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.isFile()) {
      snapshot[entry.name] = await fs.readFile(path.join(root, entry.name), "utf8");
    }
  }
  return snapshot;
}
