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
  expectedResult: z.string().min(1, "Ein Materialauftrag braucht ein erwartetes Ergebnis."),
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
    const requests = await deps.workflow.list(id);
    const latestInstruction = requests
      .filter((entry) => entry.capability === "create_student_instruction" && entry.status !== "proposed" && entry.status !== "discarded" && entry.status !== "failed")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const paths = [
      latestInstruction?.expectedOutput.location,
      "drafts/student-instruction.md"
    ].filter((value): value is string => Boolean(value));
    for (const relativePath of paths) {
      try {
        const content = await deps.workspace.readProjectFile(id, relativePath);
        return { title: "Arbeitsauftrag", status: "review_needed", format: "markdown", content, location: relativePath };
      } catch {
        // Legacy- und gefuehrte Materialpfade nacheinander pruefen.
      }
    }
    return reply.code(404).send({ message: "Fuer diesen Planungsraum liegt noch kein Arbeitsauftrag vor." });
  });

  // Generischer Material-Endpoint für beliebige Material-Dateien
  app.get<{ Params: { id: string; materialId: string } }>("/planning-spaces/:id/materials/:materialId", async (request, reply) => {
    const { id, materialId } = request.params;
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    await deps.workspace.ensureWorkspace(space);
    try {
      // Normalisiere die materialId: Extrahiere nur den Dateinamen ohne Pfad und Erweiterung
      let normalizedId = materialId;
      if (materialId.includes("/")) {
        // Extrahiere Dateinamen aus dem Pfad
        normalizedId = materialId.split("/").pop() ?? materialId;
      }
      // Entferne .md Erweiterung, falls vorhanden
      if (normalizedId.endsWith(".md")) {
        normalizedId = normalizedId.slice(0, -3);
      }

      // Versuche verschiedene Material-Pfade
      const requests = await deps.workflow.list(id);
      const relatedRequest = requests
        .filter((entry) => entry.boardItemId && (("material-" + entry.boardItemId) === materialId || entry.expectedOutput.location.endsWith("/" + materialId + ".md")))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const boardMaterialId = normalizedId.replace(/^material-/, "");
      const possiblePaths = [
        relatedRequest?.expectedOutput.location,
        `materials/${normalizedId}.md`,
        `materials/${boardMaterialId}.md`,
        `drafts/${normalizedId}.md`,
        `drafts/${boardMaterialId}.md`,
        `materials/${normalizedId}`,
        `drafts/${boardMaterialId}`,
        // Falls die originalId ein Pfad war, versuche auch den direkten Pfad
        ...(materialId !== normalizedId ? [materialId] : [])
      ];
      let content: string | undefined;
      let foundPath: string | undefined;
      for (const path of possiblePaths) {
        try {
          content = await deps.workspace.readProjectFile(id, path);
          foundPath = path;
          break;
        } catch {
          // Versuche nächsten Pfad
        }
      }
      if (!content) {
        return reply.code(404).send({ message: `Das Material "${normalizedId}" liegt nicht vor.` });
      }
      const title = normalizedId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return {
        title,
        status: "review_needed",
        format: "markdown",
        content,
        location: foundPath,
        materialId: normalizedId
      };
    } catch (err) {
      return reply.code(500).send({ message: "Das Material konnte nicht geladen werden." });
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
      const serviceRequest = await deps.workflow.proposeBoardMaterial(id, { ...parsed.data, targetGroup: space.targetGroup });
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
        service_request_needs_pedagogical_reference: "Ein Materialauftrag braucht mindestens einen pädagogischen Bezug.",
        service_request_needs_expected_result: "Ein Materialauftrag braucht ein erwartetes Ergebnis.",
        service_request_needs_existing_board_item: "Das Arbeitsvorhaben ist in diesem Planungsraum nicht mehr vorhanden.",
        service_request_needs_existing_learning_moment: "Der Bezug zu einem Lernmoment ist in diesem Planungsraum nicht mehr gültig."
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
      const errorMessage = error instanceof Error ? error.message : "unknown";
      request.log.error({ err: error, errorType: errorMessage }, "service request execution failed");
      const userMessages: Record<string, string> = {
        worker_execution_failed: "Der Worker konnte den Entwurf nicht erstellen. Überprüfe die Runtime-Konfiguration unter Einstellungen.",
        review_failed: "Der erstellte Entwurf erfüllt nicht die Qualitätsanforderungen. Der Worker muss überarbeitet werden.",
        service_request_not_proposed: "Der Auftrag befindet sich nicht im Status ‚Vorgeschlagen'.",
        enoent: "Die Datei konnte nach der Erstellung nicht gelesen werden.",
        EBUSY: "Der Workspace ist derzeit blockiert. Bitte versuche es in wenigen Sekunden erneut."
      };
      const message = userMessages[errorMessage] ?? "Der Entwurf konnte noch nicht sicher vorbereitet und geprüft werden. Fehler: " + errorMessage;
      return reply.code(409).send({ message });
    }
  });
}
