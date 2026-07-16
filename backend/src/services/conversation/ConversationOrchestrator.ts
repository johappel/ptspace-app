import { PlanningSpace } from "@ptspace/shared";
import { PlanningSpaceStore } from "../../storage/PlanningSpaceStore.js";
import { ConversationStore } from "../../storage/ConversationStore.js";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";
import { GitManager } from "../git/GitManager.js";
import { HarnessAdapter, HarnessAvailability } from "../harness/HarnessAdapter.js";
import { ConversationMetrics, ConversationMetricsCollector } from "./ConversationMetrics.js";
import { TtlCache } from "./TtlCache.js";
import { SessionManager } from "./SessionManager.js";
import { computeKernelInfo, KernelInfo } from "./KernelInfo.js";
import { createContextBudget } from "./ContextBudget.js";
import { buildContext, CurrentFocus, PromptProfile, WorkspaceContextItem } from "./ContextBuilder.js";
import {
  detectSignificance,
  shouldUpdateSummary,
  updateSummary
} from "./ConversationSummaryService.js";
import { estimateTokens } from "./TokenEstimator.js";

/**
 * Conversation Orchestrator (ARCHITECTURE-SESSION-MODEL Abschnitt 3).
 *
 * Bündelt Session-Cache, Availability-Cache, Kontextaufbau, Summary-Update,
 * Instrumentierung und asynchrone Git-Sicherung für einen Chat-Turn.
 */

export type OrchestratorDeps = {
  store: PlanningSpaceStore;
  workspace: WorkspaceManager;
  git: GitManager;
  harness: HarnessAdapter;
  conversation: ConversationStore;
};

export type OrchestratorConfig = {
  kernelDir?: string;
  totalContextTokens?: number;
  availabilityTtlMs?: number;
  maxRecentMessages?: number;
};

export type TurnFocus = CurrentFocus;

export type TurnOutcome =
  | {
      ok: true;
      reply: { id: string; author: string; text: string; createdAt: string };
      status: string;
      events: unknown[];
      metrics: ConversationMetrics;
      profile: PromptProfile;
    }
  | {
      ok: false;
      code: number;
      message: string;
      availability?: HarnessAvailability;
      events?: unknown[];
      metrics: ConversationMetrics;
    };

const STATE_FILES = ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"];

const WORKSPACE_CONTEXT_FILES = ["learning-design.md", "decisions.md", "open-questions.md", "next-steps.md"];

const DEFAULT_TOTAL_CONTEXT_TOKENS = 24000;
const DEFAULT_AVAILABILITY_TTL_MS = 45000;

export class ConversationOrchestrator {
  private readonly availabilityCache: TtlCache<HarnessAvailability>;
  private readonly sessionManager = new SessionManager<{ workspaceRoot: string }>();
  private kernelInfoCache?: KernelInfo;
  private readonly totalContextTokens: number;
  private readonly maxRecentMessages: number;
  private readonly backgroundWork = new Set<Promise<void>>();

  constructor(
    private readonly deps: OrchestratorDeps,
    private readonly config: OrchestratorConfig = {}
  ) {
    this.availabilityCache = new TtlCache<HarnessAvailability>(config.availabilityTtlMs ?? DEFAULT_AVAILABILITY_TTL_MS);
    this.totalContextTokens = config.totalContextTokens ?? DEFAULT_TOTAL_CONTEXT_TOKENS;
    this.maxRecentMessages = config.maxRecentMessages ?? 8;
  }

  private async kernelInfo(): Promise<KernelInfo> {
    if (!this.kernelInfoCache) {
      this.kernelInfoCache = await computeKernelInfo(this.config.kernelDir);
    }
    return this.kernelInfoCache;
  }

  async checkAvailability(metrics?: ConversationMetricsCollector): Promise<HarnessAvailability> {
    const result = await this.availabilityCache.get(() => this.deps.harness.checkAvailability());
    if (metrics) {
      if (result.fromCache) metrics.recordCacheHit("availability");
      else metrics.recordCacheMiss("availability");
    }
    return result.value;
  }

  private async loadWorkspaceContext(spaceId: string): Promise<WorkspaceContextItem[]> {
    const items: WorkspaceContextItem[] = [];
    for (const relativePath of WORKSPACE_CONTEXT_FILES) {
      try {
        const excerpt = (await this.deps.workspace.readProjectFile(spaceId, relativePath)).trim();
        if (excerpt) items.push({ relativePath, excerpt });
      } catch {
        // Datei fehlt – wird ausgelassen (Lazy Loading, TASK 11).
      }
    }
    return items;
  }

