import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { HarnessAdapter } from "../services/harness/HarnessAdapter.js";

const SendMessageSchema = z.object({ message: z.string().min(1) });

export async function conversationRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; harness: HarnessAdapter }) {
  app.post("/planning-spaces/:id/conversation", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = SendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Bitte schreibe kurz, woran du weiterdenken möchtest." });
    }
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }
    const workspaceRoot = await deps.workspace.ensureWorkspace(space);
    const session = await deps.harness.createSession({ planningSpaceId: space.id, workspaceRoot });
    const result = await deps.harness.sendMessage({ session, space, message: parsed.data.message });
    for (const update of result.workspaceUpdates) {
      await deps.workspace.writeProjectFile(space.id, update.relativePath, update.content);
    }
    return { status: "wird_vorbereitet", reply: result.reply };
  });
}
