import fs from "node:fs/promises";
import path from "node:path";
import { Material, MaterialManifest, MaterialManifestSchema } from "@ptspace/shared";
import { WorkspaceManager } from "../services/workspace/WorkspaceManager.js";

export const MATERIAL_MANIFEST_PATH = "materials/manifest.json";

export class MaterialManifestStore {
  constructor(private readonly workspace: WorkspaceManager) {}

  async list(planningSpaceId: string): Promise<Material[]> {
    return (await this.readManifest(planningSpaceId)).materials;
  }

  async get(planningSpaceId: string, materialId: string): Promise<Material | undefined> {
    if (!this.isSafeId(materialId)) throw new Error("invalid_material_id");
    return (await this.readManifest(planningSpaceId)).materials.find((material) => material.id === materialId);
  }

  async save(planningSpaceId: string, manifest: MaterialManifest): Promise<void> {
    const parsed = MaterialManifestSchema.parse(manifest);
    await this.workspace.writeProjectFile(planningSpaceId, MATERIAL_MANIFEST_PATH, `${JSON.stringify(parsed, null, 2)}\n`);
  }

  async upsert(planningSpaceId: string, material: Material): Promise<void> {
    const manifest = await this.readManifest(planningSpaceId);
    const index = manifest.materials.findIndex((entry) => entry.id === material.id);
    if (index === -1) manifest.materials.push(material);
    else manifest.materials[index] = material;
    await this.save(planningSpaceId, manifest);
  }

  async readManifest(planningSpaceId: string): Promise<MaterialManifest> {
    try {
      const content = await this.workspace.readProjectFile(planningSpaceId, MATERIAL_MANIFEST_PATH);
      return MaterialManifestSchema.parse(JSON.parse(content));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { schema: "ptspace.material-manifest/v1", materials: [] };
      }
      if (error instanceof SyntaxError) throw new Error("material_manifest_invalid");
      throw error;
    }
  }

  async snapshot(planningSpaceId: string): Promise<{ exists: boolean; content?: string }> {
    const target = this.workspace.resolveInsideWorkspace(planningSpaceId, MATERIAL_MANIFEST_PATH);
    try {
      return { exists: true, content: await fs.readFile(target, "utf8") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false };
      throw error;
    }
  }

  async restore(planningSpaceId: string, snapshot: { exists: boolean; content?: string }): Promise<void> {
    const target = this.workspace.resolveInsideWorkspace(planningSpaceId, MATERIAL_MANIFEST_PATH);
    if (snapshot.exists) {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, snapshot.content ?? "", "utf8");
      return;
    }
    await fs.rm(target, { force: true });
  }

  private isSafeId(materialId: string): boolean {
    return materialId.length > 0 && path.basename(materialId) === materialId && !materialId.includes("\\") && !materialId.includes("/");
  }
}
