import { randomUUID } from "node:crypto";
import { LearningLandscape, LearningMoment, LandscapeTransition, PlanningBoardItem, TemporalPlan, TimePlacement } from "@ptspace/shared";

// Phase 8 (T-801..T-804): Der Critical Friend erzeugt strukturierte Vorschläge.
// Ein Vorschlag ist ausdrücklich noch keine kanonische Änderung und kein Service
// Request. Er wird im Frontend als Vorschau angezeigt; erst „Übernehmen" schreibt
// über die bestehenden PUT-Routen. Die Erzeugung ist deterministisch und liest den
// aktuellen Denkstand, damit sie auch ohne freigegebenen Harness verlässlich ist.

export type ProposalKind = "learning_moment" | "transition" | "temporal_placement" | "board_item";

export type ProposalFocus = { kind: string; id: string; label: string };

export type Proposal = {
  id: string;
  kind: ProposalKind;
  rationale: string;
  expectedConsequence: string;
  moment?: LearningMoment;
  possibleTransitions?: Array<{ fromId: string; fromLabel: string; toId: string; toLabel: string; kind: LandscapeTransition["kind"] }>;
  timeEffect?: string;
  transition?: LandscapeTransition;
  placement?: TimePlacement;
  placementWindowLabel?: string;
  boardItem?: PlanningBoardItem;
};

export type GenerateProposalInput = {
  kind: ProposalKind;
  note?: string;
  focus?: ProposalFocus;
  landscape: LearningLandscape;
  temporalPlan: TemporalPlan;
  board: { items: PlanningBoardItem[] };
};

export class ProposalService {
  generate(input: GenerateProposalInput): Proposal {
    switch (input.kind) {
      case "learning_moment":
        return this.proposeMoment(input);
      case "transition":
        return this.proposeTransition(input);
      case "temporal_placement":
        return this.proposePlacement(input);
      case "board_item":
        return this.proposeBoardItem(input);
      default:
        throw new Error("proposal_kind_not_supported");
    }
  }

  private note(input: GenerateProposalInput): string {
    return (input.note ?? "").trim();
  }

  private proposeMoment(input: GenerateProposalInput): Proposal {
    const note = this.note(input);
    const focusMoment = input.landscape.moments.find((moment) => moment.id === input.focus?.id);
    const last = input.landscape.moments[input.landscape.moments.length - 1];
    const title = note.length >= 2 ? note.slice(0, 80) : "Zwischenschritt: Gedanken sichtbar machen";
    const moment: LearningMoment = {
      id: `lm-${randomUUID().slice(0, 8)}`,
      title,
      kind: "positioning",
      didacticPurpose: "Den Lernenden Raum geben, ihren aktuellen Stand sichtbar und besprechbar zu machen.",
      learningActivity: "Die Lernenden halten ihre gegenwärtige Deutung fest und tauschen sie mit einer Partnerin oder einem Partner aus.",
      expectedExperience: "Die Lernenden bemerken Unterschiede und Gemeinsamkeiten in ihren Deutungen.",
      materialNeeds: [],
      materialIds: [],
      openQuestions: note ? [] : ["Woran wird sichtbar, dass dieser Moment gebraucht wird?"],
      status: "draft"
    };
    const anchor = focusMoment ?? last;
    return {
      id: `proposal-${randomUUID()}`,
      kind: "learning_moment",
      rationale: anchor
        ? `Nach „${anchor.title}" fehlt ein Moment, in dem die Lernenden ihren eigenen Stand sichtbar machen, bevor es weitergeht.`
        : "Als Ausgangspunkt der Lernreise bietet sich ein Moment an, in dem die Lernenden ihre erste Deutung sichtbar machen.",
      expectedConsequence: "Die Lehrkraft erhält einen Anknüpfungspunkt für das weitere Gespräch und die Lernenden werden aktiv einbezogen.",
      moment,
      possibleTransitions: anchor
        ? [{ fromId: anchor.id, fromLabel: anchor.title, toId: moment.id, toLabel: moment.title, kind: "required" }]
        : [],
      timeEffect: "Als kurzer, gemeinsamer Abschnitt von etwa 10 Minuten planbar."
    };
  }

