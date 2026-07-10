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
    learningJourney: { startingPoint: "", phases: [], turningPoints: [] },
    activities: [],
    materials: [],
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

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("ServiceRequestWorkflow", () => {
  it("maps the app request explicitly to the kernel snake_case contract", async () => {
    const request = await workflow.proposeStudentInstruction(space.id, "Die pädagogischen Entscheidungen reichen für einen ersten Entwurf.");
    const kernel = workflow.toKernelContract(request);
    expect(kernel.task).toBe("create_student_instruction");
    expect(kernel.return_to).toBe("critical_friend");
    expect(kernel.requires_approval).toBe(true);
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
});
