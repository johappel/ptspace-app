import { HarnessAdapter, HarnessAvailability, HarnessEvent, HarnessMessageResult, HarnessSession, HarnessTaskRequest, HarnessTaskResult, SendHarnessMessageInput } from "./HarnessAdapter.js";
import type { PlanningSpace } from "@ptspace/shared";

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
      events: workspaceUpdates.map((update) => ({ type: "workspace_update", relativePath: update.relativePath })),
      ...( /material|entwurf|arbeitsauftrag|vorbereiten|vorbereitung/i.test(text) ? {
        suggestedAction: {
          kind: "worker_draft" as const,
          title: "Ersten Arbeitsauftrag als Entwurf vorbereiten",
          rationale: "Der aktuelle Denkstand ist weit genug, um einen kleinen, sichtbaren Entwurf zur gemeinsamen Prüfung vorzubereiten.",
          expectedResult: "Ein klarer Arbeitsauftrag, der den aktuellen Denkstand aufgreift und ausdrücklich als Entwurf zurückkehrt.",
          capability: "create_student_instruction" as const
        }
      } : {})
    };
  }

  async *getEvents(_session: HarnessSession): AsyncIterable<HarnessEvent> {
    yield { type: "status", status: "ready", message: "Der Planungsraum ist bereit." };
  }

  async requestTask(input: HarnessTaskRequest): Promise<HarnessTaskResult> {
    if (input.capability !== "create_student_instruction" && input.capability !== "create_board_material") {
      throw new Error("mock_capability_not_supported");
    }
    const title = input.capability === "create_board_material" ? (typeof input.input.title === "string" ? input.input.title : "Material") : "Arbeitsauftrag";
    const expectedResult = typeof input.input.expectedResult === "string" ? input.input.expectedResult : "";
    
    // Generate differentiated content based on input
    const sections: string[] = [
      `# Entwurf: ${title}`,
      ""
    ];
    
    // Add context section if available
    if (expectedResult) {
      sections.push("## Ziel");
      sections.push("");
      sections.push(expectedResult);
      sections.push("");
    }
    
    // Add task-specific content based on title keywords
    const titleLower = title.toLowerCase();
    if (titleLower.includes("begriff")) {
      sections.push("## Arbeitsauftrag");
      sections.push("");
      sections.push("1. Lest die Definitionen sorgfältig durch.");
      sections.push("2. Notiert Beispiele aus eurem Alltag oder der Praxis.");
      sections.push("3. Diskutiert, welche Begriffe zusammenhängen.");
      sections.push("");
    } else if (titleLower.includes("recherch")) {
      sections.push("## Rechercheprozess");
      sections.push("");
      sections.push("1. Sammelt zuverlässige Quellen.");
      sections.push("2. Lest kritisch und notiert Kernaussagen.");
      sections.push("3. Bereitet eine kurze Zusammenfassung vor.");
      sections.push("");
    } else if (titleLower.includes("plan") || titleLower.includes("entwick")) {
      sections.push("## Planung");
      sections.push("");
      sections.push("1. Überlegt gemeinsam den Aufbau.");
      sections.push("2. Notiert offene Entscheidungen.");
      sections.push("3. Skizziert den Ablauf.");
      sections.push("");
    } else {
      sections.push("## Arbeitsauftrag");
      sections.push("");
      sections.push("Beschreibt, was ihr an der vereinbarten Situation wahrnehmt, und begründet eure Deutung.");
      sections.push("");
    }
    
    sections.push("## Vorgehen");
    sections.push("");
    sections.push("- Arbeitet zu zweit oder in kleinen Gruppen.");
    sections.push("- Haltet eure Gedanken schriftlich fest.");
    sections.push("- Bereitet eine Rückmeldung vor.");
    sections.push("");
    sections.push("## Rückmeldung oder Ergebnis");
    sections.push("");
    sections.push("Formuliert eine offene Frage für das gemeinsame Gespräch.");
    sections.push("");
    sections.push("> Status: Entwurf – noch nicht für den Unterricht freigegeben.");
    
    const content = sections.join("\n");
    return {
      summary: "Der Worker hat einen differenzierten Entwurf vorbereitet.",
      workspaceUpdates: [{ relativePath: input.expectedOutput.relativePath, content }],
      events: [{ type: "workspace_update", relativePath: input.expectedOutput.relativePath }]
    };
  }

  async reviewTask(_input: { session: HarnessSession; space: PlanningSpace; capability: string; expectedOutput: { type: string; relativePath: string }; context: Record<string, unknown> }) {
    return {
      status: "passed" as const,
      note: "Der Critical Friend erkennt im Entwurf keine blockierende Abweichung vom erwarteten Arbeitsvorhaben."
    };
  }

  async stopSession(_session: HarnessSession): Promise<void> {
    return;
  }
}
