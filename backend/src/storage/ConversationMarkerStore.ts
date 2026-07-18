import fs from "node:fs/promises";
import path from "node:path";
import { ConversationMarker, ConversationMarkerCollection, ConversationMarkerCollectionSchema } from "@ptspace/shared";

export class ConversationMarkerStore {
  constructor(private readonly workspacesDir: string) {}

  async list(planningSpaceId: string): Promise<ConversationMarker[]> {
    try {
      const content = await fs.readFile(this.filePath(planningSpaceId), "utf8");
      const parsed = ConversationMarkerCollectionSchema.parse(JSON.parse(content));
      return [...parsed.markers].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      if (error instanceof SyntaxError) throw new Error("conversation_markers_invalid");
      throw error;
    }
  }

  async save(planningSpaceId: string, markers: ConversationMarker[]): Promise<void> {
    const parsed = ConversationMarkerCollectionSchema.parse({
      schema: "ptspace.conversation-markers/v1",
      markers
    });
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

  async add(planningSpaceId: string, marker: ConversationMarker): Promise<ConversationMarker> {
    const markers = await this.list(planningSpaceId);
    const existing = markers.find((entry) =>
      entry.status === "active" &&
      entry.sourceMessageId === marker.sourceMessageId &&
      entry.kind === marker.kind &&
      entry.targetType === marker.targetType &&
      entry.targetId === marker.targetId
    );
    if (existing) return existing;
    markers.push(marker);
    await this.save(planningSpaceId, markers);
    return marker;
  }

  private filePath(planningSpaceId: string): string {
    return path.join(this.workspacesDir, planningSpaceId, "project", "conversation-markers.json");
  }
}
