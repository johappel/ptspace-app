import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MaterialAssignmentService } from "../src/services/materials/MaterialAssignmentService.js";
import { MaterialManifestStore } from "../src/storage/MaterialManifestStore.js";
import { WorkspaceManager } from "../src/services/workspace/WorkspaceManager.js";

let root: string;
let workspace: WorkspaceManager;
let materials: MaterialManifestStore;
let assignment: MaterialAssignmentService;
const now = new Date().toISOString();

const space = {
  id: "space-materials",
  workspaceSlug: "material-test",
  title: "Materialzuordnung",
  subject: "Religion",
  targetGroup: "Klasse 9",
  initialIdea: "",
  status: "active" as const,
  participants: [],
  createdAt: now,
  updatedAt: now,
  learningDesign: { context: { subject: "Religion", grade: "Klasse 9", setting: "", constraints: [] }, intention: { summary: "", learnersShould: { know: [], understand: [], experience: [], becomeAbleTo: [] } }, learningJourney: { startingPoint: "", turningPoints: [] }, reflection: { learnerReflection: [], teacherReflection: [], openQuestions: [] } },
  openQuestions: [],
  decisions: [],
  nextSteps: [],
  materials: []
};

const landscape = `---
schema: ptspace.learning-landscape/v1
title: Lernlandschaft
structure: linear
---

# Lernlandschaft

## lm-impuls – Impuls

- Typ: Impuls
- Funktion: Einstieg
- Lernaktivität: Bild beschreiben
- Erwartete Lernerfahrung: Irritation
- Status: draft
`;

const board = `schema: ptspace.planning-board/v1
items:
  - id: pb-material
    title: Arbeitsblatt vorbereiten
    kind: produce
    column: prepare
    status: proposed
    related_nodes: [lm-impuls]
    material_ids: []
    requires_teacher_approval: true
`;

const material = {
  id: "material-impuls",
  title: "Impulskarte",
  kind: "student_material",
  status: "in_review" as const,
  relatedMoments: [],
  relatedWindows: [],
  relatedBoardItems: [],
  relatedDecisions: ["dec-existing"],
  sourceRequest: "sr-impuls",
  createdAt: now,
  reviewedAt: null
};

async function seed(): Promise<void> {
  await workspace.ensureWorkspace(space);
  await workspace.writeProjectFile(space.id, "learning-landscape.md", landscape);
  await workspace.writeProjectFile(space.id, "planning-board.yml", board);
  await workspace.writeProjectFile(space.id, "materials/impuls.md", "# Impulskarte\n\nEntwurf\n");
  await materials.save(space.id, { schema: "ptspace.material-manifest/v1", materials: [material] });
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-material-assignment-"));
  workspace = new WorkspaceManager(root);
  materials = new MaterialManifestStore(workspace);
  assignment = new MaterialAssignmentService(workspace, materials);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("MaterialAssignmentService", () => {
  it("updates material and target in both directions", async () => {
    await seed();
    const result = await assignment.assign(space.id, material.id, { type: "learning_moment", id: "lm-impuls" });
    expect(result.changed).toBe(true);
    expect(result.material.relatedMoments).toEqual(["lm-impuls"]);
    expect(result.learningLandscape.moments[0].materialIds).toEqual([material.id]);
    expect((await materials.get(space.id, material.id))?.relatedMoments).toEqual(["lm-impuls"]);

    const boardResult = await assignment.assign(space.id, material.id, { type: "board_item", id: "pb-material" });
    expect(boardResult.material.relatedBoardItems).toEqual(["pb-material"]);
    expect(boardResult.planningBoard.items[0].materialIds).toEqual([material.id]);
  });

  it("rejects targets that are not part of the same workspace", async () => {
    await seed();
    await expect(assignment.assign(space.id, material.id, { type: "learning_moment", id: "lm-foreign" })).rejects.toThrow("learning_moment_not_found");
    await expect(assignment.assign(space.id, material.id, { type: "board_item", id: "pb-foreign" })).rejects.toThrow("board_item_not_found");
  });

  it("rolls back all canonical files when a later write fails", async () => {
    await seed();
    const beforeLandscape = await workspace.readProjectFile(space.id, "learning-landscape.md");
    const beforeBoard = await workspace.readProjectFile(space.id, "planning-board.yml");
    const beforeManifest = await workspace.readProjectFile(space.id, "materials/manifest.json");
    const failingWorkspace = new (class extends WorkspaceManager {
      async writeProjectFile(spaceId: string, relativePath: string, content: string): Promise<void> {
        if (relativePath === "planning-board.yml") throw new Error("simulated_write_failure");
        return super.writeProjectFile(spaceId, relativePath, content);
      }
    })(root);
    const failing = new MaterialAssignmentService(failingWorkspace, new MaterialManifestStore(failingWorkspace));
    await failingWorkspace.ensureWorkspace(space);

    await expect(failing.assign(space.id, material.id, { type: "learning_moment", id: "lm-impuls" })).rejects.toThrow("simulated_write_failure");
    expect(await workspace.readProjectFile(space.id, "learning-landscape.md")).toBe(beforeLandscape);
    expect(await workspace.readProjectFile(space.id, "planning-board.yml")).toBe(beforeBoard);
    expect(await workspace.readProjectFile(space.id, "materials/manifest.json")).toBe(beforeManifest);
  });
});