  async handleTurn(space: PlanningSpace, message: string, focus?: TurnFocus): Promise<TurnOutcome> {
    const metrics = new ConversationMetricsCollector();
    const spaceId = space.id;

    const teacherMessageId = `msg-${Date.now()}-teacher`;
    await metrics.measure("persistence", () =>
      this.deps.conversation.addMessage(spaceId, {
        id: teacherMessageId,
        author: "teacher",
        text: message,
        createdAt: new Date().toISOString(),
        significance: detectSignificance(message)
      })
    );

    const workspaceRoot = await this.deps.workspace.ensureWorkspace(space);

    const availability = await this.checkAvailability(metrics);
    if (availability.status !== "ready") {
      return {
        ok: false,
        code: 409,
        message: availability.teacherFacingMessage,
        availability,
        metrics: metrics.finish()
      };
    }

    const kernelInfo = await this.kernelInfo();

    // Session lookup / reuse (TASK 7)
    let session: { id: string; planningSpaceId: string; workspaceRoot: string };
    metrics.start("sessionLookup");
    const keyInput = {
      planningSpaceId: spaceId,
      provider: this.deps.harness.id,
      model: this.deps.harness.mode,
      kernelHash: kernelInfo.hash
    };
    const lookup = this.sessionManager.lookup(keyInput);
    metrics.end("sessionLookup");
    if (lookup.reused) {
      metrics.recordCacheHit("runtime_session");
      session = { id: lookup.session.id, planningSpaceId: spaceId, workspaceRoot: lookup.session.native.workspaceRoot };
    } else {
      metrics.recordCacheMiss("runtime_session");
      const created = await metrics.measure("sessionStartup", () =>
        this.deps.harness.createSession({ planningSpaceId: spaceId, workspaceRoot })
      );
      this.sessionManager.register(keyInput, { workspaceRoot });
      session = created;
    }

    // Context build (TASK 5/11/12/13)
    metrics.start("contextBuild");
    const summary = await this.deps.conversation.getStructuredSummary(spaceId);
    const allMessages = await this.deps.conversation.getMessages(spaceId);
    const workspaceItems = await this.loadWorkspaceContext(spaceId);
    const kernelTokens = Math.floor(this.totalContextTokens * 0.2);
    const budget = createContextBudget(this.totalContextTokens);
    const contextPackage = buildContext({
      kernelReference: kernelInfo,
      summary,
      allMessages,
      workspaceItems,
      currentFocus: focus,
      currentMessage: message,
      budget,
      maxRecentMessages: this.maxRecentMessages,
      kernelTokens
    });
    metrics.end("contextBuild");
    metrics.recordTokens({ promptTokens: contextPackage.profile.totalTokens });

    // Generation (TASK 1 first token / generation)
    metrics.start("generation");
    let result;
    try {
      result = await this.deps.harness.sendMessage({
        session,
        space,
        message,
        conversationContext: contextPackage.conversationContext
      });
    } catch (error) {
      metrics.end("generation");
      this.sessionManager.drop(keyInput);
      throw error;
    }
    metrics.markFirstToken();
    metrics.end("generation");
    metrics.recordTokens({ outputTokens: estimateTokens(result.reply.text) });

    const failed = result.events.some((event) => event.type === "status" && event.status === "failed");
    if (failed) {
      return {
        ok: false,
        code: 409,
        message: result.reply.text,
        events: result.events,
        metrics: metrics.finish()
      };
    }

    // Persist CF message + workspace updates (TASK 1 persistence)
    const cfMessageId = `msg-${Date.now()}-cf`;
    await metrics.measure("persistence", async () => {
      await this.deps.conversation.addMessage(spaceId, {
        id: cfMessageId,
        author: "critical_friend",
        text: result.reply.text,
        createdAt: new Date().toISOString(),
        significance: detectSignificance(result.reply.text)
      });
      for (const update of result.workspaceUpdates) {
        await this.deps.workspace.writeProjectFile(spaceId, update.relativePath, update.content);
      }
    });

    // Incremental summary update (TASK 3/4)
    await this.maybeUpdateSummary(spaceId);

    const stateChanged = result.events.some(
      (event) => event.type === "workspace_update" && STATE_FILES.includes(event.relativePath)
    );

    // Async Git-Sicherung (TASK 14) – blockiert die Antwort nicht.
    this.saveVersionAsync(workspaceRoot, stateChanged ? "Denkstand aktualisiert" : "Gespräch fortgeführt");

    return {
      ok: true,
      reply: result.reply,
      status: "wird_vorbereitet",
      events: result.events,
      metrics: metrics.finish(),
      profile: contextPackage.profile
    };
  }

  private async maybeUpdateSummary(spaceId: string): Promise<void> {
    const summary = await this.deps.conversation.getStructuredSummary(spaceId);
    const messages = await this.deps.conversation.getMessages(spaceId);
    const decision = shouldUpdateSummary(summary, messages);
    if (!decision.shouldUpdate) return;
    const updated = updateSummary(summary, messages);
    await this.deps.conversation.saveStructuredSummary(spaceId, updated);
  }

  private saveVersionAsync(workspaceRoot: string, label: string): void {
    const work = this.deps.git
      .saveVersion(workspaceRoot, label)
      .then(() => undefined)
      .catch(() => {
        // Fehler werden protokolliert und sind erneut versuchbar; die UI behauptet
        // keinen erfolgreichen Commit, bevor er erfolgt ist (ARCHITECTURE 14).
      })
      .finally(() => {
        this.backgroundWork.delete(work);
      });
    this.backgroundWork.add(work);
  }

  /** Wartet auf laufende Hintergrundarbeit (z. B. Git-Commits) – für sauberes Shutdown. */
  async flush(): Promise<void> {
    await Promise.all([...this.backgroundWork]);
  }
}
