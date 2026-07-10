import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GitManager } from "../services/git/GitManager.js";
import { ServiceRequestWorkflow } from "../services/serviceRequests/ServiceRequestWorkflow.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";

const ProposalSchema = z.object({
  reason: z.string().min(10).default("Das Lernanliegen ist ausreichend geklärt; ein erster Arbeitsauftrag soll als prüfbarer Entwurf vorbereitet werden.")
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
          title: "Arbeitsauftrag",
          status: "review_needed",
          format: "markdown",
          location: serviceRequest.expectedOutput.location,
          content,
          review: serviceRequest.review
        },
        teacherFacingMessage: "Der Entwurf wurde vorbereitet und vom Critical Friend geprüft. Du entscheidest, ob er passt oder weiterbearbeitet werden soll.",
        version
      };
    } catch (error) {
      request.log.error({ err: error }, "service request execution failed");
      return reply.code(409).send({ message: "Der Entwurf konnte noch nicht sicher vorbereitet und geprüft werden." });
    }
  });
}
