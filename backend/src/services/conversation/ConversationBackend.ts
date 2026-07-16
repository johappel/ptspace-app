import { PlanningSpace } from "@ptspace/shared";
import {
  HarnessAdapter,
  HarnessAvailability,
  HarnessEvent,
  HarnessWorkspaceUpdate
} from "../harness/HarnessAdapter.js";
import {
  ConversationSummary,
  SummarizableMessage,
  shouldUpdateSummary,
  updateSummary
} from "./ConversationSummaryService.js";

/**
 * Provider-unabhängige Conversation-Abstraktion
 * (CHAT-PERFORMANCE-TASKS TASK 16, ARCHITECTURE-SESSION-MODEL Abschnitt 9).
 *
 * Der Adapter kapselt die Runtime (langlebiger OpenCode-Prozess, OpenAI
 * Responses API, OpenRouter-Conversations, lokale OpenAI-kompatible APIs …)
 * hinter einer einheitlichen Schnittstelle mit create/append/summarize/close.
 * So bleibt die App nicht fest an einen Provider gekoppelt.
 */

export type ConversationBackendSession = {
  id: string;
  planningSpaceId: string;
  workspaceRoot: string;
};

export type ConversationAppendInput = {
  session: ConversationBackendSession;
  space: PlanningSpace;
  message: string;
  conversationContext?: string;
};

export type ConversationAppendResult = {
  reply: { id: string; author: string; text: string; createdAt: string };
  workspaceUpdates: HarnessWorkspaceUpdate[];
  events: HarnessEvent[];
};

export interface ConversationBackend {
  readonly id: string;
  checkAvailability(): Promise<HarnessAvailability>;
  create(input: { planningSpaceId: string; workspaceRoot: string }): Promise<ConversationBackendSession>;
  append(input: ConversationAppendInput): Promise<ConversationAppendResult>;
  summarize(previous: ConversationSummary, messages: SummarizableMessage[]): ConversationSummary;
  close(session: ConversationBackendSession): Promise<void>;
}

/**
 * Standard-Implementierung, die einen HarnessAdapter als Conversation-Backend
 * nutzt. Die Summary-Kompression bleibt providerunabhängig im Backend, damit
 * ein Sessionverlust jederzeit aus Summary + Workspace rekonstruierbar ist
 * (ARCHITECTURE-SESSION-MODEL Abschnitt 12/17).
 */
export class HarnessConversationBackend implements ConversationBackend {
  constructor(private readonly harness: HarnessAdapter) {}

  get id(): string {
    return this.harness.id;
  }

  checkAvailability(): Promise<HarnessAvailability> {
    return this.harness.checkAvailability();
  }

  create(input: { planningSpaceId: string; workspaceRoot: string }): Promise<ConversationBackendSession> {
    return this.harness.createSession(input);
  }

  async append(input: ConversationAppendInput): Promise<ConversationAppendResult> {
    const result = await this.harness.sendMessage({
      session: input.session,
      space: input.space,
      message: input.message,
      conversationContext: input.conversationContext
    });
    return {
      reply: result.reply,
      workspaceUpdates: result.workspaceUpdates,
      events: result.events
    };
  }

  summarize(previous: ConversationSummary, messages: SummarizableMessage[]): ConversationSummary {
    if (!shouldUpdateSummary(previous, messages).shouldUpdate) return previous;
    return updateSummary(previous, messages);
  }

  close(session: ConversationBackendSession): Promise<void> {
    return this.harness.stopSession(session);
  }
}
