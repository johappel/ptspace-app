import { describe, expect, it } from "vitest";
import { estimateTokens, estimateTokensCached, estimateTotalTokens } from "../src/services/conversation/TokenEstimator.js";
import {
  checkBudget,
  compressToBudget,
  createContextBudget,
  DEFAULT_BUDGET_SHARE
} from "../src/services/conversation/ContextBudget.js";

describe("TokenEstimator", () => {
  it("returns zero for empty text", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("   ")).toBe(0);
  });

  it("scales roughly with text length", () => {
    const short = estimateTokens("Hallo Welt");
    const long = estimateTokens("Hallo Welt ".repeat(100));
    expect(long).toBeGreaterThan(short);
  });

  it("never underestimates word-rich text below its word count", () => {
    const text = "a b c d e f g h";
    expect(estimateTokens(text)).toBeGreaterThanOrEqual(8);
  });

  it("caches identical texts", () => {
    const cache = new Map<string, number>();
    const first = estimateTokensCached("gleicher Text", cache);
    const second = estimateTokensCached("gleicher Text", cache);
    expect(first).toBe(second);
    expect(cache.size).toBe(1);
  });

  it("sums parts and ignores undefined", () => {
    expect(estimateTotalTokens(["Hallo", undefined, "Welt"])).toBe(
      estimateTokens("Hallo") + estimateTokens("Welt")
    );
  });
});

describe("ContextBudget", () => {
  it("distributes the total budget by the default share", () => {
    const budget = createContextBudget(10000, DEFAULT_BUDGET_SHARE);
    expect(budget.kernelTokens).toBe(2000);
    expect(budget.summaryTokens).toBe(1500);
    expect(budget.workspaceTokens).toBe(2500);
    expect(budget.recentMessagesTokens).toBe(2000);
    expect(budget.responseReserveTokens).toBe(1500);
  });

  it("detects when usage exceeds the available budget", () => {
    const budget = createContextBudget(1000);
    const check = checkBudget(budget, {
      kernel: 200,
      summary: 150,
      workspace: 400,
      recentMessages: 300,
      currentMessage: 50
    });
    // available = 1000 - 150 reserve = 850, used = 1100
    expect(check.withinBudget).toBe(false);
    expect(check.overBy).toBeGreaterThan(0);
    expect(check.overflowingSections).toContain("workspace");
  });

  it("compresses workspace items before recent messages", () => {
    const budget = createContextBudget(200);
    const result = compressToBudget(
      budget,
      {
        workspaceItems: ["x".repeat(400), "y".repeat(400)],
        recentMessages: ["Nachricht eins", "Nachricht zwei"],
        summary: "kurze Summary",
        currentMessage: "aktuelle Frage"
      },
      20
    );
    expect(result.removedWorkspaceItems).toBeGreaterThan(0);
    // aktuelle Nachricht bleibt immer erhalten
    expect(result.context.currentMessage).toBe("aktuelle Frage");
    // mindestens die letzte Recent Message bleibt
    expect(result.context.recentMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps the current message even under an extreme budget", () => {
    const budget = createContextBudget(10);
    const result = compressToBudget(
      budget,
      {
        workspaceItems: ["z".repeat(1000)],
        recentMessages: ["nur eine"],
        summary: "s".repeat(1000),
        currentMessage: "unverzichtbare aktuelle Nachricht"
      },
      5
    );
    expect(result.context.currentMessage).toBe("unverzichtbare aktuelle Nachricht");
    expect(result.context.workspaceItems.length).toBe(0);
  });
});
