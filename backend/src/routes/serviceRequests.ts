import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GitManager } from "../services/git/GitManager.js";
import { ServiceRequestWorkflow } from "../services/serviceRequests/ServiceRequestWorkflow.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";

const ProposalSchema = z.object({
  reason: z.string().min(10).default("Das Lernanliegen ist ausreichend geklärt; ein erster Arbeitsauftrag soll als prüfbarer Entwurf vorbereitet werden.")
});

const BoardMaterialSchema = z.object({
  boardItemId: z.string().min(1),
  title: z.string().min(2),
  relatedMoments: z.array(z.string().min(1)).min(1, "Ein Materialauftrag braucht mindestens einen pädagogischen Bezug."),
  expectedResult: z.string().default(""),
  reason: z.string().min(10).default("Für dieses Arbeitsvorhaben soll ein erster, ausdrücklich noch zu prüfender Materialentwurf vorbereitet werden.")
});

export async function serviceRequestRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager; workflow: ServiceRequestWorkflow }
) {
  app.get("/capabilities", async () => ({
    capabilities: deps.workflow.listCapabilities().map((capability) => ({
      id: capability.id,
      service: capability.service,
      label: capability.teacherFacingLabel
    }))
  }));

  app.get("/planning-spaces/:id/service-requests", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    return { requests: await deps.workflow.list(id) };
  });

  app.get("/planning-spaces/:id/materials/student-instruction", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    await deps.workspace.ensureWorkspace(space);
    try {
      const content = await deps.workspace.readProjectFile(id, "drafts/student-instruction.md");
      return { title: "Arbeitsauftrag", status: "review_needed", format: "markdown", content };
    } catch {
      return reply.code(404).send({ message: "Für diesen Planungsraum liegt noch kein Arbeitsauftrag als Entwurf vor." });
    }
  });

  app.post("/planning-spaces/:id/service-requests/student-instruction", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const parsed = ProposalSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ message: "Bitte begründe kurz, warum dieser Entwurf jetzt sinnvoll ist." });
    await deps.workspace.ensureWorkspace(space);
    const serviceRequest = await deps.workflow.proposeStudentInstruction(id, parsed.data.reason);
    const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Nächsten Schritt vorgeschlagen");
    return reply.code(201).send({
      serviceRequest,
      nextStep: { label: "Arbeitsauftrag als Entwurf vorbereiten", status: "suggested", requiresTeacherApproval: true },
      version
    });
  });

  // T-900: Materialauftrag, ausdrücklich an eine Board-Karte und einen Lernmoment gebunden.
  app.post("/planning-spaces/:id/service-requests/board-material", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const parsed = BoardMaterialSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ message: "Ein Materialauftrag braucht ein Arbeitsvorhaben und mindestens einen pädagogischen Bezug." });
    await deps.workspace.ensureWorkspace(space);
    try {
      const serviceRequest = await deps.workflow.proposeBoardMaterial(id, parsed.data);
      const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Materialauftrag an Arbeitsvorhaben gebunden");
      return reply.code(201).send({
        serviceRequest,
        nextStep: { label: "Materialentwurf vorbereiten", status: "suggested", requiresTeacherApproval: true },
        version
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      const messages: Record<string, string> = {
        service_request_needs_board_item: "Ein Materialauftrag braucht ein Arbeitsvorhaben.",
        service_request_needs_pedagogical_reference: "Ein Materialauftrag braucht mindestens einen pädagogischen Bezug."
      };
      return reply.code(422).send({ message: messages[reason] ?? "Der Materialauftrag konnte nicht angelegt werden." });
    }
  });

  app.post("/planning-spaces/:id/service-requests/:requestId/approve", async (request, reply) => {
    const { id, requestId } = request.params as { id: string; requestId: string };
    if (!(await deps.store.get(id))) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    try {
      const space = await deps.store.get(id);
      if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
      const serviceRequest = await deps.workflow.approveAndRun(id, requestId, space);
      const content = await deps.workspace.readProjectFile(id, serviceRequest.expectedOutput.location);
      const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Materialentwurf geprüft");
      return {
        serviceRequest,
        material: {
          title: typeof serviceRequest.input.title === "string" ? serviceRequest.input.title : "Arbeitsauftrag",
          status: "review_needed",
          format: "markdown",
          location: serviceRequest.expectedOutput.location,
          content,
          review: serviceRequest.review,
          boardItemId: serviceRequest.boardItemId ?? null,
          relatedMoments: serviceRequest.relatedMoments ?? []
        },
        teacherFacingMessage: "Der Worker hat den Entwurf vorbereitet; die automatische Vorprüfung ist bestanden. Jetzt kann er gemeinsam mit dem Critical Friend inhaltlich geprüft werden.",
        version
      };
    } catch (error) {
      request.log.error({ err: error }, "service request execution failed");
      return reply.code(409).send({ message: "Der Entwurf konnte noch nicht sicher vorbereitet und geprüft werden." });
    }
  });
}
