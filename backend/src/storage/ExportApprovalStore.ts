import fs from "node:fs/promises";
import path from "node:path";
import { CreateExportApprovalInput, ExportApproval } from "@ptspace/shared";
import { newId, nowIso } from "../ids.js";

export class ExportApprovalStore {
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "export-approvals.json");
  }

  async create(planningSpaceId: string, input: CreateExportApprovalInput): Promise<ExportApproval> {
    const approval: ExportApproval = {
      id: newId("approval"),
      planningSpaceId,
      exportType: input.exportType,
      approvedBy: input.approvedBy,
      approvedAt: nowIso(),
      note: input.note ?? "",
      sensitiveFindingsReviewed: input.sensitiveFindingsReviewed ?? false
    };
    const approvals = await this.readAll();
    approvals.push(approval);
    await this.writeAll(approvals);
    return approval;
  }

  async latest(planningSpaceId: string, exportType: ExportApproval["exportType"]): Promise<ExportApproval | null> {
    const approvals = await this.readAll();
    return approvals
      .filter((approval) => approval.planningSpaceId === planningSpaceId && approval.exportType === exportType)
      .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))[0] ?? null;
  }

  private async readAll(): Promise<ExportApproval[]> {
    try {
      return JSON.parse(await fs.readFile(this.filePath, "utf8")) as ExportApproval[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async writeAll(approvals: ExportApproval[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(approvals, null, 2), "utf8");
  }
}