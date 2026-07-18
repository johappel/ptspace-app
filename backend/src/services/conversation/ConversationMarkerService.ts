import { randomUUID } from "node:crypto";
import {
  ConversationMarker,
  ConversationMarkerKind,
  ConversationMarkerSchema,
  ConversationMarkerTargetType
} from "@ptspace/shared";
import { PlanningSpaceStore } from "../../storage/PlanningSpaceStore.js";
import { ConversationMarkerStore } from "../../storage/ConversationMarkerStore.js";
import { ConversationStore } from "../../storage/ConversationStore.js";
import { MaterialManifestStore } from "../../storage/MaterialManifestStore.js";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";
import { parsePlanningBoard } from "../planning/PlanningArtifactCodec.js";

export type CreateConversationMarkerInput = {
  sourceMessageId: string;
  kind: ConversationMarkerKind;
  targetType: ConversationMarkerTargetType;
  targetId: string;
  label: string;
  targetPlanningSpaceId?: string;
};

type TargetState = "active" | "discarded" | "missing";

/** Validates and maintains the app-only message-to-target projection. */
export class ConversationMarkerService {
  constructor(
    private readonly spaces: PlanningSpaceStore,
    private readonly workspace: WorkspaceManager,
    private readonly conversation: ConversationStore,
    private readonly markers: ConversationMarkerStore,
    private readonly materials: MaterialManifestStore,
    private readonly listServiceRequests: (planningSpaceId: string) => Promise<Array<{ id: string; status: string }>>
  ) {}

  async create(planningSpaceId: string, input: CreateConversationMarkerInput): Promise<ConversationMarker> {
    if (input.targetPlanningSpaceId && input.targetPlanningSpaceId !== planningSpaceId) {
      throw new Error("conversation_marker_foreign_target");
    }
    const messages = await this.conversation.getMessages(planningSpaceId);
    if (!messages.some((message) => message.id === input.sourceMessageId)) {
      throw new Error("conversation_marker_source_not_found");
    }
    if ((await this.targetState(planningSpaceId, input.targetType, input.targetId)) === "missing") {
      throw new Error("conversation_marker_target_not_found");
    }

    const marker = ConversationMarkerSchema.parse({
      id: `marker-${randomUUID()}`,
      planningSpaceId,
      sourceMessageId: input.sourceMessageId,
      kind: input.kind,
      targetType: input.targetType,
      targetId: input.targetId,
      label: input.label.trim(),
      createdAt: new Date().toISOString(),
      status: "active",
      invalidatedAt: null
    });
    return this.markers.add(planningSpaceId, marker);
  }

  /** Returns only valid, active markers for teacher-facing read models. */
  async list(planningSpaceId: string): Promise<ConversationMarker[]> {
    const all = await this.refreshLifecycle(planningSpaceId);
    return all.filter((marker) => marker.status === "active");
  }

  /** Includes retained lifecycle records for audit and regression tests. */
  async listAll(planningSpaceId: string): Promise<ConversationMarker[]> {
    return this.refreshLifecycle(planningSpaceId);
  }

  async supersede(planningSpaceId: string, markerId: string, reason = "Durch einen neueren Gesprächsbezug ersetzt."): Promise<ConversationMarker> {
    const all = await this.refreshLifecycle(planningSpaceId);
    const marker = all.find((entry) => entry.id === markerId);
    if (!marker) throw new Error("conversation_marker_not_found");
    const updated = {
      ...marker,
      status: "superseded" as const,
      invalidatedAt: new Date().toISOString(),
      invalidatedReason: reason
    };
    await this.markers.save(planningSpaceId, all.map((entry) => entry.id === markerId ? updated : entry));
    return updated;
  }

  private async refreshLifecycle(planningSpaceId: string): Promise<ConversationMarker[]> {
    const all = await this.markers.list(planningSpaceId);
    if (all.length === 0) return all;
    const messages = new Set((await this.conversation.getMessages(planningSpaceId)).map((message) => message.id));
    let changed = false;
    const refreshed = await Promise.all(all.map(async (marker) => {
      if (marker.status !== "active") return marker;
      const target = await this.targetState(planningSpaceId, marker.targetType, marker.targetId);
      if (messages.has(marker.sourceMessageId) && target === "active") return marker;
      changed = true;
      const status = target === "discarded" ? "discarded" as const : "orphaned" as const;
      return {
        ...marker,
        status,
        invalidatedAt: new Date().toISOString(),
        invalidatedReason: target === "discarded" ? "Das Ziel wurde verworfen." : "Quelle oder Ziel ist nicht mehr vorhanden."
      };
    }));
    if (changed) await this.markers.save(planningSpaceId, refreshed);
    return refreshed;
  }

  private async targetState(planningSpaceId: string, targetType: ConversationMarkerTargetType, targetId: string): Promise<TargetState> {
    const space = await this.spaces.get(planningSpaceId);
    if (!space) throw new Error("planning_space_not_found");
    if (targetType === "thinking_state") {
      try {
        await this.workspace.readProjectFile(planningSpaceId, "learning-design.md");
        return ["learning-design", "learning-design.md", "denkstand"].includes(targetId) ? "active" : "missing";
      } catch {
        return "missing";
      }
    }
    if (targetType === "decision") return space.decisions.some((decision) => decision.id === targetId) ? "active" : "missing";
    if (targetType === "material") return await this.materialState(planningSpaceId, targetId);
    if (targetType === "service_request") {
      const request = (await this.listServiceRequests(planningSpaceId)).find((entry) => entry.id === targetId);
      if (!request) return "missing";
      return request.status === "discarded" || request.status === "failed" ? "discarded" : "active";
    }
    try {
      const board = parsePlanningBoard(await this.workspace.readProjectFile(planningSpaceId, "planning-board.yml"));
      const item = board.items.find((entry) => entry.id === targetId);
      if (!item) return "missing";
      return item.status === "discarded" ? "discarded" : "active";
    } catch {
      return "missing";
    }
  }

  private async materialState(planningSpaceId: string, materialId: string): Promise<TargetState> {
    const material = await this.materials.get(planningSpaceId, materialId);
    if (!material) return "missing";
    return material.status === "discarded" ? "discarded" : "active";
  }
}
