const backendUrl = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5174";


export type LearningMoment = {
  id: string;
  title: string;
  kind: string;
  didacticPurpose: string;
  learningActivity: string;
  expectedExperience: string;
  materialIds: string[];
  openQuestions: string[];
};

export type LearningLandscape = {
  schema: "ptspace.learning-landscape/v1";
  title: string;
  structure: "linear" | "branching" | "stations" | "buffet" | "project" | "spatial" | "hybrid";
  moments: LearningMoment[];
  transitions: Array<{ id: string; from: string; to: string; kind: "required" | "choice" | "parallel" | "return" | "meeting_point" | "prerequisite"; note: string }>;
  teachingWindows: Array<{ id: string; title: string; kind: "lesson" | "double_lesson" | "project_block" | "open_learning_time"; note: string }>;
  placements: Array<{ nodeId: string; windowId: string; note: string }>;
};

export type PlanningBoardItem = {
  id: string;
  title: string;
  kind: "clarify" | "research" | "design" | "produce" | "review" | "render" | "export";
  column: "clarify" | "prepare" | "review" | "ready";
  status: "proposed" | "approved" | "in_progress" | "review" | "ready" | "blocked" | "discarded";
  relatedNodes: string[];
  relatedWindows: string[];
  materialIds: string[];
  requiresTeacherApproval: boolean;
};

export type PlanningBoard = { schema: "ptspace.planning-board/v1"; items: PlanningBoardItem[] };


export type PedagogicalFocus = { kind: "learning_moment" | "teaching_window" | "planning_item" | "material"; id: string; label: string };
export type RoomOverview = { progress: Array<{ id: string; label: string; complete: boolean }>; activity: Array<{ id: string; label: string; createdAt: string }>; versions: Array<{ label: string; hash: string; createdAt: string }> };
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

export type ServiceRequest = {
  id: string;
  status: "proposed" | "approved" | "in_progress" | "returned" | "reviewed" | "failed";
  capability: string;
  reason: string;
  review?: { status: "passed" | "failed"; note: string };
};

export type WorkerMaterial = {
  title: string;
  status: "review_needed";
  format: "markdown";
  content: string;
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
  getRuntimeStatus: () => fetch(`${backendUrl}/health`).then((response) => response.json() as Promise<{ harnessAvailability: { status: string; teacherFacingMessage: string } }>),
  listPlanningSpaces: () => request<PlanningSpace[]>("/planning-spaces"),
  createPlanningSpace: (input: { title: string; subject?: string; targetGroup?: string; initialIdea?: string }) =>
    request<PlanningSpace>("/planning-spaces", { method: "POST", body: JSON.stringify(input) }),
  getMessages: (spaceId: string) =>
    request<{ messages: Array<{ id: string; author: "teacher" | "critical_friend"; text: string; createdAt: string }> }>(`/planning-spaces/${spaceId}/messages`),
  getDesignNotes: (spaceId: string) =>
    request<{ content: string; versions: Array<{ label: string; hash: string; createdAt: string }> }>(`/planning-spaces/${spaceId}/design-notes`),
  saveDesignNotes: (spaceId: string, content: string) =>
    request<{ content: string }>(`/planning-spaces/${spaceId}/design-notes`, { method: "PUT", body: JSON.stringify({ content }) }),
  recordDecision: (spaceId: string, decision: string, reason: string) =>
    request<{ content: string }>(`/planning-spaces/${spaceId}/decisions`, { method: "POST", body: JSON.stringify({ decision, reason }) }),
  getRoomOverview: (spaceId: string) => request<RoomOverview>(`/planning-spaces/${spaceId}/room-overview`),
  searchRoom: (spaceId: string, query: string) => request<{ hits: Array<{ id: string; label: string; excerpt: string }> }>(`/planning-spaces/${spaceId}/search?q=${encodeURIComponent(query)}`),
  sendMessage: (spaceId: string, message: string, focus?: PedagogicalFocus) =>
    request<{ reply: { id: string; author: "critical_friend"; text: string; createdAt: string } }>(`/planning-spaces/${spaceId}/conversation`, {
      method: "POST",
      body: JSON.stringify({ message, focus })
    }),
  getThinkingState: (spaceId: string) =>
    request<{ cards: ThinkingCard[]; summary: string }>(`/planning-spaces/${spaceId}/thinking-state`),
  getPlanningArtifacts: (spaceId: string) =>
    request<{ learningLandscape: LearningLandscape; planningBoard: PlanningBoard }>(`/planning-spaces/${spaceId}/planning-artifacts`),
  getLearningLandscapeLayout: (spaceId: string) => request<{ nodes: Array<{ id: string; x: number; y: number }> }>(`/planning-spaces/${spaceId}/learning-landscape-layout`),
  saveLearningLandscapeLayout: (spaceId: string, layout: { nodes: Array<{ id: string; x: number; y: number }> }) => request<{ nodes: Array<{ id: string; x: number; y: number }> }>(`/planning-spaces/${spaceId}/learning-landscape-layout`, { method: "PUT", body: JSON.stringify(layout) }),
  savePlanningArtifacts: (spaceId: string, input: { learningLandscape?: LearningLandscape; planningBoard?: PlanningBoard }) =>
    request<{ learningLandscape?: LearningLandscape; planningBoard?: PlanningBoard }>(`/planning-spaces/${spaceId}/planning-artifacts`, {
      method: "PUT", body: JSON.stringify(input)
    }),
  getServiceRequests: (spaceId: string) =>
    request<{ requests: ServiceRequest[] }>(`/planning-spaces/${spaceId}/service-requests`),
  getStudentInstruction: (spaceId: string) =>
    request<WorkerMaterial>(`/planning-spaces/${spaceId}/materials/student-instruction`),
  proposeStudentInstruction: (spaceId: string) =>
    request<{ serviceRequest: ServiceRequest }>(`/planning-spaces/${spaceId}/service-requests/student-instruction`, {
      method: "POST",
      body: JSON.stringify({
        reason: "Der aktuelle Denkstand soll in einem ersten, ausdrücklich noch zu prüfenden Arbeitsauftrag erprobt werden."
      })
    }),
  approveServiceRequest: (spaceId: string, requestId: string) =>
    request<{ serviceRequest: ServiceRequest; material: WorkerMaterial; teacherFacingMessage: string }>(
      `/planning-spaces/${spaceId}/service-requests/${requestId}/approve`,
      { method: "POST" }
    ),
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


