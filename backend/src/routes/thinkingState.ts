import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { GitManager } from "../services/git/GitManager.js";
import { parsePlanningBoard } from "../services/planning/PlanningArtifactCodec.js";

function markdownItems(markdown: string): string[] { const result: string[] = []; let heading = ""; for (const raw of markdown.split("\n")) { const line = raw.trim(); if (line.startsWith("## ")) { heading = line.slice(3); continue; } if (!line || line.startsWith("#") || line.startsWith(">") || /^(noch |#)/i.test(line)) continue; const value = line.replace(/^[-*]\s+/, ""); result.push(heading && !line.startsWith("-") ? `${heading}: ${value}` : value); } return [...new Set(result)]; }
const UpdateDesignSchema = z.object({ content: z.string().min(1).max(120_000) });
const RecordDecisionSchema = z.object({
  decision: z.string().min(3).max(4_000),
  reason: z.string().min(3).max(4_000)
});

export async function thinkingStateRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager }) {
  app.get("/planning-spaces/:id/thinking-state", async (request, reply) => {
    const { id } = request.params as { id: string }; const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    await deps.workspace.ensureWorkspace(space);
    const [design, questions, steps, summary, boardSource] = await Promise.all(["learning-design.md", "open-questions.md", "next-steps.md", "conversation-summary.md", "planning-board.yml"].map((file) => deps.workspace.readProjectFile(id, file)));
    let boardSteps: string[] = [];
    try { boardSteps = parsePlanningBoard(boardSource).items.filter((item) => item.status === "proposed" || item.status === "approved").map((item) => `${item.kind}: ${item.title}`); } catch { /* legacy next-steps.md remains a safe fallback */ }
    return { cards: [
      { id: "denkstand", title: "Denkstand", summary: space.initialIdea || "Der Denkstand wird im Gespräch aufgebaut.", previewItems: markdownItems(design).filter((item) => !/^(Thema|Fach \/ Lernbereich|Zielgruppe):/i.test(item)).slice(0, 8) },
      { id: "offene-entscheidungen", title: "Offene Entscheidungen", summary: "Was noch geklärt werden sollte.", previewItems: markdownItems(questions).filter((item) => !/^\[geklärt\]/i.test(item.trim())).map((item) => `Offen: ${item}`).slice(0, 8) },
      { id: "nächste-schritte", title: "Nächste Schritte", summary: "Ein sinnvoller nächster Schritt reicht.", previewItems: (boardSteps.length ? boardSteps : markdownItems(steps)).slice(0, 8) }
    ], summary };
  });
  app.get("/planning-spaces/:id/design-notes", async (request, reply) => {
    const { id } = request.params as { id: string }; const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const root = await deps.workspace.ensureWorkspace(space);
    return { content: await deps.workspace.readProjectFile(id, "learning-design.md"), versions: await deps.git.listVersions(root, 8) };
  });
  app.put("/planning-spaces/:id/design-notes", async (request, reply) => {
    const { id } = request.params as { id: string }; const parsed = UpdateDesignSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Der Denkstand kann so noch nicht gespeichert werden." });
    const space = await deps.store.get(id); if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const root = await deps.workspace.ensureWorkspace(space); const content = parsed.data.content.trimEnd() + "\n";
    await deps.workspace.writeProjectFile(id, "learning-design.md", content);
    return { content, version: await deps.git.saveVersion(root, "Denkstand gemeinsam ergänzt") };
  });
  app.post("/planning-spaces/:id/decisions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = RecordDecisionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bitte halte Entscheidung und Begründung kurz fest." });
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const root = await deps.workspace.ensureWorkspace(space);
    const [existing, learningDesign, openQuestions] = await Promise.all([
      deps.workspace.readProjectFile(id, "decisions.md"),
      deps.workspace.readProjectFile(id, "learning-design.md"),
      deps.workspace.readProjectFile(id, "open-questions.md")
    ]);
    const entry = `\n## Entscheidung\n${parsed.data.decision.trim()}\n\n**Begründung:** ${parsed.data.reason.trim()}\n`;
    const content = `${existing.trimEnd()}${entry}`.trimEnd() + "\n";
    const learningEntry = `\n## Entscheidungen\n\n### Entscheidung: ${parsed.data.decision.trim()}\n\nEntscheidung:\n${parsed.data.decision.trim()}\n\nBegründung:\n${parsed.data.reason.trim()}\n\nStatus:\napproved\n`;
    await Promise.all([
      deps.workspace.writeProjectFile(id, "decisions.md", content),
      deps.workspace.writeProjectFile(id, "learning-design.md", `${learningDesign.trimEnd()}${learningEntry}`.trimEnd() + "\n"),
      deps.workspace.writeProjectFile(id, "open-questions.md", openQuestions.split("\n").filter((line) => line.replace(/^[-*]\s+/, "").trim() !== parsed.data.decision.trim()).join("\n").trimEnd() + "\n")
    ]);
    return { content, version: await deps.git.saveVersion(root, "Entscheidung mit Begründung festgehalten") };
  });
}