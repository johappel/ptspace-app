import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { GitManager } from "../services/git/GitManager.js";

function markdownItems(markdown: string): string[] { const result: string[] = []; let heading = ""; for (const raw of markdown.split("\n")) { const line = raw.trim(); if (line.startsWith("## ")) { heading = line.slice(3); continue; } if (!line || line.startsWith("#") || line.startsWith(">") || /^(noch |#)/i.test(line)) continue; const value = line.replace(/^[-*]\s+/, ""); result.push(heading && !line.startsWith("-") ? `${heading}: ${value}` : value); } return [...new Set(result)]; }
const UpdateDesignSchema = z.object({ content: z.string().min(1).max(120_000) });

export async function thinkingStateRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager }) {
  app.get("/planning-spaces/:id/thinking-state", async (request, reply) => {
    const { id } = request.params as { id: string }; const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    await deps.workspace.ensureWorkspace(space);
    const [design, decisions, questions, steps, summary] = await Promise.all(["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md", "conversation-summary.md"].map((file) => deps.workspace.readProjectFile(id, file)));
    return { cards: [
      { id: "denkstand", title: "Denkstand", summary: space.initialIdea || "Der Denkstand wird im Gespräch aufgebaut.", previewItems: markdownItems(design).filter((item) => !/^(Thema|Fach \/ Lernbereich|Zielgruppe):/i.test(item)).slice(0, 8) },
      { id: "offene-entscheidungen", title: "Offene Entscheidungen", summary: "Was noch geklärt werden sollte.", previewItems: [...markdownItems(decisions), ...markdownItems(questions).map((item) => `Offen: ${item}`)].slice(0, 8) },
      { id: "nächste-schritte", title: "Nächste Schritte", summary: "Ein sinnvoller nächster Schritt reicht.", previewItems: markdownItems(steps).slice(0, 8) }
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
}


