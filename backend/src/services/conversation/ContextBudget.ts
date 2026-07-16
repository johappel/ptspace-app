import { estimateTokens } from "./TokenEstimator.js";

/**
 * Context Budget (ARCHITECTURE-SESSION-MODEL.md, Abschnitt 6 / CHAT-PERFORMANCE-TASKS TASK 13).
 *
 * Jeder Modellaufruf erhält ein explizites Tokenbudget. Wird es überschritten,
 * gilt eine klare Kürzungsreihenfolge:
 *   1. redundante Workspace-Auszüge entfernen
 *   2. ältere Recent Messages entfernen
 *   3. Summary verdichten
 *   4. niemals aktuelle Nachricht oder Sicherheitsregeln kürzen
 */

export type ContextBudget = {
  totalTokens: number;
  kernelTokens: number;
  summaryTokens: number;
  workspaceTokens: number;
  recentMessagesTokens: number;
  currentMessageTokens: number;
  responseReserveTokens: number;
};

export type BudgetShare = {
  kernel: number;
  summary: number;
  workspace: number;
  recentMessages: number;
  currentMessage: number;
  responseReserve: number;
};

/** Empfohlene Verteilung gemäß Architektur (Abschnitt 6). */
export const DEFAULT_BUDGET_SHARE: BudgetShare = {
  kernel: 0.2,
  summary: 0.15,
  workspace: 0.25,
  recentMessages: 0.2,
  currentMessage: 0.05,
  responseReserve: 0.15
};

export function createContextBudget(totalTokens: number, share: BudgetShare = DEFAULT_BUDGET_SHARE): ContextBudget {
  return {
    totalTokens,
    kernelTokens: Math.floor(totalTokens * share.kernel),
    summaryTokens: Math.floor(totalTokens * share.summary),
    workspaceTokens: Math.floor(totalTokens * share.workspace),
    recentMessagesTokens: Math.floor(totalTokens * share.recentMessages),
    currentMessageTokens: Math.floor(totalTokens * share.currentMessage),
    responseReserveTokens: Math.floor(totalTokens * share.responseReserve)
  };
}

export type BudgetSection = "kernel" | "summary" | "workspace" | "recentMessages" | "currentMessage";

export type BudgetUsage = Record<BudgetSection, number>;

export type BudgetCheck = {
  withinBudget: boolean;
  usedTokens: number;
  availableTokens: number;
  overBy: number;
  perSection: BudgetUsage;
  overflowingSections: BudgetSection[];
};

/**
 * Prüft eine geplante Kontextzusammensetzung gegen das Budget.
 * availableTokens = totalTokens - responseReserve.
 */
export function checkBudget(budget: ContextBudget, usage: BudgetUsage): BudgetCheck {
  const availableTokens = budget.totalTokens - budget.responseReserveTokens;
  const usedTokens = usage.kernel + usage.summary + usage.workspace + usage.recentMessages + usage.currentMessage;
  const limits: Record<BudgetSection, number> = {
    kernel: budget.kernelTokens,
    summary: budget.summaryTokens,
    workspace: budget.workspaceTokens,
    recentMessages: budget.recentMessagesTokens,
    currentMessage: budget.currentMessageTokens
  };
  const overflowingSections = (Object.keys(limits) as BudgetSection[]).filter((section) => usage[section] > limits[section]);
  return {
    withinBudget: usedTokens <= availableTokens,
    usedTokens,
    availableTokens,
    overBy: Math.max(0, usedTokens - availableTokens),
    perSection: usage,
    overflowingSections
  };
}

export type CompressibleContext = {
  workspaceItems: string[];
  recentMessages: string[];
  summary: string;
  currentMessage: string;
};

export type CompressionResult = {
  context: CompressibleContext;
  removedWorkspaceItems: number;
  removedRecentMessages: number;
  summaryTrimmed: boolean;
  usedTokens: number;
};

/**
 * Reduziert den Kontext in der von der Architektur vorgegebenen Reihenfolge,
 * bis er in das verfügbare Budget passt. Aktuelle Nachricht bleibt immer erhalten.
 */
export function compressToBudget(
  budget: ContextBudget,
  context: CompressibleContext,
  kernelTokens: number
): CompressionResult {
  const availableTokens = budget.totalTokens - budget.responseReserveTokens;
  const workspaceItems = [...context.workspaceItems];
  const recentMessages = [...context.recentMessages];
  let summary = context.summary;
  let removedWorkspaceItems = 0;
  let removedRecentMessages = 0;
  let summaryTrimmed = false;

  const currentTokens = () =>
    kernelTokens +
    estimateTokens(summary) +
    workspaceItems.reduce((sum, item) => sum + estimateTokens(item), 0) +
    recentMessages.reduce((sum, item) => sum + estimateTokens(item), 0) +
    estimateTokens(context.currentMessage);

  // 1. redundante Workspace-Auszüge entfernen (von hinten)
  while (currentTokens() > availableTokens && workspaceItems.length > 0) {
    workspaceItems.pop();
    removedWorkspaceItems += 1;
  }
  // 2. ältere Recent Messages entfernen (von vorne, mindestens die letzte behalten)
  while (currentTokens() > availableTokens && recentMessages.length > 1) {
    recentMessages.shift();
    removedRecentMessages += 1;
  }
  // 3. Summary verdichten (harte Kürzung als letzte Reserve)
  if (currentTokens() > availableTokens && summary.length > 0) {
    const overflowChars = (currentTokens() - availableTokens) * 4;
    const targetLength = Math.max(0, summary.length - overflowChars);
    summary = summary.slice(0, targetLength).trimEnd();
    summaryTrimmed = true;
  }

  return {
    context: { workspaceItems, recentMessages, summary, currentMessage: context.currentMessage },
    removedWorkspaceItems,
    removedRecentMessages,
    summaryTrimmed,
    usedTokens: currentTokens()
  };
}
