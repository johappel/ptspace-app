import { describe, expect, it } from "vitest";
import {
  detectSignificance,
  emptySummary,
  renderSummary,
  shouldUpdateSummary,
  updateSummary,
  SummarizableMessage
} from "../src/services/conversation/ConversationSummaryService.js";
import { buildContext } from "../src/services/conversation/ContextBuilder.js";
import { createContextBudget } from "../src/services/conversation/ContextBudget.js";

function message(id: string, author: SummarizableMessage["author"], text: string): SummarizableMessage {
  return { id, author, text, createdAt: new Date().toISOString() };
}

describe("ConversationSummaryService", () => {
  it("detects decisions, dissent and questions", () => {
    expect(detectSignificance("Wir haben entschieden, mit einem Bild zu starten.")).toBe("decision");
    expect(detectSignificance("Da sehe ich das anders, das ist strittig.")).toBe("dissent");
    expect(detectSignificance("Welche Erfahrung soll entstehen?")).toBe("question");
    expect(detectSignificance("Ein schlichter Beitrag.")).toBe("normal");
  });

  it("does not trigger an update for a short calm conversation", () => {
    const summary = emptySummary("space-1");
    const messages = [message("m1", "teacher", "Hallo."), message("m2", "critical_friend", "Guten Tag.")];
    expect(shouldUpdateSummary(summary, messages).shouldUpdate).toBe(false);
  });

  it("triggers an update when a decision appears", () => {
    const summary = emptySummary("space-1");
    const messages = [message("m1", "teacher", "Wir haben entschieden, mit einem Dilemma zu starten.")];
    const decision = shouldUpdateSummary(summary, messages);
    expect(decision.shouldUpdate).toBe(true);
    expect(decision.reasons).toContain("new_decision");
  });

  it("updates incrementally and only summarizes pending messages", () => {
    const first = updateSummary(emptySummary("space-1"), [
      message("m1", "teacher", "Wir haben entschieden, mit einem Bild einzusteigen.")
    ]);
    expect(first.version).toBe(1);
    expect(first.decisions.length).toBe(1);
    expect(first.lastSummarizedMessageId).toBe("m1");

    const second = updateSummary(first, [
      message("m1", "teacher", "Wir haben entschieden, mit einem Bild einzusteigen."),
      message("m2", "teacher", "Offene Frage: passt das zur Lerngruppe?")
    ]);
    expect(second.version).toBe(2);
    expect(second.openQuestions.length).toBe(1);
    // Entscheidung wird nicht doppelt gezählt
    expect(second.decisions.length).toBe(1);
  });

  it("renders a compact summary block", () => {
    const summary = updateSummary(emptySummary("space-1"), [
      message("m1", "teacher", "Wir haben entschieden, Partnerarbeit zu nutzen.")
    ]);
    const rendered = renderSummary(summary);
    expect(rendered).toContain("Gesprächsgedächtnis");
    expect(rendered).toContain("Partnerarbeit");
  });

  it("returns empty string for an empty summary", () => {
    expect(renderSummary(emptySummary("space-1"))).toBe("");
  });
});

describe("ContextBuilder", () => {
  const budget = createContextBudget(24000);
  const kernelReference = { version: "2026-07-16", hash: "sha256:test" };

  it("only keeps the most recent messages in the short-term window", () => {
    const messages: SummarizableMessage[] = Array.from({ length: 20 }, (_, i) =>
      message(`m${i}`, i % 2 === 0 ? "teacher" : "critical_friend", `Nachricht Nummer ${i}`)
    );
    const context = buildContext({
      kernelReference,
      summary: emptySummary("space-1"),
      allMessages: messages,
      workspaceItems: [],
      currentMessage: "aktuelle Frage",
      budget,
      maxRecentMessages: 6
    });
    expect(context.recentMessages.length).toBeLessThanOrEqual(6);
    expect(context.recentMessages.at(-1)?.text).toContain("Nachricht Nummer 19");
  });

  it("includes summary and workspace context in the composed prompt", () => {
    const summary = updateSummary(emptySummary("space-1"), [
      message("m1", "teacher", "Wir haben entschieden, mit einem Bild zu starten.")
    ]);
    const context = buildContext({
      kernelReference,
      summary,
      allMessages: [message("m1", "teacher", "Wir haben entschieden, mit einem Bild zu starten.")],
      workspaceItems: [{ relativePath: "learning-design.md", excerpt: "# Denkstand\nLernanliegen offen." }],
      currentMessage: "Wie geht es weiter?",
      budget
    });
    expect(context.conversationContext).toContain("Gesprächsgedächtnis");
    expect(context.conversationContext).toContain("learning-design.md");
    expect(context.profile.workspaceItemCount).toBe(1);
    expect(context.profile.totalTokens).toBeGreaterThan(0);
  });

  it("reports compression when the budget is tiny", () => {
    const smallBudget = createContextBudget(60);
    const context = buildContext({
      kernelReference,
      summary: emptySummary("space-1"),
      allMessages: [message("m1", "teacher", "kurz")],
      workspaceItems: [
        { relativePath: "a.md", excerpt: "x".repeat(600) },
        { relativePath: "b.md", excerpt: "y".repeat(600) }
      ],
      currentMessage: "aktuelle Frage bleibt erhalten",
      budget: smallBudget,
      kernelTokens: 5
    });
    expect(context.profile.compressed).toBe(true);
    expect(context.currentMessage).toBe("aktuelle Frage bleibt erhalten");
  });
});
