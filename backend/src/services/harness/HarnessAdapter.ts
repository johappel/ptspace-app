import { ConversationMessage, PlanningSpace, PolicyDecision } from "@ptspace/shared";
import { HarnessPermissionRequest } from "../policy/PermissionPolicy.js";

export type HarnessMode = "mock" | "docker" | "host-bridge" | "external";

export type HarnessAvailability = {
  status: "ready" | "unavailable" | "requires_setup" | "requires_admin_configuration";
  teacherFacingMessage: string;
};

export type HarnessSession = {
  id: string;
  planningSpaceId: string;
  workspaceRoot: string;
};

export type SendHarnessMessageInput = {
  session: HarnessSession;
  space: PlanningSpace;
  message: string;
  conversationContext?: string;
};

export type HarnessWorkspaceUpdate = {
  relativePath: string;
  content: string;
};

export type HarnessEvent =
  | { type: "status"; status: "ready" | "running" | "waiting_for_backend_policy" | "failed"; message: string }
  | { type: "policy_request"; request: HarnessPermissionRequest; decision: PolicyDecision }
  | { type: "workspace_update"; relativePath: string };

export type HarnessMessageResult = {
  reply: ConversationMessage;
  workspaceUpdates: HarnessWorkspaceUpdate[];
  events: HarnessEvent[];
  suggestedAction?: SuggestedAction;
};

export type SuggestedAction = {
  kind: "worker_draft";
  title: string;
  rationale: string;
  expectedResult: string;
  capability: "create_board_material" | "create_student_instruction";
  relatedMomentIds?: string[];
  materialNeed?: string;
};

export type HarnessTaskRequest = {
  session: HarnessSession;
  space: PlanningSpace;
  service: "worker";
  capability: string;
  reason: string;
  input: Record<string, unknown>;
  expectedOutput: { type: string; relativePath: string };
  constraints: Record<string, unknown>;
};

export type HarnessTaskResult = {
  summary: string;
  workspaceUpdates: HarnessWorkspaceUpdate[];
  events: HarnessEvent[];
};

export type HarnessReviewResult = {
  status: "passed" | "concerns" | "blocked";
  note: string;
};

export type HarnessPolicySimulationResult = {
  decisions: Array<{ request: HarnessPermissionRequest; decision: PolicyDecision }>;
};

export interface HarnessAdapter {
  id: string;
  label: string;
  mode: HarnessMode;
  checkAvailability(): Promise<HarnessAvailability>;
  createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<HarnessSession>;
  sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult>;
  requestTask(input: HarnessTaskRequest): Promise<HarnessTaskResult>;
  reviewTask?(input: { session: HarnessSession; space: PlanningSpace; capability: string; expectedOutput: { type: string; relativePath: string }; context: Record<string, unknown> }): Promise<HarnessReviewResult>;
  getEvents(session: HarnessSession): AsyncIterable<HarnessEvent>;
  simulatePolicy?(workspaceRoot: string): Promise<HarnessPolicySimulationResult>;
  stopSession(session: HarnessSession): Promise<void>;
}
