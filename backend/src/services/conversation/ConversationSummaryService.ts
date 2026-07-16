import { estimateTokens } from "./TokenEstimator.js";

/**
 * Conversation Compression / Summary
 * (CHAT-PERFORMANCE-TASKS TASK 3 + 4, ARCHITECTURE-SESSION-MODEL Abschnitt 2.2 / 11).
 *
 * Die Summary ist komprimiertes Gedächtnis, nicht der vollständige Wortlaut.
 * Sie wird inkrementell aktualisiert und nur dann neu gebildet, wenn ein
 * Auslöser erfüllt ist. Qualitätsregel: die Summary erfindet keine neuen
 * pädagogischen Entscheidungen, sie hält nur ausdrücklich Gesagtes fest.
 */

export type MessageSignificance = "normal" | "decision" | "dissent" | "question" | "state_change";

export type SummarizableMessage = {
  id: string;
  author: "teacher" | "critical_friend" | "system";
  text: string;
  createdAt: string;
  significance?: MessageSignificance;
};

export type ConversationSummary = {
  planningSpaceId: string;
  version: number;
  generatedAt: string;
  lastSummarizedMessageId?: string;
  basedOnMessageIds: string[];
  decisions: string[];
  tensions: string[];
  openQuestions: string[];
  currentFocus?: string;
  compactNarrative: string;
};

export function emptySummary(planningSpaceId: string): ConversationSummary {
  return {
    planningSpaceId,
    version: 0,
    generatedAt: new Date().toISOString(),
    basedOnMessageIds: [],
    decisions: [],
    tensions: [],
    openQuestions: [],
    compactNarrative: ""
  };
}

const DECISION_HINTS = /\b(entscheiden|entschieden|entscheidung|wir legen fest|festhalten|beschlossen|einigen uns|wir nehmen)\b/i;
const DISSENT_HINTS = /\b(uneinig|dissens|widerspruch|anderer meinung|sehe ich anders|strittig|spannung)\b/i;
const QUESTION_HINTS = /\?|\b(offene frage|unklar|noch zu klären|frage mich)\b/i;
const STATE_HINTS = /\b(denkstand|zusammenfassend|arbeitsstand|aktueller fokus|nächster schritt)\b/i;

/** Leichte, deterministische Bedeutungserkennung ohne LLM. */
export function detectSignificance(text: string): MessageSignificance {
  if (DECISION_HINTS.test(text)) return "decision";
  if (DISSENT_HINTS.test(text)) return "dissent";
  if (STATE_HINTS.test(text)) return "state_change";
  if (QUESTION_HINTS.test(text)) return "question";
  return "normal";
}

export type SummaryUpdateTriggers = {
  maxUnsummarizedMessages?: number;
  maxUnsummarizedTokens?: number;
};

const DEFAULT_TRIGGERS: Required<SummaryUpdateTriggers> = {
  maxUnsummarizedMessages: 8,
  maxUnsummarizedTokens: 3000
};

export type SummaryUpdateDecision = {
  shouldUpdate: boolean;
  reasons: string[];
  unsummarizedCount: number;
  unsummarizedTokens: number;
};

/**
 * Entscheidet, ob eine Summary-Aktualisierung ausgelöst werden soll
 * (ARCHITECTURE-SESSION-MODEL Abschnitt 11 – Auslöser).
 */
export function shouldUpdateSummary(
  summary: ConversationSummary,
  messages: SummarizableMessage[],
  triggers: SummaryUpdateTriggers = {}
): SummaryUpdateDecision {
  const limits = { ...DEFAULT_TRIGGERS, ...triggers };
  const unsummarized = pendingMessages(summary, messages);
  const unsummarizedTokens = unsummarized.reduce((sum, message) => sum + estimateTokens(message.text), 0);
  const reasons: string[] = [];
  if (unsummarized.length > limits.maxUnsummarizedMessages) reasons.push("message_count");
  if (unsummarizedTokens > limits.maxUnsummarizedTokens) reasons.push("token_count");
  if (unsummarized.some((message) => (message.significance ?? detectSignificance(message.text)) === "decision")) {
    reasons.push("new_decision");
  }
  if (unsummarized.some((message) => (message.significance ?? detectSignificance(message.text)) === "dissent")) {
    reasons.push("dissent");
  }
  return {
    shouldUpdate: reasons.length > 0,
    reasons,
    unsummarizedCount: unsummarized.length,
    unsummarizedTokens
  };
}

