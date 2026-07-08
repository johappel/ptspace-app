import { HarnessAdapter, HarnessAvailability, HarnessEvent, HarnessMessageResult, HarnessSession, SendHarnessMessageInput } from "./HarnessAdapter.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class MockHarnessAdapter implements HarnessAdapter {
  id = "mock";
  label = "Simuliertes Gegenüber";
  mode = "mock" as const;

  async checkAvailability(): Promise<HarnessAvailability> {
    return {
      status: "ready",
      teacherFacingMessage: "Der geschützte Planungsmodus ist verfügbar."
    };
  }

  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<HarnessSession> {
    return {
      id: `mock-session-${input.planningSpaceId}`,
      planningSpaceId: input.planningSpaceId,
      workspaceRoot: input.workspaceRoot
    };
  }

  async sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult> {
    const text = input.message.trim();
    const subject = input.space.subject || "deinem Lernbereich";
    const targetGroup = input.space.targetGroup || "der Lerngruppe";
    const replyText = [
      "Ich halte den nächsten Schritt bewusst klein.",
      `Für ${targetGroup} in ${subject} sollten wir zuerst klären, welche Lernerfahrung die Stunde tragen soll.`,
      "Mein Vorschlag: Wir formulieren ein Lernanliegen und sammeln danach nur die Entscheidungen, die für einen ersten Entwurf wirklich nötig sind."
    ].join(" ");
    const summary = `# Gesprächszusammenfassung\n\nLetzter Beitrag der Lehrkraft:\n\n> ${text}\n\nArbeitsstand:\n\nDas Gegenüber schlägt vor, zuerst das Lernanliegen und die zentrale Lernerfahrung zu klären.\n`;
    const nextSteps = `# Nächste Schritte\n\n- Lernanliegen in einem Satz formulieren\n- Zentrale Lernerfahrung beschreiben\n- Offene Entscheidung für den Einstieg klären\n`;
    const openQuestions = `# Offene Fragen\n\n- Welche Erfahrung soll bei den Lernenden entstehen?\n- Welche Entscheidung muss vor einem Materialentwurf geklärt sein?\n`;
    const workspaceUpdates = [
      { relativePath: "conversation-summary.md", content: summary },
      { relativePath: "next-steps.md", content: nextSteps },
      { relativePath: "open-questions.md", content: openQuestions }
    ];
    return {
      reply: { id: `reply-${Date.now()}`, author: "critical_friend", text: replyText, createdAt: nowIso() },
      workspaceUpdates,
      events: workspaceUpdates.map((update) => ({ type: "workspace_update", relativePath: update.relativePath }))
    };
  }

  async *getEvents(_session: HarnessSession): AsyncIterable<HarnessEvent> {
    yield { type: "status", status: "ready", message: "Der Planungsraum ist bereit." };
  }

  async stopSession(_session: HarnessSession): Promise<void> {
    return;
  }
}