  private proposeTransition(input: GenerateProposalInput): Proposal {
    const moments = input.landscape.moments;
    if (moments.length < 2) throw new Error("proposal_needs_two_moments");
    const existing = new Set(input.landscape.transitions.map((transition) => `${transition.from}->${transition.to}`));
    let from = moments[moments.length - 2];
    let to = moments[moments.length - 1];
    for (let i = 0; i < moments.length - 1; i += 1) {
      if (!existing.has(`${moments[i].id}->${moments[i + 1].id}`)) {
        from = moments[i];
        to = moments[i + 1];
        break;
      }
    }
    const transition: LandscapeTransition = {
      id: `tr-${randomUUID().slice(0, 8)}`,
      from: from.id,
      to: to.id,
      kind: "required",
      rationale: this.note(input) || `Der Übergang von „${from.title}" zu „${to.title}" trägt die Lernenden gemeinsam weiter.`
    };
    return {
      id: `proposal-${randomUUID()}`,
      kind: "transition",
      rationale: `Zwischen „${from.title}" und „${to.title}" ist der pädagogische Zusammenhang noch nicht ausdrücklich beschrieben.`,
      expectedConsequence: "Die Lernreise wird als zusammenhängender Weg sichtbar und Brüche werden vermeidbar.",
      transition
    };
  }

  private proposePlacement(input: GenerateProposalInput): Proposal {
    const windows = input.temporalPlan.windows;
    if (windows.length === 0) throw new Error("proposal_needs_window");
    const placed = new Set(input.temporalPlan.placements.map((placement) => placement.momentId));
    const focusMoment = input.landscape.moments.find((moment) => moment.id === input.focus?.id && !placed.has(moment.id));
    const moment = focusMoment ?? input.landscape.moments.find((entry) => !placed.has(entry.id));
    if (!moment) throw new Error("proposal_no_unplaced_moment");
    const window = windows[0];
    const startMinute = input.temporalPlan.placements
      .filter((placement) => placement.windowId === window.id && placement.mode === "common")
      .reduce((max, placement) => Math.max(max, placement.startMinute + placement.durationMinutes), 0);
    const durationMinutes = Math.max(5, Math.min(window.durationMinutes - startMinute, 15));
    const placement: TimePlacement = {
      id: `tp-${randomUUID().slice(0, 8)}`,
      momentId: moment.id,
      windowId: window.id,
      startMinute: Math.min(startMinute, window.durationMinutes),
      durationMinutes,
      dramaturgicalRole: "other",
      mode: "common",
      note: ""
    };
    return {
      id: `proposal-${randomUUID()}`,
      kind: "temporal_placement",
      rationale: `„${moment.title}" ist noch nicht zeitlich eingeplant und passt in „${window.title}".`,
      expectedConsequence: "Der Lernmoment erhält einen konkreten Platz in der Stunde, ohne die Lernlandschaft zu verändern.",
      placement,
      placementWindowLabel: window.title
    };
  }

  private proposeBoardItem(input: GenerateProposalInput): Proposal {
    const note = this.note(input);
    const focusMoment = input.landscape.moments.find((moment) => moment.id === input.focus?.id);
    const openNeed = input.landscape.moments.flatMap((moment) => moment.materialNeeds.map((need) => ({ moment, need })))[0];
    const title = note.length >= 2 ? note.slice(0, 80) : openNeed ? openNeed.need : "Lernanliegen schärfen";
    const relatedMoment = focusMoment ?? openNeed?.moment;
    const boardItem: PlanningBoardItem = {
      id: `pb-${randomUUID().slice(0, 8)}`,
      title,
      kind: openNeed ? "produce" : "clarify",
      column: "clarify",
      status: "proposed",
      relatedNodes: relatedMoment ? [relatedMoment.id] : [],
      relatedWindows: [],
      materialIds: [],
      materialNeed: openNeed?.need ?? "",
      expectedResult: openNeed ? "Ein geprüfter Materialentwurf, der den Lernmoment trägt." : "Ein klar formuliertes Lernanliegen als Grundlage der weiteren Planung.",
      requiresTeacherApproval: true,
      serviceRequestId: "",
      reviewedAt: "",
      reviewedBy: ""
    };
    return {
      id: `proposal-${randomUUID()}`,
      kind: "board_item",
      rationale: openNeed
        ? `Für „${openNeed.moment.title}" ist ein Materialbedarf notiert, aber noch kein Arbeitsvorhaben angelegt.`
        : "Ein einzelnes, klar priorisiertes Arbeitsvorhaben hilft, den nächsten Schritt konkret zu machen.",
      expectedConsequence: "Es entsteht genau ein nächster Schritt – noch kein Auftrag an einen Worker.",
      boardItem
    };
  }
}
