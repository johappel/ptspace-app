import { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { PlanningSpaceStore } from "../storage/PlanningSpaceStore.js";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";
import { GitManager } from "../services/git/GitManager.js";
import { HarnessAdapter } from "../services/harness/HarnessAdapter.js";
import { ConversationStore } from "../storage/ConversationStore.js";
import { ConversationMetricsCollector } from "../services/conversation/ConversationMetrics.js";
import { ConversationMetricsStore } from "../services/conversation/ConversationMetricsStore.js";
import { ConversationOrchestrator } from "../services/conversation/ConversationOrchestrator.js";
import { GuidedWorkflowService } from "../services/guided/GuidedWorkflowService.js";

const FocusSchema = z.object({
  kind: z.enum(["learning_moment", "transition", "teaching_window", "placement", "planning_item", "material"]),
  id: z.string().min(1),
  label: z.string().min(1)
});
const SendMessageSchema = z.object({ message: z.string().min(1), focus: FocusSchema.optional() });

export async function conversationRoutes(
  app: FastifyInstance,
  deps: {
    store: PlanningSpaceStore;
    workspace: WorkspaceManager;
    git: GitManager;
    harness: HarnessAdapter;
    conversation: ConversationStore;
    orchestrator: ConversationOrchestrator;
    metrics: ConversationMetricsStore;
    guided: GuidedWorkflowService;
    devMode?: boolean;
  }
) {
  const devMode = deps.devMode ?? false;

  app.get("/planning-spaces/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }
    const messages = await deps.conversation.getMessages(id);
    return { messages };
  });

  app.post("/planning-spaces/:id/conversation", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = SendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Bitte schreibe kurz, woran du weiterdenken möchtest." });
    }

    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }

    try {
      const outcome = await deps.orchestrator.handleTurn(space, parsed.data.message, parsed.data.focus);
      deps.metrics.record(id, outcome.metrics);
      if (!outcome.ok) {
        return reply.code(outcome.code).send({
          message: outcome.message,
          availability: outcome.availability,
          events: outcome.events,
          ...(devMode ? { metrics: outcome.metrics } : {})
        });
      }
      if (devMode) {
        request.log.info(
          { metrics: outcome.metrics, profile: outcome.profile },
          `\n${ConversationMetricsCollector.formatLog(outcome.metrics)}`
        );
      }
      const guidedProposal = outcome.suggestedAction
        ? await deps.guided.createFromSuggestedAction(id, outcome.reply.id, outcome.suggestedAction)
        : undefined;
      return {
        status: outcome.status,
        teacherMessageId: outcome.teacherMessageId,
        reply: outcome.reply,
        events: outcome.events,
        ...(guidedProposal ? { guidedProposal } : {}),
        ...(devMode ? { metrics: outcome.metrics, profile: outcome.profile } : {})
      };
    } catch (error) {
      request.log.error({ err: error }, "harness conversation failed");
      return reply.code(409).send({
        message:
          "Die geschützte Testausführung konnte noch nicht abgeschlossen werden. Bitte prüfe die freigegebene Harness-Konfiguration."
      });
    }
  });

  // Streaming-Endpunkt (CHAT-PERFORMANCE-TASKS TASK 2, ARCHITECTURE Abschnitt 10).
  // Sendet früh einen Status ("Kontext wird vorbereitet"/"denkt") und danach die
  // fertige Antwort. Technische Detailereignisse bleiben verborgen.
  app.post("/planning-spaces/:id/conversation/stream", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = SendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Bitte schreibe kurz, woran du weiterdenken möchtest." });
    }
    const space = await deps.store.get(id);
    if (!space) {
      return reply.code(404).send({ message: "Diesen Planungsraum habe ich nicht gefunden." });
    }

    // CORS-Header für SSE (fastify-cors setzt diese für normale Responses,
    // aber raw.writeHead() überschreibt sie, deshalb explizit mitgeben).
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    const send = (event: string, data: unknown) => sendSse(reply, event, data);

    send("status", { status: "preparing_context" });
    try {
      send("status", { status: "thinking" });
      const outcome = await deps.orchestrator.handleTurn(space, parsed.data.message, parsed.data.focus);
      deps.metrics.record(id, outcome.metrics);
      if (!outcome.ok) {
        send("error", { message: outcome.message });
        reply.raw.end();
        return reply;
      }
      send("status", { status: "saving_state" });
      const guidedProposal = outcome.suggestedAction
        ? await deps.guided.createFromSuggestedAction(id, outcome.reply.id, outcome.suggestedAction)
        : undefined;
      send("complete", {
        messageId: outcome.reply.id,
        teacherMessageId: outcome.teacherMessageId,
        reply: outcome.reply,
        ...(guidedProposal ? { guidedProposal } : {}),
        ...(devMode ? { metrics: outcome.metrics } : {})
      });
      reply.raw.end();
      return reply;
    } catch (error) {
      request.log.error({ err: error }, "harness conversation stream failed");
      send("error", {
        message:
          "Die geschützte Testausführung konnte noch nicht abgeschlossen werden. Bitte prüfe die freigegebene Harness-Konfiguration."
      });
      reply.raw.end();
      return reply;
    }
  });

  // Performance-Dashboard (CHAT-PERFORMANCE-TASKS TASK 18) – nur im Dev-Modus.
  // Zeigt Antwortzeiten, Promptgrößen, Session-Reuse und Cache-Trefferquote.
  // Technische Details bleiben aus der Lehrkraft-Oberfläche heraus.
  app.get("/conversation/metrics", async (_request, reply) => {
    if (!devMode) {
      return reply.code(404).send({ message: "Nicht verfügbar." });
    }
    return {
      aggregate: deps.metrics.aggregate(),
      recent: deps.metrics.recent(20)
    };
  });
}

function sendSse(reply: FastifyReply, event: string, data: unknown): void {
  reply.raw.write(`event: ${event}\n`);
  reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
}
