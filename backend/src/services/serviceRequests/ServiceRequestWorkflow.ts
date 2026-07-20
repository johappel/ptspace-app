import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";
import { BoardMaterialWorkerInputSchema, PlanningSpace } from "@ptspace/shared";
import { HarnessAdapter, HarnessReviewResult } from "../harness/HarnessAdapter.js";
import { parseLearningLandscape, parsePlanningBoard } from "../planning/PlanningArtifactCodec.js";
import { MaterialAssignmentService } from "../materials/MaterialAssignmentService.js";

export type ServiceKind = "memory" | "knowledge" | "worker" | "renderer" | "review";
export type ServiceRequestStatus = "proposed" | "approved" | "queued" | "in_progress" | "returned" | "reviewed" | "failed" | "discarded";

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
  relatedWindows?: string[];
  expectedResult?: string;
  reviewRequired: boolean;
  createdAt: string;
  updatedAt: string;
  review?: { status: "passed" | "failed"; note: string; reviewedAt: string };
  automaticCheck?: { status: "pending" | "passed" | "failed"; note: string; checkedAt?: string };
  criticalFriendCheck?: { status: "pending" | "passed" | "concerns" | "blocked"; note: string; checkedAt?: string };
  teacherReview?: { status: "accepted"; reviewedBy: string; reviewedAt: string; note?: string };
};

