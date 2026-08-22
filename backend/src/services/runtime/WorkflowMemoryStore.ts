import fs from "node:fs/promises";
import path from "node:path";
import {
  WorkflowMemory,
  WorkflowMemoryCollection,
  WorkflowMemoryCollectionSchema,
  WorkflowMemorySchema
} from "@ptspace/shared";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";

/**
 * Workflow Memory Store (L5b.6).
 *
 * Speichert abstrahiertes Prozesswissen – KEINE Chattranskripte, keine
 * personenbezogenen Profile, keine sensiblen Beobachtungen. PTS-owned: eine
 * adaptive Runtime darf Workflow Memory konsumieren, ist aber nicht dessen
 * alleiniger kanonischer Besitzer.
 *
 * Einträge sind versioniert, tragen Provenance, sind editierbar und löschbar.
 */

const WORKFLOW_MEMORY_PATH = "workflow-memory.json";

export class WorkflowMemoryStore {
  constructor(private readonly workspace: WorkspaceManager) {}

  async list(planningSpaceId: string): Promise<WorkflowMemory[]> {
    return (await this.read(planningSpaceId)).entries;
  }

  async listActive(planningSpaceId: string): Promise<WorkflowMemory[]> {
    return (await this.list(planningSpaceId)).filter((entry) => entry.status === "active");
  }

  /**
   * Legt einen neuen Eintrag an oder erhöht die Version eines bestehenden
   * (gleiche id). Verweigert das Speichern roher Dialoge, indem nur die
   * schema-konformen, abstrahierten Felder übernommen werden.
   */
  async upsert(planningSpaceId: string, entry: WorkflowMemory): Promise<WorkflowMemory> {
    const collection = await this.read(planningSpaceId);
    const now = new Date().toISOString();
    const existing = collection.entries.find((candidate) => candidate.id === entry.id);
    const next = WorkflowMemorySchema.parse({
      ...entry,
      version: existing ? existing.version + 1 : entry.version,
      createdAt: existing?.createdAt ?? entry.createdAt ?? now,
      updatedAt: now
    });
    const entries = existing
      ? collection.entries.map((candidate) => (candidate.id === entry.id ? next : candidate))
      : [...collection.entries, next];
    await this.write(planningSpaceId, { schema: "ptspace.workflow-memory/v1", entries });
    return next;
  }

  async deprecate(planningSpaceId: string, id: string): Promise<WorkflowMemory> {
    const collection = await this.read(planningSpaceId);
    const entry = collection.entries.find((candidate) => candidate.id === id);
    if (!entry) throw new Error("workflow_memory_not_found");
    const updated = WorkflowMemorySchema.parse({ ...entry, status: "deprecated", updatedAt: new Date().toISOString() });
    await this.write(planningSpaceId, {
      schema: "ptspace.workflow-memory/v1",
      entries: collection.entries.map((candidate) => (candidate.id === id ? updated : candidate))
    });
    return updated;
  }

  async remove(planningSpaceId: string, id: string): Promise<void> {
    const collection = await this.read(planningSpaceId);
    await this.write(planningSpaceId, {
      schema: "ptspace.workflow-memory/v1",
      entries: collection.entries.filter((candidate) => candidate.id !== id)
    });
  }

  private async read(planningSpaceId: string): Promise<WorkflowMemoryCollection> {
    try {
      const content = await this.workspace.readProjectFile(planningSpaceId, WORKFLOW_MEMORY_PATH);
      return WorkflowMemoryCollectionSchema.parse(JSON.parse(content));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { schema: "ptspace.workflow-memory/v1", entries: [] };
      }
      if (error instanceof SyntaxError) throw new Error("workflow_memory_invalid");
      throw error;
    }
  }

  private async write(planningSpaceId: string, collection: WorkflowMemoryCollection): Promise<void> {
    const parsed = WorkflowMemoryCollectionSchema.parse(collection);
    const target = this.workspace.resolveInsideWorkspace(planningSpaceId, WORKFLOW_MEMORY_PATH);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }
}
