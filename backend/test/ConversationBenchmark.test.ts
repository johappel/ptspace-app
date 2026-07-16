import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanningSpaceStore } from "../src/storage/PlanningSpaceStore.js";
import { ConversationStore } from "../src/storage/ConversationStore.js";
import { WorkspaceManager } from "../src/services/workspace/WorkspaceManager.js";
import { GitManager } from "../src/services/git/GitManager.js";
import { MockHarnessAdapter } from "../src/services/harness/MockHarnessAdapter.js";
import { ConversationOrchestrator } from "../src/services/conversation/ConversationOrchestrator.js";
import {
  BenchmarkDeps,
  evaluateRegression,
  runBenchmark
} from "../src/services/conversation/ConversationBenchmark.js";

let tempRoot: string;
let deps: BenchmarkDeps;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-benchmark-test-"));
  const store = new PlanningSpaceStore(path.join(tempRoot, "data"));
  await fs.mkdir(path.join(tempRoot, "data"), { recursive: true });
  const conversation = new ConversationStore(path.join(tempRoot, "workspaces"));
  const workspace = new WorkspaceManager(path.join(tempRoot, "planning-workspaces"));
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
  deps = { store, conversation, workspace, orchestrator };
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("ConversationBenchmark", () => {
  it("keeps the prompt bounded as the conversation grows (no linear regression)", async () => {
    const results = await runBenchmark(deps);
    const byName = new Map(results.map((result) => [result.scenario, result]));

    expect(byName.has("100-messages")).toBe(true);
    const short = byName.get("20-messages")!;
    const long = byName.get("100-messages")!;

    // Der Prompt für 100 Nachrichten darf nur moderat größer sein als für 20 –
    // die Summary + das begrenzte Kurzzeitgedächtnis verhindern lineares Wachstum.
    expect(long.promptTokens).toBeLessThan(short.promptTokens * 2.5);

    const regression = evaluateRegression(results);
    expect(regression.ok).toBe(true);
    expect(regression.findings).toEqual([]);
  });
});
