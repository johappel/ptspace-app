import { FastifyInstance } from "fastify";
import { CreatePlanningSpaceSchema } from "@ptspace/shared";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

export async function planningSpaceRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager }) {
  app.get("/planning-spaces", async () => deps.store.list());

  app.post("/planning-spaces", async (request, reply) => {
    const parsed = CreatePlanningSpaceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Bitte prüfe die Angaben zum Planungsraum.", issues: parsed.error.issues });
    }
    const space = await deps.store.create(parsed.data);
    await deps.workspace.ensureWorkspace(space);
    return reply.code(201).send(space);
  });

  app.get("/planning-spaces/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }
    return space;
  });
}
