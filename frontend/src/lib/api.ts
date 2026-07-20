import type { AttentionCard, BackgroundWorkItem, ConversationMarker as SharedConversationMarker, GuidedWorkerProposal, Material as SharedMaterial } from "@ptspace/shared";

const configuredBackendUrl = import.meta.env.PUBLIC_BACKEND_URL?.trim();
// During local development Vite proxies /api and /health to the backend.
// Keeping browser requests same-origin avoids a fragile CORS dependency while
// the backend remains independently configurable for preview/production.
const backendUrl = import.meta.env.DEV
  ? ""
  : (configuredBackendUrl || "http://127.0.0.1:5174").replace(/\/+$/, "");


export type LearningMoment = {
  id: string;
  title: string;
  kind: string;
  didacticPurpose: string;
  learningActivity: string;
  expectedExperience: string;
  materialNeeds: string[];
  materialIds: string[];
  openQuestions: string[];
  status: "draft" | "in_progress" | "ready" | "needs_revision";
};

export type LearningLandscape = {
  schema: "ptspace.learning-landscape/v1";
  title: string;
  structure: "linear" | "branching" | "stations" | "buffet" | "project" | "spatial" | "hybrid";
  moments: LearningMoment[];
  transitions: Array<{ id: string; from: string; to: string; kind: "required" | "choice" | "parallel" | "return" | "meeting_point" | "prerequisite"; rationale: string }>;
};

export type LearningLandscapeLayoutGroup = {
  id: string;
  title: string;
  kind: "phase" | "room" | "station";
  x: number;
  y: number;
  width: number;
  height: number;
  memberIds: string[];
};

export type LearningLandscapeViewport = { x: number; y: number; zoom: number };
export type LearningLandscapeLayout = {
  nodes: Array<{ id: string; x: number; y: number }>;
  groups: LearningLandscapeLayoutGroup[];
  viewport?: LearningLandscapeViewport;
};

export type TeachingWindow = { id: string; title: string; kind: "lesson" | "double_lesson" | "project_block" | "open_learning_time"; durationMinutes: number; note: string };
export type TimePlacement = {
  id: string;
  momentId: string;
  windowId: string;
  startMinute: number;
  durationMinutes: number;
  dramaturgicalRole: "opening" | "irritation" | "exploration" | "deepening" | "practice" | "decision" | "consolidation" | "reflection" | "closing" | "transition" | "buffer" | "other";
  mode: "common" | "choice" | "parallel" | "individual" | "group" | "open";
  note: string;
};
export type TemporalPlan = {
  schema: "ptspace.temporal-plan/v1";
  title: string;
  landscape: "learning-landscape.md";
  windows: TeachingWindow[];
  placements: TimePlacement[];
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
  materialNeed: string;
  expectedResult: string;
  requiresTeacherApproval: boolean;
  serviceRequestId: string;
  reviewedAt: string;
  reviewedBy: string;
};

export type PlanningBoard = { schema: "ptspace.planning-board/v1"; items: PlanningBoardItem[] };


export type MaterialMetadata = SharedMaterial;
export type ConversationMarker = SharedConversationMarker;
export type ConversationMarkerInput = {
  sourceMessageId: string;
  kind: ConversationMarker["kind"];
  targetType: ConversationMarker["targetType"];
  targetId: string;
  label: string;
  targetPlanningSpaceId?: string;
};
export type MaterialAssignmentTarget = {
  targetType: "learning_moment" | "board_item";
  targetId: string;
  targetPlanningSpaceId?: string;
};
export type VersionSnapshot = { label: string; committed: boolean; hash?: string };

export type PedagogicalFocus = { kind: "learning_moment" | "transition" | "teaching_window" | "placement" | "planning_item" | "material"; id: string; label: string };

export type ProposalKind = "learning_moment" | "transition" | "temporal_placement" | "board_item";
export type Proposal = {
  id: string;
  kind: ProposalKind;
  rationale: string;
  expectedConsequence: string;
  moment?: LearningMoment;
  possibleTransitions?: Array<{ fromId: string; fromLabel: string; toId: string; toLabel: string; kind: LearningLandscape["transitions"][number]["kind"] }>;
  timeEffect?: string;
  transition?: LearningLandscape["transitions"][number];
  placement?: TimePlacement;
  placementWindowLabel?: string;
  boardItem?: PlanningBoardItem;
};
export type RoomOverview = {
  progress: Array<{ id: string; label: string; complete: boolean }>;
  activity: Array<{ id: string; label: string; createdAt: string }>;
  versions: Array<{ label: string; hash: string; createdAt: string }>;
  conversationMarkers: ConversationMarker[];
  decisions: Array<{ id: string; title: string }>;
  attentionCard: AttentionCard;
  backgroundWork: BackgroundWorkItem[];
};
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
  status: "proposed" | "approved" | "queued" | "in_progress" | "returned" | "reviewed" | "failed" | "discarded";
  capability: string;
  reason: string;
  review?: { status: "passed" | "failed"; note: string };
  automaticCheck?: { status: "pending" | "passed" | "failed"; note: string; checkedAt?: string };
  criticalFriendCheck?: { status: "pending" | "passed" | "concerns" | "blocked"; note: string; checkedAt?: string };
  teacherReview?: { status: "accepted"; reviewedBy: string; reviewedAt: string; note?: string };
};

