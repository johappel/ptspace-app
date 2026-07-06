import { ConversationMessage, PlanningSpace } from "@ptspace/shared";

export type HarnessSession = {
  id: string;
  planningSpaceId: string;
  workspaceRoot: string;
};

export type SendHarnessMessageInput = {
  session: HarnessSession;
  space: PlanningSpace;
  message: string;
};

export type HarnessMessageResult = {
  reply: ConversationMessage;
  workspaceUpdates: Array<{ relativePath: string; content: string }>;
};

export interface HarnessAdapter {
  id: string;
  label: string;
  mode: "mock" | "docker" | "host-bridge" | "external";
  createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<HarnessSession>;
  sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult>;
  stopSession(session: HarnessSession): Promise<void>;
}
