import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";
import { PlanningSpace } from "@ptspace/shared";
import { HarnessAdapter } from "../harness/HarnessAdapter.js";

export type ServiceKind = "memory" | "knowledge" | "worker" | "renderer" | "review";
export type ServiceRequestStatus = "proposed" | "approved" | "in_progress" | "returned" | "reviewed" | "failed";

export type AppServiceRequest = {
  id: string;
  planningSpaceId: string;
  status: ServiceRequestStatus;
  service: ServiceKind;
  mode: string;
  capability: string;
  reason: string;
  input: Record<string, unknown>;
  expectedOutput: { type: string; location: string };
  constraints: Record<string, unknown>;
  returnTo: "critical_friend";
  requiresApproval: boolean;
  // Phase 9 (T-900): jeder Worker-Auftrag ist an ein Arbeitsvorhaben und einen
  // pädagogischen Bezug gebunden. Es gibt keinen ungebundenen Materialauftrag.
  boardItemId?: string;
  relatedMoments?: string[];
  expectedResult?: string;
  reviewRequired: boolean;
  createdAt: string;
  updatedAt: string;
  review?: { status: "passed" | "failed"; note: string; reviewedAt: string };
};

export type KernelServiceRequest = {
  id: string;
  status: ServiceRequestStatus;
  service: ServiceKind;
  mode: string;
  task: string;
  reason: string;
  input: Record<string, unknown>;
  expected_output: { type: string; location: string };
  constraints: Record<string, unknown>;
  return_to: "critical_friend";
  requires_approval: boolean;
};

type CapabilityContract = {
  id: string;
  service: ServiceKind;
  modes: string[];
  outputType: string;
  defaultLocation: string;
  teacherFacingLabel: string;
};

const capabilities: Record<string, CapabilityContract> = {
  create_student_instruction: {
    id: "create_student_instruction",
    service: "worker",
    modes: ["draft"],
    outputType: "student_instruction",
    defaultLocation: "drafts/student-instruction.md",
    teacherFacingLabel: "Arbeitsauftrag als Entwurf vorbereiten"
  },
  create_board_material: {
    id: "create_board_material",
    service: "worker",
    modes: ["draft"],
    outputType: "material_draft",
    defaultLocation: "materials/board-material.md",
    teacherFacingLabel: "Material für ein Arbeitsvorhaben entwerfen"
  }
};

export class ServiceRequestWorkflow {
  constructor(private readonly workspace: WorkspaceManager, private readonly harness: HarnessAdapter) {}

  listCapabilities(): CapabilityContract[] {
    return Object.values(capabilities);
  }

  async proposeStudentInstruction(planningSpaceId: string, reason: string): Promise<AppServiceRequest> {
    return this.propose(planningSpaceId, {
      service: "worker",
      mode: "draft",
      capability: "create_student_instruction",
      reason,
      input: { learningDesign: "learning-design.md" },
      constraints: { language: "de" }
    });
  }

  // T-900: Ein Materialauftrag ist immer an eine Board-Karte und mindestens einen
  // pädagogischen Bezug gebunden. Ohne diese Bindung entsteht kein Auftrag.
  async proposeBoardMaterial(
    planningSpaceId: string,
    input: { boardItemId: string; reason: string; relatedMoments: string[]; expectedResult: string; title: string; constraints?: Record<string, unknown> }
  ): Promise<AppServiceRequest> {
    if (!input.boardItemId) throw new Error("service_request_needs_board_item");
    if (input.relatedMoments.length === 0) throw new Error("service_request_needs_pedagogical_reference");
    return this.propose(planningSpaceId, {
      service: "worker",
      mode: "draft",
      capability: "create_board_material",
      reason: input.reason,
      input: { learningDesign: "learning-design.md", title: input.title },
      constraints: { language: "de", ...(input.constraints ?? {}) },
      boardItemId: input.boardItemId,
      relatedMoments: input.relatedMoments,
      expectedResult: input.expectedResult,
      locationOverride: `materials/${input.boardItemId}.md`
    });
  }

  async propose(
    planningSpaceId: string,
    input: {
      service: ServiceKind;
      mode: string;
      capability: string;
      reason: string;
      input?: Record<string, unknown>;
      constraints?: Record<string, unknown>;
      boardItemId?: string;
      relatedMoments?: string[];
      expectedResult?: string;
      locationOverride?: string;
    }
  ): Promise<AppServiceRequest> {
    const capability = capabilities[input.capability];
    if (!capability || capability.service !== input.service || !capability.modes.includes(input.mode)) {
      throw new Error("capability_not_approved");
    }
    const now = new Date().toISOString();
    const request: AppServiceRequest = {
      id: `sr-${randomUUID()}`,
      planningSpaceId,
      status: "proposed",
      service: input.service,
      mode: input.mode,
      capability: capability.id,
      reason: input.reason,
      input: input.input ?? {},
      expectedOutput: { type: capability.outputType, location: input.locationOverride ?? capability.defaultLocation },
      constraints: input.constraints ?? {},
      returnTo: "critical_friend",
      requiresApproval: true,
      boardItemId: input.boardItemId,
      relatedMoments: input.relatedMoments,
      expectedResult: input.expectedResult,
      reviewRequired: true,
      createdAt: now,
      updatedAt: now
    };
    await this.save(request);
    return request;
  }

