import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ConversationMarkerKindSchema, ConversationMarkerTargetTypeSchema } from "@ptspace/shared";
import { ConversationMarkerService } from "../services/conversation/ConversationMarkerService.js";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";

const MarkerInputSchema = z.object({
  sourceMessageId: z.string().min(1),
  kind: ConversationMarkerKindSchema,
  targetType: ConversationMarkerTargetTypeSchema,
  targetId: z.string().min(1),
  label: z.string().trim().min(1),
  targetPlanningSpaceId: z.string().min(1).optional()
});

const SupersedeSchema = z.object({ reason: z.string().trim().min(1).optional() });

export async function conversationMarkerRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; markers: ConversationMarkerService }
) {
  app.get("/planning-spaces/:id/conversation-markers", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    return { markers: await deps.markers.list(id) };
  });

  app.post("/planning-spaces/:id/conversation-markers", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const parsed = MarkerInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Der Gesprächsbezug ist noch nicht vollständig." });
    try {
      const marker = await deps.markers.create(id, parsed.data);
      return reply.code(201).send({ marker });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      const messages: Record<string, string> = {
        conversation_marker_foreign_target: "Das Ziel gehört zu einem anderen Planungsraum.",
        conversation_marker_source_not_found: "Die angegebene Gesprächsstelle gehört nicht zu diesem Planungsraum.",
        conversation_marker_target_not_found: "Das Ziel ist in diesem Planungsraum nicht vorhanden.",
        planning_space_not_found: "Diesen Planungsraum habe ich nicht gefunden."
      };
      return reply.code(reason === "conversation_marker_source_not_found" || reason === "conversation_marker_target_not_found" ? 422 : 409)
        .send({ message: messages[reason] ?? "Der Gesprächsbezug konnte nicht gespeichert werden." });
    }
  });

  app.post("/planning-spaces/:id/conversation-markers/:markerId/supersede", async (request, reply) => {
    const { id, markerId } = request.params as { id: string; markerId: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const parsed = SupersedeSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ message: "Für den ersetzten Gesprächsbezug fehlt noch eine gültige Begründung." });
    try {
      return { marker: await deps.markers.supersede(id, markerId, parsed.data.reason) };
    } catch (error) {
      if (error instanceof Error && error.message === "conversation_marker_not_found") {
        return reply.code(404).send({ message: "Diesen Gesprächsbezug habe ich nicht gefunden." });
      }
      throw error;
    }
  });
}
