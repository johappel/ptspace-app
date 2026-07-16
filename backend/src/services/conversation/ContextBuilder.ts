import { estimateTokens } from "./TokenEstimator.js";
import { ContextBudget, compressToBudget } from "./ContextBudget.js";
import { ConversationSummary, renderSummary, SummarizableMessage } from "./ConversationSummaryService.js";

/**
 * Context Builder / Prompt Builder
 * (CHAT-PERFORMANCE-TASKS TASK 5 / 11 / 12, ARCHITECTURE-SESSION-MODEL Abschnitt 5).
 *
 * Baut den Modellkontext in klarer Schichtreihenfolge auf:
 *   1. Kernel / System Instructions (als Referenz, nicht dupliziert)
 *   2. Conversation Summary
 *   3. relevanter Workspace-Kontext (lazy, nur bei Bedarf)
 *   4. Recent Messages (Kurzzeitgedächtnis)
 *   5. Aktueller Fokus
 *   6. Aktuelle Nachricht
 *
 * Nicht der gesamte Chat und nicht alle Workspace-Dateien wandern in den Prompt.
 */

export type WorkspaceContextItem = {
  relativePath: string;
  excerpt: string;
};

export type CurrentFocus = {
  kind: string;
  id: string;
  label: string;
};

export type ContextBuilderInput = {
  kernelReference: { version: string; hash: string };
  summary: ConversationSummary;
  allMessages: SummarizableMessage[];
  workspaceItems: WorkspaceContextItem[];
  currentFocus?: CurrentFocus;
  currentMessage: string;
  budget: ContextBudget;
  maxRecentMessages?: number;
  maxRecentMessageTokens?: number;
  kernelTokens?: number;
};

export type PromptProfile = {
  kernelTokens: number;
  summaryTokens: number;
  workspaceTokens: number;
  recentMessagesTokens: number;
  currentMessageTokens: number;
  totalTokens: number;
  recentMessageCount: number;
  workspaceItemCount: number;
  compressed: boolean;
  removedWorkspaceItems: number;
  removedRecentMessages: number;
  summaryTrimmed: boolean;
};

export type ContextPackage = {
  kernelReference: { version: string; hash: string };
  summaryText: string;
  recentMessages: SummarizableMessage[];
  workspaceItems: WorkspaceContextItem[];
  currentFocus?: CurrentFocus;
  currentMessage: string;
  conversationContext: string;
  profile: PromptProfile;
};

const DEFAULT_MAX_RECENT_MESSAGES = 8;
const DEFAULT_MAX_RECENT_MESSAGE_TOKENS = 2500;

const focusKindLabels: Record<string, string> = {
  learning_moment: "Lernmoment",
  transition: "Übergang",
  teaching_window: "Unterrichtsfenster",
  placement: "zeitliche Platzierung",
  planning_item: "Arbeitsvorhaben",
  material: "Material"
};

function selectRecentMessages(
  messages: SummarizableMessage[],
  maxCount: number,
  maxTokens: number
): SummarizableMessage[] {
  const selected: SummarizableMessage[] = [];
  let tokens = 0;
  for (let i = messages.length - 1; i >= 0 && selected.length < maxCount; i -= 1) {
    const message = messages[i];
    const messageTokens = estimateTokens(message.text);
    if (selected.length > 0 && tokens + messageTokens > maxTokens) break;
    selected.unshift(message);
    tokens += messageTokens;
  }
  return selected;
}

function renderMessage(message: SummarizableMessage): string {
  const label = message.author === "teacher" ? "Lehrkraft" : message.author === "critical_friend" ? "Critical Friend" : "System";
  return `${label}: ${message.text}`;
}

function renderFocus(focus?: CurrentFocus): string {
  if (!focus) return "";
  const kind = focusKindLabels[focus.kind] ?? focus.kind;
  return `Aktueller Fokus der Lehrkraft: ${kind} „${focus.label}".`;
}

export function buildContext(input: ContextBuilderInput): ContextPackage {
  const maxRecentMessages = input.maxRecentMessages ?? DEFAULT_MAX_RECENT_MESSAGES;
  const maxRecentMessageTokens = input.maxRecentMessageTokens ?? DEFAULT_MAX_RECENT_MESSAGE_TOKENS;
  const kernelTokens = input.kernelTokens ?? 0;

  const summaryText = renderSummary(input.summary);
  const recentMessages = selectRecentMessages(input.allMessages, maxRecentMessages, maxRecentMessageTokens);

  const compression = compressToBudget(
    input.budget,
    {
      workspaceItems: input.workspaceItems.map((item) => `### ${item.relativePath}\n${item.excerpt}`),
      recentMessages: recentMessages.map(renderMessage),
      summary: summaryText,
      currentMessage: input.currentMessage
    },
    kernelTokens
  );

  const keptWorkspaceItems = input.workspaceItems.slice(0, input.workspaceItems.length - compression.removedWorkspaceItems);
  const keptRecentMessages = recentMessages.slice(recentMessages.length - compression.context.recentMessages.length);
  const finalSummaryText = compression.context.summary;

  const focusLine = renderFocus(input.currentFocus);
  const conversationContext = [
    finalSummaryText,
    keptWorkspaceItems.length > 0
      ? `## Relevanter Denkstand\n${keptWorkspaceItems.map((item) => `### ${item.relativePath}\n${item.excerpt}`).join("\n\n")}`
      : "",
    keptRecentMessages.length > 0
      ? `## Bisheriges Gespräch\n${keptRecentMessages.map(renderMessage).join("\n\n")}`
      : "",
    focusLine
  ]
    .filter(Boolean)
    .join("\n\n");

  const summaryTokens = estimateTokens(finalSummaryText);
  const workspaceTokens = keptWorkspaceItems.reduce((sum, item) => sum + estimateTokens(item.excerpt), 0);
  const recentMessagesTokens = keptRecentMessages.reduce((sum, item) => sum + estimateTokens(item.text), 0);
  const currentMessageTokens = estimateTokens(input.currentMessage);

  const profile: PromptProfile = {
    kernelTokens,
    summaryTokens,
    workspaceTokens,
    recentMessagesTokens,
    currentMessageTokens,
    totalTokens: kernelTokens + summaryTokens + workspaceTokens + recentMessagesTokens + currentMessageTokens,
    recentMessageCount: keptRecentMessages.length,
    workspaceItemCount: keptWorkspaceItems.length,
    compressed:
      compression.removedWorkspaceItems > 0 || compression.removedRecentMessages > 0 || compression.summaryTrimmed,
    removedWorkspaceItems: compression.removedWorkspaceItems,
    removedRecentMessages: compression.removedRecentMessages,
    summaryTrimmed: compression.summaryTrimmed
  };

  return {
    kernelReference: input.kernelReference,
    summaryText: finalSummaryText,
    recentMessages: keptRecentMessages,
    workspaceItems: keptWorkspaceItems,
    currentFocus: input.currentFocus,
    currentMessage: input.currentMessage,
    conversationContext,
    profile
  };
}