export type WorkerMaterial = {
  title: string;
  status: "review_needed";
  format: "markdown";
  content: string;
  location?: string;
  boardItemId?: string | null;
  relatedMoments?: string[];
  review?: { status: "passed" | "failed"; note: string; reviewedAt?: string };
};

export type ConversationMessage = {
  id: string;
  author: "teacher" | "critical_friend" | "system";
  text: string;
  createdAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init.body !== null && init.body !== "";
  const response = await fetch(`${backendUrl}/api${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
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
    request<{ messages: ConversationMessage[] }>(`/planning-spaces/${spaceId}/messages`),
  getDesignNotes: (spaceId: string) =>
    request<{ content: string; versions: Array<{ label: string; hash: string; createdAt: string }> }>(`/planning-spaces/${spaceId}/design-notes`),
  saveDesignNotes: (spaceId: string, content: string) =>
    request<{ content: string }>(`/planning-spaces/${spaceId}/design-notes`, { method: "PUT", body: JSON.stringify({ content }) }),
  recordDecision: (spaceId: string, decision: string, reason: string) =>
    request<{ content: string; decision: { id: string; title: string; decision: string; reason: string; createdAt: string } }>(`/planning-spaces/${spaceId}/decisions`, { method: "POST", body: JSON.stringify({ decision, reason }) }),
  getRoomOverview: (spaceId: string) => request<RoomOverview>(`/planning-spaces/${spaceId}/room-overview`),
  searchRoom: (spaceId: string, query: string) => request<{ hits: Array<{ id: string; label: string; excerpt: string }> }>(`/planning-spaces/${spaceId}/search?q=${encodeURIComponent(query)}`),
  sendMessage: (spaceId: string, message: string, focus?: PedagogicalFocus) =>
    request<{ teacherMessageId: string; reply: { id: string; author: "critical_friend"; text: string; createdAt: string } }>(`/planning-spaces/${spaceId}/conversation`, {
      method: "POST",
      body: JSON.stringify({ message, focus })
    }),
  // Streaming-Variante (SSE): meldet früh einen Denkstatus und liefert am Ende
  // die vollständige Antwort. Fällt bei Serverfehlern auf einen klaren Fehler zurück.
  sendMessageStream: async (
    spaceId: string,
    message: string,
    handlers: {
      onStatus?: (status: string) => void;
      onComplete: (reply: { id: string; author: "critical_friend"; text: string; createdAt: string }, teacherMessageId?: string) => void;
      onError?: (message: string) => void;
    },
    focus?: PedagogicalFocus
  ): Promise<{ completed: boolean }> => {
    const response = await fetch(`${backendUrl}/api/planning-spaces/${spaceId}/conversation/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, focus })
    });
    if (!response.ok || !response.body) {
      const fallback = await response.json().catch(() => ({ message: "Die Antwort konnte nicht gestreamt werden." }));
      handlers.onError?.(fallback.message ?? "Die Antwort konnte nicht gestreamt werden.");
      return { completed: false };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;
    const processChunk = (chunk: string) => {
      const eventMatch = chunk.match(/^event: (.+)$/m);
      const dataMatch = chunk.match(/^data: (.+)$/m);
      if (!eventMatch || !dataMatch) return;
      const event = eventMatch[1].trim();
      let data: { status?: string; message?: string; reply?: { id: string; author: "critical_friend"; text: string; createdAt: string }; teacherMessageId?: string };
      try {
        data = JSON.parse(dataMatch[1]) as typeof data;
      } catch {
        handlers.onError?.("Die Antwort des Critical Friend konnte nicht gelesen werden.");
        return;
      }
      if (event === "status") handlers.onStatus?.(data.status ?? "thinking");
      else if (event === "complete" && data.reply) {
        completed = true;
        handlers.onComplete(data.reply, data.teacherMessageId);
      } else if (event === "error") handlers.onError?.(data.message ?? "Die Antwort konnte nicht gestreamt werden.");
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) processChunk(chunk);
    }
    if (buffer.trim()) processChunk(buffer);
    return { completed };
  },
  generateProposal: (spaceId: string, input: { kind: ProposalKind; note?: string; focus?: PedagogicalFocus }) =>
    request<{ proposal: Proposal }>(`/planning-spaces/${spaceId}/proposals`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  getThinkingState: (spaceId: string) =>
    request<{ cards: ThinkingCard[]; summary: string }>(`/planning-spaces/${spaceId}/thinking-state`),
  getPlanningArtifacts: (spaceId: string) =>
    request<{ learningLandscape: LearningLandscape; planningBoard: PlanningBoard }>(`/planning-spaces/${spaceId}/planning-artifacts`),
  listMaterials: (spaceId: string) =>
    request<{ materials: MaterialMetadata[] }>("/planning-spaces/" + spaceId + "/materials"),
  assignMaterial: (spaceId: string, materialId: string, target: MaterialAssignmentTarget) =>
    request<{
      material: MaterialMetadata;
      learningLandscape: LearningLandscape;
      planningBoard: PlanningBoard;
      changed: boolean;
      version: VersionSnapshot;
    }>("/planning-spaces/" + spaceId + "/materials/" + materialId + "/assignments", {
      method: "POST",
      body: JSON.stringify(target)
    }),
  listConversationMarkers: (spaceId: string) =>
    request<{ markers: ConversationMarker[] }>("/planning-spaces/" + spaceId + "/conversation-markers"),
  createConversationMarker: (spaceId: string, input: ConversationMarkerInput) =>
    request<{ marker: ConversationMarker }>("/planning-spaces/" + spaceId + "/conversation-markers", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  supersedeConversationMarker: (spaceId: string, markerId: string, reason?: string) =>
    request<{ marker: ConversationMarker }>("/planning-spaces/" + spaceId + "/conversation-markers/" + markerId + "/supersede", {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {})
    }),
  getTemporalPlan: (spaceId: string) =>
    request<TemporalPlan>(`/planning-spaces/${spaceId}/temporal-plan`),
  saveTemporalPlan: (spaceId: string, temporalPlan: TemporalPlan) =>
    request<{ temporalPlan: TemporalPlan; version: unknown }>(`/planning-spaces/${spaceId}/temporal-plan`, { method: "PUT", body: JSON.stringify(temporalPlan) }),
  getLearningLandscapeLayout: (spaceId: string) => request<LearningLandscapeLayout>(`/planning-spaces/${spaceId}/learning-landscape-layout`),
  saveLearningLandscapeLayout: (spaceId: string, layout: LearningLandscapeLayout) => request<LearningLandscapeLayout>(`/planning-spaces/${spaceId}/learning-landscape-layout`, { method: "PUT", body: JSON.stringify(layout) }),
  savePlanningArtifacts: (spaceId: string, input: { learningLandscape?: LearningLandscape; planningBoard?: PlanningBoard }) =>
    request<{ learningLandscape?: LearningLandscape; planningBoard?: PlanningBoard }>(`/planning-spaces/${spaceId}/planning-artifacts`, {
      method: "PUT", body: JSON.stringify(input)
    }),
  getServiceRequests: (spaceId: string) =>
    request<{ requests: ServiceRequest[] }>(`/planning-spaces/${spaceId}/service-requests`),
  getMaterial: (spaceId: string, materialId: string) =>
    request<WorkerMaterial>(`/planning-spaces/${spaceId}/materials/${materialId}`),
  getStudentInstruction: (spaceId: string) =>
    request<WorkerMaterial>(`/planning-spaces/${spaceId}/materials/student-instruction`),
  proposeStudentInstruction: (spaceId: string) =>
    request<{ serviceRequest: ServiceRequest }>(`/planning-spaces/${spaceId}/service-requests/student-instruction`, {
      method: "POST",
      body: JSON.stringify({
        reason: "Der aktuelle Denkstand soll in einem ersten, ausdrücklich noch zu prüfenden Arbeitsauftrag erprobt werden."
      })
    }),
  proposeBoardMaterial: (spaceId: string, input: { boardItemId: string; title: string; relatedMoments: string[]; expectedResult: string }) =>
    request<{ serviceRequest: ServiceRequest & { boardItemId?: string; relatedMoments?: string[]; expectedOutput?: { location: string } } }>(`/planning-spaces/${spaceId}/service-requests/board-material`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  approveServiceRequest: (spaceId: string, requestId: string) =>
    request<{ serviceRequest: ServiceRequest; material: WorkerMaterial; teacherFacingMessage: string }>(
      `/planning-spaces/${spaceId}/service-requests/${requestId}/approve`,
      { method: "POST" }
    ),
  getGuidedProposals: (spaceId: string) =>
    request<{ proposals: GuidedWorkerProposal[] }>(`/planning-spaces/${spaceId}/guided-proposals`),
  acceptGuidedProposal: (spaceId: string, proposalId: string) =>
    request<{ proposal: GuidedWorkerProposal; request: ServiceRequest; teacherFacingMessage: string }>(
      `/planning-spaces/${spaceId}/guided-proposals/${proposalId}/accept`,
      { method: "POST" }
    ),
  reviewServiceRequest: (spaceId: string, requestId: string, note?: string) =>
    request<{ serviceRequest: ServiceRequest; planningBoard: PlanningBoard; teacherFacingMessage: string }>(
      `/planning-spaces/${spaceId}/service-requests/${requestId}/review`,
      { method: "POST", body: JSON.stringify({ reviewedBy: "Lehrkraft", ...(note ? { note } : {}) }) }
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


