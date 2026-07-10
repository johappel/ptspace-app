import { FastifyInstance } from "fastify";
import { z } from "zod";
import { LearningLandscapeSchema, PlanningBoardSchema } from "@ptspace/shared";
import { GitManager } from "../services/git/GitManager.js";
import { parseLearningLandscape, parsePlanningBoard, serializeLearningLandscape, serializePlanningBoard } from "../services/planning/PlanningArtifactCodec.js";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

const UpdateArtifactsSchema = z.object({
  learningLandscape: LearningLandscapeSchema.optional(),
  planningBoard: PlanningBoardSchema.optional()
}).refine((value) => value.learningLandscape || value.planningBoard, {
  message: "Bitte übermittle eine Lernlandschaft oder ein Planungsboard."
});

function validationMessage(error: unknown): string {
  return error instanceof Error
    ? `Die Planungsdatei ist noch nicht in einer lesbaren Form: ${error.message}`
    : "Die Planungsdatei ist noch nicht in einer lesbaren Form.";
}

export async function planningArtifactRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager }
) {
  app.get("/planning-spaces/:id/planning-artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });

    await deps.workspace.ensureWorkspace(space);
    const [learningLandscapeMarkdown, planningBoardYaml] = await Promise.all([
      deps.workspace.readProjectFile(id, "learning-landscape.md"),
      deps.workspace.readProjectFile(id, "planning-board.yml")
    ]);

    try {
      return {
        learningLandscape: parseLearningLandscape(learningLandscapeMarkdown),
        planningBoard: parsePlanningBoard(planningBoardYaml)
      };
    } catch (error) {
      return reply.code(422).send({ message: validationMessage(error) });
    }
  });

  app.put("/planning-spaces/:id/planning-artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });

    const parsed = UpdateArtifactsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Die vorgeschlagenen Änderungen sind nicht vollständig oder enthalten ungültige Verweise." });

    await deps.workspace.ensureWorkspace(space);
    const writes: Array<Promise<void>> = [];
    if (parsed.data.learningLandscape) {
      writes.push(deps.workspace.writeProjectFile(id, "learning-landscape.md", serializeLearningLandscape(parsed.data.learningLandscape)));
    }
    if (parsed.data.planningBoard) {
      writes.push(deps.workspace.writeProjectFile(id, "planning-board.yml", serializePlanningBoard(parsed.data.planningBoard)));
    }
    await Promise.all(writes);
    const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Lernlandschaft oder Planungsboard aktualisiert");

    return {
      learningLandscape: parsed.data.learningLandscape,
      planningBoard: parsed.data.planningBoard,
      version
    };
  });
}
