import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  AttentionCard,
  BackgroundWorkItem,
  GuidedWorkerProposal,
  GuidedWorkerProposalSchema,
  PlanningBoard,
  PlanningBoardItem
} from "@ptspace/shared";
import { PlanningSpaceStore } from "../../storage/PlanningSpaceStore.js";
import { GuidedProposalStore } from "../../storage/GuidedProposalStore.js";
import { MaterialManifestStore } from "../../storage/MaterialManifestStore.js";
import { ConversationMarkerService } from "../conversation/ConversationMarkerService.js";
import { ServiceRequestWorkflow, AppServiceRequest } from "../serviceRequests/ServiceRequestWorkflow.js";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";
import { GitManager } from "../git/GitManager.js";
import { parseLearningLandscape, parsePlanningBoard, serializePlanningBoard } from "../planning/PlanningArtifactCodec.js";
import { SuggestedAction } from "../harness/HarnessAdapter.js";

type FileSnapshot = { path: string; exists: boolean; content?: string };

export class GuidedWorkflowService {
  constructor(
    private readonly spaces: PlanningSpaceStore,
    private readonly workspace: WorkspaceManager,
    private readonly proposals: GuidedProposalStore,
    private readonly workflow: ServiceRequestWorkflow,
    private readonly materials: MaterialManifestStore,
    private readonly markers: ConversationMarkerService,
    private readonly git: GitManager
  ) {}

  async list(planningSpaceId: string): Promise<GuidedWorkerProposal[]> {
    return this.proposals.list(planningSpaceId);
  }

  async create(
    planningSpaceId: string,
    input: {
      sourceMessageId: string;
      title: string;
      rationale: string;
      expectedResult: string;
      capability: "create_board_material" | "create_student_instruction";
      relatedMomentIds?: string[];
      materialNeed?: string;
    }
  ): Promise<GuidedWorkerProposal> {
    const space = await this.spaces.get(planningSpaceId);
    if (!space) throw new Error("planning_space_not_found");
    const landscape = parseLearningLandscape(await this.workspace.readProjectFile(planningSpaceId, "learning-landscape.md"));
    const relatedMomentIds = input.relatedMomentIds ?? [];
    if (relatedMomentIds.some((id) => !landscape.moments.some((moment) => moment.id === id))) {
      throw new Error("guided_proposal_unknown_moment");
    }
    const now = new Date().toISOString();
    const proposal = GuidedWorkerProposalSchema.parse({
      id: `guided-${randomUUID()}`,
      planningSpaceId,
      kind: "worker_draft",
      status: "pending",
      sourceMessageId: input.sourceMessageId,
      title: input.title.trim(),
      rationale: input.rationale.trim(),
      expectedResult: input.expectedResult.trim(),
      capability: input.capability,
      relatedMomentIds,
      ...(input.materialNeed?.trim() ? { materialNeed: input.materialNeed.trim() } : {}),
      createdAt: now,
      updatedAt: now
    });
    const existing = await this.proposals.list(planningSpaceId);
    const updated = existing.map((entry) => entry.status === "pending" ? { ...entry, status: "superseded" as const, updatedAt: now } : entry);
    await this.proposals.save(planningSpaceId, [...updated, proposal]);
    return proposal;
  }

  async createFromSuggestedAction(planningSpaceId: string, sourceMessageId: string, action: SuggestedAction): Promise<GuidedWorkerProposal> {
    return this.create(planningSpaceId, {
      sourceMessageId,
      title: action.title,
      rationale: action.rationale,
      expectedResult: action.expectedResult,
      capability: action.capability,
      relatedMomentIds: action.relatedMomentIds,
      materialNeed: action.materialNeed
    });
  }