export type KernelServiceRequest = {
  id: string;
  status: ServiceRequestStatus;
  service: ServiceKind;
  mode: string;
  task: string;
  capability: string;
  reason: string;
  input: Record<string, unknown>;
  expected_output: { type: string; location: string; material_id?: string };
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

const capabilityPaths: Record<string, string> = {
  create_student_instruction: "capabilities/workers/CREATE_STUDENT_INSTRUCTION.md",
  create_board_material: "capabilities/workers/CREATE_BOARD_MATERIAL.md"
};

export class ServiceRequestWorkflow {
  private readonly runningSpaces = new Set<string>();
  private returnedHook?: (planningSpaceId: string, request: AppServiceRequest) => Promise<void>;

  constructor(private readonly workspace: WorkspaceManager, private readonly harness: HarnessAdapter, private readonly materialAssignment?: MaterialAssignmentService) {}

  setReturnedHook(hook: (planningSpaceId: string, request: AppServiceRequest) => Promise<void>): void {
    this.returnedHook = hook;
  }

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
  // pädagogischen Bezug gebunden. Der Worker erhält die dazugehörigen
  // Lernmomentbeschreibungen statt nur unprüfbarer IDs.
  async proposeBoardMaterial(
    planningSpaceId: string,
    input: { boardItemId: string; reason: string; relatedMoments: string[]; expectedResult: string; title: string; targetGroup: string; constraints?: Record<string, unknown> }
  ): Promise<AppServiceRequest> {
    if (!input.boardItemId) throw new Error("service_request_needs_board_item");
    if (input.relatedMoments.length === 0) throw new Error("service_request_needs_pedagogical_reference");
    if (!input.expectedResult.trim()) throw new Error("service_request_needs_expected_result");

    const board = parsePlanningBoard(await this.workspace.readProjectFile(planningSpaceId, "planning-board.yml"));
    const boardItem = board.items.find((item) => item.id === input.boardItemId);
    if (!boardItem) {
      throw new Error("service_request_needs_existing_board_item");
    }
    const landscape = parseLearningLandscape(await this.workspace.readProjectFile(planningSpaceId, "learning-landscape.md"));
    const relatedMomentContexts = input.relatedMoments.map((momentId) => landscape.moments.find((moment) => moment.id === momentId));
    if (relatedMomentContexts.some((moment) => !moment)) {
      throw new Error("service_request_needs_existing_learning_moment");
    }

    const workerInput = BoardMaterialWorkerInputSchema.parse({
      learningDesign: "learning-design.md",
      boardItemId: input.boardItemId,
      title: input.title,
      expectedResult: input.expectedResult.trim(),
      relatedMoments: relatedMomentContexts,
      targetGroup: input.targetGroup.trim(),
      language: "de"
    });

    return this.propose(planningSpaceId, {
      service: "worker",
      mode: "draft",
      capability: "create_board_material",
      reason: input.reason,
      input: workerInput,
      constraints: { language: workerInput.language, ...(input.constraints ?? {}) },
      boardItemId: input.boardItemId,
      relatedMoments: input.relatedMoments,
      relatedWindows: boardItem.relatedWindows,
      expectedResult: workerInput.expectedResult,
      locationOverride: "materials/" + input.boardItemId + ".md"
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
      relatedWindows?: string[];
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
      relatedWindows: input.relatedWindows,
      expectedResult: input.expectedResult,
      reviewRequired: true,
      createdAt: now,
      updatedAt: now
    };
    await this.save(request);
    return request;
  }

  async proposeGuidedWorker(
    planningSpaceId: string,
    input: {
      capability: "create_board_material" | "create_student_instruction";
      boardItemId: string;
      title: string;
      reason: string;
      expectedResult: string;
      relatedMoments: string[];
      targetGroup: string;
    }
  ): Promise<AppServiceRequest> {
    if (input.capability === "create_board_material") {
      return this.proposeBoardMaterial(planningSpaceId, {
        boardItemId: input.boardItemId,
        title: input.title,
        reason: input.reason,
        expectedResult: input.expectedResult,
        relatedMoments: input.relatedMoments,
        targetGroup: input.targetGroup
      });
    }
    return this.propose(planningSpaceId, {
      service: "worker",
      mode: "draft",
      capability: "create_student_instruction",
      reason: input.reason,
      input: {
        learningDesign: "learning-design.md",
        title: input.title,
        expectedResult: input.expectedResult,
        boardItemId: input.boardItemId,
        targetGroup: input.targetGroup
      },
      constraints: { language: "de" },
      boardItemId: input.boardItemId,
      relatedMoments: input.relatedMoments,
      expectedResult: input.expectedResult,
      locationOverride: "materials/" + input.boardItemId + ".md"
    });
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

  async get(planningSpaceId: string, requestId: string): Promise<AppServiceRequest | undefined> {
    try {
      return await this.read(planningSpaceId, requestId);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async saveRequest(request: AppServiceRequest): Promise<void> {
    await this.save(request);
  }

  async remove(planningSpaceId: string, requestId: string): Promise<void> {
    const safeId = path.basename(requestId);
    if (safeId !== requestId) throw new Error("invalid_service_request_id");
    await fs.rm(path.join(this.requestsDirectory(planningSpaceId), `${safeId}.json`), { force: true });
  }

  /**
   * Starts a queued request without keeping the HTTP request open. The request
   * state is persisted before and after every harness call so reload/recovery
   * can show the last trustworthy teacher-facing state.
   */
  async runQueued(planningSpaceId: string, requestId: string, space: PlanningSpace): Promise<void> {
    if (this.runningSpaces.has(planningSpaceId)) return;
    this.runningSpaces.add(planningSpaceId);
    try {
      const request = await this.read(planningSpaceId, requestId);
      if (request.status !== "queued" && request.status !== "in_progress") return;
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
          input: request.capability === "create_board_material"
            ? BoardMaterialWorkerInputSchema.parse(request.input)
            : request.input,
          reason: request.reason,
          expectedOutput: { type: request.expectedOutput.type, relativePath: request.expectedOutput.location },
          constraints: request.constraints
        });
        if (result.events.some((event) => event.type === "status" && event.status === "failed")) {
          throw new Error("worker_execution_failed");
        }
        if (request.boardItemId && this.materialAssignment) {
          await this.materialAssignment.returnMaterial(planningSpaceId, {
            id: `material-${request.boardItemId}`,
            title: typeof request.input.title === "string" ? request.input.title : "Materialentwurf",
            kind: "board_material",
            status: "in_review",
            relatedMoments: request.relatedMoments ?? [],
            relatedWindows: request.relatedWindows ?? [],
            relatedBoardItems: [request.boardItemId],
            relatedDecisions: [],
            sourceRequest: request.id,
            createdAt: request.createdAt,
            reviewedAt: null
          }, result.workspaceUpdates, { column: "review", status: "review" });
        } else {
          for (const update of result.workspaceUpdates) {
            await this.workspace.writeProjectFile(planningSpaceId, update.relativePath, update.content);
          }
        }
        request.status = "returned";
        request.updatedAt = new Date().toISOString();
        request.automaticCheck = await this.automaticCheck(planningSpaceId, request);
        request.review = {
          status: request.automaticCheck.status === "passed" ? "passed" : "failed",
          note: request.automaticCheck.note,
          reviewedAt: request.automaticCheck.checkedAt ?? request.updatedAt
        };
        request.criticalFriendCheck = await this.criticalFriendCheck(planningSpaceId, request, space, session);
        await this.save(request);
        try {
          await this.returnedHook?.(planningSpaceId, request);
        } catch {
          // The marker is a read-model projection. A transient marker failure
          // must not turn an already returned material into a failed request.
        }
      } catch (error) {
        request.status = "failed";
        request.updatedAt = new Date().toISOString();
        request.automaticCheck = {
          status: "failed",
          note: "Die Vorbereitung konnte noch nicht sicher abgeschlossen werden.",
          checkedAt: request.updatedAt
        };
        request.review = { status: "failed", note: error instanceof Error ? error.message : "Ausführung fehlgeschlagen.", reviewedAt: request.updatedAt };
        await this.save(request);
      }
    } finally {
      this.runningSpaces.delete(planningSpaceId);
    }
  }

  async queue(planningSpaceId: string, requestId: string, space: PlanningSpace): Promise<AppServiceRequest> {
    const request = await this.read(planningSpaceId, requestId);
    if (request.status === "proposed" || request.status === "approved") {
      request.status = "queued";
      request.updatedAt = new Date().toISOString();
      await this.save(request);
    }
    void this.runQueued(planningSpaceId, requestId, space);
    return request;
  }

  async acceptTeacherReview(planningSpaceId: string, requestId: string, reviewedBy = "Lehrkraft", note?: string): Promise<AppServiceRequest> {
    const request = await this.read(planningSpaceId, requestId);
    if (request.status === "reviewed" && request.teacherReview) {
      return request;
    }
    if (request.status !== "returned") throw new Error("service_request_not_returned");
    if (request.automaticCheck?.status !== "passed") throw new Error("automatic_check_failed");
    if (request.criticalFriendCheck?.status === "blocked") throw new Error("critical_friend_review_blocked");
    const reviewedAt = new Date().toISOString();
    request.status = "reviewed";
    request.updatedAt = reviewedAt;
    request.teacherReview = { status: "accepted", reviewedBy, reviewedAt, ...(note ? { note } : {}) };
    await this.save(request);
    return request;
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
        input: request.capability === "create_board_material"
          ? BoardMaterialWorkerInputSchema.parse(request.input)
          : request.input,
        expectedOutput: { type: request.expectedOutput.type, relativePath: request.expectedOutput.location },
        constraints: request.constraints
      });
      if (result.events.some((event) => event.type === "status" && event.status === "failed")) {
        throw new Error("worker_execution_failed");
      }
      if (request.boardItemId && request.capability === "create_board_material" && this.materialAssignment) {
        await this.materialAssignment.returnMaterial(planningSpaceId, {
          id: `material-${request.boardItemId}`,
          title: typeof request.input.title === "string" ? request.input.title : "Materialentwurf",
          kind: "board_material",
          status: "in_review",
          relatedMoments: request.relatedMoments ?? [],
          relatedWindows: request.relatedWindows ?? [],
          relatedBoardItems: [request.boardItemId],
          relatedDecisions: [],
          sourceRequest: request.id,
          createdAt: request.createdAt,
          reviewedAt: null
        }, result.workspaceUpdates);
      } else {
        for (const update of result.workspaceUpdates) {
          await this.workspace.writeProjectFile(planningSpaceId, update.relativePath, update.content);
        }
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
    const capability = capabilityPaths[request.capability];
    if (!capability) throw new Error("capability_not_approved");

    const { learningDesign: _learningDesign, ...rest } = request.input;
    const input: Record<string, unknown> = {
      ...rest,
      learning_design: "workspace/" + workspaceName + "/learning-design.md"
    };
    if (request.capability === "create_board_material") {
      const { learningDesign: _learningDesignSnapshot, boardItemId: _boardItemId, expectedResult: _expectedResult, relatedMoments: _relatedMoments, targetGroup: _targetGroup, ...boardInput } = request.input;
      const relatedMomentSnapshots = Array.isArray(request.input.relatedMoments)
        ? request.input.relatedMoments.map((moment) => {
            const snapshot = moment as Record<string, unknown>;
            return {
              id: snapshot.id,
              title: snapshot.title,
              didactic_purpose: snapshot.didacticPurpose,
              learning_activity: snapshot.learningActivity,
              expected_experience: snapshot.expectedExperience,
              material_needs: snapshot.materialNeeds,
              open_questions: snapshot.openQuestions
            };
          })
        : [];
      Object.assign(input, {
        ...boardInput,
        board_item_id: request.boardItemId,
        title: request.input.title,
        expected_result: request.expectedResult,
        related_nodes: request.relatedMoments ?? [],
        related_moments: relatedMomentSnapshots,
        related_windows: request.relatedWindows ?? [],
        target_group: request.input.targetGroup
      });
      delete input.boardItemId;
      delete input.expectedResult;
      delete input.relatedMoments;
      delete input.targetGroup;
    }

    const expectedOutput: KernelServiceRequest["expected_output"] = {
      type: request.expectedOutput.type,
      location: "workspace/" + workspaceName + "/" + request.expectedOutput.location
    };
    if (request.boardItemId) expectedOutput.material_id = "material-" + request.boardItemId;
    return {
      id: request.id,
      status: request.status,
      service: request.service,
      mode: request.mode,
      task: request.capability,
      capability,
      reason: request.reason,
      input,
      expected_output: expectedOutput,
      constraints: request.constraints,
      return_to: request.returnTo,
      requires_approval: request.requiresApproval
    };
  }

  private async automaticCheck(planningSpaceId: string, request: AppServiceRequest): Promise<{ status: "passed" | "failed"; note: string; checkedAt: string }> {
    const checkedAt = new Date().toISOString();
    try {
      const result = await this.workspace.readProjectFile(planningSpaceId, request.expectedOutput.location);
      if (!result || result.trim().length < 10 || !result.includes("#")) {
        return { status: "failed", note: "Der zurückgekehrte Entwurf enthält noch keinen prüfbaren Inhalt.", checkedAt };
      }
      return { status: "passed", note: "Die Datei ist vorhanden und enthält eine lesbare Entwurfsstruktur.", checkedAt };
    } catch {
      return { status: "failed", note: "Der zurückgekehrte Entwurf konnte noch nicht gelesen werden.", checkedAt };
    }
  }

  private async criticalFriendCheck(
    planningSpaceId: string,
    request: AppServiceRequest,
    space: PlanningSpace,
    session: { id: string; planningSpaceId: string; workspaceRoot: string }
  ): Promise<{ status: "passed" | "concerns" | "blocked"; note: string; checkedAt: string }> {
    const checkedAt = new Date().toISOString();
    if (!this.harness.reviewTask) {
      return { status: "passed", note: "Für diesen geschützten Modus liegt keine zusätzliche blockierende Critical-Friend-Rückmeldung vor.", checkedAt };
    }
    const result: HarnessReviewResult = await this.harness.reviewTask({
      session,
      space,
      capability: request.capability,
      expectedOutput: { type: request.expectedOutput.type, relativePath: request.expectedOutput.location },
      context: {
        reason: request.reason,
        expectedResult: request.expectedResult ?? "",
        relatedMoments: request.relatedMoments ?? []
      }
    });
    return { ...result, checkedAt };
  }

  private async reviewReturnedResult(planningSpaceId: string, request: AppServiceRequest): Promise<void> {
    const result = await this.workspace.readProjectFile(planningSpaceId, request.expectedOutput.location);
    // Minimale Validierung: die Datei muss existieren und nicht leer sein
    if (!result || result.trim().length < 10) {
      throw new Error("review_failed");
    }
    // Erlauben wir den Review auch wenn die Struktur nicht perfekt ist
    // (der Worker könnte eine leicht andere Formatierung nutzen)
    const hasBasicStructure = 
      (result.includes("#") || result.includes("*")) && // Irgendein Markdown
      result.length > 50; // Mindestens etwas Inhalt

    if (!hasBasicStructure) {
      throw new Error("review_failed");
    }
    request.status = "reviewed";
    request.updatedAt = new Date().toISOString();
    request.review = {
      status: "passed",
      note: "Der Entwurf wurde vom Worker vorbereitet. Die inhaltliche Prüfung durch den Critical Friend und die Lehrkraft steht noch aus.",
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
