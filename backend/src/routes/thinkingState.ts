import { FastifyInstance } from "fastify";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

function markdownItems(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

export async function thinkingStateRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager }) {
  app.get("/planning-spaces/:id/thinking-state", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }
    await deps.workspace.ensureWorkspace(space);
    const [learningDesign, openQuestionsMd, nextStepsMd, summary] = await Promise.all([
      deps.workspace.readProjectFile(id, "learning-design.md"),
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
          previewItems: markdownItems(learningDesign).slice(0, 3)
        },
        {
          id: "offene-entscheidungen",
          title: "Offene Entscheidungen",
          summary: "Was vor einem Materialentwurf noch geklärt werden sollte.",
          previewItems: markdownItems(openQuestionsMd).slice(0, 3)
        },
        {
          id: "naechste-schritte",
          title: "Nächste Schritte",
          summary: "Ein sinnvoller nächster Schritt reicht für den Moment.",
          previewItems: markdownItems(nextStepsMd).slice(0, 3)
        }
      ],
      summary
    };
  });
}
