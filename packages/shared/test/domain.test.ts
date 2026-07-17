import { describe, expect, it } from "vitest";
import {
  CreatePlanningSpaceSchema,
  MaterialSchema,
  PlanningSpaceSchema,
  createEmptyLearningDesign,
  toTeacherFacingStatus
} from "../src/index.js";

describe("shared domain schemas", () => {
  it("validates a minimal planning-space creation input", () => {
    const parsed = CreatePlanningSpaceSchema.parse({ title: "Eine tragfähige Frage" });
    expect(parsed.title).toBe("Eine tragfähige Frage");
    expect(parsed.subject).toBe("");
  });

  it("rejects too-short planning-space titles", () => {
    expect(() => CreatePlanningSpaceSchema.parse({ title: "ab" })).toThrow();
  });

  it("creates a schema-valid empty learning design", () => {
    const learningDesign = createEmptyLearningDesign({ subject: "Religion", targetGroup: "Klasse 9" });
    const planningSpace = PlanningSpaceSchema.parse({
      id: "space-1",
      title: "Test",
      status: "active",
      participants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningDesign,
      openQuestions: [],
      decisions: [],
      nextSteps: [],
      materials: []
    });
    expect(planningSpace.learningDesign.context.subject).toBe("Religion");
  });

  it("translates internal statuses into teacher-facing statuses", () => {
    expect(toTeacherFacingStatus("in_progress")).toBe("wird_vorbereitet");
    expect(toTeacherFacingStatus("requires_admin_approval")).toBe("admin_freigabe_noetig");
  });

  it("keeps material metadata stable across a JSON roundtrip (T-1101)", () => {
    const material = MaterialSchema.parse({
      id: "material-impuls",
      title: "Bildimpuls mit Leitfragen",
      kind: "worksheet",
      status: "in_review",
      relatedMoments: ["lm-impuls"],
      relatedWindows: [],
      relatedBoardItems: ["pb-impuls"],
      relatedDecisions: [],
      sourceRequest: "sr-impuls",
      reviewedAt: null,
      createdAt: new Date().toISOString()
    });
    const roundtrip = MaterialSchema.parse(JSON.parse(JSON.stringify(material)));
    expect(roundtrip).toEqual(material);
  });

  it("rejects material metadata with an unknown status or kind", () => {
    const base = { id: "m1", title: "Titel", kind: "student_material", status: "draft", relatedMoments: ["lm-1"], relatedWindows: [], relatedBoardItems: [], relatedDecisions: [], sourceRequest: "sr-1", createdAt: new Date().toISOString(), reviewedAt: null };
    expect(() => MaterialSchema.parse({ ...base, status: "ready" })).toThrow();
    expect(() => MaterialSchema.parse({ ...base, kind: "" })).toThrow();
    expect(() => MaterialSchema.parse({ ...base, relatedMoments: [], sourceRequest: "sr-1" })).toThrow("material_needs_pedagogical_reference");
    expect(() => MaterialSchema.parse({ ...base, status: "ready_for_class", reviewedAt: null })).toThrow("ready_material_needs_review_timestamp");
  });
});