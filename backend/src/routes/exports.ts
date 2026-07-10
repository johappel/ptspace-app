import { FastifyInstance } from "fastify";
import { CreateExportApprovalSchema } from "@ptspace/shared";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { ExportApprovalStore } from "../storage/ExportApprovalStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { ExportFilter } from "../services/export/ExportFilter.js";
import { OkfExporter } from "../services/okf/OkfExporter.js";
import { SensitiveContentScanner } from "../services/privacy/SensitiveContentScanner.js";

export async function exportRoutes(
  app: FastifyInstance,
  deps: {
    store: PlanningSpaceStore;
    approvals: ExportApprovalStore;
    workspace: WorkspaceManager;
    exportFilter: ExportFilter;
    okf: OkfExporter;
    scanner: SensitiveContentScanner;
  }
) {
  app.post("/planning-spaces/:id/export-approvals", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const parsed = CreateExportApprovalSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bitte prüfe die Freigabeangaben.", issues: parsed.error.issues });
    const approval = await deps.approvals.create(id, parsed.data);
    return reply.code(201).send(approval);
  });

  app.get("/planning-spaces/:id/export-status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    return {
      markdown: await deps.approvals.latest(id, "markdown"),
      okfMarkdown: await deps.approvals.latest(id, "okf_markdown")
    };
  });

  app.get("/planning-spaces/:id/export/markdown", async (request, reply) => {
    const { id } = request.params as { id: string };
    const approval = await deps.approvals.latest(id, "markdown");
    if (!approval) return reply.code(409).send({ message: "Bitte gib den Export zuerst frei." });

    const result = await createCuratedMarkdown(id, deps);
    if (result.blocked) return reply.code(409).send({ message: result.message });

    const filtered = deps.exportFilter.filterMarkdown(result.markdown);
    return reply
      .header("content-type", "text/markdown; charset=utf-8")
      .header("x-ptspace-export-filtered-lines", String(filtered.removedLines))
      .send(filtered.markdown);
  });

  app.get("/planning-spaces/:id/export/okf", async (request, reply) => {
    const { id } = request.params as { id: string };
    const approval = await deps.approvals.latest(id, "okf_markdown");
    if (!approval) return reply.code(409).send({ message: "Bitte gib den OKF-Export zuerst frei." });

    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    await deps.workspace.ensureWorkspace(space);
    const learningDesign = await deps.workspace.readProjectFile(id, "learning-design.md");
    const decisions = await deps.workspace.readProjectFile(id, "decisions.md");
    const openQuestions = await deps.workspace.readProjectFile(id, "open-questions.md");
    const okf = deps.okf.createLearningDesignMarkdown({ space, learningDesignMarkdown: learningDesign, decisionsMarkdown: decisions, openQuestionsMarkdown: openQuestions });
    const filtered = deps.exportFilter.filterMarkdown(okf);
    return reply
      .header("content-type", "text/markdown; charset=utf-8")
      .header("x-ptspace-export-filtered-lines", String(filtered.removedLines))
      .send(filtered.markdown);
  });
}

type CuratedMarkdownResult =
  | { blocked: false; markdown: string }
  | { blocked: true; message: string };

async function createCuratedMarkdown(
  id: string,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; scanner: SensitiveContentScanner }
): Promise<CuratedMarkdownResult> {
  const space = await deps.store.get(id);
  if (!space) throw new Error("planning_space_not_found");
  await deps.workspace.ensureWorkspace(space);
  const learningDesign = await deps.workspace.readProjectFile(id, "learning-design.md");
  const decisions = await deps.workspace.readProjectFile(id, "decisions.md");
  const openQuestions = await deps.workspace.readProjectFile(id, "open-questions.md");
  const markdown = [
    `# ${space.title}`,
    "",
    "Hinweis: Dieser Export enthält den kuratierten Denkstand, nicht den rohen Chatverlauf.",
    "",
    learningDesign,
    decisions,
    openQuestions
  ].join("\n");
  const findings = deps.scanner.scan(markdown);
  if (findings.some((finding) => finding.severity === "block_export")) {
    return { blocked: true, message: "Der Export enthält noch besonders sensible Hinweise. Bitte prüfe und entschärfe sie zuerst." };
  }
  return { blocked: false, markdown };
}