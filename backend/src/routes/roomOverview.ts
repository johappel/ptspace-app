import { FastifyInstance } from "fastify";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { GitManager } from "../services/git/GitManager.js";
import { ConversationStore } from "../storage/ConversationStore.js";
import { ConversationMarkerService } from "../services/conversation/ConversationMarkerService.js";
import { GuidedWorkflowService } from "../services/guided/GuidedWorkflowService.js";
import { parseLearningLandscape, parsePlanningBoard } from "../services/planning/PlanningArtifactCodec.js";

export async function roomOverviewRoutes(app: FastifyInstance, deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager; conversation: ConversationStore; markers: ConversationMarkerService; guided: GuidedWorkflowService }) {
  app.get("/planning-spaces/:id/room-overview", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const root = await deps.workspace.ensureWorkspace(space);
    const [design, landscapeSource, boardSource, messages, versions, conversationMarkers] = await Promise.all([deps.workspace.readProjectFile(id, "learning-design.md"), deps.workspace.readProjectFile(id, "learning-landscape.md"), deps.workspace.readProjectFile(id, "planning-board.yml"), deps.conversation.getMessages(id), deps.git.listVersions(root), deps.markers.list(id)]);
    const landscape = parseLearningLandscape(landscapeSource);
    const board = parsePlanningBoard(boardSource);
    const progress = [{ id: "clarify", label: "Denkstand klären", complete: messages.length > 0 || !/Noch zu klären/i.test(design) }, { id: "journey", label: "Lernreise gestalten", complete: landscape.moments.length > 0 }, { id: "plan", label: "Unterricht planen", complete: board.items.length > 0 }, { id: "review", label: "Materialien prüfen", complete: board.items.some((item) => item.status === "review") }, { id: "ready", label: "Bereitstellen", complete: board.items.some((item) => item.status === "ready") }];
    const activity = [...messages.slice(-5).reverse().map((message) => ({ id: message.id, label: message.author === "teacher" ? "Gedanke festgehalten" : "Critical Friend hat geantwortet", createdAt: message.createdAt })), ...versions.slice(0, 7).map((version) => ({ id: `v-${version.hash}`, label: version.label, createdAt: version.createdAt }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const projection = await deps.guided.projection(id);
    return { progress, activity, versions, conversationMarkers, decisions: space.decisions.map((decision) => ({ id: decision.id, title: decision.title })), ...projection };
  });

  app.get("/planning-spaces/:id/search", async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = String((request.query as { q?: string }).q ?? "").trim().toLocaleLowerCase("de");
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    if (q.length < 2) return { hits: [] };
    await deps.workspace.ensureWorkspace(space);
    const files = ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"];
    const hits = (await Promise.all(files.map(async (file) => (await deps.workspace.readProjectFile(id, file)).split("\n").filter((line) => line.toLocaleLowerCase("de").includes(q)).map((excerpt, index) => ({ id: `${file}-${index}`, label: file === "learning-design.md" ? "Denkstand" : file === "decisions.md" ? "Entscheidungen" : file === "open-questions.md" ? "Offene Fragen" : "Nächste Schritte", excerpt: excerpt.replace(/^[-#* ]+/, "") }))))).flat().slice(0, 12);
    return { hits };
  });
}
