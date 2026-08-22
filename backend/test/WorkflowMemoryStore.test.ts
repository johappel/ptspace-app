import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanningSpace } from "@ptspace/shared";
import { WorkspaceManager } from "../src/services/workspace/WorkspaceManager.js";
import { WorkflowMemoryStore } from "../src/services/runtime/WorkflowMemoryStore.js";

let root: string;
let workspace: WorkspaceManager;
let store: WorkflowMemoryStore;
const now = new Date().toISOString();

const space = {
  id: "space-wm",
  workspaceSlug: "workflow-memory-test",
  title: "Workflow Memory",
  subject: "Religion",
  targetGroup: "Klasse 9",
  initialIdea: "",
  status: "active" as const,
  participants: [],
  createdAt: now,
  updatedAt: now,
  learningDesign: { context: { subject: "", grade: "", setting: "", constraints: [] }, intention: { summary: "", learnersShould: { know: [], understand: [], experience: [], becomeAbleTo: [] } }, learningJourney: { startingPoint: "", turningPoints: [] }, reflection: { learnerReflection: [], teacherReflection: [], openQuestions: [] } },
  openQuestions: [],
  decisions: [],
  nextSteps: [],
  materials: []
} as PlanningSpace;

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "wm-1",
    taskType: "contrastive_research",
    version: 1,
    observations: ["breite Recherche erzeugte zu viele irrelevante Treffer"],
    useWhen: ["bestehendes Design wirkt geschlossen"],
    provenance: "PTS L5b.6",
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-workflow-memory-"));
  workspace = new WorkspaceManager(root);
  store = new WorkflowMemoryStore(workspace);
  await workspace.ensureWorkspace(space);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("WorkflowMemoryStore", () => {
  it("persists and lists an abstracted workflow pattern", async () => {
    await store.upsert(space.id, entry() as never);
    const list = await store.list(space.id);
    expect(list).toHaveLength(1);
    expect(list[0].taskType).toBe("contrastive_research");
    expect(list[0].observations[0]).toContain("irrelevante Treffer");
  });

  it("increments the version on update and keeps provenance", async () => {
    await store.upsert(space.id, entry() as never);
    const updated = await store.upsert(space.id, entry({ observations: ["ein Near-Fit plus ein Kontrast war hilfreicher"] }) as never);
    expect(updated.version).toBe(2);
    expect(updated.provenance).toBe("PTS L5b.6");
    expect(updated.createdAt).toBe(now);
  });

  it("supports deprecation and removal", async () => {
    await store.upsert(space.id, entry() as never);
    const deprecated = await store.deprecate(space.id, "wm-1");
    expect(deprecated.status).toBe("deprecated");
    expect(await store.listActive(space.id)).toHaveLength(0);
    await store.remove(space.id, "wm-1");
    expect(await store.list(space.id)).toHaveLength(0);
  });

  it("rejects invalid stored data instead of silently accepting it", async () => {
    const target = workspace.resolveInsideWorkspace(space.id, "workflow-memory.json");
    await fs.writeFile(target, "{ not valid json", "utf8");
    await expect(store.list(space.id)).rejects.toThrow("workflow_memory_invalid");
  });
});
