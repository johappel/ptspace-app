import fs from "node:fs/promises";
import path from "node:path";
import { Material, MaterialSchema, LearningLandscape, PlanningBoard } from "@ptspace/shared";
import { MaterialManifestStore, MATERIAL_MANIFEST_PATH } from "../../storage/MaterialManifestStore.js";
import { parseLearningLandscape, parsePlanningBoard, serializeLearningLandscape, serializePlanningBoard } from "../planning/PlanningArtifactCodec.js";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";

export type MaterialAssignmentTarget =
  | { type: "learning_moment"; id: string }
  | { type: "board_item"; id: string };

export type MaterialAssignmentResult = {
  material: Material;
  learningLandscape: LearningLandscape;
  planningBoard: PlanningBoard;
  changed: boolean;
};

type Snapshot = { path: string; exists: boolean; content?: string };

/**
 * Maintains both directions of a material relation in one workspace
 * transaction. The kernel keeps the landscape, board and material metadata as
 * separate artefacts; this service makes a user-facing assignment all-or-none.
 */
export class MaterialAssignmentService {
  constructor(private readonly workspace: WorkspaceManager, private readonly materials: MaterialManifestStore) {}

  async assign(planningSpaceId: string, materialId: string, target: MaterialAssignmentTarget): Promise<MaterialAssignmentResult> {
    const material = await this.materials.get(planningSpaceId, materialId);
    if (!material) throw new Error("material_not_found");

    const landscape = parseLearningLandscape(await this.workspace.readProjectFile(planningSpaceId, "learning-landscape.md"));
    const board = parsePlanningBoard(await this.workspace.readProjectFile(planningSpaceId, "planning-board.yml"));
    const updatedMaterial = { ...material };
    let changed = false;

    if (target.type === "learning_moment") {
      const moment = landscape.moments.find((entry) => entry.id === target.id);
      if (!moment) throw new Error("learning_moment_not_found");
      if (!updatedMaterial.relatedMoments.includes(target.id)) {
        updatedMaterial.relatedMoments = [...updatedMaterial.relatedMoments, target.id];
        changed = true;
      }
      if (!moment.materialIds.includes(materialId)) {
        moment.materialIds = [...moment.materialIds, materialId];
        changed = true;
      }
    } else if (target.type === "board_item") {
      const item = board.items.find((entry) => entry.id === target.id);
      if (!item) throw new Error("board_item_not_found");
      if (!updatedMaterial.relatedBoardItems.includes(target.id)) {
        updatedMaterial.relatedBoardItems = [...updatedMaterial.relatedBoardItems, target.id];
        changed = true;
      }
      if (!item.materialIds.includes(materialId)) {
        item.materialIds = [...item.materialIds, materialId];
        changed = true;
      }
    } else {
      throw new Error("material_assignment_target_unknown");
    }

    const parsedMaterial = MaterialSchema.parse(updatedMaterial);
    if (!changed) return { material: parsedMaterial, learningLandscape: landscape, planningBoard: board, changed: false };

    const files = [
      "learning-landscape.md",
      "planning-board.yml",
      MATERIAL_MANIFEST_PATH
    ];
    const snapshots = await Promise.all(files.map((relativePath) => this.snapshot(planningSpaceId, relativePath)));
    try {
      const manifest = await this.materials.readManifest(planningSpaceId);
      manifest.materials = manifest.materials.map((entry) => entry.id === materialId ? parsedMaterial : entry);
      await this.workspace.writeProjectFile(planningSpaceId, "learning-landscape.md", serializeLearningLandscape(landscape));
      await this.workspace.writeProjectFile(planningSpaceId, "planning-board.yml", serializePlanningBoard(board));
      await this.materials.save(planningSpaceId, manifest);
      return { material: parsedMaterial, learningLandscape: landscape, planningBoard: board, changed: true };
    } catch (error) {
      await this.restoreAll(planningSpaceId, snapshots);
      throw error;
    }
  }
  /**
   * Atomically returns a worker-produced material and all canonical relations.
   * The content update is part of the same rollback set as the manifest,
   * landscape and board, so a partial result cannot look usable after reload.
   */
  async returnMaterial(
    planningSpaceId: string,
    material: Material,
    updates: Array<{ relativePath: string; content: string }>
  ): Promise<MaterialAssignmentResult> {
    const parsedMaterial = MaterialSchema.parse(material);
    const landscape = parseLearningLandscape(await this.workspace.readProjectFile(planningSpaceId, "learning-landscape.md"));
    const board = parsePlanningBoard(await this.workspace.readProjectFile(planningSpaceId, "planning-board.yml"));
    if (parsedMaterial.relatedMoments.length === 0 && parsedMaterial.relatedBoardItems.length === 0) {
      throw new Error("material_return_needs_pedagogical_reference");
    }
    for (const momentId of parsedMaterial.relatedMoments) {
      const moment = landscape.moments.find((entry) => entry.id === momentId);
      if (!moment) throw new Error("learning_moment_not_found");
      if (!moment.materialIds.includes(parsedMaterial.id)) moment.materialIds = [...moment.materialIds, parsedMaterial.id];
    }
    for (const boardItemId of parsedMaterial.relatedBoardItems) {
      const item = board.items.find((entry) => entry.id === boardItemId);
      if (!item) throw new Error("board_item_not_found");
      if (!item.materialIds.includes(parsedMaterial.id)) item.materialIds = [...item.materialIds, parsedMaterial.id];
    }

    const relativePaths = [...new Set([
      "learning-landscape.md",
      "planning-board.yml",
      MATERIAL_MANIFEST_PATH,
      ...updates.map((update) => update.relativePath)
    ])];
    const snapshots = await Promise.all(relativePaths.map((relativePath) => this.snapshot(planningSpaceId, relativePath)));
    try {
      const manifest = await this.materials.readManifest(planningSpaceId);
      const materialIndex = manifest.materials.findIndex((entry) => entry.id === parsedMaterial.id);
      if (materialIndex === -1) manifest.materials.push(parsedMaterial);
      else manifest.materials[materialIndex] = parsedMaterial;
      for (const update of updates) await this.workspace.writeProjectFile(planningSpaceId, update.relativePath, update.content);
      await this.workspace.writeProjectFile(planningSpaceId, "learning-landscape.md", serializeLearningLandscape(landscape));
      await this.workspace.writeProjectFile(planningSpaceId, "planning-board.yml", serializePlanningBoard(board));
      await this.materials.save(planningSpaceId, manifest);
      return { material: parsedMaterial, learningLandscape: landscape, planningBoard: board, changed: true };
    } catch (error) {
      await this.restoreAll(planningSpaceId, snapshots);
      throw error;
    }
  }


  private async snapshot(planningSpaceId: string, relativePath: string): Promise<Snapshot> {
    const target = this.workspace.resolveInsideWorkspace(planningSpaceId, relativePath);
    try {
      return { path: target, exists: true, content: await fs.readFile(target, "utf8") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { path: target, exists: false };
      throw error;
    }
  }

  private async restoreAll(planningSpaceId: string, snapshots: Snapshot[]): Promise<void> {
    for (const snapshot of snapshots.reverse()) {
      if (snapshot.exists) {
        await fs.mkdir(path.dirname(snapshot.path), { recursive: true });
        await fs.writeFile(snapshot.path, snapshot.content ?? "", "utf8");
      } else {
        await fs.rm(snapshot.path, { force: true });
      }
    }
  }
}
