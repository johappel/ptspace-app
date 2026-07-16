import fs from "node:fs/promises";
import path from "node:path";
import {
  ConversationSummary,
  MessageSignificance,
  emptySummary,
  renderSummary
} from "../services/conversation/ConversationSummaryService.js";

export type ConversationMessage = {
  id: string;
  author: "teacher" | "critical_friend" | "system";
  text: string;
  createdAt: string;
  significance?: MessageSignificance;
};

export class ConversationStore {
  constructor(private readonly workspacesDir: string) {}

  private messagesPath(spaceId: string): string {
    return path.join(this.workspacesDir, spaceId, "project", "messages.json");
  }

  private summaryPath(spaceId: string): string {
    return path.join(this.workspacesDir, spaceId, "project", "conversation-summary.json");
  }

  async getMessages(spaceId: string): Promise<ConversationMessage[]> {
    try {
      const content = await fs.readFile(this.messagesPath(spaceId), "utf8");
      return JSON.parse(content) as ConversationMessage[];
    } catch {
      return [];
    }
  }

  /** Kurzzeitgedächtnis: nur die letzten Nachrichten (ARCHITECTURE-SESSION-MODEL 2.3). */
  async getRecentMessages(spaceId: string, max = 8): Promise<ConversationMessage[]> {
    const messages = await this.getMessages(spaceId);
    return messages.slice(Math.max(0, messages.length - max));
  }

  async addMessage(spaceId: string, message: ConversationMessage): Promise<void> {
    const filePath = this.messagesPath(spaceId);
    const messages = await this.getMessages(spaceId);
    messages.push(message);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), "utf8");
  }

  /** Strukturierte, komprimierte Summary laden (TASK 3/4). */
  async getStructuredSummary(spaceId: string): Promise<ConversationSummary> {
    try {
      const content = await fs.readFile(this.summaryPath(spaceId), "utf8");
      return JSON.parse(content) as ConversationSummary;
    } catch {
      return emptySummary(spaceId);
    }
  }

  async saveStructuredSummary(spaceId: string, summary: ConversationSummary): Promise<void> {
    const filePath = this.summaryPath(spaceId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(summary, null, 2), "utf8");
  }

  /**
   * Kompaktes Gesprächsgedächtnis als Text. Nutzt die strukturierte Summary,
   * wenn vorhanden – nicht mehr den vollständigen Chatverlauf (TASK 3).
   */
  async getConversationSummary(spaceId: string): Promise<string> {
    const summary = await this.getStructuredSummary(spaceId);
    const rendered = renderSummary(summary);
    if (rendered) return rendered;
    const recent = await this.getRecentMessages(spaceId, 6);
    if (recent.length === 0) return "";
    return recent
      .map((msg) => `${msg.author === "teacher" ? "Lehrkraft" : "CF"}: ${msg.text}`)
      .join("\n\n");
  }
}
