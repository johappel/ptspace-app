<script lang="ts">
  import { onMount, tick } from "svelte";
  import { AlertCircle, ArrowRight, ArrowUp, BookOpen, Check, CheckCircle2, ChevronDown, FileText, GripVertical, Layers, Lightbulb, List, ListChecks, Map as MapIcon, MessageSquareText, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Scale, ShieldCheck, Settings, TriangleAlert, X } from "lucide-svelte";
  import { api, type ConversationMarker, type ExportApproval, type LearningLandscape, type LearningLandscapeLayout, type LearningLandscapeLayoutGroup, type LearningLandscapeViewport, type LearningMoment, type MaterialMetadata, type PedagogicalFocus, type PlanningBoard, type PlanningBoardItem, type PlanningSpace, type SensitiveFinding, type ServiceRequest, type TeachingWindow, type TemporalPlan, type ThinkingCard, type TimePlacement, type WorkerMaterial } from "$lib/api";
  import { Background, Controls, MiniMap, SvelteFlow, type Connection, type Edge, type Node, type NodeTypes } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import LearningMomentNode from "$lib/LearningMomentNode.svelte";
  import LearningGroupNode from "$lib/LearningGroupNode.svelte";
  import { uuid } from "$lib/uuid";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";

  type UiMessage = { id: string; author: "teacher" | "critical_friend"; text: string; createdAt?: string };
  type LandscapeTransitionKind = LearningLandscape["transitions"][number]["kind"];
  type LandscapeGroupKind = LearningLandscapeLayoutGroup["kind"];
  type LandscapeGroupForm = {
    id: string | null;
    title: string;
    kind: LandscapeGroupKind;
    memberIds: string[];
  };

  const landscapeGroupKindLabels: Record<LandscapeGroupKind, string> = {
    phase: "Phase", room: "Raum", station: "Stationenbereich"
  };

  let spaces: PlanningSpace[] = [];
  let activeSpace: PlanningSpace | null = null;
  let cards: ThinkingCard[] = [];
  let messages: UiMessage[] = [];
  let findings: SensitiveFinding[] = [];
  let markdownApproval: ExportApproval | null = null;
  let okfApproval: ExportApproval | null = null;
  let serviceRequests: ServiceRequest[] = [];
  let serviceMessage = "";
  let workerMaterial: WorkerMaterial | null = null;
  let showWorkerMaterial = false;
  let expandedCard = "denkstand";
  let loading = true;
  let sending = false;
  let thinkingStatus = "";
  let error = "";
  let draftMessage = "";
  let activeFocus: PedagogicalFocus | null = null;
  let designNotes = "";
  let editingDesign = false;
  let savingDesign = false;
