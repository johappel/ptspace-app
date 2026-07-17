import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ServiceRequestWorkflow } from "../src/services/serviceRequests/ServiceRequestWorkflow.js";
import { WorkspaceManager } from "../src/services/workspace/WorkspaceManager.js";
import { MockHarnessAdapter } from "../src/services/harness/MockHarnessAdapter.js";

let tempRoot: string;
let workspace: WorkspaceManager;
let workflow: ServiceRequestWorkflow;

const now = new Date().toISOString();
const space = {
  id: "room-1",
  title: "Hoffnung trotz Krise",
  subject: "Religion",
  targetGroup: "Klasse 9",
  initialIdea: "Handlungsfähigkeit trotz Ohnmacht",
  status: "active" as const,
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
};

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-service-test-"));
  workspace = new WorkspaceManager(tempRoot);
  workflow = new ServiceRequestWorkflow(workspace, new MockHarnessAdapter());
  await workspace.ensureWorkspace(space);
});

async function seedBoardMaterialContext(): Promise<void> {
  await workspace.writeProjectFile(space.id, "learning-landscape.md", [
    "---",
    "schema: ptspace.learning-landscape/v1",
    "title: Lernlandschaft",
    "structure: linear",
    "---",
    "",
    "# Lernlandschaft",
    "",
    "## lm-impuls – Bildimpuls",
    "",
    "- Typ: Impuls",
    "- Funktion: Erste Wahrnehmung und Irritation",
    "- Lernaktivität: Die Lernenden beschreiben ihre Beobachtung.",
    "- Erwartete Lernerfahrung: Die Lernenden bemerken unterschiedliche Deutungen.",
    "- Status: draft"
  ].join("\n") + "\n");
  await workspace.writeProjectFile(space.id, "planning-board.yml", [
    "schema: ptspace.planning-board/v1",
    "items:",
    "  - id: pb-1",
    "    title: Arbeitsblatt zum Impuls",
    "    kind: produce",
    "    column: prepare",
    "    status: proposed",
    "    related_nodes: [lm-impuls]",
    "    requires_teacher_approval: true"
  ].join("\n") + "\n");
}
afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("ServiceRequestWorkflow", () => {
  it("maps the app request explicitly to the kernel snake_case contract", async () => {
    const request = await workflow.proposeStudentInstruction(space.id, "Die pädagogischen Entscheidungen reichen für einen ersten Entwurf.");
    const kernel = workflow.toKernelContract(request);
    expect(kernel.task).toBe("create_student_instruction");
    expect(kernel.capability).toBe("capabilities/workers/CREATE_STUDENT_INSTRUCTION.md");
    expect(kernel.return_to).toBe("critical_friend");
    expect(kernel.requires_approval).toBe(true);
    expect(kernel.input.learning_design).toBe("workspace/hoffnung-trotz-krise-religion/learning-design.md");
    expect(kernel.input).not.toHaveProperty("learningDesign");
    expect(kernel.expected_output.location).toContain("/hoffnung-trotz-krise-religion/drafts/student-instruction.md");
  });

  it("requires approval, runs the worker and returns the result through review", async () => {
    const request = await workflow.proposeStudentInstruction(space.id, "Die pädagogischen Entscheidungen reichen für einen ersten Entwurf.");
    expect(request.status).toBe("proposed");
    const completed = await workflow.approveAndRun(space.id, request.id, space);
    expect(completed.status).toBe("reviewed");
    expect(completed.review?.status).toBe("passed");
    const material = await workspace.readProjectFile(space.id, "drafts/student-instruction.md");
    expect(material).toContain("# Entwurf: Arbeitsauftrag");
    expect(material).toContain("Status: Entwurf");
  });

  it("rejects unapproved capabilities instead of improvising a worker", async () => {
    await expect(workflow.propose(space.id, {
      service: "knowledge",
      mode: "research",
      capability: "unknown_research",
      reason: "Eine nicht freigegebene Fähigkeit darf nicht still ausgeführt werden."
    })).rejects.toThrow("capability_not_approved");
  });

  it("binds a material request to a board card and at least one pedagogical reference", async () => {
    await seedBoardMaterialContext();
    const request = await workflow.proposeBoardMaterial(space.id, {
      boardItemId: "pb-1",
      targetGroup: space.targetGroup,
      title: "Arbeitsblatt zum Impuls",
      relatedMoments: ["lm-impuls"],
      expectedResult: "Ein differenziertes Arbeitsblatt als Entwurf.",
      reason: "Für dieses Arbeitsvorhaben soll ein erster, ausdrücklich noch zu prüfender Entwurf entstehen."
    });
    expect(request.boardItemId).toBe("pb-1");
    expect(request.relatedMoments).toEqual(["lm-impuls"]);
    expect(request.reviewRequired).toBe(true);
    expect(request.expectedOutput.location).toBe("materials/pb-1.md");
    expect(request.input).toMatchObject({ expectedResult: "Ein differenziertes Arbeitsblatt als Entwurf." });
    expect(request.input.relatedMoments).toMatchObject([{ id: "lm-impuls", title: "Bildimpuls" }]);
  });

  it("maps a board material request to the complete kernel traceability contract", async () => {
    await seedBoardMaterialContext();
    const request = await workflow.proposeBoardMaterial(space.id, {
      boardItemId: "pb-1",
      targetGroup: space.targetGroup,
      title: "Arbeitsblatt zum Impuls",
      relatedMoments: ["lm-impuls"],
      expectedResult: "Ein differenziertes Arbeitsblatt als Entwurf.",
      reason: "Fuer dieses Arbeitsvorhaben soll ein erster Entwurf entstehen."
    });
    const kernel = workflow.toKernelContract(request);
    expect(kernel).toMatchObject({
      task: "create_board_material",
      capability: "capabilities/workers/CREATE_BOARD_MATERIAL.md",
      input: {
        board_item_id: "pb-1",
        expected_result: "Ein differenziertes Arbeitsblatt als Entwurf.",
        related_nodes: ["lm-impuls"],
        related_windows: [],
        target_group: "Klasse 9",
        language: "de"
      },
      expected_output: {
        type: "material_draft",
        material_id: "material-pb-1"
      }
    });
    expect(kernel.input).not.toHaveProperty("boardItemId");
    expect(kernel.input).not.toHaveProperty("relatedMoments");
    expect(kernel.input.related_moments).toMatchObject([{ id: "lm-impuls", title: "Bildimpuls" }]);
    expect(kernel.expected_output.location).toContain("/hoffnung-trotz-krise-religion/materials/pb-1.md");
  });

  it("refuses a material request without a pedagogical reference", async () => {
    await expect(workflow.proposeBoardMaterial(space.id, {
      boardItemId: "pb-1",
      targetGroup: space.targetGroup,
      title: "Arbeitsblatt",
      relatedMoments: [],
      expectedResult: "",
      reason: "Ein Materialauftrag ohne pädagogischen Bezug darf nicht entstehen."
    })).rejects.toThrow("service_request_needs_pedagogical_reference");
  });

  it("returns a bound worker result as a reviewable draft, not as classroom-ready material", async () => {
    await seedBoardMaterialContext();
    const request = await workflow.proposeBoardMaterial(space.id, {
      boardItemId: "pb-1",
      targetGroup: space.targetGroup,
      title: "Arbeitsblatt zum Impuls",
      relatedMoments: ["lm-impuls"],
      expectedResult: "Ein Entwurf.",
      reason: "Für dieses Arbeitsvorhaben soll ein erster, ausdrücklich noch zu prüfender Entwurf entstehen."
    });
    const completed = await workflow.approveAndRun(space.id, request.id, space);
    expect(completed.status).toBe("reviewed");
    const material = await workspace.readProjectFile(space.id, "materials/pb-1.md");
    expect(material).toContain("# Entwurf: Arbeitsblatt zum Impuls");
    expect(material).toContain("Status: Entwurf");
  });
});
