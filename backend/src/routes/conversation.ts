import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { GitManager } from "../services/git/GitManager.js";
import { HarnessAdapter } from "../services/harness/HarnessAdapter.js";
import { ConversationStore } from "../storage/ConversationStore.js";

const SendMessageSchema = z.object({ message: z.string().min(1) });

export async function conversationRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager; harness: HarnessAdapter; conversation: ConversationStore }
) {
  app.get("/planning-spaces/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }
    const messages = await deps.conversation.getMessages(id);
    return { messages };
  });

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

    // Store teacher message
    const teacherMessageId = `msg-${Date.now()}-teacher`;
    await deps.conversation.addMessage(id, {
      id: teacherMessageId,
      author: "teacher",
      text: parsed.data.message,
      createdAt: new Date().toISOString()
    });

    const workspaceRoot = await deps.workspace.ensureWorkspace(space);
    try {
      const availability = await deps.harness.checkAvailability();
      if (availability.status !== "ready") {
        return reply.code(409).send({ message: availability.teacherFacingMessage, availability });
      }
      const session = await deps.harness.createSession({ planningSpaceId: space.id, workspaceRoot });
      const result = await deps.harness.sendMessage({ 
        session, 
        space, 
        message: parsed.data.message,
        conversationContext: await deps.conversation.getConversationSummary(id)
      });
      const failed = result.events.some((event) => event.type === "status" && event.status === "failed");
      if (failed) {
        return reply.code(409).send({ message: result.reply.text, events: result.events });
      }

      // Store CF message
      const cfMessageId = `msg-${Date.now()}-cf`;
      await deps.conversation.addMessage(id, {
        id: cfMessageId,
        author: "critical_friend",
        text: result.reply.text,
        createdAt: new Date().toISOString()
      });

      for (const update of result.workspaceUpdates) {
        await deps.workspace.writeProjectFile(space.id, update.relativePath, update.content);
      }
      const stateChanged = result.events.some(
        (event) =>
          event.type === "workspace_update" &&
          ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"].includes(event.relativePath)
      );
      const version = await deps.git.saveVersion(workspaceRoot, stateChanged ? "Denkstand aktualisiert" : "Gespräch fortgeführt");
      return { status: "wird_vorbereitet", reply: result.reply, version, events: result.events };
    } catch (error) {
      request.log.error({ err: error }, "harness conversation failed");
      return reply.code(409).send({
        message: "Die geschützte Testausführung konnte noch nicht abgeschlossen werden. Bitte prüfe die freigegebene Harness-Konfiguration."
      });
    }
  });
}
