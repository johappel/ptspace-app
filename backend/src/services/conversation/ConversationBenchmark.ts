import { PlanningSpaceStore } from "../../storage/PlanningSpaceStore.js";
import { ConversationStore } from "../../storage/ConversationStore.js";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";
import { ConversationOrchestrator } from "./ConversationOrchestrator.js";
import { ConversationMetrics } from "./ConversationMetrics.js";
import { PromptProfile } from "./ContextBuilder.js";

/**
 * Conversation-Benchmarks (CHAT-PERFORMANCE-TASKS TASK 19).
 *
 * Referenzszenarien machen messbar, dass lange Gespräche nicht linear langsamer
 * werden und – vor allem – dass der Prompt nicht linear mit der Nachrichtenzahl
 * wächst (ARCHITECTURE-SESSION-MODEL Abschnitt 19). Der Benchmark läuft gegen
 * den echten Orchestrator mit dem Mock-Adapter, damit er deterministisch und
 * ohne externe Runtime reproduzierbar ist.
 */

export type BenchmarkScenario = {
  name: string;
  priorMessages: number;
  /** Ungefähre Zeichenzahl der learning-design.md (großes Design testen). */
  learningDesignChars?: number;
  /** Anzahl abgelegter Materialentwürfe (viele Materialien testen). */
  materialCount?: number;
};

export const REFERENCE_SCENARIOS: BenchmarkScenario[] = [
  { name: "new-chat", priorMessages: 0 },
  { name: "20-messages", priorMessages: 20 },
  { name: "100-messages", priorMessages: 100 },
  { name: "large-learning-design", priorMessages: 10, learningDesignChars: 40000 },
  { name: "many-materials", priorMessages: 10, materialCount: 25 }
];

export type BenchmarkTurnResult = {
  scenario: string;
  priorMessages: number;
  promptTokens: number;
  totalMs: number;
  contextBuildMs: number;
  metrics: ConversationMetrics;
  profile: PromptProfile;
};

export type BenchmarkDeps = {
  store: PlanningSpaceStore;
  conversation: ConversationStore;
  workspace: WorkspaceManager;
  orchestrator: ConversationOrchestrator;
};

function seedMessageText(index: number): string {
  const author = index % 2 === 0 ? "Lehrkraft" : "Critical Friend";
  return `${author}-Beitrag ${index}: Wir denken über die Lernreise nach und halten den nächsten kleinen Schritt fest.`;
}

async function seedScenario(deps: BenchmarkDeps, scenario: BenchmarkScenario): Promise<string> {
  const space = await deps.store.create({
    title: `Benchmark ${scenario.name}`,
    subject: "Religion",
    targetGroup: "Klasse 9",
    initialIdea: "Referenzszenario für Performance-Messung."
  });
  await deps.workspace.ensureWorkspace(space);

  for (let index = 0; index < scenario.priorMessages; index += 1) {
    await deps.conversation.addMessage(space.id, {
      id: `seed-${index}`,
      author: index % 2 === 0 ? "teacher" : "critical_friend",
      text: seedMessageText(index),
      createdAt: new Date(Date.now() + index).toISOString()
    });
  }

  if (scenario.learningDesignChars) {
    const filler = "Lernmoment: Die Lernenden erschließen eine verantwortliche Entscheidung. ";
    const repeats = Math.ceil(scenario.learningDesignChars / filler.length);
    await deps.workspace.writeProjectFile(
      space.id,
      "learning-design.md",
      `# Learning Design\n\n${filler.repeat(repeats)}`
    );
  }

  if (scenario.materialCount) {
    for (let index = 0; index < scenario.materialCount; index += 1) {
      await deps.workspace.writeProjectFile(
        space.id,
        `materials/entwurf-${index}.md`,
        `# Materialentwurf ${index}\n\nEin Arbeitsauftrag für die Lerngruppe.\n`
      );
    }
  }

  return space.id;
}

export async function runScenario(
  deps: BenchmarkDeps,
  scenario: BenchmarkScenario
): Promise<BenchmarkTurnResult> {
  const spaceId = await seedScenario(deps, scenario);
  const space = await deps.store.get(spaceId);
  if (!space) throw new Error("benchmark_space_missing");
  const outcome = await deps.orchestrator.handleTurn(space, "Woran sollten wir als Nächstes weiterdenken?");
  if (!outcome.ok) throw new Error(`benchmark_turn_failed: ${outcome.message}`);
  return {
    scenario: scenario.name,
    priorMessages: scenario.priorMessages,
    promptTokens: outcome.profile.totalTokens,
    totalMs: outcome.metrics.totalMs,
    contextBuildMs: outcome.metrics.contextBuildMs,
    metrics: outcome.metrics,
    profile: outcome.profile
  };
}

export async function runBenchmark(
  deps: BenchmarkDeps,
  scenarios: BenchmarkScenario[] = REFERENCE_SCENARIOS
): Promise<BenchmarkTurnResult[]> {
  const results: BenchmarkTurnResult[] = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(deps, scenario));
  }
  await deps.orchestrator.flush();
  return results;
}

export type RegressionEvaluation = {
  ok: boolean;
  findings: string[];
  maxPromptTokens: number;
  promptGrowthRatio: number;
};

/**
 * Bewertet, ob der Prompt trotz stark wachsender Nachrichtenzahl beschränkt
 * bleibt. Kernaussage der Architektur: nicht der gesamte Chat wird übertragen,
 * sondern Summary + begrenztes Kurzzeitgedächtnis. Der Prompt der Szenarien mit
 * vielen Nachrichten darf deshalb nur moderat größer sein als der eines kurzen
 * Gesprächs.
 */
export function evaluateRegression(
  results: BenchmarkTurnResult[],
  options: { maxPromptGrowthRatio?: number } = {}
): RegressionEvaluation {
  const maxRatio = options.maxPromptGrowthRatio ?? 2.5;
  const findings: string[] = [];
  const byName = new Map(results.map((result) => [result.scenario, result]));
  const short = byName.get("20-messages");
  const long = byName.get("100-messages");

  let promptGrowthRatio = 1;
  if (short && long) {
    promptGrowthRatio = long.promptTokens / Math.max(1, short.promptTokens);
    if (promptGrowthRatio > maxRatio) {
      findings.push(
        `Prompt wächst zu stark: 100 Nachrichten = ${long.promptTokens} Tokens, ` +
          `20 Nachrichten = ${short.promptTokens} Tokens (Faktor ${promptGrowthRatio.toFixed(2)} > ${maxRatio}).`
      );
    }
  } else {
    findings.push("Referenzszenarien 20-messages / 100-messages fehlen.");
  }

  const maxPromptTokens = results.reduce((max, result) => Math.max(max, result.promptTokens), 0);
  return {
    ok: findings.length === 0,
    findings,
    maxPromptTokens,
    promptGrowthRatio
  };
}

/** Menschenlesbare Tabelle für das Dev-Benchmark-Skript. */
export function formatBenchmark(results: BenchmarkTurnResult[]): string {
  const header = ["Szenario".padEnd(24), "Msgs".padStart(5), "Prompt".padStart(8), "Ctx ms".padStart(8), "Total ms".padStart(9)].join(" ");
  const rows = results.map((result) =>
    [
      result.scenario.padEnd(24),
      String(result.priorMessages).padStart(5),
      String(result.promptTokens).padStart(8),
      String(result.contextBuildMs).padStart(8),
      String(result.totalMs).padStart(9)
    ].join(" ")
  );
  return [header, ...rows].join("\n");
}
