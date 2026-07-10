import { FastifyInstance } from "fastify";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

/**
 * Foundation endpoint for the canonical planning artefacts. The following
 * delivery replaces these textual snapshots with validated domain objects;
 * keeping the files visible here ensures that no parallel app-only model is
 * introduced in the meantime.
 */
export async function planningArtifactRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager }
) {
  app.get("/planning-spaces/:id/planning-artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }

    await deps.workspace.ensureWorkspace(space);
    const [learningLandscapeMarkdown, planningBoardYaml] = await Promise.all([
      deps.workspace.readProjectFile(id, "learning-landscape.md"),
      deps.workspace.readProjectFile(id, "planning-board.yml")
    ]);

    return {
      learningLandscapeMarkdown,
      planningBoardYaml
    };
  });
}
