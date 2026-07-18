import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GitManager } from "../services/git/GitManager.js";
import { MaterialAssignmentService } from "../services/materials/MaterialAssignmentService.js";
import { MaterialManifestStore } from "../storage/MaterialManifestStore.js";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

const AssignmentSchema = z.object({
  targetType: z.enum(["learning_moment", "board_item"]),
  targetId: z.string().min(1),
  targetPlanningSpaceId: z.string().min(1).optional()
});

export async function materialRoutes(
  app: FastifyInstance,
  deps: {
    store: PlanningSpaceStore;
    workspace: WorkspaceManager;
    git: GitManager;
    materials: MaterialManifestStore;
    assignments: MaterialAssignmentService;
  }
) {
  app.get("/planning-spaces/:id/materials", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    await deps.workspace.ensureWorkspace(space);
    return { materials: await deps.materials.list(id) };
  });

  app.post<{ Params: { id: string; materialId: string } }>("/planning-spaces/:id/materials/:materialId/assignments", async (request, reply) => {
    const { id, materialId } = request.params;
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const parsed = AssignmentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bitte wähle einen gültigen Lernmoment oder ein Arbeitsvorhaben aus." });
    if (parsed.data.targetPlanningSpaceId && parsed.data.targetPlanningSpaceId !== id) return reply.code(422).send({ message: "Das Zuordnungsziel gehört zu einem anderen Planungsraum." });
    await deps.workspace.ensureWorkspace(space);
    try {
      const result = await deps.assignments.assign(id, materialId, {
        type: parsed.data.targetType,
        id: parsed.data.targetId
      });
      const version = result.changed
        ? await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Material pädagogisch zugeordnet")
        : { label: "Material pädagogisch zugeordnet", committed: false };
      return { ...result, version };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      const messages: Record<string, string> = {
        material_not_found: "Das Material ist in diesem Planungsraum nicht vorhanden.",
        learning_moment_not_found: "Der Lernmoment gehört nicht zu diesem Planungsraum.",
        board_item_not_found: "Das Arbeitsvorhaben gehört nicht zu diesem Planungsraum.",
        material_assignment_target_unknown: "Dieses Zuordnungsziel wird nicht unterstützt.",
        material_manifest_invalid: "Die Materialangaben konnten nicht sicher gelesen werden."
      };
      const status = reason === "material_not_found" ? 404 : 422;
      request.log.error({ err: error, reason }, "material assignment failed");
      return reply.code(status).send({ message: messages[reason] ?? "Die Materialzuordnung konnte nicht sicher gespeichert werden." });
    }
  });
}
