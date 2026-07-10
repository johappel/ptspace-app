import { FastifyInstance } from "fastify";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

function markdownItems(markdown: string): string[] {
  const items: string[] = [];
  let heading = "";
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      heading = line.slice(3).trim();
      continue;
    }
    if (!line || line.startsWith("#") || line.startsWith(">")) continue;
    const value = line.replace(/^[-*]\s+/, "").trim();
    if (!value || /^(noch (?:offen|zu klären|zu entwickeln)|noch keine)/i.test(value)) continue;
    items.push(heading && !line.startsWith("- ") ? `${heading}: ${value}` : value);
  }
  return [...new Set(items)];
}

function learningDesignPreview(markdown: string): string[] {
  const metadata = /^(Thema|Fach \/ Lernbereich|Zielgruppe):/i;
  return markdownItems(markdown).filter((item) => !metadata.test(item)).slice(0, 8);
}

export async function thinkingStateRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager }) {
  app.get("/planning-spaces/:id/thinking-state", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }
    await deps.workspace.ensureWorkspace(space);
    const [learningDesign, decisionsMd, openQuestionsMd, nextStepsMd, summary] = await Promise.all([
      deps.workspace.readProjectFile(id, "learning-design.md"),
      deps.workspace.readProjectFile(id, "decisions.md"),
      deps.workspace.readProjectFile(id, "open-questions.md"),
      deps.workspace.readProjectFile(id, "next-steps.md"),
      deps.workspace.readProjectFile(id, "conversation-summary.md")
    ]);
    return {
      cards: [
        {
          id: "denkstand",
          title: "Denkstand",
          summary: space.initialIdea || "Der Denkstand wird im Gespräch aufgebaut.",
          previewItems: learningDesignPreview(learningDesign)
        },
        {
          id: "offene-entscheidungen",
          title: "Offene Entscheidungen",
          summary: "Was vor einem Materialentwurf noch geklärt werden sollte.",
          previewItems: [
            ...markdownItems(decisionsMd),
            ...markdownItems(openQuestionsMd).map((item) => `Offen: ${item}`)
          ].slice(0, 8)
        },
        {
          id: "nächste-schritte",
          title: "Nächste Schritte",
          summary: "Ein sinnvoller nächster Schritt reicht für den Moment.",
          previewItems: markdownItems(nextStepsMd).slice(0, 8)
        }
      ],
      summary
    };
  });
}