  async discard(planningSpaceId: string, proposalId: string): Promise<GuidedWorkerProposal> {
    const proposal = await this.proposals.get(planningSpaceId, proposalId);
    if (!proposal) throw new Error("guided_proposal_not_found");
    if (proposal.status !== "pending") throw new Error("guided_proposal_not_pending");
    const discarded = { ...proposal, status: "discarded" as const, updatedAt: new Date().toISOString() };
    await this.proposals.upsert(planningSpaceId, discarded);
    return discarded;
  }

  async accept(planningSpaceId: string, proposalId: string, space: NonNullable<Awaited<ReturnType<PlanningSpaceStore["get"]>>>) {
    const proposal = await this.proposals.get(planningSpaceId, proposalId);
    if (!proposal) throw new Error("guided_proposal_not_found");
    if (proposal.status === "accepted" && proposal.acceptance) {
      const request = await this.workflow.get(planningSpaceId, proposal.acceptance.serviceRequestId);
      if (request) return { proposal, request };
    }
    if (proposal.status !== "pending") throw new Error("guided_proposal_not_pending");

    const boardSnapshot = await this.snapshot(planningSpaceId, "planning-board.yml");
    const proposalSnapshot = await this.proposals.snapshot(planningSpaceId);
    let request: AppServiceRequest | undefined;
    const accepting = { ...proposal, status: "accepting" as const, updatedAt: new Date().toISOString() };
    await this.proposals.upsert(planningSpaceId, accepting);
    try {
      const board = parsePlanningBoard(await this.workspace.readProjectFile(planningSpaceId, "planning-board.yml"));
      const boardItem: PlanningBoardItem = {
        id: `pb-${randomUUID().slice(0, 8)}`,
        title: proposal.title,
        kind: "produce",
        column: "prepare",
        status: "in_progress",
        relatedNodes: proposal.relatedMomentIds,
        relatedWindows: [],
        materialIds: [],
        materialNeed: proposal.materialNeed ?? "",
        expectedResult: proposal.expectedResult,
        requiresTeacherApproval: true,
        serviceRequestId: "",
        reviewedAt: "",
        reviewedBy: ""
      };
      board.items.push(boardItem);
      await this.workspace.writeProjectFile(planningSpaceId, "planning-board.yml", serializePlanningBoard(board));
      request = await this.workflow.proposeGuidedWorker(planningSpaceId, {
        capability: proposal.capability,
        boardItemId: boardItem.id,
        title: proposal.title,
        reason: proposal.rationale,
        expectedResult: proposal.expectedResult,
        relatedMoments: proposal.relatedMomentIds,
        targetGroup: space.targetGroup
      });
      boardItem.serviceRequestId = request.id;
      await this.workspace.writeProjectFile(planningSpaceId, "planning-board.yml", serializePlanningBoard(board));
      const accepted = {
        ...accepting,
        status: "accepted" as const,
        acceptance: { boardItemId: boardItem.id, serviceRequestId: request.id },
        updatedAt: new Date().toISOString()
      };
      await this.proposals.upsert(planningSpaceId, accepted);
      await this.markers.create(planningSpaceId, {
        sourceMessageId: proposal.sourceMessageId,
        kind: "work_started",
        targetType: "service_request",
        targetId: request.id,
        label: "Vorbereitung im Hintergrund"
      });
      const queued = await this.workflow.queue(planningSpaceId, request.id, space);
      await this.git.saveVersion(this.workspace.getWorkspaceRoot(planningSpaceId), "Vorbereitung aus dem Gespräch gestartet");
      return { proposal: accepted, request: queued };
    } catch (error) {
      if (request) await this.workflow.remove(planningSpaceId, request.id);
      await this.restore(planningSpaceId, boardSnapshot);
      await this.proposals.restore(planningSpaceId, proposalSnapshot);
      throw error;
    }
  }

