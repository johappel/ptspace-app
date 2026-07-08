import { describe, expect, it } from "vitest";
import { createEmptyLearningDesign, PlanningSpace } from "@ptspace/shared";
import { OkfExporter } from "../src/services/okf/OkfExporter.js";

const space: PlanningSpace = {
  id: "space-1",
  title: "Hoffnung trotz Krise",
  subject: "Religion",
  targetGroup: "Klasse 9",
  initialIdea: "",
  status: "active",
  participants: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  learningDesign: createEmptyLearningDesign(),
  openQuestions: [],
  decisions: [],
  nextSteps: [],
  materials: []
};

describe("OkfExporter", () => {
  it("creates curated OKF markdown with frontmatter", () => {
    const markdown = new OkfExporter().createLearningDesignMarkdown({
      space,
      learningDesignMarkdown: "# Denkstand\nLernanliegen",
      decisionsMarkdown: "# Entscheidungen\nEine Entscheidung",
      openQuestionsMarkdown: "# Offene Fragen\nEine Frage"
    });

    expect(markdown).toContain("type: learning_design");
    expect(markdown).toContain("contains_raw_chat: false");
    expect(markdown).toContain("## Learning Design");
    expect(markdown).toContain("Lernanliegen");
  });
});