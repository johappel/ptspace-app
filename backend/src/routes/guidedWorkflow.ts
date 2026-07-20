import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { GuidedWorkflowService } from "../services/guided/GuidedWorkflowService.js";
import { ServiceRequestWorkflow } from "../services/serviceRequests/ServiceRequestWorkflow.js";

const CreateProposalSchema = z.object({
  sourceMessageId: z.string().min(1),
  title: z.string().trim().min(2),
  rationale: z.string().trim().min(10),
  expectedResult: z.string().trim().min(5),
  capability: z.enum(["create_board_material", "create_student_instruction"]),
  relatedMomentIds: z.array(z.string().min(1)).optional(),
  materialNeed: z.string().trim().optional()
});

const ReviewSchema = z.object({
  reviewedBy: z.string().trim().min(1).default("Lehrkraft"),
  note: z.string().trim().optional()
});

function messageFor(reason: string): string {
  const messages: Record<string, string> = {
    guided_proposal_not_found: "Diesen Vorschlag gibt es in diesem Planungsraum nicht.",
    guided_proposal_not_pending: "Dieser Vorschlag ist bereits bearbeitet oder nicht mehr aktuell.",
    guided_proposal_unknown_moment: "Der Vorschlag verweist auf einen Lernmoment, der hier nicht vorhanden ist.",
    service_request_not_found: "Diese Vorbereitung gibt es in diesem Planungsraum nicht.",
    service_request_not_returned: "Das Ergebnis liegt noch nicht zur fachlichen Prüfung vor.",
    automatic_check_failed: "Die automatische Vorprüfung ist noch nicht bestanden.",
    critical_friend_review_blocked: "Der Critical Friend hat einen blockierenden Befund markiert.",
    material_not_found: "Zum Ergebnis ist noch kein Materialbezug vorhanden.",
    board_item_not_found: "Das Arbeitsvorhaben ist in diesem Planungsraum nicht mehr vorhanden.",
    planning_space_not_found: "Diesen Planungsraum habe ich nicht gefunden."
  };
  return messages[reason] ?? "Der geführte Schritt konnte noch nicht sicher abgeschlossen werden.";
}

export async function guidedWorkflowRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; guided: GuidedWorkflowService; workflow: ServiceRequestWorkflow }
) {
  app.get("/planning-spaces/:id/guided-proposals", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: messageFor("planning_space_not_found") });
    return { proposals: await deps.guided.list(id) };
  });

  app.post("/planning-spaces/:id/guided-proposals", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: messageFor("planning_space_not_found") });
    const parsed = CreateProposalSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Der Vorschlag ist noch nicht vollständig formuliert." });
    try {
      const proposal = await deps.guided.create(id, parsed.data);
      return reply.code(201).send({ proposal });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      return reply.code(reason === "guided_proposal_unknown_moment" ? 422 : 409).send({ message: messageFor(reason) });
    }
  });

  app.post("/planning-spaces/:id/guided-proposals/:proposalId/accept", async (request, reply) => {
    const { id, proposalId } = request.params as { id: string; proposalId: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: messageFor("planning_space_not_found") });
    try {
      const result = await deps.guided.accept(id, proposalId, space);
      return { ...result, teacherFacingMessage: "Die Vorbereitung ist gestartet und bleibt unten im Denkraum sichtbar." };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      return reply.code(reason === "guided_proposal_not_found" ? 404 : 409).send({ message: messageFor(reason) });
    }
  });

  app.post("/planning-spaces/:id/guided-proposals/:proposalId/discard", async (request, reply) => {
    const { id, proposalId } = request.params as { id: string; proposalId: string };
    try {
      return { proposal: await deps.guided.discard(id, proposalId) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      return reply.code(reason === "guided_proposal_not_found" ? 404 : 409).send({ message: messageFor(reason) });
    }
  });

  app.get("/planning-spaces/:id/service-requests/:requestId", async (request, reply) => {
    const { id, requestId } = request.params as { id: string; requestId: string };
    const serviceRequest = await deps.workflow.get(id, requestId);
    if (!serviceRequest) return reply.code(404).send({ message: messageFor("service_request_not_found") });
    return { serviceRequest };
  });

  app.get("/planning-spaces/:id/work-events", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: messageFor("planning_space_not_found") });
    const requests = await deps.workflow.list(id);
    return {
      workEvents: requests.map((entry) => ({
        id: entry.id,
        title: typeof entry.input.title === "string" ? entry.input.title : "Vorbereitung",
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      }))
    };
  });

  app.post("/planning-spaces/:id/service-requests/:requestId/review", async (request, reply) => {
    const { id, requestId } = request.params as { id: string; requestId: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: messageFor("planning_space_not_found") });
    const parsed = ReviewSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ message: "Für die Freigabe fehlt noch eine gültige Prüfung." });
    try {
      const result = await deps.guided.review(id, requestId, parsed.data.reviewedBy, parsed.data.note);
      return {
        serviceRequest: result.request,
        planningBoard: result.board,
        teacherFacingMessage: "Das Material ist für den Unterricht bereit."
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      return reply.code(reason === "service_request_not_found" ? 404 : 409).send({ message: messageFor(reason) });
    }
  });
}