  async list(planningSpaceId: string): Promise<AppServiceRequest[]> {
    const directory = this.requestsDirectory(planningSpaceId);
    try {
      const names = (await fs.readdir(directory)).filter((name) => name.endsWith(".json"));
      return Promise.all(names.map(async (name) => JSON.parse(await fs.readFile(path.join(directory, name), "utf8")) as AppServiceRequest));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async approveAndRun(planningSpaceId: string, requestId: string, space: PlanningSpace): Promise<AppServiceRequest> {
    const request = await this.read(planningSpaceId, requestId);
    if (request.status !== "proposed") throw new Error("service_request_not_proposed");
    request.status = "approved";
    request.updatedAt = new Date().toISOString();
    await this.save(request);
    request.status = "in_progress";
    request.updatedAt = new Date().toISOString();
    await this.save(request);
    try {
      const workspaceRoot = await this.workspace.ensureWorkspace(space);
      const session = await this.harness.createSession({ planningSpaceId, workspaceRoot });
      const result = await this.harness.requestTask({
        session,
        space,
        service: "worker",
        capability: request.capability,
        reason: request.reason,
        input: request.input,
        expectedOutput: { type: request.expectedOutput.type, relativePath: request.expectedOutput.location },
        constraints: request.constraints
      });
      if (result.events.some((event) => event.type === "status" && event.status === "failed")) {
        throw new Error("worker_execution_failed");
      }
      for (const update of result.workspaceUpdates) {
        await this.workspace.writeProjectFile(planningSpaceId, update.relativePath, update.content);
      }
      request.status = "returned";
      request.updatedAt = new Date().toISOString();
      await this.reviewReturnedResult(planningSpaceId, request);
      await this.save(request);
      return request;
    } catch (error) {
      request.status = "failed";
      request.updatedAt = new Date().toISOString();
      request.review = { status: "failed", note: error instanceof Error ? error.message : "Ausführung fehlgeschlagen.", reviewedAt: request.updatedAt };
      await this.save(request);
      throw error;
    }
  }

  toKernelContract(request: AppServiceRequest): KernelServiceRequest {
    const workspaceName = path.basename(this.workspace.getWorkspaceRoot(request.planningSpaceId));
    return {
      id: request.id,
      status: request.status,
      service: request.service,
      mode: request.mode,
      task: request.capability,
      reason: request.reason,
      input: { ...request.input, learning_design: `workspace/${workspaceName}/learning-design.md` },
      expected_output: {
        type: request.expectedOutput.type,
        location: `workspace/${workspaceName}/${request.expectedOutput.location}`
      },
      constraints: request.constraints,
      return_to: request.returnTo,
      requires_approval: request.requiresApproval
    };
  }

  private async reviewReturnedResult(planningSpaceId: string, request: AppServiceRequest): Promise<void> {
    const result = await this.workspace.readProjectFile(planningSpaceId, request.expectedOutput.location);
    const learningDesign = await this.workspace.readProjectFile(planningSpaceId, "learning-design.md");
    if (
      !result.includes("# Entwurf") ||
      !result.includes("## Auftrag") ||
      !result.includes("## Vorgehen") ||
      !result.includes("Status: Entwurf") ||
      result.length < 180 ||
      !learningDesign.trim()
    ) throw new Error("review_failed");
    request.status = "reviewed";
    request.updatedAt = new Date().toISOString();
    request.review = {
      status: "passed",
      note: "Automatische Vorprüfung bestanden: Der Entwurf ist vorhanden, vollständig gegliedert und als Entwurf gekennzeichnet. Die inhaltliche Prüfung durch den Critical Friend und die Lehrkraft steht noch aus.",
      reviewedAt: request.updatedAt
    };
  }

  private requestsDirectory(planningSpaceId: string): string {
    return this.workspace.resolveInsideWorkspace(planningSpaceId, "service-requests");
  }

  private async read(planningSpaceId: string, requestId: string): Promise<AppServiceRequest> {
    const safeId = path.basename(requestId);
    if (safeId !== requestId) throw new Error("invalid_service_request_id");
    const content = await fs.readFile(path.join(this.requestsDirectory(planningSpaceId), `${safeId}.json`), "utf8");
    return JSON.parse(content) as AppServiceRequest;
  }

  private async save(request: AppServiceRequest): Promise<void> {
    const directory = this.requestsDirectory(request.planningSpaceId);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, `${request.id}.json`), JSON.stringify(request, null, 2), "utf8");
  }
}
