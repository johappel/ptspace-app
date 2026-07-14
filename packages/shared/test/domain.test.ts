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
      status: "review_needed",
      createdAt: new Date().toISOString()
    });
    const roundtrip = MaterialSchema.parse(JSON.parse(JSON.stringify(material)));
    expect(roundtrip).toEqual(material);
  });

  it("rejects material metadata with an unknown status or kind", () => {
    const base = { id: "m1", title: "Titel", kind: "worksheet", status: "draft", createdAt: new Date().toISOString() };
    expect(() => MaterialSchema.parse({ ...base, status: "ready" })).toThrow();
    expect(() => MaterialSchema.parse({ ...base, kind: "video" })).toThrow();
  });
});