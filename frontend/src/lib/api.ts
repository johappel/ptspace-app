const backendUrl = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5174";

export type PlanningSpace = {
  id: string;
  title: string;
  subject?: string;
  targetGroup?: string;
  initialIdea?: string;
};

export type ThinkingCard = {
  id: string;
  title: string;
  summary: string;
  previewItems: string[];
};

export type SensitiveFinding = {
  id: string;
  kind: "student_name" | "grade" | "diagnosis" | "family_detail" | "personal_conflict" | "secret";
  severity: "notice" | "review" | "block_export";
  excerpt: string;
  message: string;
  suggestion: string;
};

export type ExportApproval = {
  id: string;
  planningSpaceId: string;
  exportType: "markdown" | "okf_markdown";
  approvedBy: string;
  approvedAt: string;
  sensitiveFindingsReviewed: boolean;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Die Anfrage konnte noch nicht verarbeitet werden." }));
    throw new Error(body.message ?? "Die Anfrage konnte noch nicht verarbeitet werden.");
  }
  return response.json() as Promise<T>;
}

export const api = {
  backendUrl,
  listPlanningSpaces: () => request<PlanningSpace[]>("/planning-spaces"),
  createPlanningSpace: (input: { title: string; subject?: string; targetGroup?: string; initialIdea?: string }) =>
    request<PlanningSpace>("/planning-spaces", { method: "POST", body: JSON.stringify(input) }),
  getMessages: (spaceId: string) =>
    request<{ messages: Array<{ id: string; author: "teacher" | "critical_friend"; text: string; createdAt: string }> }>(`/planning-spaces/${spaceId}/messages`),
  sendMessage: (spaceId: string, message: string) =>
    request<{ reply: { id: string; author: "critical_friend"; text: string; createdAt: string } }>(`/planning-spaces/${spaceId}/conversation`, {
      method: "POST",
      body: JSON.stringify({ message })
    }),
  getThinkingState: (spaceId: string) =>
    request<{ cards: ThinkingCard[]; summary: string }>(`/planning-spaces/${spaceId}/thinking-state`),
  scanSensitiveContent: (text: string) =>
    request<{ findings: SensitiveFinding[]; message: string }>("/sensitive-content/scan", {
      method: "POST",
      body: JSON.stringify({ text })
    }),
  getExportStatus: (spaceId: string) =>
    request<{ markdown: ExportApproval | null; okfMarkdown: ExportApproval | null }>(`/planning-spaces/${spaceId}/export-status`),
  approveExport: (spaceId: string, exportType: "markdown" | "okf_markdown", sensitiveFindingsReviewed: boolean) =>
    request<ExportApproval>(`/planning-spaces/${spaceId}/export-approvals`, {
      method: "POST",
      body: JSON.stringify({ exportType, approvedBy: "Lehrkraft", sensitiveFindingsReviewed })
    })
};