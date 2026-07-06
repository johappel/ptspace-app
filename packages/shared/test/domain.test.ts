import { describe, expect, it } from "vitest";
import {
  CreatePlanningSpaceSchema,
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
});