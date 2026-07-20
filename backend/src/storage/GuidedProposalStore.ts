import fs from "node:fs/promises";
import path from "node:path";
import { GuidedWorkerProposal, GuidedWorkerProposalSchema } from "@ptspace/shared";

export const GUIDED_PROPOSALS_PATH = "guided-proposals.json";

/**
 * Persistent app read model for Critical-Friend worker proposals.
 * It deliberately lives beside the conversation projection, not in a kernel file.
 */
export class GuidedProposalStore {
  constructor(private readonly workspacesDir: string) {}

  async list(planningSpaceId: string): Promise<GuidedWorkerProposal[]> {
    try {
      const content = await fs.readFile(this.filePath(planningSpaceId), "utf8");
      const parsed = JSON.parse(content) as unknown;
      if (!Array.isArray(parsed)) throw new Error("guided_proposals_invalid");
      return parsed.map((entry) => GuidedWorkerProposalSchema.parse(entry));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      if (error instanceof SyntaxError) throw new Error("guided_proposals_invalid");
      throw error;
    }
  }

  async get(planningSpaceId: string, proposalId: string): Promise<GuidedWorkerProposal | undefined> {
    if (path.basename(proposalId) !== proposalId) throw new Error("invalid_guided_proposal_id");
    return (await this.list(planningSpaceId)).find((proposal) => proposal.id === proposalId);
  }

  async save(planningSpaceId: string, proposals: GuidedWorkerProposal[]): Promise<void> {
    const parsed = proposals.map((proposal) => GuidedWorkerProposalSchema.parse(proposal));
    const filePath = this.filePath(planningSpaceId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      await fs.rename(temporaryPath, filePath);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  }

  async upsert(planningSpaceId: string, proposal: GuidedWorkerProposal): Promise<void> {
    const proposals = await this.list(planningSpaceId);
    const index = proposals.findIndex((entry) => entry.id === proposal.id);
    if (index === -1) proposals.push(proposal);
    else proposals[index] = proposal;
    await this.save(planningSpaceId, proposals);
  }

  async snapshot(planningSpaceId: string): Promise<{ exists: boolean; content?: string }> {
    try {
      return { exists: true, content: await fs.readFile(this.filePath(planningSpaceId), "utf8") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false };
      throw error;
    }
  }

  async restore(planningSpaceId: string, snapshot: { exists: boolean; content?: string }): Promise<void> {
    const filePath = this.filePath(planningSpaceId);
    if (!snapshot.exists) {
      await fs.rm(filePath, { force: true });
      return;
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, snapshot.content ?? "", "utf8");
  }

  private filePath(planningSpaceId: string): string {
    return path.join(this.workspacesDir, planningSpaceId, "project", GUIDED_PROPOSALS_PATH);
  }
}
