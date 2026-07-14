import { describe, expect, it } from "vitest";
import { ProposalService } from "../src/services/proposals/ProposalService.js";
import { LearningLandscapeSchema, PlanningBoardSchema, TemporalPlanSchema } from "@ptspace/shared";

const service = new ProposalService();

function landscape(momentCount: number) {
  return LearningLandscapeSchema.parse({
    schema: "ptspace.learning-landscape/v1",
    title: "Testlandschaft",
    structure: "linear",
    moments: Array.from({ length: momentCount }, (_, index) => ({
      id: `lm-${index + 1}`,
      title: `Moment ${index + 1}`,
      kind: "impulse",
      materialNeeds: index === 0 ? ["Bildimpuls"] : []
    })),
    transitions: []
  });
}

const emptyBoard = { items: PlanningBoardSchema.parse({ schema: "ptspace.planning-board/v1", items: [] }).items };
const emptyPlan = TemporalPlanSchema.parse({ schema: "ptspace.temporal-plan/v1", title: "Test", landscape: "learning-landscape.md", windows: [], placements: [] });
const planWithWindow = TemporalPlanSchema.parse({
  schema: "ptspace.temporal-plan/v1",
  title: "Test",
  landscape: "learning-landscape.md",
  windows: [{ id: "tw-1", title: "Stunde 1", kind: "lesson", durationMinutes: 45 }],
  placements: []
});

describe("ProposalService", () => {
  it("produces a structured learning-moment proposal with rationale and expected consequence", () => {
    const proposal = service.generate({ kind: "learning_moment", landscape: landscape(1), temporalPlan: emptyPlan, board: emptyBoard, note: "Eigene Position sichtbar machen" });
    expect(proposal.kind).toBe("learning_moment");
    expect(proposal.moment?.title).toContain("Eigene Position");
    expect(proposal.rationale.length).toBeGreaterThan(0);
    expect(proposal.expectedConsequence.length).toBeGreaterThan(0);
    expect(proposal.possibleTransitions?.[0]).toMatchObject({ toId: proposal.moment?.id });
  });

  it("proposes a transition between the first unconnected pair of moments", () => {
    const proposal = service.generate({ kind: "transition", landscape: landscape(3), temporalPlan: emptyPlan, board: emptyBoard });
    expect(proposal.transition).toMatchObject({ from: "lm-1", to: "lm-2", kind: "required" });
  });

  it("refuses a transition proposal when fewer than two moments exist", () => {
    expect(() => service.generate({ kind: "transition", landscape: landscape(1), temporalPlan: emptyPlan, board: emptyBoard })).toThrow("proposal_needs_two_moments");
  });

  it("proposes a placement for an unplaced moment inside a window", () => {
    const proposal = service.generate({ kind: "temporal_placement", landscape: landscape(2), temporalPlan: planWithWindow, board: emptyBoard });
    expect(proposal.placement).toMatchObject({ momentId: "lm-1", windowId: "tw-1" });
    expect(proposal.placementWindowLabel).toBe("Stunde 1");
  });

  it("refuses a placement proposal without a teaching window", () => {
    expect(() => service.generate({ kind: "temporal_placement", landscape: landscape(2), temporalPlan: emptyPlan, board: emptyBoard })).toThrow("proposal_needs_window");
  });

  it("proposes exactly one board item bound to an open material need", () => {
    const proposal = service.generate({ kind: "board_item", landscape: landscape(2), temporalPlan: emptyPlan, board: emptyBoard });
    expect(proposal.boardItem?.materialNeed).toBe("Bildimpuls");
    expect(proposal.boardItem?.relatedNodes).toEqual(["lm-1"]);
    expect(proposal.boardItem?.status).toBe("proposed");
    expect(proposal.boardItem?.requiresTeacherApproval).toBe(true);
  });
});
