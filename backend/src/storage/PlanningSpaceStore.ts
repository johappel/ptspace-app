import fs from "node:fs/promises";
import path from "node:path";
import { CreatePlanningSpaceInput, PlanningSpace, createEmptyLearningDesign } from "@ptspace/shared";
import { newId, nowIso } from "../ids.js";
import { planningSpaceSlug } from "../workspaceSlug.js";

export class PlanningSpaceStore {
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "planning-spaces.json");
  }

  async list(): Promise<PlanningSpace[]> {
    return this.readAll();
  }

  async get(id: string): Promise<PlanningSpace | undefined> {
    const spaces = await this.readAll();
    return spaces.find((space) => space.id === id);
  }

  async create(input: CreatePlanningSpaceInput): Promise<PlanningSpace> {
    const timestamp = nowIso();
    const spaces = await this.readAll();
    const baseSlug = planningSpaceSlug(input.title, input.subject);
    const usedSlugs = new Set(spaces.map((entry) => entry.workspaceSlug).filter(Boolean));
    let workspaceSlug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(workspaceSlug)) workspaceSlug = `${baseSlug}-${suffix++}`;
    const space: PlanningSpace = {
      id: newId("space"),
      workspaceSlug,
      title: input.title,
      subject: input.subject ?? "",
      targetGroup: input.targetGroup ?? "",
      initialIdea: input.initialIdea ?? "",
      status: "active",
      participants: [{ id: "local-teacher", displayName: "Lehrkraft", role: "owner" }],
      createdAt: timestamp,
      updatedAt: timestamp,
      learningDesign: createEmptyLearningDesign(input),
      openQuestions: [
        {
          id: newId("question"),
          question: "Welche Lernerfahrung soll im Mittelpunkt stehen?",
          context: "Startfrage zum gemeinsamen Nachdenken",
          createdAt: timestamp
        }
      ],
      decisions: [],
      nextSteps: [
        {
          id: newId("step"),
          label: "Lernanliegen klären",
          description: "Im Gespräch herausarbeiten, woran die Lerngruppe fachlich und persoenlich wachsen soll.",
          kind: "reflect",
          status: "suggested",
          relatedServiceRequest: null
        }
      ],
      materials: []
    };

    spaces.push(space);
    await this.writeAll(spaces);
    return space;
  }

  async save(space: PlanningSpace): Promise<void> {
    const spaces = await this.readAll();
    const index = spaces.findIndex((entry) => entry.id === space.id);
    const updated = { ...space, updatedAt: nowIso() };
    if (index === -1) {
      spaces.push(updated);
    } else {
      spaces[index] = updated;
    }
    await this.writeAll(spaces);
  }

  private async readAll(): Promise<PlanningSpace[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(raw) as PlanningSpace[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async writeAll(spaces: PlanningSpace[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(spaces, null, 2), "utf8");
  }
}