  async review(
    planningSpaceId: string,
    requestId: string,
    reviewedBy = "Lehrkraft",
    note?: string
  ): Promise<{ request: AppServiceRequest; board: PlanningBoard }> {
    const requestBefore = await this.workflow.get(planningSpaceId, requestId);
    if (!requestBefore) throw new Error("service_request_not_found");
    const boardSnapshot = await this.snapshot(planningSpaceId, "planning-board.yml");
    const manifestSnapshot = await this.materials.snapshot(planningSpaceId);
    try {
      const request = await this.workflow.acceptTeacherReview(planningSpaceId, requestId, reviewedBy, note);
      if (!request.boardItemId) throw new Error("service_request_needs_board_item");
      const materialId = `material-${request.boardItemId}`;
      const material = await this.materials.get(planningSpaceId, materialId);
      if (!material) throw new Error("material_not_found");
      const reviewedAt = request.teacherReview?.reviewedAt ?? new Date().toISOString();
      await this.materials.upsert(planningSpaceId, { ...material, status: "ready_for_class", reviewedAt });
      const board = parsePlanningBoard(await this.workspace.readProjectFile(planningSpaceId, "planning-board.yml"));
      const item = board.items.find((entry) => entry.id === request.boardItemId);
      if (!item) throw new Error("board_item_not_found");
      item.column = "ready";
      item.status = "ready";
      item.reviewedAt = reviewedAt;
      item.reviewedBy = reviewedBy;
      await this.workspace.writeProjectFile(planningSpaceId, "planning-board.yml", serializePlanningBoard(board));
      const proposal = (await this.proposals.list(planningSpaceId)).find((entry) => entry.acceptance?.serviceRequestId === requestId);
      if (proposal) {
        await this.markers.create(planningSpaceId, {
          sourceMessageId: proposal.sourceMessageId,
          kind: "ready_for_class",
          targetType: "material",
          targetId: materialId,
          label: "Für den Unterricht bereit"
        });
      }
      await this.git.saveVersion(this.workspace.getWorkspaceRoot(planningSpaceId), "Material für den Unterricht freigegeben");
      return { request, board };
    } catch (error) {
      await this.workflow.saveRequest(requestBefore);
      await this.restore(planningSpaceId, boardSnapshot);
      await this.materials.restore(planningSpaceId, manifestSnapshot);
      throw error;
    }
  }

  async onRequestReturned(planningSpaceId: string, request: AppServiceRequest): Promise<void> {
    const proposal = (await this.proposals.list(planningSpaceId)).find((entry) => entry.acceptance?.serviceRequestId === request.id);
    if (!proposal || !request.boardItemId) return;
    await this.markers.create(planningSpaceId, {
      sourceMessageId: proposal.sourceMessageId,
      kind: "result_returned",
      targetType: "material",
      targetId: `material-${request.boardItemId}`,
      label: "Ergebnis zur Prüfung zurückgekehrt"
    });
  }

