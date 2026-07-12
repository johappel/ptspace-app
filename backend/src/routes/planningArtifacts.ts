import { FastifyInstance } from "fastify";
import { z } from "zod";
import { LearningLandscapeSchema, PlanningBoardSchema, TemporalPlanSchema } from "@ptspace/shared";
import { GitManager } from "../services/git/GitManager.js";
import { parseLearningLandscape, parsePlanningBoard, serializeLearningLandscape, serializePlanningBoard } from "../services/planning/PlanningArtifactCodec.js";
import { parseTemporalPlan, serializeTemporalPlan, assertTemporalPlanReferences, emptyTemporalPlan } from "../services/planning/TemporalPlanCodec.js";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

const UpdateArtifactsSchema = z.object({
  learningLandscape: LearningLandscapeSchema.optional(),
  planningBoard: PlanningBoardSchema.optional()
}).refine((value) => value.learningLandscape || value.planningBoard, {
  message: "Bitte übermittle eine Lernlandschaft oder ein Planungsboard."
});

function validationMessage(error: unknown): string {
  return error instanceof Error
    ? `Die Planungsdatei ist noch nicht in einer lesbaren Form: ${error.message}`
    : "Die Planungsdatei ist noch nicht in einer lesbaren Form.";
}

export async function planningArtifactRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager }
) {
  app.get("/planning-spaces/:id/planning-artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });

    await deps.workspace.ensureWorkspace(space);
    const [learningLandscapeMarkdown, planningBoardYaml] = await Promise.all([
      deps.workspace.readProjectFile(id, "learning-landscape.md"),
      deps.workspace.readProjectFile(id, "planning-board.yml")
    ]);

    try {
      return {
        learningLandscape: parseLearningLandscape(learningLandscapeMarkdown),
        planningBoard: parsePlanningBoard(planningBoardYaml)
      };
    } catch (error) {
      return reply.code(422).send({ message: validationMessage(error) });
    }
  });

  app.put("/planning-spaces/:id/planning-artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });

    const parsed = UpdateArtifactsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Die vorgeschlagenen Änderungen sind nicht vollständig oder enthalten ungültige Verweise." });

    await deps.workspace.ensureWorkspace(space);
    const writes: Array<Promise<void>> = [];
    if (parsed.data.learningLandscape) {
      writes.push(deps.workspace.writeProjectFile(id, "learning-landscape.md", serializeLearningLandscape(parsed.data.learningLandscape)));
    }
    if (parsed.data.planningBoard) {
      writes.push(deps.workspace.writeProjectFile(id, "planning-board.yml", serializePlanningBoard(parsed.data.planningBoard)));
    }
    await Promise.all(writes);
    const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Lernlandschaft oder Planungsboard aktualisiert");

    return {
      learningLandscape: parsed.data.learningLandscape,
      planningBoard: parsed.data.planningBoard,
      version
    };
  });
  app.get("/planning-spaces/:id/learning-landscape-layout", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    await deps.workspace.ensureWorkspace(space);
    try {
      return JSON.parse(await deps.workspace.readProjectFile(id, "learning-landscape.layout.json"));
    } catch {
      return { nodes: [] };
    }
  });

  app.put("/planning-spaces/:id/learning-landscape-layout", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    const layout = z.object({ nodes: z.array(z.object({ id: z.string().min(1), x: z.number(), y: z.number() })) }).safeParse(request.body);
    if (!layout.success) return reply.code(400).send({ message: "Die Ansicht konnte nicht gespeichert werden." });
    await deps.workspace.ensureWorkspace(space);
    await deps.workspace.writeProjectFile(id, "learning-landscape.layout.json", `${JSON.stringify(layout.data, null, 2)}\n`);
    return layout.data;
  });
}

// T-404: dedizierte, serverseitig validierte Routen je Kernel-Artefakt. Jede
// semantische Änderung erzeugt eine Git-Version; Layoutdaten bleiben getrennt.
export async function planningArtifactResourceRoutes(
  app: FastifyInstance,
  deps: { store: PlanningSpaceStore; workspace: WorkspaceManager; git: GitManager }
) {
  async function loadSpace(id: string, reply: import("fastify").FastifyReply) {
    const space = await deps.store.get(id);
    if (!space) { reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." }); return undefined; }
    await deps.workspace.ensureWorkspace(space);
    return space;
  }

  app.get("/planning-spaces/:id/learning-landscape", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await loadSpace(id, reply))) return;
    try {
      return parseLearningLandscape(await deps.workspace.readProjectFile(id, "learning-landscape.md"));
    } catch (error) {
      return reply.code(422).send({ message: validationMessage(error) });
    }
  });

  app.put("/planning-spaces/:id/learning-landscape", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await loadSpace(id, reply))) return;
    const parsed = LearningLandscapeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Die Lernlandschaft enthält noch ungültige Verweise oder Felder." });
    await deps.workspace.writeProjectFile(id, "learning-landscape.md", serializeLearningLandscape(parsed.data));
    const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Lernlandschaft aktualisiert");
    return { learningLandscape: parsed.data, version };
  });

  app.get("/planning-spaces/:id/temporal-plan", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await loadSpace(id, reply);
    if (!space) return;
    try {
      return parseTemporalPlan(await deps.workspace.readProjectFile(id, "temporal-plan.yml"));
    } catch {
      return emptyTemporalPlan(space.title);
    }
  });

  app.put("/planning-spaces/:id/temporal-plan", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await loadSpace(id, reply))) return;
    const parsed = TemporalPlanSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Die Zeitplanung enthält noch ungültige Werte." });
    try {
      const landscape = parseLearningLandscape(await deps.workspace.readProjectFile(id, "learning-landscape.md"));
      assertTemporalPlanReferences(parsed.data, new Set(landscape.moments.map((moment) => moment.id)));
      // Serialize + reparse enforces the internal consistency rules (window refs, overbooking).
      const serialized = serializeTemporalPlan(parsed.data);
      parseTemporalPlan(serialized);
      await deps.workspace.writeProjectFile(id, "temporal-plan.yml", serialized);
    } catch (error) {
      return reply.code(422).send({ message: validationMessage(error) });
    }
    const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Zeitplanung aktualisiert");
    return { temporalPlan: parsed.data, version };
  });

  app.get("/planning-spaces/:id/planning-board", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await loadSpace(id, reply))) return;
    try {
      return parsePlanningBoard(await deps.workspace.readProjectFile(id, "planning-board.yml"));
    } catch (error) {
      return reply.code(422).send({ message: validationMessage(error) });
    }
  });

  app.put("/planning-spaces/:id/planning-board", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await loadSpace(id, reply))) return;
    const parsed = PlanningBoardSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Das Planungsboard enthält noch ungültige Verweise oder Felder." });
    await deps.workspace.writeProjectFile(id, "planning-board.yml", serializePlanningBoard(parsed.data));
    const version = await deps.git.saveVersion(deps.workspace.getWorkspaceRoot(id), "Planungsboard aktualisiert");
    return { planningBoard: parsed.data, version };
  });
}
