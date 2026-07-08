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
  getEvents(session: HarnessSession): AsyncIterable<HarnessEvent>;
  simulatePolicy?(workspaceRoot: string): Promise<HarnessPolicySimulationResult>;
  stopSession(session: HarnessSession): Promise<void>;
}