  async projection(planningSpaceId: string): Promise<{ attentionCard: AttentionCard; backgroundWork: BackgroundWorkItem[] }> {
    const requests = await this.workflow.list(planningSpaceId);
    const proposals = await this.proposals.list(planningSpaceId);
    const proposalByRequest = new Map(proposals.flatMap((proposal) => proposal.acceptance ? [[proposal.acceptance.serviceRequestId, proposal] as const] : []));
    const returned = requests.filter((request) => request.status === "returned").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (returned) {
      const proposal = proposalByRequest.get(returned.id);
      const content = await this.preview(planningSpaceId, returned.expectedOutput.location);
      return {
        attentionCard: {
          id: `result-${returned.id}`,
          kind: "result_review",
          title: typeof returned.input.title === "string" ? returned.input.title : "Entwurf zur Prüfung",
          rationale: proposal?.rationale ?? "Ein Entwurf ist aus dem Gespräch zurückgekehrt und wartet auf deine fachliche Prüfung.",
          ...(proposal?.sourceMessageId ? { sourceMessageId: proposal.sourceMessageId } : {}),
          ...(content ? { preview: content } : {}),
          ...(returned.automaticCheck ? { automaticCheck: returned.automaticCheck } : {}),
          ...(returned.criticalFriendCheck ? { criticalFriendCheck: returned.criticalFriendCheck } : {}),
          primaryAction: { kind: "accept_result", label: "Für den Unterricht freigeben", targetId: returned.id },
          discussAction: { label: "Weiterreden", focus: { kind: "material", id: `material-${returned.boardItemId ?? returned.id}`, label: "Entwurf zur Prüfung" } }
        },
        backgroundWork: this.backgroundWork(requests)
      };
    }
    const failed = requests.filter((request) => request.status === "failed").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (failed) {
      return {
        attentionCard: {
          id: `failed-${failed.id}`,
          kind: "safety_block",
          title: "Die Vorbereitung braucht Aufmerksamkeit",
          rationale: "Der Entwurf wurde nicht sicher zurückgeführt. Im Gespräch kannst du den nächsten Schritt klären.",
          primaryAction: undefined,
          discussAction: { label: "Weiterreden", focus: { kind: "planning_item", id: failed.boardItemId ?? failed.id, label: "Vorbereitung klären" } }
        },
        backgroundWork: this.backgroundWork(requests)
      };
    }
    const pending = proposals.filter((proposal) => proposal.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (pending) {
      return {
        attentionCard: {
          id: pending.id,
          kind: "worker_proposal",
          title: pending.title,
          rationale: pending.rationale,
          sourceMessageId: pending.sourceMessageId,
          primaryAction: { kind: "accept_proposal", label: "Passt", targetId: pending.id },
          discussAction: { label: "Weiterreden", focus: { kind: "planning_item", id: pending.id, label: pending.title } }
        },
        backgroundWork: this.backgroundWork(requests)
      };
    }
    return {
      attentionCard: {
        id: "continue-conversation",
        kind: "continue_conversation",
        title: "Woran möchtest du weiterdenken?",
        rationale: "Der nächste sinnvolle Schritt entsteht im gemeinsamen Gespräch.",
        discussAction: { label: "Weiterreden", focus: { kind: "planning_item", id: "conversation", label: "Gespräch" } }
      },
      backgroundWork: this.backgroundWork(requests)
    };
  }

  private backgroundWork(requests: AppServiceRequest[]): BackgroundWorkItem[] {
    return requests
      .filter((request) => request.status !== "proposed" && request.status !== "reviewed" && request.status !== "discarded")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((request) => ({
        id: request.id,
        title: typeof request.input.title === "string" ? request.input.title : "Vorbereitung",
        status: request.status === "queued" ? "wartet_kurz" as const
          : request.status === "in_progress" ? "wird_vorbereitet" as const
          : request.status === "returned" ? "liegt_zur_pruefung_bereit" as const
          : request.status === "failed" ? "konnte_noch_nicht_erstellt_werden" as const
          : "bereit" as const,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        resultAvailable: request.status === "returned"
      }));
  }

  private async preview(planningSpaceId: string, relativePath: string) {
    try {
      const content = await this.workspace.readProjectFile(planningSpaceId, relativePath);
      const truncated = content.length > 1400;
      return { format: "markdown" as const, content: truncated ? content.slice(0, 1400) : content, truncated };
    } catch {
      return undefined;
    }
  }

  private async snapshot(planningSpaceId: string, relativePath: string): Promise<FileSnapshot> {
    const filePath = this.workspace.resolveInsideWorkspace(planningSpaceId, relativePath);
    try {
      return { path: filePath, exists: true, content: await fs.readFile(filePath, "utf8") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { path: filePath, exists: false };
      throw error;
    }
  }

  private async restore(planningSpaceId: string, snapshot: FileSnapshot): Promise<void> {
    if (!snapshot.exists) {
      await fs.rm(snapshot.path, { force: true });
      return;
    }
    await fs.mkdir(path.dirname(snapshot.path), { recursive: true });
    await fs.writeFile(snapshot.path, snapshot.content ?? "", "utf8");
  }
}
