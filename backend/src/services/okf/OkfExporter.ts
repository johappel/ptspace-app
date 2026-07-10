import { PlanningSpace } from "@ptspace/shared";

function yamlString(value: string): string {
  return JSON.stringify(value ?? "");
}

export class OkfExporter {
  createLearningDesignMarkdown(input: { space: PlanningSpace; learningDesignMarkdown: string; decisionsMarkdown: string; openQuestionsMarkdown: string }): string {
    const frontmatter = [
      "---",
      "type: learning_design",
      `title: ${yamlString(input.space.title)}`,
      "status: proposal",
      `subject: ${yamlString(input.space.subject ?? "")}`,
      `target_group: ${yamlString(input.space.targetGroup ?? "")}`,
      "source_status: teacher_generated_review_needed",
      "contains_raw_chat: false",
      "contains_service_requests: false",
      "review_required: true",
      "---"
    ].join("\n");

    return [
      frontmatter,
      "",
      `# ${input.space.title}`,
      "",
      "Dieses OKF-Markdown ist ein Kurationsvorschlag. Es enthält keinen rohen Chatverlauf und keine internen Service Requests.",
      "",
      "## Learning Design",
      "",
      input.learningDesignMarkdown.trim(),
      "",
      "## Entscheidungen",
      "",
      input.decisionsMarkdown.trim(),
      "",
      "## Offene Fragen",
      "",
      input.openQuestionsMarkdown.trim(),
      ""
    ].join("\n");
  }
}