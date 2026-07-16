import { describe, expect, it } from "vitest";
import { PlanningSpace } from "@ptspace/shared";
import { HarnessConversationBackend } from "../src/services/conversation/ConversationBackend.js";
import { MockHarnessAdapter } from "../src/services/harness/MockHarnessAdapter.js";
import { emptySummary, SummarizableMessage } from "../src/services/conversation/ConversationSummaryService.js";

const space = { id: "space-1", subject: "Religion", targetGroup: "Klasse 9" } as unknown as PlanningSpace;

describe("HarnessConversationBackend", () => {
  it("exposes create/append/close over a harness adapter", async () => {
    const backend = new HarnessConversationBackend(new MockHarnessAdapter());
    expect(backend.id).toBe("mock");

    const session = await backend.create({ planningSpaceId: "space-1", workspaceRoot: "/tmp/space-1" });
    expect(session.planningSpaceId).toBe("space-1");

    const result = await backend.append({ session, space, message: "Ich möchte das Lernanliegen klären." });
    expect(result.reply.text).toContain("Lernerfahrung");
    expect(result.workspaceUpdates.length).toBeGreaterThan(0);

    await expect(backend.close(session)).resolves.toBeUndefined();
  });

  it("keeps summary compression provider independent", () => {
    const backend = new HarnessConversationBackend(new MockHarnessAdapter());
    const messages: SummarizableMessage[] = Array.from({ length: 10 }, (_, index) => ({
      id: `m-${index}`,
      author: index % 2 === 0 ? "teacher" : "critical_friend",
      text: `Wir haben entschieden, Schritt ${index} festzuhalten.`,
      createdAt: new Date(Date.now() + index).toISOString()
    }));

    const summary = backend.summarize(emptySummary("space-1"), messages);
    expect(summary.version).toBe(1);
    expect(summary.decisions.length).toBeGreaterThan(0);
  });

  it("does not create a new summary version without a trigger", () => {
    const backend = new HarnessConversationBackend(new MockHarnessAdapter());
    const messages: SummarizableMessage[] = [
      { id: "m-0", author: "teacher", text: "Kurzer Hinweis.", createdAt: new Date().toISOString() }
    ];
    const summary = backend.summarize(emptySummary("space-1"), messages);
    expect(summary.version).toBe(0);
  });
});
