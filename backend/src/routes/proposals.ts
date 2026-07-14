import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { ProposalService } from "../services/proposals/ProposalService.js";
import { parseLearningLandscape, parsePlanningBoard } from "../services/planning/PlanningArtifactCodec.js";
import { parseTemporalPlan, emptyTemporalPlan } from "../services/planning/TemporalPlanCodec.js";

const GenerateSchema = z.object({
  kind: z.enum(["learning_moment", "transition", "temporal_placement", "board_item"]),
  note: z.string().optional(),
  focus: z.object({ kind: z.string(), id: z.string(), label: z.string() }).optional()
});

// Phase 8: Der Critical Friend schlägt strukturiert vor, ändert aber nichts kanonisch.
// Diese Route erzeugt nur einen Vorschau-Vorschlag. Das Übernehmen erfolgt über die
// bestehenden Artefakt-Routen und erfordert die ausdrückliche Zustimmung der Lehrkraft.
export async function proposalRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; proposals: ProposalService }
) {
  app.post("/planning-spaces/:id/proposals", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });

    const parsed = GenerateSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ message: "Für diesen Vorschlag fehlen noch Angaben." });

    await deps.workspace.ensureWorkspace(space);
    try {
      const landscape = parseLearningLandscape(await deps.workspace.readProjectFile(id, "learning-landscape.md"));
      const board = parsePlanningBoard(await deps.workspace.readProjectFile(id, "planning-board.yml"));
      let temporalPlan;
      try {
        temporalPlan = parseTemporalPlan(await deps.workspace.readProjectFile(id, "temporal-plan.yml"));
      } catch {
        temporalPlan = emptyTemporalPlan(space.title);
      }
      const proposal = deps.proposals.generate({
        kind: parsed.data.kind,
        note: parsed.data.note,
        focus: parsed.data.focus,
        landscape,
        temporalPlan,
        board
      });
      return { proposal };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      const messages: Record<string, string> = {
        proposal_needs_two_moments: "Für einen Übergangsvorschlag braucht die Lernlandschaft mindestens zwei Lernmomente.",
        proposal_needs_window: "Für einen Zeitvorschlag braucht es zunächst ein Unterrichtsfenster.",
        proposal_no_unplaced_moment: "Alle Lernmomente sind bereits zeitlich eingeplant.",
        proposal_kind_not_supported: "Diese Art von Vorschlag ist noch nicht vorgesehen."
      };
      return reply.code(422).send({ message: messages[reason] ?? "Der Vorschlag konnte noch nicht vorbereitet werden." });
    }
  });
}