function pendingMessages(summary: ConversationSummary, messages: SummarizableMessage[]): SummarizableMessage[] {
  if (!summary.lastSummarizedMessageId) return messages;
  const index = messages.findIndex((message) => message.id === summary.lastSummarizedMessageId);
  if (index === -1) return messages;
  return messages.slice(index + 1);
}

function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : normalized).slice(0, 240);
}

function pushUnique(target: string[], value: string, max: number): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (!target.includes(trimmed)) target.push(trimmed);
  while (target.length > max) target.shift();
}

/**
 * Aktualisiert die Summary inkrementell: bestehende Summary + neue,
 * noch nicht verdichtete Nachrichten = neue Summary-Version.
 */
export function updateSummary(
  previous: ConversationSummary,
  messages: SummarizableMessage[]
): ConversationSummary {
  const pending = pendingMessages(previous, messages);
  if (pending.length === 0) return previous;

  const decisions = [...previous.decisions];
  const tensions = [...previous.tensions];
  const openQuestions = [...previous.openQuestions];
  let currentFocus = previous.currentFocus;

  for (const message of pending) {
    const significance = message.significance ?? detectSignificance(message.text);
    const sentence = firstSentence(message.text);
    if (significance === "decision") pushUnique(decisions, sentence, 12);
    else if (significance === "dissent") pushUnique(tensions, sentence, 8);
    else if (significance === "question") pushUnique(openQuestions, sentence, 12);
    if (significance === "state_change") currentFocus = sentence;
  }

  const lastMessage = pending[pending.length - 1];
  const narrativeParts: string[] = [];
  if (currentFocus) narrativeParts.push(`Aktueller Fokus: ${currentFocus}`);
  if (decisions.length > 0) narrativeParts.push(`Entscheidungen: ${decisions.length}`);
  if (openQuestions.length > 0) narrativeParts.push(`Offene Fragen: ${openQuestions.length}`);
  narrativeParts.push(`Zuletzt: ${firstSentence(lastMessage.text)}`);

  return {
    planningSpaceId: previous.planningSpaceId,
    version: previous.version + 1,
    generatedAt: new Date().toISOString(),
    lastSummarizedMessageId: lastMessage.id,
    basedOnMessageIds: messages.map((message) => message.id),
    decisions,
    tensions,
    openQuestions,
    currentFocus,
    compactNarrative: narrativeParts.join(" · ")
  };
}

/** Rendert die strukturierte Summary als kompakten Prompt-Abschnitt. */
export function renderSummary(summary: ConversationSummary): string {
  if (summary.version === 0 && !summary.compactNarrative) return "";
  const lines: string[] = ["## Gesprächsgedächtnis"];
  if (summary.currentFocus) lines.push(`Aktueller Fokus: ${summary.currentFocus}`);
  if (summary.decisions.length > 0) {
    lines.push("Bereits getroffene Entscheidungen:");
    for (const decision of summary.decisions) lines.push(`- ${decision}`);
  }
  if (summary.tensions.length > 0) {
    lines.push("Dissens / Spannungen:");
    for (const tension of summary.tensions) lines.push(`- ${tension}`);
  }
  if (summary.openQuestions.length > 0) {
    lines.push("Offene Fragen:");
    for (const question of summary.openQuestions) lines.push(`- ${question}`);
  }
  return lines.join("\n");
}
