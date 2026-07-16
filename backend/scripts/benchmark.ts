import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PlanningSpaceStore } from "../src/storage/PlanningSpaceStore.js";
import { ConversationStore } from "../src/storage/ConversationStore.js";
import { WorkspaceManager } from "../src/services/workspace/WorkspaceManager.js";
import { GitManager } from "../src/services/git/GitManager.js";
import { MockHarnessAdapter } from "../src/services/harness/MockHarnessAdapter.js";
import { ConversationOrchestrator } from "../src/services/conversation/ConversationOrchestrator.js";
import {
  BenchmarkDeps,
  REFERENCE_SCENARIOS,
  evaluateRegression,
  formatBenchmark,
  runBenchmark
} from "../src/services/conversation/ConversationBenchmark.js";

/**
 * Dev-Benchmark-Runner (CHAT-PERFORMANCE-TASKS TASK 19).
 *
 * Ausführung: `pnpm --filter @ptspace/backend benchmark`.
 * Läuft gegen den Mock-Adapter, misst die Referenzszenarien und meldet eine
 * Regression (Exit-Code 1), wenn der Prompt zu stark mit der Nachrichtenzahl
 * wächst.
 */

async function main(): Promise<void> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-benchmark-"));
  try {
    const store = new PlanningSpaceStore(path.join(tempRoot, "data"));
    const conversation = new ConversationStore(path.join(tempRoot, "workspaces"));
    const workspace = new WorkspaceManager(path.join(tempRoot, "planning-workspaces"));
    // Git-Sicherung ist im Benchmark nicht das Messziel – Stub vermeidet echte Git-Prozesse.
    const git = {
      async saveVersion(_root: string, label: string) {
        return { label, committed: false };
      }
    } as unknown as GitManager;
    const orchestrator = new ConversationOrchestrator({
      store,
      workspace,
      git,
      harness: new MockHarnessAdapter(),
      conversation
    });

    const deps: BenchmarkDeps = { store, conversation, workspace, orchestrator };
    const results = await runBenchmark(deps, REFERENCE_SCENARIOS);

    process.stdout.write(`${formatBenchmark(results)}\n\n`);
    const regression = evaluateRegression(results);
    process.stdout.write(
      `Max Prompt-Tokens: ${regression.maxPromptTokens} · Prompt-Wachstum (100/20): ${regression.promptGrowthRatio.toFixed(2)}\n`
    );
    if (!regression.ok) {
      for (const finding of regression.findings) process.stderr.write(`Regression: ${finding}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write("Keine Prompt-Regression erkannt.\n");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`Benchmark fehlgeschlagen: ${String(error)}\n`);
  process.exitCode = 1;
});
