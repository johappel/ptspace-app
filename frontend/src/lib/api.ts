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
  listPlanningSpaces: () => request<PlanningSpace[]>("/planning-spaces"),
  createPlanningSpace: (input: { title: string; subject?: string; targetGroup?: string; initialIdea?: string }) =>
    request<PlanningSpace>("/planning-spaces", { method: "POST", body: JSON.stringify(input) }),
  sendMessage: (spaceId: string, message: string) =>
    request<{ reply: { id: string; author: "critical_friend"; text: string; createdAt: string } }>(`/planning-spaces/${spaceId}/conversation`, {
      method: "POST",
      body: JSON.stringify({ message })
    }),
  getThinkingState: (spaceId: string) =>
    request<{ cards: ThinkingCard[]; summary: string }>(`/planning-spaces/${spaceId}/thinking-state`)
};
