import fs from "node:fs/promises";
import path from "node:path";

export type ConversationMessage = {
  id: string;
  author: "teacher" | "critical_friend";
  text: string;
  createdAt: string;
};

export class ConversationStore {
  constructor(private readonly workspacesDir: string) {}

  async getMessages(spaceId: string): Promise<ConversationMessage[]> {
    const filePath = path.join(this.workspacesDir, spaceId, "project", "messages.json");
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content) as ConversationMessage[];
    } catch {
      return [];
    }
  }

  async addMessage(spaceId: string, message: ConversationMessage): Promise<void> {
    const filePath = path.join(this.workspacesDir, spaceId, "project", "messages.json");
    const messages = await this.getMessages(spaceId);
    messages.push(message);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), "utf8");
  }

  async getConversationSummary(spaceId: string): Promise<string> {
    const messages = await this.getMessages(spaceId);
    if (messages.length === 0) return "";
    
    const summary = messages
      .map((msg) => `${msg.author === "teacher" ? "Lehrkraft" : "CF"}: ${msg.text}`)
      .join("\n\n");
    
    return summary;
  }
}
