import { describe, expect, it } from "vitest";
import { LearningLandscapeSchema, PlanningBoardSchema, MaterialSchema } from "@ptspace/shared";
import { checkWorkspaceConsistency, WorkspaceSnapshot } from "../src/services/runtime/WorkspaceConsistencyCheck.js";

const now = new Date().toISOString();

function landscape(momentIds: string[]) {
  return LearningLandscapeSchema.parse({
    schema: "ptspace.learning-landscape/v1",
    title: "L",
    structure: "linear",
    moments: momentIds.map((id) => ({ id, title: id, kind: "impulse" })),
    transitions: []
  });
}

function board(itemIds: string[], relatedNodes: string[] = []) {
  return PlanningBoardSchema.parse({
    schema: "ptspace.planning-board/v1",
    items: itemIds.map((id) => ({
      id, title: id, kind: "produce", column: "prepare", status: "proposed",
      relatedNodes, relatedWindows: [], materialIds: [], materialNeed: "", expectedResult: "",
      requiresTeacherApproval: true, serviceRequestId: "", reviewedAt: "", reviewedBy: ""
    }))
  });
}

function material(overrides: Record<string, unknown> = {}) {
  return MaterialSchema.parse({
    id: "material-1",
    title: "Arbeitsblatt",
    kind: "board_material",
    status: "in_review",
    relatedMoments: ["lm-1"],
    relatedWindows: [],
    relatedBoardItems: [],
    relatedDecisions: [],
    sourceRequest: "sr-1",
    createdAt: now,
    reviewedAt: null,
    ...overrides
  });
}

const emptySnapshot: Omit<WorkspaceSnapshot, "landscape" | "board" | "materials"> = {
  openQuestions: [],
  decisions: []
};

describe("checkWorkspaceConsistency", () => {
  it("returns no findings for a consistent workspace", () => {
    const findings = checkWorkspaceConsistency({
      landscape: landscape(["lm-1"]),
      board: board(["pb-1"], ["lm-1"]),
      materials: [material()],
      ...emptySnapshot
    });
    expect(findings).toEqual([]);
  });

  it("flags a material referencing a removed learning moment", () => {
    const findings = checkWorkspaceConsistency({
      landscape: landscape(["lm-other"]),
      board: board([]),
      materials: [material()],
      ...emptySnapshot
    });
    expect(findings.some((finding) => finding.kind === "orphaned_material_reference")).toBe(true);
  });

  it("flags a material without provenance", () => {
    const findings = checkWorkspaceConsistency({
      landscape: landscape(["lm-1"]),
      board: board([]),
      materials: [material({ sourceRequest: "sr-1", relatedMoments: ["lm-1"] })].map((m) => ({ ...m, sourceRequest: "" })) as never,
      ...emptySnapshot
    });
    expect(findings.some((finding) => finding.kind === "missing_provenance")).toBe(true);
  });

  it("flags a board item referencing a removed moment", () => {
    const findings = checkWorkspaceConsistency({
      landscape: landscape(["lm-1"]),
      board: board(["pb-1"], ["lm-ghost"]),
      materials: [],
      ...emptySnapshot
    });
    expect(findings.some((finding) => finding.kind === "inconsistent_reference")).toBe(true);
  });

  it("flags an open question apparently resolved by a decision", () => {
    const findings = checkWorkspaceConsistency({
      landscape: landscape(["lm-1"]),
      board: board([]),
      materials: [],
      openQuestions: ["Welche Hoffnungstradition trägt den Einstieg?"],
      decisions: ["Der Einstieg nutzt eine biblische Hoffnungstradition als Anker."]
    });
    expect(findings.some((finding) => finding.kind === "resolved_open_question")).toBe(true);
  });

  it("only uses deterministic detection (no semantic findings without an LLM)", () => {
    const findings = checkWorkspaceConsistency({
      landscape: landscape(["lm-other"]),
      board: board([]),
      materials: [material()],
      ...emptySnapshot
    });
    expect(findings.every((finding) => finding.detectedBy === "deterministic")).toBe(true);
  });
});
