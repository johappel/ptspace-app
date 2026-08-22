import type { HarnessReviewResult } from "./HarnessAdapter.js";

// Harness-unabhängige Übersetzung von Runtime-Ausgaben in lehrkraftfreundliche
// Antworten inklusive Absicherung gegen nicht belegte Behauptungen.

export function normalizeOutput(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "").trim();
}

export function guardUnsupportedClaims(reply: string, changedFiles: string[]): string {
  const stateWasWritten = changedFiles.some((file) =>
    ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"].includes(file)
  );
  const knowledgeWasWritten = changedFiles.some((file) =>
    file.startsWith("knowledge-proposals/") || file.startsWith("service-requests/")
  );
  const claimsPersistence = /(?:denkstand|entscheidung|schritt).{0,40}(?:festgehalten|gespeichert|aktualisiert)/i.test(reply);
  const makesKnowledgeClaim = /(?:kernlehrplan|lehrplanbezug|curriculum|\bIF\s?\d)/i.test(reply);
  const notes: string[] = [];
  if (claimsPersistence && !stateWasWritten) {
    notes.push("Hinweis: Dieser Gedanke wurde im Gespräch formuliert, aber technisch noch nicht dauerhaft im Denkstand gespeichert.");
  }
  if (makesKnowledgeClaim && !knowledgeWasWritten) {
    notes.push("Hinweis: Die Lehrplaneinordnung ist noch nicht durch einen Knowledge-Auftrag mit überprüfbaren Quellen abgesichert.");
  }
  return notes.length ? [reply, ...notes].join("\n\n") : reply;
}

export function toTeacherFacingReply(reply: string): string {
  return reply
    .replace(/`?(learning-design|conversation-summary)\.md`?/gi, "den Denkstand")
    .replace(/`?next-steps\.md`?/gi, "die nächsten Schritte")
    .replace(/`?open-questions\.md`?/gi, "die offenen Fragen")
    .replace(/`?decisions\.md`?/gi, "die offenen Entscheidungen")
    .replace(/`?service-requests?\/?`?/gi, "")
    .replace(/`?opencode`?/gi, "")
    .replace(/`?\/workspace\/?`?/gi, "")
    .replace(/`?\/ptspace-kernel\/?`?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseReviewReply(output: string): HarnessReviewResult | undefined {
  const statusMatch = output.match(/(?:^|\n)\s*STATUS\s*:\s*(PASSED|CONCERNS|BLOCKED)\b/i);
  if (!statusMatch) return undefined;
  const noteMatch = output.match(/(?:^|\n)\s*NOTE\s*:\s*([^\n]+)/i);
  const note = noteMatch?.[1]?.trim();
  if (!note) return undefined;
  const status = statusMatch[1].toLowerCase() as HarnessReviewResult["status"];
  return { status, note: toTeacherFacingReply(note) };
}
