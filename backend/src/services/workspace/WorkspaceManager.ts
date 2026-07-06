import fs from "node:fs/promises";
import path from "node:path";
import { PlanningSpace } from "@ptspace/shared";

export class WorkspaceManager {
  constructor(private readonly rootDir: string) {}

  getWorkspaceRoot(spaceId: string): string {
    return path.resolve(this.rootDir, spaceId);
  }

  async ensureWorkspace(space: PlanningSpace): Promise<string> {
    const workspaceRoot = this.getWorkspaceRoot(space.id);
    const projectDir = path.join(workspaceRoot, "project");
    await fs.mkdir(path.join(projectDir, "service-requests"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "drafts"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "materials"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "exports"), { recursive: true });
    await this.writeIfMissing(path.join(projectDir, "learning-design.md"), this.learningDesignTemplate(space));
    await this.writeIfMissing(path.join(projectDir, "decisions.md"), "# Offene Entscheidungen\n\nNoch keine Entscheidung festgehalten.\n");
    await this.writeIfMissing(path.join(projectDir, "open-questions.md"), "# Offene Fragen\n\n- Welche Lernerfahrung soll im Mittelpunkt stehen?\n");
    await this.writeIfMissing(path.join(projectDir, "next-steps.md"), "# Nächste Schritte\n\n- Lernanliegen klären\n");
    await this.writeIfMissing(path.join(projectDir, "conversation-summary.md"), "# Gesprächszusammenfassung\n\nDer Planungsraum wurde angelegt.\n");
    return workspaceRoot;
  }

  resolveInsideWorkspace(spaceId: string, relativePath: string): string {
    const workspaceRoot = this.getWorkspaceRoot(spaceId);
    const target = path.resolve(workspaceRoot, relativePath);
    if (!this.isInside(workspaceRoot, target)) {
      throw new Error("workspace_boundary_violation");
    }
    return target;
  }

  async readProjectFile(spaceId: string, relativePath: string): Promise<string> {
    const fullPath = this.resolveInsideWorkspace(spaceId, path.join("project", relativePath));
    return fs.readFile(fullPath, "utf8");
  }

  async writeProjectFile(spaceId: string, relativePath: string, content: string): Promise<void> {
    const fullPath = this.resolveInsideWorkspace(spaceId, path.join("project", relativePath));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf8");
  }

  private isInside(root: string, target: string): boolean {
    const relative = path.relative(root, target);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  }

  private async writeIfMissing(filePath: string, content: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, content, "utf8");
    }
  }

  private learningDesignTemplate(space: PlanningSpace): string {
    return `# Denkstand\n\n## Thema\n${space.title}\n\n## Fach / Lernbereich\n${space.subject || "noch offen"}\n\n## Zielgruppe\n${space.targetGroup || "noch offen"}\n\n## Erste Idee\n${space.initialIdea || "noch offen"}\n\n## Lernanliegen\nNoch zu klären.\n\n## Lernreise\nNoch zu entwickeln.\n`;
  }
}