let messagesElement: HTMLDivElement | null = null;
  let composerElement: HTMLTextAreaElement | null = null;
  let roomOverview: import("$lib/api").RoomOverview | null = null;
  let statusDetailsOpen = false;
  let exportMenuOpen = false;
  let decisionToRecord = "";
  let decisionReason = "";
  let decisionModalOpen = false;
  let settingsOpen = false;
  let runtimeStatus = "Runtime-Status wird geprüft …";
  let workspaceElement: HTMLElement | null = null;
  let railCollapsed = true;
  let primaryWidth = 74;
  let newRoom = { title: "", subject: "", targetGroup: "", initialIdea: "" };
  let planningModal = false;
  let createRoomModal = false;
  let roomView: "conversation" | "landscape" | "timeline" | "board" | "materials" | "knowledge" = "conversation";
  let planningTab: "landscape" | "board" = "landscape";
  let landscapeMode: "canvas" | "linear" = "canvas";
  let learningLandscape: LearningLandscape | null = null;
  let planningBoard: PlanningBoard | null = null;
  let temporalPlan: TemporalPlan | null = null;
  let planningError = "";
  let planningLoading = false;
  let canvasNodes: Node[] = [];
  let canvasEdges: Edge[] = [];
  let landscapeLayout: Record<string, { x: number; y: number }> = {};
  let landscapeGroups: LearningLandscapeLayoutGroup[] = [];
  let landscapeViewport: LearningLandscapeViewport | undefined;
  let pendingConnection: Connection | null = null;
  let connectionKind: LandscapeTransitionKind = "required";
  let connectionRationale = "";
  let groupForm: LandscapeGroupForm | null = null;
  let draggedBoardItem: string | null = null;
  let materials: MaterialMetadata[] = [];
  let materialsLoading = false;
  let materialContents: Record<string, WorkerMaterial | null> = {};
  let materialContentLoading: Record<string, boolean> = {};
  let materialTargetSelection: Record<string, string> = {};
  let materialAssignmentBusy = "";
  let materialMessage = "";
  let expandedMaterialId = "";
  let roomAccessOpen = false;
  let pinnwandOpen = false;
  let messageFilter: "all" | "captured" | "decisions" | "work" = "all";
  let highlightedMessageId = "";
  let markerReturnMessageId = "";
  let markerMessageId = "";
  let markerKind: ConversationMarker["kind"] = "captured_note";
  let markerTarget = "thinking_state:denkstand";
  let markerLabel = "Gedanke aus dem Gespräch";
  let markerSaving = false;
  let soundsEnabled = false;
  let reducedMotion = false;
  const lastOpenedSpaceKey = "ptspace.last-opened-planning-space";
  const boardColumns: Array<{ id: PlanningBoardItem["column"]; label: string; hint: string }> = [
    { id: "clarify", label: "Noch klären", hint: "Entscheidungen und Recherche" },
    { id: "prepare", label: "Vorbereiten", hint: "Dramaturgie und Materialien" },
    { id: "review", label: "Zur Prüfung", hint: "Ergebnisse gemeinsam ansehen" },
    { id: "ready", label: "Bereit", hint: "fachlich freigegeben" }
  ];
  const canvasNodeTypes: NodeTypes = { learningMoment: LearningMomentNode, learningGroup: LearningGroupNode };


  onMount(async () => {
    soundsEnabled = localStorage.getItem("ptspace.sounds-enabled") === "true";
    reducedMotion = localStorage.getItem("ptspace.reduced-motion") === "true";
    await refreshSpaces();
    loading = false;
  });

  async function refreshSpaces() {
    try {
      spaces = await api.listPlanningSpaces();
      if (!activeSpace && spaces.length > 0) {
        const lastOpenedId = localStorage.getItem(lastOpenedSpaceKey);
        await openSpace(spaces.find((space) => space.id === lastOpenedId) ?? spaces[0]);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Die Planungsräume konnten noch nicht geladen werden.";
    }
  }

  async function createSpace() {
    error = "";
    if (newRoom.title.trim().length < 3) {
      error = "Bitte gib dem Planungsraum einen klaren Titel.";
      return;
    }
    const created = await api.createPlanningSpace(newRoom);
    spaces = [created, ...spaces];
    const initialIdea = newRoom.initialIdea;
    newRoom = { title: "", subject: "", targetGroup: "", initialIdea: "" };
    await openSpace(created);
    await scanText(initialIdea);
  }

  async function openSpace(space: PlanningSpace) {
    activeSpace = space;
    localStorage.setItem(lastOpenedSpaceKey, space.id);
    messages = [{ id: "welcome", author: "critical_friend", text: `Hallo, ich habe Zeit für dich. Woran möchtest du in "${space.title}" heute weiterdenken?` }];
    
    // Load messages from backend
    try {
      const result = await api.getMessages(space.id);
      if (result.messages.length > 0) {
        messages = result.messages;
      }
    } catch {
      // Ignore if messages can't be loaded, keep the welcome message
    }
    
    const state = await api.getThinkingState(space.id);
    const notes = await api.getDesignNotes(space.id);
    designNotes = notes.content;
    cards = state.cards;
    const exportStatus = await api.getExportStatus(space.id);
    markdownApproval = exportStatus.markdown;
    okfApproval = exportStatus.okfMarkdown;
    serviceRequests = (await api.getServiceRequests(space.id)).requests;
    const hasReviewedStudentInstruction = serviceRequests.some((item) => item.status === "reviewed");
    if (hasReviewedStudentInstruction) {
      try {
        workerMaterial = await api.getStudentInstruction(space.id);
      } catch {
        workerMaterial = null;
      }
    } else {
      workerMaterial = null;
    }
    showWorkerMaterial = false;
    serviceMessage = "";
    findings = [];
    roomOverview = await api.getRoomOverview(space.id);
    await scrollConversationToEnd("auto");
  }

  async function loadMaterials(spaceId: string) {
    materialsLoading = true;
    materialMessage = "";
    try {
      const result = await api.listMaterials(spaceId);
      materials = result.materials;
      materialTargetSelection = Object.fromEntries(result.materials.map((material) => [material.id, materialTargetSelection[material.id] ?? ""]));
    } catch (err) {
      materialMessage = err instanceof Error ? err.message : "Die Materialien konnten noch nicht geladen werden.";
    } finally {
      materialsLoading = false;
    }
  }

  function availableMaterialTargets() {
    return [
      ...(learningLandscape?.moments ?? []).map((moment) => ({ value: `learning_moment:${moment.id}`, label: `Lernmoment · ${moment.title}` })),
      ...(planningBoard?.items ?? []).filter((item) => item.status !== "discarded").map((item) => ({ value: `board_item:${item.id}`, label: `Arbeitsvorhaben · ${item.title}` }))
    ];
  }

  function materialRelationLabels(material: MaterialMetadata) {
    const labels = [
      ...material.relatedMoments.map((id) => `Lernmoment · ${momentTitle(id)}`),
      ...material.relatedBoardItems.map((id) => `Arbeitsvorhaben · ${boardTitle(id)}`),
      ...material.relatedWindows.map((id) => `Unterrichtsfenster · ${windowTitle(id)}`),
      ...material.relatedDecisions.map(() => "Begründete Entscheidung")
    ];
    return labels.length > 0 ? labels : ["Noch kein pädagogischer Bezug"];
  }

  function boardTitle(id: string) {
    return planningBoard?.items.find((item) => item.id === id)?.title ?? "Arbeitsvorhaben";
  }

  function materialKindLabel(kind: string) {
    const labels: Record<string, string> = {
      student_material: "Material für Lernende",
      teacher_notes: "Lehrkraftnotizen",
      worksheet: "Arbeitsblatt",
      source_overview: "Quellenübersicht",
      lesson_plan: "Stundenverlauf"
    };
    return labels[kind] ?? "Unterrichtsmaterial";
  }

  function materialStatusLabel(status: MaterialMetadata["status"]) {
    return { draft: "Entwurf", in_review: "Zur Prüfung", approved: "Geprüft", ready_for_class: "Für den Unterricht bereit", discarded: "Verworfen" }[status];
  }

  function materialDate(value: string | null) {
    if (!value) return "Noch nicht festgehalten";
    return new Date(value).toLocaleString("de-DE", { dateStyle: "medium" });
  }

  async function toggleMaterialContent(material: MaterialMetadata) {
    if (expandedMaterialId === material.id) {
      expandedMaterialId = "";
      return;
    }
    expandedMaterialId = material.id;
    if (materialContents[material.id] !== undefined) return;
    if (!activeSpace) return;
    materialContentLoading = { ...materialContentLoading, [material.id]: true };
    try {
      materialContents = { ...materialContents, [material.id]: await api.getMaterial(activeSpace.id, material.id) };
    } catch {
      materialContents = { ...materialContents, [material.id]: null };
      materialMessage = "Der Inhalt dieses Materials konnte noch nicht geöffnet werden.";
    } finally {
      materialContentLoading = { ...materialContentLoading, [material.id]: false };
    }
  }

  async function assignMaterialFromTab(material: MaterialMetadata) {
    if (!activeSpace || materialAssignmentBusy) return;
    const selection = materialTargetSelection[material.id] ?? "";
    const divider = selection.indexOf(":");
    if (divider < 1) {
      materialMessage = "Bitte wähle zuerst einen Lernmoment oder ein Arbeitsvorhaben aus.";
      return;
    }
    const targetType = selection.slice(0, divider) as "learning_moment" | "board_item";
    const targetId = selection.slice(divider + 1);
    materialAssignmentBusy = material.id;
    materialMessage = "";
    try {
      const result = await api.assignMaterial(activeSpace.id, material.id, { targetType, targetId });
      materials = materials.map((entry) => entry.id === material.id ? result.material : entry);
      learningLandscape = result.learningLandscape;
      planningBoard = result.planningBoard;
      makeCanvas();
      materialMessage = result.changed ? "Der pädagogische Bezug wurde gemeinsam gespeichert." : "Dieser Bezug besteht bereits.";
      roomOverview = await api.getRoomOverview(activeSpace.id);
      playFeedbackSound();
    } catch (err) {
      materialMessage = err instanceof Error ? err.message : "Die Materialzuordnung konnte nicht gespeichert werden.";
    } finally {
      materialAssignmentBusy = "";
    }
  }

  function markerKindLabel(kind: ConversationMarker["kind"]) {
    return { captured_note: "Festgehaltener Gedanke", open_decision: "Offene Entscheidung", work_started: "Vorbereitung gestartet", result_returned: "Ergebnis zurückgekehrt", ready_for_class: "Für den Unterricht bereit" }[kind];
  }

  function markerGlyph(kind: ConversationMarker["kind"]) {
    return { captured_note: "Zettel", open_decision: "Fragezeichen", work_started: "Werkbank", result_returned: "Ergebnis", ready_for_class: "Häkchen" }[kind];
  }

  function markerFilter(kind: ConversationMarker["kind"]) {
    if (kind === "captured_note") return "captured";
    if (kind === "open_decision") return "decisions";
    return "work";
  }

  function markersForMessage(messageId: string) {
    return roomOverview?.conversationMarkers.filter((marker) => marker.sourceMessageId === messageId) ?? [];
  }

  function messageMatchesFilter(message: UiMessage) {
    const markers = markersForMessage(message.id);
    if (messageFilter === "all") return true;
    return markers.some((marker) => markerFilter(marker.kind) === messageFilter);
  }

  function visibleMessages() {
    if (messageFilter === "all") return messages;
    const matches = messages.map((message, index) => messageMatchesFilter(message) ? index : -1).filter((index) => index >= 0);
    if (matches.length === 0) return [];
    const indexes = new Set(matches.flatMap((index) => [index - 1, index, index + 1]).filter((index) => index >= 0 && index < messages.length));
    return messages.filter((_message, index) => indexes.has(index));
  }

  function isContextMessage(message: UiMessage) {
    return messageFilter !== "all" && !messageMatchesFilter(message);
  }

  function formatMessageTime(message: UiMessage) {
    return message.createdAt ? new Date(message.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
  }

  function openMarkerComposer(message: UiMessage) {
    markerMessageId = message.id;
    markerKind = "captured_note";
    markerTarget = "thinking_state:denkstand";
    markerLabel = "Gedanke aus dem Gespräch";
  }

  function markerTargetsForKind(kind: ConversationMarker["kind"]) {
    if (kind === "captured_note") return [{ value: "thinking_state:denkstand", label: "Denkstand · gemeinsamer Gedanke" }];
    if (kind === "work_started") return [
      ...(planningBoard?.items ?? []).filter((item) => item.status !== "discarded").map((item) => ({ value: `board_item:${item.id}`, label: `Arbeitsvorhaben · ${item.title}` })),
      ...serviceRequests.map((request) => ({ value: `service_request:${request.id}`, label: "Vorbereitung im Hintergrund" }))
    ];
    if (kind === "result_returned" || kind === "ready_for_class") return materials.map((material) => ({ value: `material:${material.id}`, label: `Material · ${material.title}` }));
    return [];
  }

  function updateMarkerKind(kind: ConversationMarker["kind"]) {
    markerKind = kind;
    markerTarget = markerTargetsForKind(kind)[0]?.value ?? "";
    markerLabel = markerKindLabel(kind);
  }

  function handleMarkerKindChange(event: Event) {
    updateMarkerKind((event.currentTarget as HTMLSelectElement).value as ConversationMarker["kind"]);
  }

  async function saveConversationMarker() {
    if (!activeSpace || !markerMessageId || markerSaving) return;
    const divider = markerTarget.indexOf(":");
    if (divider < 1) return;
    markerSaving = true;
    try {
      const result = await api.createConversationMarker(activeSpace.id, {
        sourceMessageId: markerMessageId,
        kind: markerKind,
        targetType: markerTarget.slice(0, divider) as ConversationMarker["targetType"],
        targetId: markerTarget.slice(divider + 1),
        label: markerLabel.trim() || markerKindLabel(markerKind)
      });
      roomOverview = roomOverview ? { ...roomOverview, conversationMarkers: [...roomOverview.conversationMarkers, result.marker] } : await api.getRoomOverview(activeSpace.id);
      markerMessageId = "";
      serviceMessage = "Der Bezug ist im Gespräch festgehalten.";
      playFeedbackSound();
    } catch (err) {
      error = err instanceof Error ? err.message : "Der Gesprächsbezug konnte nicht gespeichert werden.";
    } finally {
      markerSaving = false;
    }
  }

  async function openMarkerTarget(marker: ConversationMarker) {
    markerReturnMessageId = marker.sourceMessageId;
    highlightedMessageId = marker.sourceMessageId;
    pinnwandOpen = marker.targetType === "thinking_state";
    if (marker.targetType === "board_item") {
      await selectPerspective("board");
      boardDetail = planningBoard?.items.find((item) => item.id === marker.targetId) ?? null;
    } else if (marker.targetType === "material") {
      await selectPerspective("materials");
      expandedMaterialId = marker.targetId;
    } else if (marker.targetType === "service_request") {
      statusDetailsOpen = true;
      roomAccessOpen = false;
    } else {
      roomView = "conversation";
    }
  }

  async function returnToConversation() {
    roomView = "conversation";
    roomAccessOpen = false;
    await tick();
    const target = Array.from(messagesElement?.querySelectorAll<HTMLElement>("[data-message-id]") ?? []).find((element) => element.dataset.messageId === markerReturnMessageId);
    target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    highlightedMessageId = markerReturnMessageId;
    markerReturnMessageId = "";
  }

  function playFeedbackSound() {
    if (!soundsEnabled || typeof window === "undefined") return;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 520;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {
      // Sound remains optional; the visible status is authoritative.
    }
  }

  function backgroundStatusLabel() {
    if (sending) return "Critical Friend antwortet";
    const activeRequest = serviceRequests.find((request) => request.status === "in_progress" || request.status === "approved" || request.status === "proposed");
    if (activeRequest) return "Eine Vorbereitung läuft im Hintergrund";
    if (serviceMessage) return serviceMessage;
    return "Gespräch bereit";
  }

  function serviceRequestTeacherLabel(request: ServiceRequest) {
    if (request.status === "in_progress" || request.status === "approved") return "wird vorbereitet";
    if (request.status === "returned") return "Ergebnis liegt zur Prüfung vor";
    if (request.status === "reviewed") return "fachlich geprüft";
    if (request.status === "failed") return "braucht noch Aufmerksamkeit";
    return "vorgemerkt";
  }

  function markerTargetDisplay(marker: ConversationMarker) {
    if (marker.targetType === "board_item") return boardTitle(marker.targetId);
    if (marker.targetType === "material") return materials.find((material) => material.id === marker.targetId)?.title ?? "Material";
    return marker.label;
  }
  function chooseRoomView(view: "conversation" | "landscape" | "timeline" | "board" | "materials" | "knowledge") {
    roomAccessOpen = false;
    if (view === "conversation") {
      pinnwandOpen = false;
      roomView = "conversation";
      return;
    }
    void selectPerspective(view);
  }
  async function scrollConversationToEnd(behavior: ScrollBehavior = "smooth") {
    await tick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    messagesElement?.scrollTo({ top: messagesElement.scrollHeight, behavior });
  }

async function sendMessage() {
    if (!activeSpace || !draftMessage.trim() || sending) return;
    const text = draftMessage.trim();
    draftMessage = "";
    sending = true;
    thinkingStatus = "Ich bereite den Kontext vor …";
    error = "";
    messages = [...messages, { id: uuid(), author: "teacher", text }];
    await scrollConversationToEnd();
    try {
      await scanText(text);
      let streamError = "";
      await api.sendMessageStream(
        activeSpace.id,
        text,
        {
          onStatus: (status) => {
            thinkingStatus = thinkingStatusLabel(status);
          },
          onComplete: (reply) => {
            messages = [...messages, { id: reply.id, author: "critical_friend", text: reply.text }];
          },
          onError: (message) => {
            streamError = message;
          }
        },
        activeFocus ?? undefined
      );
      if (streamError) throw new Error(streamError);
      await scrollConversationToEnd();
      const state = await api.getThinkingState(activeSpace.id);
      cards = state.cards;
      roomOverview = await api.getRoomOverview(activeSpace.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Die Antwort konnte noch nicht vorbereitet werden.";
    } finally {
      sending = false;
      thinkingStatus = "";
    }
  }

  function thinkingStatusLabel(status: string): string {
    if (status === "preparing_context") return "Ich bereite den Kontext vor …";
    if (status === "thinking") return "Ich denke kurz mit …";
    if (status === "saving_state") return "Ich sichere den Denkstand …";
    return "Ich denke kurz mit …";
  }

  async function scanText(text: string) {
    if (!text.trim()) return;
    const result = await api.scanSensitiveContent(text);
    findings = result.findings;
  }

  async function approve(exportType: "markdown" | "okf_markdown") {
    if (!activeSpace) return;
    const approval = await api.approveExport(activeSpace.id, exportType, findings.length > 0);
    if (exportType === "markdown") markdownApproval = approval;
    else okfApproval = approval;
  }

  async function proposeStudentInstruction() {
    if (!activeSpace) return;
    error = "";
    try {
      const result = await api.proposeStudentInstruction(activeSpace.id);
      serviceRequests = [...serviceRequests, result.serviceRequest];
      serviceMessage = "Der Schritt ist vorgemerkt. Erst deine Zustimmung startet die Vorbereitung.";
    } catch (err) {
      error = err instanceof Error ? err.message : "Der nächste Schritt konnte noch nicht vorgemerkt werden.";
    }
  }

  async function approveServiceRequest(serviceRequest: ServiceRequest) {
    if (!activeSpace) return;
    error = "";
    try {
      const result = await api.approveServiceRequest(activeSpace.id, serviceRequest.id);
      serviceRequests = serviceRequests.map((item) => item.id === result.serviceRequest.id ? result.serviceRequest : item);
      workerMaterial = result.material;
      serviceMessage = result.teacherFacingMessage;
    } catch (err) {
      error = err instanceof Error ? err.message : "Der Entwurf konnte noch nicht vorbereitet werden.";
    }
  }

  function makeCanvas() {
    if (!learningLandscape) return;
    const groupNodes: Node[] = landscapeGroups.map((group) => ({
      id: group.id,
      type: "learningGroup",
      position: { x: group.x, y: group.y },
      data: { title: group.title, kind: group.kind, kindLabel: landscapeGroupKindLabels[group.kind], memberCount: group.memberIds.length },
      style: `width: ${group.width}px; height: ${group.height}px;`,
      selectable: false,
      draggable: false,
      focusable: false,
      zIndex: -1
    }));
    const momentNodes: Node[] = learningLandscape.moments.map((moment, index) => ({
      id: moment.id,
      type: "learningMoment",
      position: landscapeLayout[moment.id] ?? { x: 80 + (index % 3) * 280, y: 70 + Math.floor(index / 3) * 180 },
      data: {
        title: moment.title,
        kind: moment.kind,
        kindLabel: momentKindLabels[moment.kind] ?? moment.kind,
        didacticPurpose: moment.didacticPurpose,
        learningActivity: moment.learningActivity,
        expectedExperience: moment.expectedExperience,
        statusLabel: momentStatusLabels[moment.status] ?? moment.status
      }
    }));
    canvasNodes = [...groupNodes, ...momentNodes];
    canvasEdges = learningLandscape.transitions.map((transition) => ({
      id: transition.id,
      source: transition.from,
      target: transition.to,
      type: "smoothstep",
      label: transitionKindLabels[transition.kind] ?? transition.kind,
      animated: transition.kind === "choice"
    }));
  }

  async function saveLandscapeLayout() {
    if (!activeSpace) return;
    const nodes = canvasNodes.filter((node) => node.type === "learningMoment").map((node) => ({ id: node.id, x: node.position.x, y: node.position.y }));
    const groupNodes = new Map(canvasNodes.filter((node) => node.type === "learningGroup").map((node) => [node.id, node]));
    const groups = landscapeGroups.map((group) => {
      const node = groupNodes.get(group.id);
      return node ? { ...group, x: node.position.x, y: node.position.y } : group;
    });
    landscapeLayout = Object.fromEntries(nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
    landscapeGroups = groups;
    const layout = { nodes, groups, ...(landscapeViewport ? { viewport: landscapeViewport } : {}) };
    try {
      const saved = await api.saveLearningLandscapeLayout(activeSpace.id, layout);
      landscapeGroups = saved.groups ?? [];
      landscapeViewport = saved.viewport;
    } catch (err) { error = err instanceof Error ? err.message : "Die Ansicht konnte noch nicht gespeichert werden."; }
  }

  function applyLandscapeLayout(layout: LearningLandscapeLayout) {
    landscapeLayout = Object.fromEntries(layout.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
    landscapeGroups = layout.groups ?? [];
    landscapeViewport = layout.viewport;
  }

  async function saveLandscapeViewport(_event: unknown, viewport: LearningLandscapeViewport) {
    landscapeViewport = viewport;
    await saveLandscapeLayout();
  }

  function defaultMomentPosition(index: number) {
    return { x: 80 + (index % 3) * 280, y: 70 + Math.floor(index / 3) * 180 };
  }

  async function resetLandscapeLayout() {
    if (!learningLandscape) return;
    landscapeLayout = Object.fromEntries(learningLandscape.moments.map((moment, index) => [moment.id, defaultMomentPosition(index)]));
    landscapeGroups = landscapeGroups.map((group, index) => ({ ...group, x: 30 + (index % 2) * 520, y: 25 + Math.floor(index / 2) * 300 }));
    landscapeViewport = undefined;
    makeCanvas();
    await saveLandscapeLayout();
  }

  async function openPlanning() {
    if (!activeSpace) return;
    roomView = "conversation";
    planningLoading = true;
    planningError = "";
    try {
      const [artifacts, layout, plan] = await Promise.all([api.getPlanningArtifacts(activeSpace.id), api.getLearningLandscapeLayout(activeSpace.id), api.getTemporalPlan(activeSpace.id)]);
      learningLandscape = artifacts.learningLandscape;
      planningBoard = artifacts.planningBoard;
      applyLandscapeLayout(layout);
      temporalPlan = plan;
      makeCanvas();
      planningModal = true;
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Die Lernlandschaft konnte noch nicht geöffnet werden.";
      planningModal = true;
    } finally {
      planningLoading = false;
    }
  }

  async function moveBoardItem(column: PlanningBoardItem["column"]) {
    if (!activeSpace || !planningBoard || !draggedBoardItem) return;
    planningBoard = {
      ...planningBoard,
      items: planningBoard.items.map((item) => item.id === draggedBoardItem
        ? column === "ready" ? { ...item, column: "review", status: "review" } : { ...item, column, status: item.status }
        : item)
    };
    const moving = draggedBoardItem;
    draggedBoardItem = null;
    try {
      await api.savePlanningArtifacts(activeSpace.id, { planningBoard });
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Die Karte konnte nicht verschoben werden.";
      draggedBoardItem = moving;
    }
  }

  function markdownToHtml(markdown: string): string {
    return markdown.split("\n").map((line) => line.startsWith("## ") ? `<h2>${line.slice(3)}</h2>` : line.startsWith("# ") ? `<h1>${line.slice(2)}</h1>` : line.startsWith("- ") ? `<li>${line.slice(2)}</li>` : line ? `<p>${line}</p>` : "").join("").replace(/(<li>.*?<\/li>)+/g, (items) => `<ul>${items}</ul>`);
  }
  function htmlToMarkdown(html: string): string {
    const document = new DOMParser().parseFromString(html, "text/html");
    return Array.from(document.body.children).map((node) => node.tagName === "H1" ? `# ${node.textContent}` : node.tagName === "H2" ? `## ${node.textContent}` : node.tagName === "UL" ? Array.from(node.querySelectorAll("li")).map((item) => `- ${item.textContent}`).join("\n") : node.textContent?.trim() || "").filter(Boolean).join("\n");
  }
  function tiptap(node: HTMLElement) {
    const editor = new Editor({ element: node, extensions: [StarterKit], content: markdownToHtml(designNotes), onUpdate: ({ editor: nextEditor }) => { designNotes = htmlToMarkdown(nextEditor.getHTML()); } });
    return { destroy: () => editor.destroy() };
  }
  function startResize(event: PointerEvent) {
    const bounds = workspaceElement?.getBoundingClientRect();
    if (!bounds) return;
    const move = (moveEvent: PointerEvent) => { primaryWidth = Math.min(82, Math.max(60, ((moveEvent.clientX - bounds.left) / bounds.width) * 100)); };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop);
  }
  async function saveDesignNotes() {
    if (!activeSpace || savingDesign) return;
    savingDesign = true;
    try { const result = await api.saveDesignNotes(activeSpace.id, designNotes); designNotes = result.content; editingDesign = false; cards = (await api.getThinkingState(activeSpace.id)).cards; }
    catch (err) { error = err instanceof Error ? err.message : "Der Denkstand konnte nicht gespeichert werden."; }
    finally { savingDesign = false; }
  }

  async function selectPerspective(view: "conversation" | "landscape" | "timeline" | "board" | "materials" | "knowledge") {
    roomView = view;
    if (view === "conversation" || !activeSpace) return;
    planningLoading = true; planningError = "";
    try { const [artifacts, layout, plan] = await Promise.all([api.getPlanningArtifacts(activeSpace.id), api.getLearningLandscapeLayout(activeSpace.id), api.getTemporalPlan(activeSpace.id)]); applyLandscapeLayout(layout); learningLandscape = artifacts.learningLandscape; planningBoard = artifacts.planningBoard; temporalPlan = plan; makeCanvas(); if (view === "materials") await loadMaterials(activeSpace.id); }
    catch (err) { planningError = err instanceof Error ? err.message : "Die Planung konnte nicht geladen werden."; }
    finally { planningLoading = false; }
  }
  async function focusConversation(prompt: string, focus?: PedagogicalFocus) {
    if (focus) activeFocus = focus;
    draftMessage = prompt;
    await tick();
    composerElement?.focus();
  }
  async function saveDecision() {
    if (!activeSpace || decisionToRecord.trim().length < 3 || decisionReason.trim().length < 3) return;
    try {
      await api.recordDecision(activeSpace.id, decisionToRecord, decisionReason);
      decisionModalOpen = false;
      await focusConversation(`Wir haben festgehalten: ${decisionToRecord.trim()} (Begründung: ${decisionReason.trim()}). Lass uns prüfen, was daraus als Nächstes folgt.`);
      cards = (await api.getThinkingState(activeSpace.id)).cards;
      roomOverview = await api.getRoomOverview(activeSpace.id);
    } catch (err) { error = err instanceof Error ? err.message : "Die Entscheidung konnte nicht festgehalten werden."; }
  }
  function decisionParts(item: string) {
    const cleaned = item.replace(/\*\*/g, "").replace(/^Offen:\s*/i, "").trim();
    const divider = cleaned.indexOf(":");
    if (divider > 0 && divider < 24) return { category: cleaned.slice(0, divider), question: cleaned.slice(divider + 1).trim() };
    return { category: "Offen", question: cleaned };
  }
  function openDecisionDialog(item: string) {
    decisionToRecord = item.replace(/^Offen:\s*/i, "");
    decisionReason = "";
    decisionModalOpen = true;
  }
  function handleComposerKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  // --- Phase 5 & 6: Lernlandschaft, Materialbedarf und Planungsboard ---
  const momentKindLabels: Record<string, string> = {
    impulse: "Impuls", learning_place: "Lernort", positioning: "Positionierung",
    inquiry: "Erkundung", choice: "Wahlphase", practice: "Übung", project: "Projektphase",
    product: "Produkt", reflection: "Reflexion", assessment: "Leistungsrückmeldung", other: "Anderes"
  };
  const momentStatusLabels: Record<string, string> = {
    draft: "Entwurf", in_progress: "In Arbeit", ready: "Bereit", needs_revision: "Zu überarbeiten"
  };
  const transitionKindLabels: Record<string, string> = {
    required: "Gemeinsamer Weg", choice: "Wahl", parallel: "Parallel", return: "Rückkehr",
    meeting_point: "Treffpunkt", prerequisite: "Voraussetzung"
  };
  const boardKindLabels: Record<string, string> = {
    clarify: "Klären", research: "Recherchieren", design: "Gestalten", produce: "Erstellen",
    review: "Prüfen", render: "Aufbereiten", export: "Bereitstellen"
  };
  const boardStatusLabels: Record<string, string> = {
    proposed: "Vorgeschlagen", approved: "Angenommen", in_progress: "In Arbeit",
    review: "Zur Prüfung", ready: "Freigegeben", blocked: "Blockiert", discarded: "Verworfen"
  };

  let momentDetail: LearningMoment | null = null;
  let momentEditing = false;
  let momentDraft: LearningMoment | null = null;
  let momentNeedInput = "";
  let addMomentOpen = false;
  let newMomentForm: { kind: string; title: string; didacticPurpose: string; learningActivity: string; expectedExperience: string } = { kind: "impulse", title: "", didacticPurpose: "", learningActivity: "", expectedExperience: "" };
  let transitionDetail: LearningLandscape["transitions"][number] | null = null;
  let transitionEditing = false;
  let transitionDraft: LearningLandscape["transitions"][number] | null = null;
  let boardDetail: PlanningBoardItem | null = null;
  let boardProposal: { title: string; kind: PlanningBoardItem["kind"]; momentId: string; windowId: string; expectedResult: string; materialNeed: string } | null = null;
  function handleCanvasConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const exists = learningLandscape?.transitions.some((transition) => transition.from === connection.source && transition.to === connection.target);
    if (exists) {
      planningError = "Diese Verbindung ist bereits vorhanden.";
      return;
    }
    pendingConnection = connection;
    connectionKind = "required";
    connectionRationale = "";
  }

  function closeConnectionForm() {
    pendingConnection = null;
    connectionRationale = "";
  }

  async function confirmCanvasConnection() {
    if (!learningLandscape || !pendingConnection) return;
    const { source, target } = pendingConnection;
    learningLandscape = {
      ...learningLandscape,
      transitions: [...learningLandscape.transitions, {
        id: `tr-${uuid().slice(0, 8)}`,
        from: source,
        to: target,
        kind: connectionKind,
        rationale: connectionRationale.trim()
      }]
    };
    closeConnectionForm();
    await persistLandscape();
  }

  function openGroupForm(group?: LearningLandscapeLayoutGroup) {
    groupForm = group
      ? { id: group.id, title: group.title, kind: group.kind, memberIds: [...group.memberIds] }
      : { id: null, title: "", kind: "phase", memberIds: [] };
  }

  function toggleGroupMember(momentId: string) {
    if (!groupForm) return;
    groupForm = {
      ...groupForm,
      memberIds: groupForm.memberIds.includes(momentId)
        ? groupForm.memberIds.filter((id) => id !== momentId)
        : [...groupForm.memberIds, momentId]
    };
  }

  async function saveGroupForm() {
    if (!groupForm || groupForm.title.trim().length < 2) return;
    const existing = groupForm.id ? landscapeGroups.find((group) => group.id === groupForm?.id) : undefined;
    const group: LearningLandscapeLayoutGroup = {
      id: groupForm.id ?? `group-${uuid().slice(0, 8)}`,
      title: groupForm.title.trim(),
      kind: groupForm.kind,
      x: existing?.x ?? 30 + (landscapeGroups.length % 2) * 520,
      y: existing?.y ?? 25 + Math.floor(landscapeGroups.length / 2) * 300,
      width: existing?.width ?? 450,
      height: existing?.height ?? 250,
      memberIds: [...groupForm.memberIds]
    };
    landscapeGroups = existing
      ? landscapeGroups.map((entry) => entry.id === group.id ? group : entry)
      : [...landscapeGroups, group];
    groupForm = null;
    makeCanvas();
    await saveLandscapeLayout();
  }

  async function removeGroupForm() {
    if (!groupForm?.id) return;
    landscapeGroups = landscapeGroups.filter((group) => group.id !== groupForm?.id);
    groupForm = null;
    makeCanvas();
    await saveLandscapeLayout();
  }

  function linearMoments(): LearningMoment[] {
    if (!learningLandscape) return [];
    const outgoing = new Map<string, string[]>();
    const incoming = new Set<string>();
    for (const transition of learningLandscape.transitions) {
      outgoing.set(transition.from, [...(outgoing.get(transition.from) ?? []), transition.to]);
      incoming.add(transition.to);
    }
    const byId = new Map(learningLandscape.moments.map((moment) => [moment.id, moment]));
    const result: LearningMoment[] = [];
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visited.has(id)) return;
      const moment = byId.get(id);
      if (!moment) return;
      visited.add(id);
      result.push(moment);
      for (const nextId of outgoing.get(id) ?? []) visit(nextId);
    };
    learningLandscape.moments.filter((moment) => !incoming.has(moment.id)).forEach((moment) => visit(moment.id));
    learningLandscape.moments.forEach((moment) => visit(moment.id));
    return result;
  }

  function transitionsFrom(momentId: string) {
    return learningLandscape?.transitions.filter((transition) => transition.from === momentId) ?? [];
  }
  function handleCanvasNodeClick(node: Node) {
    if (node.type === "learningMoment") openMomentDetail(node.id);
    else openGroupForm(landscapeGroups.find((group) => group.id === node.id));
  }


  function momentTitle(id: string): string {
    return learningLandscape?.moments.find((moment) => moment.id === id)?.title ?? id;
  }
  function windowTitle(id: string): string {
    return temporalPlan?.windows.find((window) => window.id === id)?.title ?? id;
  }
  function placementsFor(momentId: string): TimePlacement[] {
    return temporalPlan?.placements.filter((placement) => placement.momentId === momentId) ?? [];
  }

  async function persistLandscape() {
    if (!activeSpace || !learningLandscape) return;
    planningError = "";
    try {
      const result = await api.savePlanningArtifacts(activeSpace.id, { learningLandscape });
      if (result.learningLandscape) learningLandscape = result.learningLandscape;
      makeCanvas();
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Die Lernlandschaft konnte nicht gespeichert werden.";
    }
  }
  async function ensurePlanningBoard() {
    if (planningBoard || !activeSpace) return;
    planningBoard = (await api.getPlanningArtifacts(activeSpace.id)).planningBoard;
  }
  async function persistBoard() {
    if (!activeSpace || !planningBoard) return;
    planningError = "";
    try {
      const result = await api.savePlanningArtifacts(activeSpace.id, { planningBoard });
      if (result.planningBoard) planningBoard = result.planningBoard;
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Das Planungsboard konnte nicht gespeichert werden.";
    }
  }

  // T-500: Lernmoment-Detailansicht. Änderungen werden erst nach Speichern kanonisch.
  function openMomentDetail(id: string) {
    momentDetail = learningLandscape?.moments.find((moment) => moment.id === id) ?? null;
    momentEditing = false;
    momentDraft = null;
    momentNeedInput = "";
  }
  function closeMomentDetail() { momentDetail = null; momentEditing = false; momentDraft = null; }
  function startEditMoment() {
    if (!momentDetail) return;
    momentDraft = { ...momentDetail, materialNeeds: [...momentDetail.materialNeeds], materialIds: [...momentDetail.materialIds], openQuestions: [...momentDetail.openQuestions] };
    momentEditing = true;
  }
  async function saveMoment() {
    if (!learningLandscape || !momentDraft) return;
    const draft = momentDraft;
    learningLandscape = { ...learningLandscape, moments: learningLandscape.moments.map((moment) => moment.id === draft.id ? draft : moment) };
    momentDetail = draft;
    momentEditing = false;
    momentDraft = null;
    await persistLandscape();
  }
  // T-600: Materialbedarf im Entwurf pflegen.
  function addMaterialNeedToDraft() {
    if (!momentDraft || !momentNeedInput.trim()) return;
    momentDraft = { ...momentDraft, materialNeeds: [...momentDraft.materialNeeds, momentNeedInput.trim()] };
    momentNeedInput = "";
  }
  function removeMaterialNeedFromDraft(index: number) {
    if (!momentDraft) return;
    momentDraft = { ...momentDraft, materialNeeds: momentDraft.materialNeeds.filter((_, position) => position !== index) };
  }

  // T-501: Lernmoment hinzufügen. Node wird erst nach bewusster Bestätigung gespeichert.
  function openAddMoment() {
    newMomentForm = { kind: "impulse", title: "", didacticPurpose: "", learningActivity: "", expectedExperience: "" };
    addMomentOpen = true;
  }
  async function confirmAddMoment() {
    if (!learningLandscape || newMomentForm.title.trim().length < 2) return;
    const id = `lm-${uuid().slice(0, 8)}`;
    const moment: LearningMoment = {
      id, title: newMomentForm.title.trim(), kind: newMomentForm.kind,
      didacticPurpose: newMomentForm.didacticPurpose.trim(), learningActivity: newMomentForm.learningActivity.trim(),
      expectedExperience: newMomentForm.expectedExperience.trim(), materialNeeds: [], materialIds: [], openQuestions: [], status: "draft"
    };
    learningLandscape = { ...learningLandscape, moments: [...learningLandscape.moments, moment] };
    addMomentOpen = false;
    await persistLandscape();
    openMomentDetail(id);
  }
  function developMomentWithCriticalFriend() {
    addMomentOpen = false;
    focusConversation("Ich möchte mit dir gemeinsam einen neuen Lernmoment entwickeln. Mein Ausgangsgedanke: ");
  }

  // T-502: Übergangs-Detailansicht.
  function openTransitionDetail(id: string) {
    transitionDetail = learningLandscape?.transitions.find((transition) => transition.id === id) ?? null;
    transitionEditing = false;
    transitionDraft = null;
  }
  function startEditTransition() {
    if (!transitionDetail) return;
    transitionDraft = { ...transitionDetail };
    transitionEditing = true;
  }
  async function saveTransition() {
    if (!learningLandscape || !transitionDraft) return;
    const draft = transitionDraft;
    learningLandscape = { ...learningLandscape, transitions: learningLandscape.transitions.map((transition) => transition.id === draft.id ? draft : transition) };
    transitionDetail = draft;
    transitionEditing = false;
    transitionDraft = null;
    await persistLandscape();
  }
  async function removeTransition() {
    if (!learningLandscape || !transitionDetail) return;
    const removeId = transitionDetail.id;
    learningLandscape = { ...learningLandscape, transitions: learningLandscape.transitions.filter((transition) => transition.id !== removeId) };
    transitionDetail = null;
    await persistLandscape();
  }
  function checkTransitionWithCriticalFriend() {
    if (!transitionDetail) return;
    const transition = transitionDetail;
    const from = momentTitle(transition.from), to = momentTitle(transition.to);
    transitionDetail = null;
    focusConversation(`Lass uns den Übergang von „${from}“ zu „${to}“ gemeinsam prüfen: `, { kind: "transition", id: transition.id, label: `${from} → ${to}` });
  }
  function proposeMissingMoment() {
    if (!transitionDetail) return;
    const from = momentTitle(transitionDetail.from), to = momentTitle(transitionDetail.to);
    transitionDetail = null;
    focusConversation(`Zwischen „${from}“ und „${to}“ fehlt vielleicht ein Lernmoment. Welcher Zwischenschritt wäre sinnvoll? `);
  }

  // T-601: Board-Vorschlag aus Materialbedarf. Erst Zustimmung schreibt die Karte kanonisch.
  function openBoardProposal(momentId: string, need: string) {
    boardProposal = { title: need, kind: "produce", momentId, windowId: "", expectedResult: "", materialNeed: need };
  }
  async function confirmBoardProposal() {
    if (!boardProposal || boardProposal.title.trim().length < 2) return;
    await ensurePlanningBoard();
    if (!planningBoard) return;
    const proposal = boardProposal;
    const item: PlanningBoardItem = {
      id: `pb-${uuid().slice(0, 8)}`,
      title: proposal.title.trim(),
      kind: proposal.kind,
      column: "clarify",
      status: "proposed",
      relatedNodes: proposal.momentId ? [proposal.momentId] : [],
      relatedWindows: proposal.windowId ? [proposal.windowId] : [],
      materialIds: [],
      materialNeed: proposal.materialNeed,
      expectedResult: proposal.expectedResult.trim(),
      requiresTeacherApproval: true,
      serviceRequestId: "",
      reviewedAt: "",
      reviewedBy: ""
    };
    planningBoard = { ...planningBoard, items: [...planningBoard.items, item] };
    boardProposal = null;
    await persistBoard();
  }

  // T-602: Board-Karten-Detailansicht. Aktionen sind ausdrücklich, Drag-and-drop startet nichts.
  async function updateBoardItem(id: string, patch: Partial<PlanningBoardItem>) {
    if (!planningBoard) return;
    planningBoard = { ...planningBoard, items: planningBoard.items.map((item) => item.id === id ? { ...item, ...patch } : item) };
    boardDetail = planningBoard.items.find((item) => item.id === id) ?? null;
    await persistBoard();
  }
  function clarifyBoardItem(item: PlanningBoardItem) {
    boardDetail = null;
    focusConversation(`Zum Arbeitsvorhaben „${item.title}“ weiterdenken: `, { kind: "planning_item", id: item.id, label: item.title });
  }
  // T-900/T-901: „Entwurf beauftragen" bindet einen Worker-Auftrag ausdrücklich an
  // die Karte und mindestens einen Lernmoment. Das Ergebnis wird zurückgeführt.
  async function commissionBoardDraft(item: PlanningBoardItem) {
    if (!activeSpace || !planningBoard) return;
    if (item.relatedNodes.length === 0) {
      planningError = "Bitte verknüpfe zuerst einen Lernmoment mit diesem Arbeitsvorhaben, bevor ein Entwurf beauftragt wird.";
      boardDetail = null;
      return;
    }
    boardDetail = null;
    planningError = "";
    try {
      const proposed = await api.proposeBoardMaterial(activeSpace.id, { boardItemId: item.id, title: item.title, relatedMoments: item.relatedNodes, expectedResult: item.expectedResult });
      const run = await api.approveServiceRequest(activeSpace.id, proposed.serviceRequest.id);
      workerMaterial = run.material;
      serviceMessage = run.teacherFacingMessage;
      serviceRequests = [...serviceRequests, proposed.serviceRequest];
      const materialId = run.material.location ?? proposed.serviceRequest.id;
      planningBoard = { ...planningBoard, items: planningBoard.items.map((entry) => entry.id === item.id ? { ...entry, column: "review", status: "review", serviceRequestId: proposed.serviceRequest.id, materialIds: Array.from(new Set([...entry.materialIds, materialId])) } : entry) };
      await persistBoard();
      if (learningLandscape) {
        learningLandscape = { ...learningLandscape, moments: learningLandscape.moments.map((moment) => item.relatedNodes.includes(moment.id) ? { ...moment, materialIds: Array.from(new Set([...moment.materialIds, materialId])) } : moment) };
        await persistLandscape();
      }
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Der Entwurf konnte nicht beauftragt werden.";
    }
  }
  async function reviewBoardDraft(item: PlanningBoardItem) {
    await startBoardReview(item);
  }
  // T-902: fachliche Freigabe erfordert sichtbare Prüfung, eine bestätigende Aktion,
  // einen dokumentierten Zeitpunkt und die prüfende Rolle. Kein Drag-and-drop ersetzt das.
  let reviewBoardItem: PlanningBoardItem | null = null;
  let reviewBoardMaterial: WorkerMaterial | null = null;
  let approvalConfirm: PlanningBoardItem | null = null;
  let approvalReviewed = false;
  async function startBoardReview(item: PlanningBoardItem) {
    if (!activeSpace) return;
    boardDetail = null;
    planningError = "";
    try {
      // Falls workerMaterial bereits geladen ist und zum gleichen Item gehört, verwende das
      if (workerMaterial && workerMaterial.boardItemId === item.id) {
        reviewBoardItem = item;
        reviewBoardMaterial = workerMaterial;
        return;
      }
      
      // Versuche, das Material mit verschiedenen IDs zu laden
      let material: WorkerMaterial | null = null;
      const idsToTry = [
        ...(item.materialIds ?? []), // Zuerst gespeicherte Material-IDs versuchen
        item.id,                       // Dann die Board-Item-ID selbst
        `pb-${item.id}`                // Mit pb- Prefix
      ];
      
      for (const materialId of idsToTry) {
        if (!materialId) continue;
        try {
          let cleanId = materialId;
          // Normalisiere die ID: Extrahiere nur den Dateinamen ohne Pfad und Erweiterung
          if (cleanId.includes("/")) {
            cleanId = cleanId.split("/").pop() ?? cleanId;
          }
          if (cleanId.endsWith(".md")) {
            cleanId = cleanId.slice(0, -3);
          }
          console.log(`Trying to load material with ID: ${cleanId}`);
          material = await api.getMaterial(activeSpace.id, cleanId);
          console.log(`Successfully loaded material: ${cleanId}`);
          break;
        } catch (loadErr) {
          console.log(`Failed to load material ${materialId}: ${loadErr}`);
          continue;
        }
      }
      
      if (!material) {
        planningError = "Für dieses Arbeitsvorhaben wurde noch kein Entwurf beauftragt. Klick auf 'Entwurf beauftragen', um einen Entwurf zu generieren.";
        return;
      }
      
      reviewBoardItem = item;
      reviewBoardMaterial = material;
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Der Entwurf konnte nicht geöffnet werden.";
    }
  }
  async function confirmBoardReview() {
    if (!reviewBoardItem) return;
    reviewBoardItem = null;
    reviewBoardMaterial = null;
    // Nach der Prüfung kann der Nutzer auf "Freigeben" klicken
    // Das Element bleibt in "Zur Prüfung"
  }
  function requestBoardApproval(item: PlanningBoardItem) {
    approvalConfirm = item;
    approvalReviewed = false;
    boardDetail = null;
  }
  async function confirmBoardApproval() {
    if (!approvalConfirm || !approvalReviewed) return;
    const item = approvalConfirm;
    approvalConfirm = null;
    approvalReviewed = false;
    await updateBoardItem(item.id, { column: "ready", status: "ready", reviewedAt: new Date().toISOString(), reviewedBy: "Lehrkraft" });
  }
  async function discardBoardItem(item: PlanningBoardItem) {
    await updateBoardItem(item.id, { status: "discarded" });
    boardDetail = null;
  }

  // --- Phase 7: Zeit & Dramaturgie. Ausschließlich temporal-plan.yml ist Quelle. ---
  const windowKindLabels: Record<string, string> = {
    lesson: "Unterrichtsstunde", double_lesson: "Doppelstunde", project_block: "Projektblock", open_learning_time: "Offene Lernzeit"
  };
  const windowKindDurations: Record<TeachingWindow["kind"], number> = {
    lesson: 45, double_lesson: 90, project_block: 180, open_learning_time: 120
  };
  const dramaturgicalRoleLabels: Record<string, string> = {
    opening: "Einstieg", irritation: "Irritation", exploration: "Erkundung", deepening: "Vertiefung",
    practice: "Übung", decision: "Entscheidung", consolidation: "Sicherung", reflection: "Reflexion",
    closing: "Abschluss", transition: "Übergang", buffer: "Puffer", other: "Anderes"
  };
  const placementModeLabels: Record<string, string> = {
    common: "Gemeinsam", choice: "Wahl", parallel: "Parallel", individual: "Einzeln", group: "Gruppe", open: "Offen"
  };
  // T-800: ein einziger Gesprächsverlauf, aber mit wählbarem Kontextfokus.
  const focusKindLabels: Record<PedagogicalFocus["kind"], string> = {
    learning_moment: "Lernmoment", transition: "Übergang", teaching_window: "Unterrichtsfenster",
    placement: "Platzierung", planning_item: "Arbeitsvorhaben", material: "Material"
  };

  let windowForm: { id: string | null; title: string; kind: TeachingWindow["kind"]; durationMinutes: number; note: string } | null = null;
  let windowDeleteConfirm: TeachingWindow | null = null;
  let placementDraft: TimePlacement | null = null;
  let placementConfirm: { moment: LearningMoment; window: TeachingWindow; startMinute: number; durationMinutes: number; dramaturgicalRole: TimePlacement["dramaturgicalRole"]; mode: TimePlacement["mode"] } | null = null;
  let windowDetail: TeachingWindow | null = null;
  let draggedMomentId: string | null = null;

  async function persistTemporalPlan() {
    if (!activeSpace || !temporalPlan) return;
    planningError = "";
    try {
      const result = await api.saveTemporalPlan(activeSpace.id, temporalPlan);
      temporalPlan = result.temporalPlan;
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Die Zeitplanung konnte nicht gespeichert werden.";
    }
  }
  function placedMomentIds(): Set<string> {
    return new Set((temporalPlan?.placements ?? []).map((placement) => placement.momentId));
  }
  function unplacedMoments(): LearningMoment[] {
    const placed = placedMomentIds();
    return (learningLandscape?.moments ?? []).filter((moment) => !placed.has(moment.id));
  }
  function placementsInWindow(windowId: string): TimePlacement[] {
    return (temporalPlan?.placements ?? []).filter((placement) => placement.windowId === windowId).sort((a, b) => a.startMinute - b.startMinute);
  }
  function nextFreeMinute(windowId: string): number {
    const placements = placementsInWindow(windowId).filter((placement) => placement.mode === "common");
    return placements.reduce((max, placement) => Math.max(max, placement.startMinute + placement.durationMinutes), 0);
  }
  // T-706: lehrkräfteverständliche Konfliktbeschreibungen je Fenster.
  function windowConflicts(window: TeachingWindow): string[] {
    const conflicts: string[] = [];
    const placements = placementsInWindow(window.id);
    for (const placement of placements) {
      if (placement.durationMinutes <= 0) conflicts.push(`„${momentTitle(placement.momentId)}“ hat noch keine Dauer.`);
      if (placement.startMinute + placement.durationMinutes > window.durationMinutes) conflicts.push(`„${momentTitle(placement.momentId)}“ reicht über das Ende des Fensters hinaus.`);
      if (!learningLandscape?.moments.some((moment) => moment.id === placement.momentId)) conflicts.push("Eine Platzierung verweist auf einen nicht mehr vorhandenen Lernmoment.");
    }
    const common = placements.filter((placement) => placement.mode === "common");
    for (let i = 0; i < common.length; i += 1) {
      for (let j = i + 1; j < common.length; j += 1) {
        const a = common[i], b = common[j];
        if (a.startMinute < b.startMinute + b.durationMinutes && b.startMinute < a.startMinute + a.durationMinutes) {
          conflicts.push(`„${momentTitle(a.momentId)}“ und „${momentTitle(b.momentId)}“ überschneiden sich zeitlich.`);
        }
      }
    }
    return Array.from(new Set(conflicts));
  }
  // T-702: zentrale Lernmomente ohne Platzierung sind ein Hinweis, kein Fehler.
  function timelineNotices(): string[] {
    const notices: string[] = [];
    const unplaced = unplacedMoments();
    if (unplaced.length > 0) notices.push(`${unplaced.length} Lernmoment${unplaced.length === 1 ? " ist" : "e sind"} noch nicht zeitlich eingeplant.`);
    return notices;
  }

  // T-701: Unterrichtsfenster verwalten.
  function openWindowForm(existing?: TeachingWindow) {
    windowForm = existing
      ? { id: existing.id, title: existing.title, kind: existing.kind, durationMinutes: existing.durationMinutes, note: existing.note }
      : { id: null, title: "", kind: "lesson", durationMinutes: windowKindDurations.lesson, note: "" };
  }
  function onWindowKindChange() {
    if (windowForm && !windowForm.id) windowForm.durationMinutes = windowKindDurations[windowForm.kind];
  }
  async function saveWindow() {
    if (!temporalPlan || !windowForm || windowForm.title.trim().length < 2 || windowForm.durationMinutes <= 0) return;
    const form = windowForm;
    if (form.id) {
      temporalPlan = { ...temporalPlan, windows: temporalPlan.windows.map((window) => window.id === form.id ? { ...window, title: form.title.trim(), kind: form.kind, durationMinutes: form.durationMinutes, note: form.note.trim() } : window) };
    } else {
      const window: TeachingWindow = { id: `tw-${uuid().slice(0, 8)}`, title: form.title.trim(), kind: form.kind, durationMinutes: form.durationMinutes, note: form.note.trim() };
      temporalPlan = { ...temporalPlan, windows: [...temporalPlan.windows, window] };
    }
    windowForm = null;
    await persistTemporalPlan();
  }
  function requestDeleteWindow(window: TeachingWindow) {
    if (placementsInWindow(window.id).length > 0) { windowDeleteConfirm = window; return; }
    void deleteWindow(window);
  }
  async function deleteWindow(window: TeachingWindow) {
    if (!temporalPlan) return;
    temporalPlan = {
      ...temporalPlan,
      windows: temporalPlan.windows.filter((entry) => entry.id !== window.id),
      placements: temporalPlan.placements.filter((placement) => placement.windowId !== window.id)
    };
    windowDeleteConfirm = null;
    windowDetail = null;
    await persistTemporalPlan();
  }

  // T-703: Drag-and-drop erzeugt eine Platzierung – erst nach Bestätigung kanonisch.
  function onWindowDrop(window: TeachingWindow) {
    if (!draggedMomentId) return;
    const moment = learningLandscape?.moments.find((entry) => entry.id === draggedMomentId);
    draggedMomentId = null;
    if (!moment) return;
    const startMinute = Math.min(nextFreeMinute(window.id), window.durationMinutes);
    const durationMinutes = Math.max(5, Math.min(window.durationMinutes - startMinute, 15));
    placementConfirm = { moment, window, startMinute, durationMinutes, dramaturgicalRole: "other", mode: "common" };
  }
  async function confirmPlacement() {
    if (!temporalPlan || !placementConfirm) return;
    const confirmData = placementConfirm;
    const placement: TimePlacement = {
      id: `tp-${uuid().slice(0, 8)}`,
      momentId: confirmData.moment.id,
      windowId: confirmData.window.id,
      startMinute: confirmData.startMinute,
      durationMinutes: confirmData.durationMinutes,
      dramaturgicalRole: confirmData.dramaturgicalRole,
      mode: confirmData.mode,
      note: ""
    };
    temporalPlan = { ...temporalPlan, placements: [...temporalPlan.placements, placement] };
    placementConfirm = null;
    await persistTemporalPlan();
  }

  // T-704: Reihenfolge, Dauer, Rolle und Modus bearbeiten.
  function openPlacementEditor(placement: TimePlacement) {
    placementDraft = { ...placement };
  }
  async function savePlacement() {
    if (!temporalPlan || !placementDraft) return;
    const draft = placementDraft;
    temporalPlan = { ...temporalPlan, placements: temporalPlan.placements.map((placement) => placement.id === draft.id ? draft : placement) };
    placementDraft = null;
    await persistTemporalPlan();
  }
  async function removePlacement(placement: TimePlacement) {
    if (!temporalPlan) return;
    temporalPlan = { ...temporalPlan, placements: temporalPlan.placements.filter((entry) => entry.id !== placement.id) };
    placementDraft = null;
    await persistTemporalPlan();
  }
  function formatMinute(minute: number): string {
    const hours = Math.floor(minute / 60), rest = minute % 60;
    return hours > 0 ? `${hours}:${String(rest).padStart(2, "0")} h` : `${rest} min`;
  }

  // --- Phase 8: Strukturierte Vorschläge des Critical Friend (T-801..T-804). ---
  // Ein Vorschlag ist nur eine Vorschau. Ohne „Übernehmen" bleibt alles unverändert.
  let proposal: import("$lib/api").Proposal | null = null;
  let proposalLoading = false;
  const proposalKindTitles: Record<string, string> = {
    learning_moment: "Vorschlag: neuer Lernmoment",
    transition: "Vorschlag: Übergang",
    temporal_placement: "Vorschlag: zeitliche Platzierung",
    board_item: "Vorschlag: Arbeitsvorhaben"
  };
  async function requestProposal(kind: import("$lib/api").ProposalKind, note?: string) {
    if (!activeSpace) return;
    proposalLoading = true;
    planningError = "";
    try {
      const result = await api.generateProposal(activeSpace.id, { kind, note, focus: activeFocus ?? undefined });
      proposal = result.proposal;
    } catch (err) {
      planningError = err instanceof Error ? err.message : "Der Vorschlag konnte noch nicht vorbereitet werden.";
    } finally {
      proposalLoading = false;
    }
  }
  async function acceptProposal() {
    if (!proposal) return;
    const current = proposal;
    proposal = null;
    if (current.kind === "learning_moment" && current.moment && learningLandscape) {
      const transitions = (current.possibleTransitions ?? [])
        .filter((edge) => learningLandscape!.moments.some((moment) => moment.id === edge.fromId))
        .map((edge) => ({ id: `tr-${uuid().slice(0, 8)}`, from: edge.fromId, to: edge.toId, kind: edge.kind, rationale: "" }));
      learningLandscape = {
        ...learningLandscape,
        moments: [...learningLandscape.moments, current.moment],
        transitions: [...learningLandscape.transitions, ...transitions]
      };
      await persistLandscape();
      openMomentDetail(current.moment.id);
    } else if (current.kind === "transition" && current.transition && learningLandscape) {
      learningLandscape = { ...learningLandscape, transitions: [...learningLandscape.transitions, current.transition] };
      await persistLandscape();
    } else if (current.kind === "temporal_placement" && current.placement && temporalPlan) {
      temporalPlan = { ...temporalPlan, placements: [...temporalPlan.placements, current.placement] };
      await persistTemporalPlan();
    } else if (current.kind === "board_item" && current.boardItem) {
      await ensurePlanningBoard();
      if (planningBoard) {
        planningBoard = { ...planningBoard, items: [...planningBoard.items, current.boardItem] };
        await persistBoard();
      }
    }
  }
  function refineProposalInConversation() {
    if (!proposal) return;
    const current = proposal;
    proposal = null;
    focusConversation(`Ich möchte diesen Vorschlag gemeinsam anpassen: ${current.rationale} `);
  }

  $: hasBlockingFinding = findings.some((finding) => finding.severity === "block_export");
</script>

<svelte:head><title>ptspace-app</title></svelte:head>

<div class:rail-collapsed={railCollapsed} class:reduce-motion={reducedMotion} class="app-shell">
  <aside class="room-rail" aria-label="Planungsräume">
    <div class="brand-row"><button class="rail-toggle" on:click={() => (railCollapsed = !railCollapsed)} aria-label={railCollapsed ? "Planungsräume einblenden" : "Planungsräume ausblenden"}>{#if railCollapsed}<PanelLeftOpen size={18} />{:else}<PanelLeftClose size={18} />{/if}</button>
      <div class="brand-mark"><BookOpen size={18} /></div>
      <div><strong>Planungsräume</strong><span>ptspace</span></div>
    </div>

    <button class="new-room-button" on:click={() => (createRoomModal = true)}><Plus size={16} /> Neuen Planungsraum beginnen</button>

    <div class="room-list">
      {#if loading}<p>Planungsräume werden geladen.</p>
      {:else if spaces.length === 0}<p>Noch kein Planungsraum. Lege links einen ersten Raum an.</p>
      {:else}
        {#each spaces as space}
          <button class:active={activeSpace?.id === space.id} on:click={() => openSpace(space)}>
            <span>{space.title}</span><small>{space.subject || "Fach offen"} · {space.targetGroup || "Zielgruppe offen"}</small>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  {#if createRoomModal}
    <div class="planning-overlay" role="presentation" on:click={() => (createRoomModal = false)}>
      <dialog class="start-modal" open aria-label="Neuen Planungsraum beginnen" on:click|stopPropagation>
        <header><div><span>Neuer Denkraum</span><h2>Woran möchtest du weiterdenken?</h2></div><button class="icon-button" on:click={() => (createRoomModal = false)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={async () => { await createSpace(); if (!error) createRoomModal = false; }}>
          <label>Titel oder erster Gedanke<input bind:value={newRoom.title} placeholder="z. B. Eine Frage, ein Vorhaben oder eine offene Idee" /></label>
          <label>Fach oder Lernbereich <small>optional</small><input bind:value={newRoom.subject} placeholder="z. B. Religion, Konfirmandenarbeit, AG" /></label>
          <label>Zielgruppe <small>optional</small><input bind:value={newRoom.targetGroup} placeholder="z. B. Klasse 9, Konfirmand:innen" /></label>
          <label>Erster Gedanke <small>optional</small><textarea bind:value={newRoom.initialIdea} rows="4" placeholder="Was ist gerade wichtig?"></textarea></label>
          <button type="submit"><Plus size={16} /> Denkraum eröffnen</button>
        </form>
      </dialog>
    </div>
  {/if}
  <main class="planning-room">
    <header class="topbar">
      <div><span>Planungsräume</span><h1>{activeSpace?.title ?? "Neuer pädagogischer Denkraum"}</h1></div>
      <div class="topbar-actions">
        {#if activeSpace}<button class="room-access-toggle" on:click={() => (roomAccessOpen = !roomAccessOpen)} aria-expanded={roomAccessOpen} aria-controls="room-access"><MoreHorizontal size={16} /> Bereiche <span>{roomAccessOpen ? "schließen" : "öffnen"}</span></button>{/if}
        <button class="planning-open" on:click={openPlanning}><MapIcon size={16} /> Unterrichtsplanung</button>
        <button class="settings-button" on:click={async () => { settingsOpen = true; try { runtimeStatus = (await api.getRuntimeStatus()).harnessAvailability.teacherFacingMessage; } catch { runtimeStatus = "Die Runtime-Konfiguration konnte nicht geprüft werden."; } }}><Settings size={16} /> Einstellungen</button>
        {#if activeSpace && roomAccessOpen}
          <nav id="room-access" class="room-nav" aria-label="Bereiche im Planungsraum">
            <button class:active={roomView === "conversation" && !pinnwandOpen} on:click={() => chooseRoomView("conversation")}>Gespräch</button>
            <button class:active={pinnwandOpen} on:click={() => { pinnwandOpen = true; chooseRoomView("conversation"); }}>Pinnwand</button>
            <button class:active={roomView === "landscape"} on:click={() => chooseRoomView("landscape")}>Lernlandschaft</button>
            <button class:active={roomView === "timeline"} on:click={() => chooseRoomView("timeline")}>Zeit &amp; Dramaturgie</button>
            <button class:active={roomView === "board"} on:click={() => chooseRoomView("board")}>Vorbereitungen</button>
            <button class:active={roomView === "knowledge"} on:click={() => chooseRoomView("knowledge")}>Knowledge &amp; Quellen</button>
            <button class:active={roomView === "materials"} on:click={() => chooseRoomView("materials")}>Materialien</button>
          </nav>
        {/if}
      </div>
    </header>
    {#if statusDetailsOpen && roomOverview}
      <section id="background-work" class="status-details" aria-label="Hintergrundarbeit und Verlauf">
        <div class="workshop-summary"><strong>Im Hintergrund</strong><span>{serviceRequests.filter((request) => request.status === "in_progress" || request.status === "approved").length} Vorbereitungen aktiv</span>{#each serviceRequests.slice(-4).reverse() as request}<span class="workshop-request">{request.reason || "Vorbereitung"} · {serviceRequestTeacherLabel(request)}</span>{/each}</div>
        <div class="workshop-summary"><strong>Zuletzt festgehalten</strong>{#each roomOverview.activity.slice(0, 3) as activity}<span>{activity.label}</span>{/each}</div>
        <button class="workshop-board-link" on:click={() => chooseRoomView("board")}>Vorbereitungen und Planungsboard öffnen <ArrowRight size={14} /></button>
      </section>
    {/if}

    {#if error}<div class="notice error"><AlertCircle size={18} /> {error}</div>{/if}

    {#if activeSpace}
      <section class="workspace-grid" bind:this={workspaceElement} style={`--primary-width: ${primaryWidth}%`}>
        <section class="conversation-panel" aria-label="Gespräch mit Critical Friend">
          <div class="conversation-heading">
            <MessageSquareText size={18} />
            <div><strong>Gespräch mit Critical Friend</strong><span>Gemeinsam weiterdenken · Herkunft bleibt sichtbar</span></div>
            <div class="conversation-tools">
              <label class="message-filter"><span>Gespräch anzeigen</span><select bind:value={messageFilter} aria-label="Gespräch filtern"><option value="all">Alle Beiträge</option><option value="captured">Festgehaltenes</option><option value="decisions">Offene Entscheidungen</option><option value="work">Vorbereitungen &amp; Ergebnisse</option></select></label>
              {#if pinnwandOpen}<button class="quiet-button" on:click={() => (pinnwandOpen = false)}>Pinnwand schließen</button>{/if}
            </div>
          </div>
          <div class="messages" bind:this={messagesElement} role="log" aria-live="polite" aria-label="Gesprächsverlauf">
            {#if visibleMessages().length === 0}<p class="conversation-empty">Für diesen Filter gibt es noch keine markierte Gesprächsstelle.</p>{/if}
            {#each visibleMessages() as message}
              {@const messageMarkers = markersForMessage(message.id)}
              <article class:teacher={message.author === "teacher"} class:context-message={isContextMessage(message)} class:highlighted={highlightedMessageId === message.id} class="message" data-message-id={message.id}>
                <div class="avatar" aria-hidden="true">{message.author === "teacher" ? "L" : "CF"}</div>
                <div class="message-content">
                  <div class="message-meta"><strong>{message.author === "teacher" ? "Lehrkraft" : "Critical Friend"}</strong>{#if formatMessageTime(message)}<time>{formatMessageTime(message)}</time>{/if}</div>
                  <div class="message-body markdown-preview">{@html markdownToHtml(message.text)}</div>
                  {#if messageMarkers.length > 0}<div class="message-markers" aria-label="Gesprächsbezüge">{#each messageMarkers as marker}<button class="message-marker" on:click={() => openMarkerTarget(marker)} title="{markerKindLabel(marker.kind)} öffnen"><span aria-hidden="true">{markerGlyph(marker.kind)}</span> {markerKindLabel(marker.kind)} · {marker.label}</button>{/each}</div>{/if}
                  <div class="message-actions"><button class="message-action" on:click={() => openMarkerComposer(message)}>Gedanken festhalten</button></div>
                </div>
              </article>
            {/each}
            {#if sending}<article class="message thinking"><div class="avatar" aria-hidden="true">CF</div><p><span class="thinking-dots" aria-hidden="true"></span>{thinkingStatus || "Ich prüfe deine Frage und halte den Denkstand gleich sichtbar fest."}</p></article>{/if}
          </div>
          <div class="composer-wrap">{#if activeFocus}<div class="focus-chip"><span>Bezug: {focusKindLabels[activeFocus.kind]} · {activeFocus.label}</span><button on:click={() => (activeFocus = null)} aria-label="Fokus aufheben"><X size={13} /></button></div>{/if}<div class="privacy-hint"><ShieldCheck size={15} /> Für die Planung reichen Beschreibungen ohne Namen einzelner Schüler:innen.</div><form class="composer" on:submit|preventDefault={sendMessage}><textarea bind:this={composerElement} bind:value={draftMessage} rows="3" placeholder="Beschreibe kurz deine Unterrichtsidee oder die offene Frage." on:keydown={handleComposerKeydown}></textarea><button type="submit" disabled={sending || !draftMessage.trim()} aria-label="Nachricht senden"><ArrowUp size={18} /></button></form></div>
        </section>
        <button class="resize-handle" aria-label="Breite der Arbeitsbereiche anpassen" on:pointerdown={startResize}><GripVertical size={18} /></button>
        <aside class="perspective-panel" aria-label="Gewählte Perspektive">
          {#if roomView === "conversation"}
            <div class="panel-heading"><Lightbulb size={18} /><div><strong>Denkstand</strong><span>Gemeinsam festhalten, was das weitere Gespräch trägt.</span></div><div class="panel-menu"><button on:click={() => (exportMenuOpen = !exportMenuOpen)}>Mehr</button>{#if exportMenuOpen}<div class="export-menu"><button on:click={() => approve("markdown")} disabled={hasBlockingFinding}>Markdown freigeben</button><button on:click={() => approve("okf_markdown")} disabled={hasBlockingFinding}>Zum Teilen vormerken</button>{#if markdownApproval}<a href={`${api.backendUrl}/api/planning-spaces/${activeSpace.id}/export/markdown`} target="_blank" rel="noreferrer">Markdown ansehen</a>{/if}</div>{/if}</div></div>
            <section class="pinnwand-projection" aria-label="Pinnwand">
              <div class="pinnwand-heading"><div><span>Pinnwand</span><strong>Was aus dem Gespräch bleibt</strong></div><button class="quiet-button" on:click={() => (pinnwandOpen = !pinnwandOpen)}>{pinnwandOpen ? "Weniger anzeigen" : "Öffnen"}</button></div>
              {#if roomOverview?.conversationMarkers.length}
                {@const pinMarker = roomOverview.conversationMarkers[roomOverview.conversationMarkers.length - 1]}
                <button class="pinnwand-note" on:click={() => openMarkerTarget(pinMarker)}><span aria-hidden="true">{markerGlyph(pinMarker.kind)}</span><strong>{pinMarker.label}</strong><small>{markerKindLabel(pinMarker.kind)} · {markerTargetDisplay(pinMarker)}</small></button>
                {#if pinnwandOpen}<div class="pinnwand-list">{#each roomOverview.conversationMarkers as marker}<button on:click={() => openMarkerTarget(marker)}><span aria-hidden="true">{markerGlyph(marker.kind)}</span><span><strong>{marker.label}</strong><small>{markerKindLabel(marker.kind)} · {markerTargetDisplay(marker)}</small></span></button>{/each}</div>{/if}
              {:else}<p class="pinnwand-empty">Noch kein Gedanke ist hier festgehalten. Im Gespräch kannst du eine Stelle als Denkstand markieren.</p>{/if}
            </section>            <section class="thinking-card design-pad"><div class="pad-heading"><div><strong>Gemeinsamer Denkstand</strong><span>Bewusst speichern erstellt eine nachvollziehbare Version und wird im nächsten Gespräch berücksichtigt.</span></div><button on:click={() => (editingDesign = !editingDesign)}>{editingDesign ? "Lesen" : "Gemeinsam schreiben"}</button></div>{#if editingDesign}<div class="tiptap-editor" use:tiptap aria-label="Gemeinsamer Denkstand"></div><div class="pad-actions"><button on:click={saveDesignNotes} disabled={savingDesign}>{savingDesign ? "Speichert …" : "Änderung festhalten"}</button></div>{:else}<div class="design-preview markdown-preview">{@html markdownToHtml(designNotes)}</div>{/if}</section>
            <div class="conversation-perspective">
              {#if findings.length > 0}<section class="sensitive-card" class:blocking={hasBlockingFinding}><div class="sensitive-heading"><TriangleAlert size={18} /><strong>Sensible Hinweise prüfen</strong></div><ul>{#each findings as finding}<li><span>{finding.message}</span><small>{finding.suggestion}</small></li>{/each}</ul></section>{/if}
              {#each cards.filter((card) => card.id === "offene-entscheidungen" || card.id === "nächste-schritte") as card}
                <section class="thinking-card action-card" class:decision-card={card.id === "offene-entscheidungen"} class:next-step-card={card.id === "nächste-schritte"}>
                  <div class="action-card-heading">{#if card.id === "offene-entscheidungen"}<Scale size={18} />{:else}<ListChecks size={18} />{/if}<div><strong>{card.title}</strong><span>{card.id === "offene-entscheidungen" ? `${card.previewItems.length} noch zu klären` : "Ein sinnvoller nächster Schritt"}</span></div></div>
                  {#if card.id === "offene-entscheidungen"}<p>{card.summary}</p><div class="decision-list">{#each card.previewItems as item}{@const decision = decisionParts(item)}<article class="decision-item"><span class="decision-chip">{decision.category}</span><strong>{decision.question}</strong><div><button class="decide-action" on:click={() => focusConversation(`Lass uns diese offene Entscheidung klären: ${decision.question}`)}><Scale size={15} /> Jetzt entscheiden</button><button class="record-action" on:click={() => openDecisionDialog(decision.question)}><Check size={15} /> Begründet festhalten</button></div></article>{/each}</div>
                  {:else}{#each card.previewItems.slice(0, 1) as item}<article class="next-step-item"><strong>{item}</strong><button on:click={() => focusConversation(`Ich möchte den nächsten Schritt „${item}“ im Gespräch aufgreifen: `)}>Im Gespräch aufgreifen <ArrowRight size={14} /></button></article>{/each}<button class="board-overview" on:click={() => requestProposal("board_item")} disabled={proposalLoading}><Lightbulb size={14} /> Arbeitsvorhaben vorschlagen lassen</button><button class="board-overview" on:click={() => selectPerspective("board")}>Alle Arbeitsvorhaben im Planungsboard <ArrowRight size={14} /></button>{/if}
                </section>
              {/each}
            </div>
          {:else if planningLoading}<p class="planning-empty">Planung wird geöffnet …</p>
          {:else if planningError}<p class="planning-error">{planningError}</p>
          {:else if roomView === "knowledge"}
            <div class="knowledge-view">
              <div class="perspective-title"><span>Knowledge &amp; Quellen</span><h2>Geprüfte Bezugsquellen</h2><p>Quellen und fachliche Bezüge erhalten hier einen eigenen, ruhigen Zugang. Die Recherche bleibt an das Gespräch und den gemeinsamen Denkstand gebunden.</p></div>
              <div class="knowledge-empty"><BookOpen size={22} /><strong>Noch keine Quelle festgehalten</strong><p>Wenn eine Quelle im Gespräch relevant wird, greifen wir sie gemeinsam auf und halten ihren pädagogischen Bezug fest.</p><button on:click={() => focusConversation("Welche Quelle oder welcher fachliche Bezug sollte für unseren Denkstand geprüft werden? ")}>Im Gespräch anstoßen</button></div>
            </div>          {:else if roomView === "landscape" && learningLandscape}
            <div class="perspective-title landscape-heading">
              <span>Lernlandschaft</span>
              <h2>{learningLandscape.title}</h2>
              <p>Ordne Lernmomente als didaktische Reise. Die lineare Lesansicht nutzt dieselben Lernmomente und Übergänge.</p>
              <div class="landscape-toolbar" aria-label="Werkzeuge der Lernlandschaft">
                <div class="view-switch" role="group" aria-label="Darstellung wählen">
                  <button class:active={landscapeMode === "canvas"} on:click={() => (landscapeMode = "canvas")}><MapIcon size={14} /> Raumansicht</button>
                  <button class:active={landscapeMode === "linear"} on:click={() => (landscapeMode = "linear")}><List size={14} /> Lineare Lesansicht</button>
                </div>
                <button class="add-moment-button" on:click={openAddMoment}><Plus size={15} /> Lernmoment hinzufügen</button>
                <button class="add-moment-button ghost-action" on:click={() => openGroupForm()}><Layers size={15} /> Fläche hinzufügen</button>
                <button class="add-moment-button ghost-action" on:click={resetLandscapeLayout}><RotateCcw size={15} /> Layout zurücksetzen</button>
                <button class="add-moment-button ghost-action" on:click={() => requestProposal("learning_moment")} disabled={proposalLoading}><Lightbulb size={15} /> Vorschlag anfragen</button>
              </div>
            </div>
            {#if landscapeMode === "canvas"}
              <div class="landscape-view inline landscape-canvas-layout">
                <div class="flow-canvas" role="application" aria-label="Didaktische Lernlandschaft. Lernmomente sind per Tastatur fokussierbar; Verbindungen entstehen erst nach Auswahl ihrer didaktischen Bedeutung.">
                  <SvelteFlow bind:nodes={canvasNodes} bind:edges={canvasEdges} nodeTypes={canvasNodeTypes} fitView={landscapeViewport === undefined} initialViewport={landscapeViewport} nodesDraggable={true} nodesConnectable={true} elementsSelectable={true} nodesFocusable={true} edgesFocusable={true} onnodedragstop={() => void saveLandscapeLayout()} onmoveend={saveLandscapeViewport} onconnect={handleCanvasConnect} onnodeclick={(event) => handleCanvasNodeClick(event.node)} onedgeclick={(event) => openTransitionDetail(event.edge.id)}><Background /><Controls /><MiniMap /></SvelteFlow>
                </div>
                <aside class="landscape-groups" aria-label="Lernflächen">
                  <div class="landscape-groups-heading"><strong>Lernflächen</strong><span>nur Darstellung und Orientierung</span></div>
                  {#if landscapeGroups.length === 0}<p class="muted">Noch keine Fläche. Phasen, Räume und Stationen können hier sichtbar zusammengefasst werden.</p>{:else}{#each landscapeGroups as group}<button class="landscape-group-entry" on:click={() => openGroupForm(group)}><span>{landscapeGroupKindLabels[group.kind]}</span><strong>{group.title}</strong><small>{group.memberIds.length} Lernmomente · bearbeiten</small></button>{/each}{/if}
                </aside>
              </div>
              <p class="canvas-accessibility-hint">Tastatur: Mit Tab zwischen Lernmomenten wechseln, Enter auswählen, Pfeiltasten bewegen. Eine Verbindung wird erst nach der Wahl von Weg, Wahl, Parallelität, Rückkehr, Treffpunkt oder Voraussetzung gespeichert.</p>
            {:else}
              <div class="linear-landscape" aria-label="Lineare Lesansicht der Lernlandschaft">
                <p class="linear-landscape-intro">Diese Lesansicht ist aus derselben Landschaft abgeleitet und macht auch Wahl- und Parallelwege ausdrücklich sichtbar.</p>
                {#each linearMoments() as moment, index}
                  <article class="linear-moment">
                    <div class="linear-moment-index" aria-hidden="true">{index + 1}</div>
                    <div class="linear-moment-content"><span class="learning-moment-kind">{momentKindLabels[moment.kind] ?? moment.kind}</span><h3>{moment.title}</h3><p>{moment.didacticPurpose || "Didaktische Funktion noch offen"}</p>{#if moment.learningActivity}<small><strong>Lernaktivität:</strong> {moment.learningActivity}</small>{/if}{#if landscapeGroups.some((group) => group.memberIds.includes(moment.id))}<div class="linear-groups">{#each landscapeGroups.filter((group) => group.memberIds.includes(moment.id)) as group}<span>{landscapeGroupKindLabels[group.kind]}: {group.title}</span>{/each}</div>{/if}<div class="linear-moment-actions"><button on:click={() => openMomentDetail(moment.id)}>Lernmoment öffnen</button>{#each transitionsFrom(moment.id) as transition}<span class="linear-transition"><strong>{transitionKindLabels[transition.kind]}</strong> → {momentTitle(transition.to)}</span>{/each}</div></div>
                  </article>
                {/each}
              </div>
            {/if}
          {:else if roomView === "timeline" && temporalPlan}<div class="timeline-view"><header><span>Zeit & Dramaturgie</span><h2>Unterrichtsfenster</h2><p>Ziehe Lernmomente aus der Ablage in ein Unterrichtsfenster. Erst deine Bestätigung legt eine zeitliche Platzierung an.</p><div class="title-actions"><button class="add-moment-button" on:click={() => openWindowForm()}><Plus size={15} /> Unterrichtsfenster hinzufügen</button>{#if temporalPlan.windows.length > 0 && unplacedMoments().length > 0}<button class="add-moment-button ghost-action" on:click={() => requestProposal("temporal_placement")} disabled={proposalLoading}><Lightbulb size={15} /> Platzierung vorschlagen lassen</button>{/if}</div></header>
            {#each timelineNotices() as notice}<p class="timeline-notice"><TriangleAlert size={14} /> {notice}</p>{/each}
            <section class="unplaced-tray" aria-label="Noch nicht eingeplante Lernmomente"><h3>Ablage · noch nicht eingeplant</h3>{#if unplacedMoments().length === 0}<p class="muted">Alle Lernmomente sind mindestens einmal eingeplant.</p>{:else}<div class="tray-moments">{#each unplacedMoments() as moment}<button class="tray-moment" draggable="true" on:dragstart={() => (draggedMomentId = moment.id)} on:click={() => openMomentDetail(moment.id)}><strong>{moment.title}</strong><small>{momentKindLabels[moment.kind] ?? moment.kind}</small></button>{/each}</div>{/if}</section>
            {#if temporalPlan.windows.length === 0}<p class="planning-empty">Noch keine Unterrichtsfenster. Lege oben ein erstes Fenster an, um Lernmomente zeitlich zu platzieren.</p>{:else}<div class="timeline-track">{#each temporalPlan.windows as window}{@const conflicts = windowConflicts(window)}<section class="teaching-window" class:has-conflict={conflicts.length > 0} role="group" aria-label={window.title} on:dragover|preventDefault on:drop={() => onWindowDrop(window)}><div class="window-head"><div><button class="window-title-link" on:click={() => (windowDetail = window)}>{window.title}</button><span>{windowKindLabels[window.kind]} · {window.durationMinutes} min</span></div><div class="window-tools"><button on:click={() => openWindowForm(window)} aria-label="Fenster bearbeiten"><Settings size={14} /></button><button on:click={() => requestDeleteWindow(window)} aria-label="Fenster löschen"><X size={14} /></button></div></div>
                    {#if conflicts.length > 0}<ul class="window-conflicts">{#each conflicts as conflict}<li><TriangleAlert size={12} /> {conflict}</li>{/each}</ul>{/if}
                    <div class="window-moments">{#if placementsInWindow(window.id).length === 0}<p class="drop-hint">Lernmoment hierher ziehen</p>{:else}{#each placementsInWindow(window.id) as placement}<button class="placement-block" class:mode-parallel={placement.mode === "parallel"} class:mode-choice={placement.mode === "choice"} class:mode-individual={placement.mode === "individual"} class:mode-group={placement.mode === "group"} on:click={() => openPlacementEditor(placement)}><span class="placement-time">{formatMinute(placement.startMinute)}–{formatMinute(placement.startMinute + placement.durationMinutes)}</span><strong>{momentTitle(placement.momentId)}</strong><span class="placement-tags"><em class="tag-role">{dramaturgicalRoleLabels[placement.dramaturgicalRole]}</em><em class="tag-mode tag-mode-{placement.mode}">{placementModeLabels[placement.mode]}</em></span></button>{/each}{/if}</div></section>{/each}</div>{/if}</div>
          {:else if roomView === "timeline"}<p class="planning-empty">Die Zeitplanung wird vorbereitet …</p>
          {:else if roomView === "board" && planningBoard}<div class="board-view inline">{#each boardColumns as column}<section class="board-column" role="list" aria-label={column.label} on:dragover|preventDefault on:drop={() => moveBoardItem(column.id)}><header><strong>{column.label}</strong><span>{column.hint}</span></header><div class="board-cards">{#each planningBoard.items.filter((item) => item.column === column.id) as item}<button class="board-card" draggable="true" on:dragstart={() => (draggedBoardItem = item.id)} on:click={() => (boardDetail = item)}><span class="board-kind">{boardKindLabels[item.kind] ?? item.kind}</span><strong>{item.title}</strong><small>{boardStatusLabels[item.status] ?? item.status}</small></button>{/each}</div></section>{/each}</div>
                    {:else if roomView === "materials"}
            <div class="materials-view">
              <header class="perspective-title">
                <span>Materialien</span>
                <h2>Materialien und ihre pädagogischen Bezüge</h2>
                <p>Hier siehst du vollständige Angaben, Entstehungsgrund und die Zuordnung zu Lernmomenten und Arbeitsvorhaben. Die Zuordnung wird gemeinsam und atomar gespeichert.</p>
              </header>
              {#if materialsLoading}<p class="planning-empty">Materialien werden geladen …</p>
              {:else if materials.length === 0}<p class="planning-empty">Noch kein Material liegt in diesem Planungsraum vor. Ergebnisse erscheinen hier, sobald sie zur Prüfung zurückkehren.</p>
              {:else}<div class="materials-list">
                {#each materials as material}
                  {@const targets = availableMaterialTargets()}
                  <article class="material-record" class:expanded={expandedMaterialId === material.id}>
                    <div class="material-record-heading"><div><span class="material-kind">{materialKindLabel(material.kind)}</span><h3>{material.title}</h3></div><span class="material-status material-status-{material.status}">{materialStatusLabel(material.status)}</span></div>
                    <dl class="material-metadata"><div><dt>Entstanden</dt><dd>{materialDate(material.createdAt)}</dd></div><div><dt>Prüfung</dt><dd>{materialDate(material.reviewedAt)}</dd></div><div><dt>Quelle</dt><dd>Aus einer begleiteten Vorbereitung</dd></div><div><dt>Bezüge</dt><dd>{materialRelationLabels(material).length}</dd></div></dl>
                    <div class="material-relations"><strong>Pädagogische Bezüge</strong><div>{#each materialRelationLabels(material) as relation}<span>{relation}</span>{/each}</div></div>
                    <div class="material-targeting"><label for={`material-target-${material.id}`}>Bezug ergänzen<select id={`material-target-${material.id}`} bind:value={materialTargetSelection[material.id]}><option value="">Lernmoment oder Arbeitsvorhaben wählen</option>{#each targets as target}<option value={target.value}>{target.label}</option>{/each}</select></label><button class="material-assign-button" disabled={materialAssignmentBusy === material.id || targets.length === 0} on:click={() => assignMaterialFromTab(material)}>{materialAssignmentBusy === material.id ? "Speichert …" : "Bezug speichern"}</button></div>
                    <button class="material-content-toggle" on:click={() => toggleMaterialContent(material)} aria-expanded={expandedMaterialId === material.id}>{expandedMaterialId === material.id ? "Inhalt schließen" : "Inhalt ansehen"}<ChevronDown size={15} /></button>
                    {#if expandedMaterialId === material.id}{#if materialContentLoading[material.id]}<p class="muted">Inhalt wird geöffnet …</p>{:else if materialContents[material.id]}<pre class="material-content-preview">{materialContents[material.id]?.content}</pre>{:else}<p class="muted">Für dieses Material ist noch keine lesbare Vorschau hinterlegt.</p>{/if}{/if}
                  </article>
                {/each}
              </div>{/if}
              {#if materialMessage}<p class="material-feedback" aria-live="polite">{materialMessage}</p>{/if}
            </div>
          {/if}
        </aside>
      </section>
      {#if activeSpace}<button class="statusbar" on:click={() => (statusDetailsOpen = !statusDetailsOpen)} aria-expanded={statusDetailsOpen} aria-controls="background-work"><span>Im Hintergrund</span><strong>{backgroundStatusLabel()}</strong><span>{roomOverview?.conversationMarkers.length ?? 0} Gesprächsbezüge</span></button>{/if}
    {:else}
      <section class="empty-state"><MessageSquareText size={34} /><h2>Lege einen Planungsraum an.</h2><p>Der erste Umsetzungsschnitt arbeitet mit einer geschützten Backend-Grenze und einem simulierten Gegenüber.</p></section>
    {/if}

  {#if decisionModalOpen}
    <div class="planning-overlay" role="presentation" on:click={() => (decisionModalOpen = false)}>
      <dialog class="start-modal decision-modal" open aria-label="Entscheidung festhalten" on:click|stopPropagation>
        <header><div><span>Entscheidung festhalten</span><h2>Was entscheidet ihr – und warum?</h2></div><button class="icon-button" on:click={() => (decisionModalOpen = false)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={saveDecision}>
          <label>Entscheidung<textarea bind:value={decisionToRecord} rows="3" placeholder="Was soll künftig gelten?"></textarea></label>
          <label>Begründung<textarea bind:value={decisionReason} rows="4" placeholder="Welche pädagogische Überlegung trägt diese Entscheidung?"></textarea></label>
          <button type="submit" disabled={decisionToRecord.trim().length < 3 || decisionReason.trim().length < 3}>Mit Begründung festhalten</button>
        </form>
      </dialog>
    </div>
  {/if}
  {#if markerMessageId}
    <div class="planning-overlay" role="presentation" on:click={() => (markerMessageId = "")}>
      <dialog class="start-modal marker-modal" open aria-label="Gesprächsbezug festhalten" on:click|stopPropagation>
        <header><div><span>Gesprächsmarker</span><h2>Was soll aus dieser Stelle bleiben?</h2></div><button class="icon-button" on:click={() => (markerMessageId = "")} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={saveConversationMarker}>
          <label>Art des Bezugs<select value={markerKind} on:change={handleMarkerKindChange}><option value="captured_note">Festgehaltener Gedanke</option><option value="open_decision" disabled>Offene Entscheidung · entsteht aus einer begründeten Entscheidung</option><option value="work_started">Vorbereitung gestartet</option><option value="result_returned">Ergebnis zurückgekehrt</option><option value="ready_for_class">Für den Unterricht bereit</option></select></label>
          {#if markerTargetsForKind(markerKind).length > 0}<label>Ziel<select bind:value={markerTarget}>{#each markerTargetsForKind(markerKind) as target}<option value={target.value}>{target.label}</option>{/each}</select></label>{:else}<p class="muted">Für diese Art gibt es im Planungsraum noch kein gültiges Ziel.</p>{/if}
          <label>Beschriftung<input bind:value={markerLabel} maxlength="140" /></label>
          <p class="privacy-hint">Der Marker verweist auf ein bestehendes Ziel. Er legt keinen zweiten pädagogischen Inhalt an.</p>
          <div class="pad-actions"><button type="button" class="ghost" on:click={() => (markerMessageId = "")}>Abbrechen</button><button type="submit" disabled={markerSaving || markerTargetsForKind(markerKind).length === 0}>{markerSaving ? "Speichert …" : "Im Gespräch festhalten"}</button></div>
        </form>
      </dialog>
    </div>
  {/if}
  {#if settingsOpen}
    <div class="planning-overlay" role="presentation" on:click={() => (settingsOpen = false)}>
      <dialog class="start-modal" open aria-label="Einstellungen" on:click|stopPropagation>
        <header><div><span>Darstellung</span><h2>Denkraum-Einstellungen</h2></div><button class="icon-button" on:click={() => (settingsOpen = false)} aria-label="Schließen"><X size={20} /></button></header>
        <div class="start-form">
          <p aria-live="polite">{runtimeStatus}</p>
          <label class="setting-toggle"><input type="checkbox" bind:checked={reducedMotion} on:change={() => localStorage.setItem("ptspace.reduced-motion", String(reducedMotion))} /> Bewegung reduzieren</label>
          <label class="setting-toggle"><input type="checkbox" bind:checked={soundsEnabled} on:change={() => localStorage.setItem("ptspace.sounds-enabled", String(soundsEnabled))} /> Töne einschalten <small>Die Anwendung bleibt auch ohne Töne vollständig verständlich.</small></label>
          <p>Die technische Konfiguration bleibt geschützt. Hier werden keine Schlüssel entgegengenommen oder angezeigt.</p></div>
      </dialog>
    </div>
  {/if}

  {#if momentDetail}
    {@const moment = momentDetail}
    <div class="planning-overlay" role="presentation" on:click={closeMomentDetail}>
      <dialog class="start-modal detail-modal" open aria-label="Lernmoment" on:click|stopPropagation>
        <header><div><span>Lernmoment · {momentKindLabels[moment.kind] ?? moment.kind}</span><h2>{moment.title}</h2></div><button class="icon-button" on:click={closeMomentDetail} aria-label="Schließen"><X size={20} /></button></header>
        {#if momentEditing && momentDraft}
          <form class="start-form" on:submit|preventDefault={saveMoment}>
            <label>Titel<input bind:value={momentDraft.title} /></label>
            <label>Pädagogischer Typ<select bind:value={momentDraft.kind}>{#each Object.entries(momentKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
            <label>Didaktische Funktion<textarea bind:value={momentDraft.didacticPurpose} rows="2"></textarea></label>
            <label>Lernaktivität<textarea bind:value={momentDraft.learningActivity} rows="2"></textarea></label>
            <label>Erwartete Lernerfahrung<textarea bind:value={momentDraft.expectedExperience} rows="2"></textarea></label>
            <label>Status<select bind:value={momentDraft.status}>{#each Object.entries(momentStatusLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
            <div class="need-editor"><strong>Materialbedarf</strong>{#each momentDraft.materialNeeds as need, index}<div class="need-row"><span>{need}</span><button type="button" on:click={() => removeMaterialNeedFromDraft(index)} aria-label="Materialbedarf entfernen"><X size={14} /></button></div>{/each}<div class="need-add"><input bind:value={momentNeedInput} placeholder="z. B. Bildimpuls mit Leitfragen" /><button type="button" on:click={addMaterialNeedToDraft}><Plus size={14} /> Hinzufügen</button></div></div>
            <div class="pad-actions"><button type="button" class="ghost" on:click={() => { momentEditing = false; momentDraft = null; }}>Abbrechen</button><button type="submit">Änderung festhalten</button></div>
          </form>
        {:else}
          <div class="detail-body">
            <dl><dt>Didaktische Funktion</dt><dd>{moment.didacticPurpose || "—"}</dd><dt>Lernaktivität</dt><dd>{moment.learningActivity || "—"}</dd><dt>Erwartete Lernerfahrung</dt><dd>{moment.expectedExperience || "—"}</dd><dt>Status</dt><dd>{momentStatusLabels[moment.status] ?? moment.status}</dd></dl>
            <section class="detail-block"><strong>Materialbedarf</strong>{#if moment.materialNeeds.length === 0}<p class="muted">Noch kein Materialbedarf festgehalten.</p>{:else}<ul class="need-list">{#each moment.materialNeeds as need}<li><span>{need}</span><button class="link-action" on:click={() => openBoardProposal(moment.id, need)}>Als Arbeitsvorhaben vorschlagen</button></li>{/each}</ul>{/if}</section>
            {#if moment.openQuestions.length}<section class="detail-block"><strong>Offene Fragen</strong><ul>{#each moment.openQuestions as question}<li>{question}</li>{/each}</ul></section>{/if}
            <section class="detail-block"><strong>Zeitliche Platzierungen</strong>{#if placementsFor(moment.id).length === 0}<p class="muted">Noch nicht zeitlich eingeplant.</p>{:else}<ul>{#each placementsFor(moment.id) as placement}<li>{windowTitle(placement.windowId)} · {placement.durationMinutes} min</li>{/each}</ul>{/if}</section>
            <div class="detail-actions"><button on:click={() => { const target = moment; closeMomentDetail(); focusConversation(`Zu „${target.title}“ weiterdenken: `, { kind: "learning_moment", id: target.id, label: target.title }); }}><MessageSquareText size={15} /> Mit Critical Friend weiterdenken</button><button on:click={startEditMoment}>Bearbeiten</button><button on:click={() => { closeMomentDetail(); selectPerspective("timeline"); }}>Zeitlich einplanen</button></div>
          </div>
        {/if}
      </dialog>
    </div>
  {/if}

  {#if addMomentOpen}
    <div class="planning-overlay" role="presentation" on:click={() => (addMomentOpen = false)}>
      <dialog class="start-modal" open aria-label="Lernmoment hinzufügen" on:click|stopPropagation>
        <header><div><span>Neuer Lernmoment</span><h2>Was sollen Lernende hier erleben?</h2></div><button class="icon-button" on:click={() => (addMomentOpen = false)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={confirmAddMoment}>
          <label>Pädagogischer Typ<select bind:value={newMomentForm.kind}>{#each Object.entries(momentKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <label>Titel<input bind:value={newMomentForm.title} placeholder="z. B. KI begegnet Menschenbildern" /></label>
          <label>Didaktische Funktion <small>optional</small><textarea bind:value={newMomentForm.didacticPurpose} rows="2" placeholder="Wozu dient dieser Moment?"></textarea></label>
          <label>Lernaktivität <small>optional</small><textarea bind:value={newMomentForm.learningActivity} rows="2" placeholder="Was tun die Lernenden?"></textarea></label>
          <label>Erwartete Lernerfahrung <small>optional</small><textarea bind:value={newMomentForm.expectedExperience} rows="2" placeholder="Was soll spürbar oder erkennbar werden?"></textarea></label>
          <div class="pad-actions"><button type="button" class="ghost" on:click={developMomentWithCriticalFriend}>Mit Critical Friend entwickeln</button><button type="submit" disabled={newMomentForm.title.trim().length < 2}>Lernmoment aufnehmen</button></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if transitionDetail}
    {@const transition = transitionDetail}
    <div class="planning-overlay" role="presentation" on:click={() => (transitionDetail = null)}>
      <dialog class="start-modal" open aria-label="Übergang" on:click|stopPropagation>
        <header><div><span>Übergang</span><h2>{momentTitle(transition.from)} → {momentTitle(transition.to)}</h2></div><button class="icon-button" on:click={() => (transitionDetail = null)} aria-label="Schließen"><X size={20} /></button></header>
        {#if transitionEditing && transitionDraft}
          <form class="start-form" on:submit|preventDefault={saveTransition}>
            <label>Übergangstyp<select bind:value={transitionDraft.kind}>{#each Object.entries(transitionKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
            <label>Pädagogische Begründung<textarea bind:value={transitionDraft.rationale} rows="3"></textarea></label>
            <div class="pad-actions"><button type="button" class="ghost" on:click={() => { transitionEditing = false; transitionDraft = null; }}>Abbrechen</button><button type="submit">Änderung festhalten</button></div>
          </form>
        {:else}
          <div class="detail-body">
            <dl><dt>Übergangstyp</dt><dd>{transitionKindLabels[transition.kind] ?? transition.kind}</dd><dt>Pädagogische Begründung</dt><dd>{transition.rationale || "—"}</dd></dl>
            <div class="detail-actions"><button on:click={startEditTransition}>Bearbeiten</button><button on:click={checkTransitionWithCriticalFriend}><MessageSquareText size={15} /> Mit Critical Friend prüfen</button><button on:click={proposeMissingMoment}>Fehlenden Lernmoment vorschlagen</button><button class="danger" on:click={removeTransition}>Entfernen</button></div>
          </div>
        {/if}
      </dialog>
    </div>
  {/if}

  {#if boardProposal}
    <div class="planning-overlay" role="presentation" on:click={() => (boardProposal = null)}>
      <dialog class="start-modal" open aria-label="Arbeitsvorhaben vorschlagen" on:click|stopPropagation>
        <header><div><span>Arbeitsvorhaben vorschlagen</span><h2>Aus Materialbedarf wird ein Vorhaben</h2></div><button class="icon-button" on:click={() => (boardProposal = null)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={confirmBoardProposal}>
          <label>Titel<input bind:value={boardProposal.title} /></label>
          <label>Art<select bind:value={boardProposal.kind}>{#each Object.entries(boardKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <label>Erwartetes Ergebnis <small>optional</small><textarea bind:value={boardProposal.expectedResult} rows="2" placeholder="Was soll am Ende vorliegen?"></textarea></label>
          <label>Zu welchem Unterrichtsfenster? <small>optional</small><select bind:value={boardProposal.windowId}><option value="">Noch offen</option>{#each temporalPlan?.windows ?? [] as window}<option value={window.id}>{window.title}</option>{/each}</select></label>
          <p class="privacy-hint"><ShieldCheck size={15} /> Erst deine Zustimmung nimmt das Vorhaben ins Planungsboard auf.</p>
          <div class="pad-actions"><button type="button" class="ghost" on:click={() => (boardProposal = null)}>Verwerfen</button><button type="submit" disabled={boardProposal.title.trim().length < 2}>Ins Planungsboard aufnehmen</button></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if boardDetail}
    {@const item = boardDetail}
    <div class="planning-overlay" role="presentation" on:click={() => (boardDetail = null)}>
      <dialog class="start-modal detail-modal" open aria-label="Arbeitsvorhaben" on:click|stopPropagation>
        <header><div><span>Arbeitsvorhaben · {boardKindLabels[item.kind] ?? item.kind}</span><h2>{item.title}</h2></div><button class="icon-button" on:click={() => (boardDetail = null)} aria-label="Schließen"><X size={20} /></button></header>
        <div class="detail-body">
          <dl>
            <dt>Status</dt><dd>{boardStatusLabels[item.status] ?? item.status}</dd>
            {#if item.expectedResult}<dt>Erwartetes Ergebnis</dt><dd>{item.expectedResult}</dd>{/if}
            {#if item.materialNeed}<dt>Materialbedarf</dt><dd>{item.materialNeed}</dd>{/if}
            {#if item.relatedNodes.length}<dt>Bezug zum Lernmoment</dt><dd>{item.relatedNodes.map(momentTitle).join(", ")}</dd>{/if}
            {#if item.relatedWindows.length}<dt>Bezug zum Unterrichtsfenster</dt><dd>{item.relatedWindows.map(windowTitle).join(", ")}</dd>{/if}
            <dt>Freigabe</dt><dd>{item.reviewedAt ? `fachlich freigegeben von ${item.reviewedBy || "Lehrkraft"} am ${new Date(item.reviewedAt).toLocaleString("de-DE")}` : item.requiresTeacherApproval ? "erfordert fachliche Freigabe" : "keine Freigabe nötig"}</dd>
          </dl>
          <div class="detail-actions"><button on:click={() => clarifyBoardItem(item)}><MessageSquareText size={15} /> Im Gespräch klären</button><button on:click={() => commissionBoardDraft(item)}>Entwurf beauftragen</button><button on:click={() => reviewBoardDraft(item)}>Ergebnis prüfen</button><button on:click={() => requestBoardApproval(item)}><Check size={15} /> Freigeben</button><button class="danger" on:click={() => discardBoardItem(item)}>Verwerfen</button></div>
          <p class="muted">Ein Entwurf entsteht nur durch die ausdrückliche Aktion „Entwurf beauftragen“ – nicht durch das Verschieben der Karte. Die fachliche Freigabe erfordert eine bestätigte Prüfung.</p>
        </div>
      </dialog>
    </div>
  {/if}

  {#if reviewBoardItem && reviewBoardMaterial}
    {@const item = reviewBoardItem}
    {@const material = reviewBoardMaterial}
    <div class="planning-overlay" role="presentation" on:click={() => { reviewBoardItem = null; reviewBoardMaterial = null; }}>
      <dialog class="start-modal review-modal" open aria-label="Entwurf prüfen" on:click|stopPropagation>
        <header><div><span>Entwurf zur Prüfung</span><h2>{item.title}</h2></div><button class="icon-button" on:click={() => { reviewBoardItem = null; reviewBoardMaterial = null; }} aria-label="Schließen"><X size={20} /></button></header>
        <div class="detail-body">
          <section class="material-preview">
            <h3>Entwurf</h3>
            <pre>{material.content.slice(0, 800)}</pre>
            {#if material.content.length > 800}<p class="muted">… ({material.content.length} Zeichen gesamt)</p>{/if}
            {#if material.review}<div class="review-info"><strong>Automatische Vorprüfung:</strong> {material.review.status === "passed" ? "✓ Bestanden" : "✗ Fehlgeschlagen"}</div>{/if}
          </section>
          <section class="review-actions">
            <p>Prüfe den Entwurf sorgfältig. Nach deiner Prüfung kannst du ihn für den Unterricht freigeben.</p>
            <div class="detail-actions">
              <button on:click={() => { reviewBoardItem = null; reviewBoardMaterial = null; }}>Später weitermachen</button>
              <button on:click={() => confirmBoardReview()}><Check size={15} /> Prüfung abgeschlossen</button>
            </div>
          </section>
        </div>
      </dialog>
    </div>
  {/if}

  {#if approvalConfirm}
    {@const item = approvalConfirm}
    <div class="planning-overlay" role="presentation" on:click={() => (approvalConfirm = null)}>
      <dialog class="start-modal" open aria-label="Fachliche Freigabe" on:click|stopPropagation>
        <header><div><span>Fachliche Freigabe</span><h2>„{item.title}“ freigeben?</h2></div><button class="icon-button" on:click={() => (approvalConfirm = null)} aria-label="Schließen"><X size={20} /></button></header>
        <div class="detail-body">
          <p>Die Freigabe kennzeichnet das Material als „für den Unterricht bereit“. Sie wird mit Zeitpunkt und prüfender Rolle festgehalten und lässt sich nicht durch Verschieben der Karte ersetzen.</p>
          {#if workerMaterial}<button class="link-action" on:click={() => { approvalConfirm = null; roomView = "materials"; }}>Entwurf zuerst ansehen</button>{/if}
          <label class="review-check"><input type="checkbox" bind:checked={approvalReviewed} /> Ich habe den Entwurf fachlich geprüft und gebe ihn für den Unterricht frei.</label>
          <div class="detail-actions"><button on:click={() => (approvalConfirm = null)}>Abbrechen</button><button disabled={!approvalReviewed} on:click={confirmBoardApproval}><Check size={15} /> Fachlich freigeben</button></div>
        </div>
      </dialog>
    </div>
  {/if}

  {#if windowForm}
    <div class="planning-overlay" role="presentation" on:click={() => (windowForm = null)}>
      <dialog class="start-modal" open aria-label="Unterrichtsfenster" on:click|stopPropagation>
        <header><div><span>{windowForm.id ? "Fenster bearbeiten" : "Neues Unterrichtsfenster"}</span><h2>Wann findet Unterricht statt?</h2></div><button class="icon-button" on:click={() => (windowForm = null)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={saveWindow}>
          <label>Titel<input bind:value={windowForm.title} placeholder="z. B. Stunde 1 – Einstieg" /></label>
          <label>Art<select bind:value={windowForm.kind} on:change={onWindowKindChange}>{#each Object.entries(windowKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <label>Dauer in Minuten<input type="number" min="5" step="5" bind:value={windowForm.durationMinutes} /></label>
          <label>Notiz <small>optional</small><textarea bind:value={windowForm.note} rows="2" placeholder="z. B. Raum, besondere Rahmenbedingungen"></textarea></label>
          <div class="pad-actions"><button type="button" class="ghost" on:click={() => (windowForm = null)}>Abbrechen</button><button type="submit" disabled={windowForm.title.trim().length < 2 || windowForm.durationMinutes <= 0}>{windowForm.id ? "Änderung festhalten" : "Fenster anlegen"}</button></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if windowDeleteConfirm}
    {@const target = windowDeleteConfirm}
    <div class="planning-overlay" role="presentation" on:click={() => (windowDeleteConfirm = null)}>
      <dialog class="start-modal" open aria-label="Fenster löschen" on:click|stopPropagation>
        <header><div><span>Sicherheitsprüfung</span><h2>Fenster wirklich löschen?</h2></div><button class="icon-button" on:click={() => (windowDeleteConfirm = null)} aria-label="Schließen"><X size={20} /></button></header>
        <div class="detail-body"><p>„{target.title}“ enthält {placementsInWindow(target.id).length} zeitliche Platzierung{placementsInWindow(target.id).length === 1 ? "" : "en"}. Beim Löschen werden diese Platzierungen entfernt. Die Lernmomente selbst bleiben in der Lernlandschaft erhalten.</p><div class="detail-actions"><button on:click={() => (windowDeleteConfirm = null)}>Behalten</button><button class="danger" on:click={() => deleteWindow(target)}>Fenster und Platzierungen löschen</button></div></div>
      </dialog>
    </div>
  {/if}

  {#if placementConfirm}
    {@const confirmData = placementConfirm}
    <div class="planning-overlay" role="presentation" on:click={() => (placementConfirm = null)}>
      <dialog class="start-modal" open aria-label="Zeitliche Platzierung bestätigen" on:click|stopPropagation>
        <header><div><span>Zeitlich einplanen</span><h2>„{confirmData.moment.title}“ platzieren</h2></div><button class="icon-button" on:click={() => (placementConfirm = null)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={confirmPlacement}>
          <p class="muted">In „{confirmData.window.title}“ ({windowKindLabels[confirmData.window.kind]}, {confirmData.window.durationMinutes} min). Der Lernmoment bleibt in der Lernlandschaft unverändert.</p>
          <label>Beginn ab Minute<input type="number" min="0" step="5" bind:value={confirmData.startMinute} /></label>
          <label>Dauer in Minuten<input type="number" min="5" step="5" bind:value={confirmData.durationMinutes} /></label>
          <label>Dramaturgische Rolle<select bind:value={confirmData.dramaturgicalRole}>{#each Object.entries(dramaturgicalRoleLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <label>Modus<select bind:value={confirmData.mode}>{#each Object.entries(placementModeLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <div class="pad-actions"><button type="button" class="ghost" on:click={() => (placementConfirm = null)}>Abbrechen</button><button type="submit">Platzierung speichern</button></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if placementDraft}
    {@const draft = placementDraft}
    <div class="planning-overlay" role="presentation" on:click={() => (placementDraft = null)}>
      <dialog class="start-modal" open aria-label="Platzierung bearbeiten" on:click|stopPropagation>
        <header><div><span>Platzierung bearbeiten</span><h2>{momentTitle(draft.momentId)}</h2></div><button class="icon-button" on:click={() => (placementDraft = null)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={savePlacement}>
          <label>Unterrichtsfenster<select bind:value={draft.windowId}>{#each temporalPlan?.windows ?? [] as window}<option value={window.id}>{window.title}</option>{/each}</select></label>
          <label>Beginn ab Minute<input type="number" min="0" step="5" bind:value={draft.startMinute} /></label>
          <label>Dauer in Minuten<input type="number" min="5" step="5" bind:value={draft.durationMinutes} /></label>
          <label>Dramaturgische Rolle<select bind:value={draft.dramaturgicalRole}>{#each Object.entries(dramaturgicalRoleLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <label>Modus<select bind:value={draft.mode}>{#each Object.entries(placementModeLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <label>Notiz <small>optional</small><textarea bind:value={draft.note} rows="2"></textarea></label>
          <div class="pad-actions"><button type="button" class="danger" on:click={() => removePlacement(draft)}>Platzierung entfernen</button><button type="submit">Änderung festhalten</button></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if windowDetail}
    {@const detail = windowDetail}
    <div class="planning-overlay" role="presentation" on:click={() => (windowDetail = null)}>
      <dialog class="start-modal detail-modal window-detail" open aria-label="Stunden-Detailansicht" on:click|stopPropagation>
        <header><div><span>{windowKindLabels[detail.kind]} · {detail.durationMinutes} min</span><h2>{detail.title}</h2></div><button class="icon-button" on:click={() => (windowDetail = null)} aria-label="Schließen"><X size={20} /></button></header>
        <div class="detail-body">
          {#if windowConflicts(detail).length > 0}<ul class="window-conflicts">{#each windowConflicts(detail) as conflict}<li><TriangleAlert size={12} /> {conflict}</li>{/each}</ul>{/if}
          <section class="detail-block"><strong>Dramaturgie im Verlauf</strong>{#if placementsInWindow(detail.id).length === 0}<p class="muted">Noch keine Lernmomente in diesem Fenster.</p>{:else}<div class="dramaturgy-track">{#each placementsInWindow(detail.id) as placement}<div class="dramaturgy-slot mode-{placement.mode}" style={`flex: ${Math.max(1, placement.durationMinutes)}`}><span>{formatMinute(placement.startMinute)}</span><strong>{momentTitle(placement.momentId)}</strong><em>{dramaturgicalRoleLabels[placement.dramaturgicalRole]} · {placementModeLabels[placement.mode]}</em></div>{/each}</div>{/if}</section>
          {#if placementsInWindow(detail.id).length > 0}<section class="detail-block"><strong>Tabellarischer Verlaufsplan</strong><table class="lesson-table"><thead><tr><th>Zeit</th><th>Funktion</th><th>Lernaktivität</th><th>Modus</th></tr></thead><tbody>{#each placementsInWindow(detail.id) as placement}{@const moment = learningLandscape?.moments.find((entry) => entry.id === placement.momentId)}<tr on:click={() => openPlacementEditor(placement)}><td>{formatMinute(placement.startMinute)}–{formatMinute(placement.startMinute + placement.durationMinutes)}</td><td>{dramaturgicalRoleLabels[placement.dramaturgicalRole]}</td><td>{moment?.learningActivity || moment?.title || "—"}</td><td>{placementModeLabels[placement.mode]}</td></tr>{/each}</tbody></table></section>{/if}
          <div class="detail-actions"><button on:click={() => { const target = detail; windowDetail = null; openWindowForm(target); }}>Fenster bearbeiten</button><button on:click={() => { windowDetail = null; focusConversation(`Zur Dramaturgie von „${detail.title}“ weiterdenken: `, { kind: "teaching_window", id: detail.id, label: detail.title }); }}><MessageSquareText size={15} /> Mit Critical Friend weiterdenken</button></div>
        </div>
      </dialog>
    </div>
  {/if}

  {#if pendingConnection && learningLandscape}
    <div class="planning-overlay" role="presentation" on:click={closeConnectionForm}>
      <dialog class="start-modal" open aria-label="Didaktische Bedeutung des Übergangs" on:click|stopPropagation>
        <header><div><span>Neue Verbindung</span><h2>Was bedeutet dieser Übergang?</h2></div><button class="icon-button" on:click={closeConnectionForm} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={confirmCanvasConnection}>
          <p class="muted">{momentTitle(pendingConnection.source)} → {momentTitle(pendingConnection.target)}</p>
          <label>Didaktische Bedeutung<select bind:value={connectionKind}>{#each Object.entries(transitionKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <label>Begründung <small>optional</small><textarea bind:value={connectionRationale} rows="3" placeholder="Wozu führt dieser Übergang für die Lernenden?"></textarea></label>
          <p class="privacy-hint">Erst nach deiner Auswahl wird der Übergang in der Lernlandschaft festgehalten.</p>
          <div class="pad-actions"><button type="button" class="ghost" on:click={closeConnectionForm}>Abbrechen</button><button type="submit">Verbindung festhalten</button></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if groupForm}
    <div class="planning-overlay" role="presentation" on:click={() => (groupForm = null)}>
      <dialog class="start-modal" open aria-label="Lernfläche bearbeiten" on:click|stopPropagation>
        <header><div><span>{groupForm.id ? "Lernfläche bearbeiten" : "Neue Lernfläche"}</span><h2>Was soll zusammen sichtbar sein?</h2></div><button class="icon-button" on:click={() => (groupForm = null)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={saveGroupForm}>
          <label>Bezeichnung<input bind:value={groupForm.title} placeholder="z. B. Gemeinsamer Einstieg" /></label>
          <label>Art<select bind:value={groupForm.kind}>{#each Object.entries(landscapeGroupKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label>
          <fieldset class="group-members"><legend>Lernmomente in dieser Fläche</legend>{#each learningLandscape?.moments ?? [] as moment}<label><input type="checkbox" checked={groupForm.memberIds.includes(moment.id)} on:change={() => toggleGroupMember(moment.id)} /> {moment.title}</label>{/each}</fieldset>
          <p class="privacy-hint"><Layers size={15} /> Die Fläche unterstützt Orientierung. Sie verändert weder die Lernlandschaft noch die Übergänge.</p>
          <div class="pad-actions">{#if groupForm.id}<button type="button" class="danger" on:click={removeGroupForm}>Fläche entfernen</button>{/if}<button type="button" class="ghost" on:click={() => (groupForm = null)}>Abbrechen</button><button type="submit" disabled={groupForm.title.trim().length < 2}>Fläche speichern</button></div>
        </form>
      </dialog>
    </div>
  {/if}
  {#if planningModal && learningLandscape}
    <div class="planning-overlay" role="presentation" on:click={() => (planningModal = false)}>
      <dialog class="planning-modal" open aria-label="Unterrichtsplanung" on:click|stopPropagation>
        <header class="planning-modal-header"><div><span>Unterrichtsplanung</span><h2>{learningLandscape.title}</h2></div><button class="icon-button" on:click={() => (planningModal = false)} aria-label="Unterrichtsplanung schließen"><X size={20} /></button></header>
        <nav class="planning-tabs" aria-label="Planungsansichten"><button role="tab" aria-selected={planningTab === "landscape"} class:active={planningTab === "landscape"} on:click={() => (planningTab = "landscape")}>Lernlandschaft</button><button role="tab" aria-selected={planningTab === "board"} class:active={planningTab === "board"} on:click={() => (planningTab = "board")}>Planungsboard</button></nav>
        <section class="planning-modal-content">
          {#if planningTab === "landscape"}
            <div class="modal-landscape-toolbar"><div><strong>Lernlandschaft</strong><span>Canvas und lineare Lesansicht greifen auf dieselbe Landschaft zu.</span></div><div class="title-actions"><button class="add-moment-button" on:click={() => (landscapeMode = "canvas")}><MapIcon size={14} /> Raumansicht</button><button class="add-moment-button" on:click={() => (landscapeMode = "linear")}><List size={14} /> Linear lesen</button><button class="add-moment-button ghost-action" on:click={() => openGroupForm()}><Layers size={14} /> Fläche hinzufügen</button><button class="add-moment-button ghost-action" on:click={resetLandscapeLayout}><RotateCcw size={14} /> Layout zurücksetzen</button></div></div>
            {#if landscapeMode === "canvas"}<div class="modal-flow-canvas flow-canvas" role="application" aria-label="Lernlandschaft im Canvas"><SvelteFlow bind:nodes={canvasNodes} bind:edges={canvasEdges} nodeTypes={canvasNodeTypes} fitView={landscapeViewport === undefined} initialViewport={landscapeViewport} nodesDraggable={true} nodesConnectable={true} nodesFocusable={true} edgesFocusable={true} onnodedragstop={() => void saveLandscapeLayout()} onmoveend={saveLandscapeViewport} onconnect={handleCanvasConnect} onnodeclick={(event) => handleCanvasNodeClick(event.node)} onedgeclick={(event) => openTransitionDetail(event.edge.id)}><Background /><Controls /><MiniMap /></SvelteFlow></div>{:else}<div class="modal-linear-note"><List size={24} /><h3>Lineare Lesansicht</h3><p>Die vollständige lineare Darstellung ist im Planungsraum verfügbar. Sie bleibt aus derselben Lernlandschaft abgeleitet und zeigt Wahl- und Parallelwege ausdrücklich.</p><button on:click={() => { planningModal = false; roomView = "landscape"; }}>Lineare Lesansicht öffnen</button></div>{/if}
          {:else}<div class="board-view inline">{#each boardColumns as column}<section class="board-column" role="list" aria-label={column.label}><header><strong>{column.label}</strong><span>{column.hint}</span></header><div class="board-cards">{#each planningBoard?.items.filter((item) => item.column === column.id) ?? [] as item}<button class="board-card" on:click={() => { planningModal = false; boardDetail = item; }}><span class="board-kind">{boardKindLabels[item.kind] ?? item.kind}</span><strong>{item.title}</strong><small>{boardStatusLabels[item.status] ?? item.status}</small></button>{/each}</div></section>{/each}</div>{/if}
        </section>
      </dialog>
    </div>
  {/if}
  {#if proposal}
    {@const current = proposal}
    <div class="planning-overlay" role="presentation" on:click={() => (proposal = null)}>
      <dialog class="start-modal detail-modal" open aria-label="Vorschlag des Critical Friend" on:click|stopPropagation>
        <header><div><span>Vorschlag · noch nicht übernommen</span><h2>{proposalKindTitles[current.kind] ?? "Vorschlag"}</h2></div><button class="icon-button" on:click={() => (proposal = null)} aria-label="Schließen"><X size={20} /></button></header>
        <div class="detail-body">
          <dl>
            <dt>Begründung</dt><dd>{current.rationale}</dd>
            <dt>Erwartete Konsequenz</dt><dd>{current.expectedConsequence}</dd>
          </dl>
          {#if current.moment}<section class="detail-block"><strong>Vorgeschlagener Lernmoment</strong><dl><dt>Titel</dt><dd>{current.moment.title}</dd><dt>Typ</dt><dd>{momentKindLabels[current.moment.kind] ?? current.moment.kind}</dd><dt>Funktion</dt><dd>{current.moment.didacticPurpose}</dd><dt>Lernaktivität</dt><dd>{current.moment.learningActivity}</dd></dl></section>{/if}
          {#if current.possibleTransitions && current.possibleTransitions.length}<section class="detail-block"><strong>Mögliche Übergänge</strong><ul>{#each current.possibleTransitions as edge}<li>{edge.fromLabel} → {edge.toLabel}</li>{/each}</ul></section>{/if}
          {#if current.transition}<section class="detail-block"><strong>Vorgeschlagener Übergang</strong><p>{momentTitle(current.transition.from)} → {momentTitle(current.transition.to)} · {transitionKindLabels[current.transition.kind] ?? current.transition.kind}</p><p class="muted">{current.transition.rationale}</p></section>{/if}
          {#if current.placement}<section class="detail-block"><strong>Vorgeschlagene Platzierung</strong><p>{momentTitle(current.placement.momentId)} in „{current.placementWindowLabel}“ · {formatMinute(current.placement.startMinute)}–{formatMinute(current.placement.startMinute + current.placement.durationMinutes)}</p></section>{/if}
          {#if current.boardItem}<section class="detail-block"><strong>Vorgeschlagenes Arbeitsvorhaben</strong><dl><dt>Titel</dt><dd>{current.boardItem.title}</dd><dt>Art</dt><dd>{boardKindLabels[current.boardItem.kind] ?? current.boardItem.kind}</dd>{#if current.boardItem.expectedResult}<dt>Erwartetes Ergebnis</dt><dd>{current.boardItem.expectedResult}</dd>{/if}</dl></section>{/if}
          {#if current.timeEffect}<p class="muted">{current.timeEffect}</p>{/if}
          <div class="detail-actions"><button on:click={acceptProposal}><Check size={15} /> Übernehmen</button><button on:click={refineProposalInConversation}><MessageSquareText size={15} /> Im Gespräch ändern</button><button class="danger" on:click={() => (proposal = null)}>Verwerfen</button></div>
          <p class="muted">Erst „Übernehmen“ schreibt diesen Vorschlag kanonisch. Bis dahin bleibt der Denkstand unverändert.</p>
        </div>
      </dialog>
    </div>
  {/if}
  </main>
</div>




