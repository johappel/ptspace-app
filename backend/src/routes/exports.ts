import { FastifyInstance } from "fastify";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

export async function exportRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager }) {
  app.get("/planning-spaces/:id/export/markdown", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }
    await deps.workspace.ensureWorkspace(space);
    const learningDesign = await deps.workspace.readProjectFile(id, "learning-design.md");
    const decisions = await deps.workspace.readProjectFile(id, "decisions.md");
    const openQuestions = await deps.workspace.readProjectFile(id, "open-questions.md");
    const markdown = [
      `# ${space.title}`,
      "",
      "Hinweis: Dieser Export enthaelt den kuratierten Denkstand, nicht den rohen Chatverlauf.",
      "",
      learningDesign,
      decisions,
      openQuestions
    ].join("\n");
    return reply.header("content-type", "text/markdown; charset=utf-8").send(markdown);
  });
}
