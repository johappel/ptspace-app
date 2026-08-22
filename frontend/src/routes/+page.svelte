<script lang="ts">
  import { onMount, tick } from "svelte";
  import { AlertCircle, ArrowRight, ArrowUp, BookOpen, Check, CheckCircle2, ChevronDown, FileText, Folder, GripVertical, Layers, Lightbulb, List, ListChecks, Map as MapIcon, MessageSquareText, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Scale, Search, Settings, ShieldCheck, TriangleAlert, X } from "lucide-svelte";
  import { api, type ConversationMarker, type ConversationMessage, type ExportApproval, type FocusedObject, type FocusMode, type LearningLandscape, type LearningLandscapeLayout, type LearningLandscapeLayoutGroup, type LearningLandscapeViewport, type LearningMoment, type MaterialMetadata, type PedagogicalFocus, type PlanningBoard, type PlanningBoardItem, type PlanningSpace, type SensitiveFinding, type ServiceRequest, type TeachingWindow, type TemporalPlan, type ThinkingCard, type TimePlacement, type WorkerMaterial } from "$lib/api";
  import { Background, Controls, MiniMap, SvelteFlow, type Connection, type Edge, type Node, type NodeTypes } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import LearningMomentNode from "$lib/LearningMomentNode.svelte";
  import LearningGroupNode from "$lib/LearningGroupNode.svelte";
  import { uuid } from "$lib/uuid";
  import { markdownToHtml as markdownToHtmlShared, htmlToMarkdown as htmlToMarkdownShared } from "$lib/markdown";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";

  type UiMessage = { id: string; author: "teacher" | "critical_friend" | "system"; text: string; createdAt?: string };
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
  let conversationLoading = false;
  let conversationLoadError = "";
  let renderedMessages: UiMessage[] = [];
  let draftMessage = "";
  let activeFocus: PedagogicalFocus | null = null;
  let lastFailedMessage: { text: string; focus: PedagogicalFocus | null } | null = null;
  let focusMode: FocusMode = "conversation";
  let focusedObject: FocusedObject = null;
  let previousFocusMode: FocusMode = "conversation";
  let previousFocusedObject: FocusedObject = null;
  let companionExpanded = false;
  let companionStrip = false;
  let designNotes = "";
  let editingDesign = false;
  let savingDesign = false;
  let messagesElement: HTMLDivElement | null = null;
  let composerElement: HTMLTextAreaElement | null = null;
  let roomOverview: import("$lib/api").RoomOverview | null = null;
  let attentionBusy = false;
  let statusDetailsOpen = false;
  let exportMenuOpen = false;
  let decisionToRecord = "";
  let decisionReason = "";
  let decisionMarkerSourceId = "";
  let decisionModalOpen = false;
  let settingsOpen = false;
  let runtimeStatus = "Runtime-Status wird geprüft …";
  let simulatedMode = false;
  let workspaceElement: HTMLElement | null = null;
  let railCollapsed = true;
  let primaryWidth = 78;
  let newRoom = { title: "", subject: "", targetGroup: "", initialIdea: "" };
  let planningModal = false;
  let createRoomModal = false;
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
  let roomSearch = "";
  let roomCategories: Record<string, string> = {};
  let roomCategoryNames: string[] = [];
  let openRoomCategories: Record<string, boolean> = {};
  let roomMenuOpenId = "";
  let draggedSpaceId = "";
  let newCategoryModal = false;
  let newCategoryName = "";
  let roomCategoryError = "";
  let pinnwandOpen = false;
  let recentMarkerId = "";
  let recentMarkerTimer: number | null = null;
  let deferredAttentionId = "";
  let continuedAttentionId = "";
  let attentionFocused = false;
  let attentionDeferred = false;
  let visiblePinnwandMarkers: ConversationMarker[] = [];
  let pinnwandThoughts: ConversationMarker[] = [];
  let pinnwandOpenQuestions: ConversationMarker[] = [];
  let pinnwandDecisions: ConversationMarker[] = [];
  let pinnwandSections: Array<{ id: string; title: string; hint: string; items: ConversationMarker[] }> = [];
  let focusRegionElement: HTMLElement | null = null;
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
  let spaceLoadVersion = 0;
  let workflowRefreshInFlight = false;
  const lastOpenedSpaceKey = "ptspace.last-opened-planning-space";
  const roomCategoriesStorageKey = "ptspace.room-categories";
  const roomCategoryNamesStorageKey = "ptspace.room-category-names";
  const boardColumns: Array<{ id: PlanningBoardItem["column"]; label: string; hint: string }> = [
    { id: "clarify", label: "Noch klären", hint: "Entscheidungen und Recherche" },
    { id: "prepare", label: "Vorbereiten", hint: "Dramaturgie und Materialien" },
    { id: "review", label: "Zur Prüfung", hint: "Ergebnisse gemeinsam ansehen" },
    { id: "ready", label: "Bereit", hint: "fachlich freigegeben" }
  ];
  const canvasNodeTypes: NodeTypes = { learningMoment: LearningMomentNode, learningGroup: LearningGroupNode };


  onMount(() => {
    soundsEnabled = localStorage.getItem("ptspace.sounds-enabled") === "true";
    reducedMotion = localStorage.getItem("ptspace.reduced-motion") === "true";
    try {
      const storedCategories = JSON.parse(localStorage.getItem(roomCategoriesStorageKey) ?? "{}");
      if (storedCategories && typeof storedCategories === "object" && !Array.isArray(storedCategories)) roomCategories = storedCategories as Record<string, string>;
      const storedNames = JSON.parse(localStorage.getItem(roomCategoryNamesStorageKey) ?? "[]");
      const savedNames = Array.isArray(storedNames) ? storedNames.filter((name): name is string => typeof name === "string" && name.trim().length > 0) : [];
      roomCategoryNames = [...new Set([...savedNames, ...Object.values(roomCategories).filter(Boolean)])];
    } catch {
      roomCategories = {};
      roomCategoryNames = [];
    }
    void (async () => {
      try {
        await refreshSpaces();
      } catch (err) {
        error = err instanceof Error ? err.message : "Die Planungsraeume konnten noch nicht geladen werden.";
      } finally {
        loading = false;
      }
    })();
    void (async () => {
      try {
        const health = await api.getRuntimeStatus();
        simulatedMode = health.harness === "mock";
      } catch {
        // If the health probe fails the composer still works; the banner stays hidden.
      }
    })();
    const workflowTimer = window.setInterval(() => {
      if (document.hidden || !activeSpace || sending || !hasActiveBackgroundWork()) return;
      void refreshWorkflowProjection(activeSpace.id, spaceLoadVersion);
    }, 5000);
    return () => window.clearInterval(workflowTimer);
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

  function roomCategoryFor(space: PlanningSpace) {
    return roomCategories[space.id] ?? "";
  }

  function persistRoomCategories() {
    localStorage.setItem(roomCategoriesStorageKey, JSON.stringify(roomCategories));
  }

  function persistRoomCategoryNames() {
    localStorage.setItem(roomCategoryNamesStorageKey, JSON.stringify(roomCategoryNames));
  }

  function assignRoomCategory(spaceId: string, category: string) {
    roomCategories = { ...roomCategories, [spaceId]: category };
    if (category && !roomCategoryNames.includes(category)) {
      roomCategoryNames = [...roomCategoryNames, category];
      persistRoomCategoryNames();
    }
    persistRoomCategories();
    roomMenuOpenId = "";
  }

  function toggleRoomCategory(category: string) {
    openRoomCategories = { ...openRoomCategories, [category]: !(openRoomCategories[category] ?? true) };
  }

  function createRoomCategory() {
    const category = newCategoryName.trim();
    roomCategoryError = "";
    if (!category) {
      roomCategoryError = "Bitte gib der Kategorie einen Namen.";
      return;
    }
    if (category.toLocaleLowerCase("de-DE") === "unkategorisiert" || roomCategoryNames.some((name) => name.toLocaleLowerCase("de-DE") === category.toLocaleLowerCase("de-DE"))) {
      roomCategoryError = "Diese Kategorie gibt es bereits.";
      return;
    }
    roomCategoryNames = [...roomCategoryNames, category];
    openRoomCategories = { ...openRoomCategories, [category]: true };
    persistRoomCategoryNames();
    newCategoryName = "";
    newCategoryModal = false;
  }

  function startRoomDrag(spaceId: string, event: DragEvent) {
    draggedSpaceId = spaceId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", spaceId);
    }
  }

  function allowRoomDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function dropSpaceInCategory(category: string, event: DragEvent) {
    event.preventDefault();
    const spaceId = event.dataTransfer?.getData("text/plain") || draggedSpaceId;
    if (spaceId) assignRoomCategory(spaceId, category);
    draggedSpaceId = "";
  }

  function dropSpaceUncategorized(event: DragEvent) {
    dropSpaceInCategory("", event);
  }

  function openKnowledgebase() {
    roomAccessOpen = false;
    if (activeSpace) {
      void chooseRoomView("knowledge");
      return;
    }
    createRoomModal = true;
  }

  async function createSpace() {
    error = "";
    if (newRoom.title.trim().length < 3) {
      error = "Bitte gib dem Planungsraum einen klaren Titel.";
      return;
    }
    try {
      const created = await api.createPlanningSpace(newRoom);
      spaces = [created, ...spaces];
      const initialIdea = newRoom.initialIdea;
      newRoom = { title: "", subject: "", targetGroup: "", initialIdea: "" };
      await openSpace(created);
      await scanText(initialIdea);
    } catch (err) {
      error = err instanceof Error
        ? err.message
        : "Der neue Denkraum konnte wegen eines Verbindungsproblems noch nicht angelegt werden.";
    }
  }

  async function openSpace(space: PlanningSpace) {
    const loadVersion = ++spaceLoadVersion;
    activeSpace = space;
    localStorage.setItem(lastOpenedSpaceKey, space.id);
    focusMode = "conversation";
    focusedObject = null;
    previousFocusMode = "conversation";
    previousFocusedObject = null;
    roomAccessOpen = false;
    pinnwandOpen = false;
    recentMarkerId = "";
    deferredAttentionId = "";
    continuedAttentionId = "";
    statusDetailsOpen = false;
    activeFocus = null;
    companionExpanded = false;
    companionStrip = false;
    learningLandscape = null;
    planningBoard = null;
    temporalPlan = null;
    planningError = "";
    planningModal = false;
    momentDetail = null;
    transitionDetail = null;
    boardDetail = null;
    reviewBoardItem = null;
    reviewBoardMaterial = null;
    approvalConfirm = null;
    proposal = null;
    materials = [];
    error = "";
    messages = [{ id: "welcome", author: "critical_friend", text: `Hallo, ich habe Zeit für dich. Woran möchtest du in "${space.title}" heute weiterdenken?` }];

    messageFilter = "all";
    conversationLoading = true;
    conversationLoadError = "";

    try {
      try {
        const result = await api.getMessages(space.id);
        if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
        if (result.messages.length > 0) messages = result.messages;
      } catch (err) {
        if (isCurrentSpaceLoad(space.id, loadVersion)) {
          conversationLoadError = err instanceof Error ? err.message : "Der Gesprächsverlauf konnte noch nicht geladen werden.";
          error = conversationLoadError;
        }
      } finally {
        if (isCurrentSpaceLoad(space.id, loadVersion)) conversationLoading = false;
      }

      const state = await api.getThinkingState(space.id);
      if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
      const notes = await api.getDesignNotes(space.id);
      if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
      designNotes = notes.content;
      cards = state.cards;
      const exportStatus = await api.getExportStatus(space.id);
      if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
      markdownApproval = exportStatus.markdown;
      okfApproval = exportStatus.okfMarkdown;
      const loadedServiceRequests = (await api.getServiceRequests(space.id)).requests;
      if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
      serviceRequests = loadedServiceRequests;
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
      if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
      showWorkerMaterial = false;
      serviceMessage = "";
      findings = [];
      roomOverview = await api.getRoomOverview(space.id);
      syncAttentionDisposition(roomOverview.attentionCard);
      if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
      await loadMaterials(space.id, loadVersion);
      if (!isCurrentSpaceLoad(space.id, loadVersion)) return;
      roomAccessOpen = false;
      pinnwandOpen = false;
      messageFilter = "all";
      highlightedMessageId = "";
      markerReturnMessageId = "";
      expandedMaterialId = "";
      materialContents = {};
      materialContentLoading = {};
      await scrollConversationToEnd("auto");
    } catch (err) {
      if (isCurrentSpaceLoad(space.id, loadVersion)) {
        error = err instanceof Error ? err.message : "Der Planungsraum konnte noch nicht vollständig geladen werden.";
      }
    }
  }

  function isCurrentSpaceLoad(spaceId: string, loadVersion = spaceLoadVersion) {
    return activeSpace?.id === spaceId && spaceLoadVersion === loadVersion;
  }

  function deferredAttentionStorageKey(spaceId: string) {
    return `ptspace.deferred-attention.${spaceId}`;
  }

  function syncAttentionDisposition(card: import("@ptspace/shared").AttentionCard) {
    if (!activeSpace) return;
    const storedId = localStorage.getItem(deferredAttentionStorageKey(activeSpace.id));
    deferredAttentionId = storedId === card.id && card.kind !== "continue_conversation" ? storedId : "";
    if (continuedAttentionId && continuedAttentionId !== card.id) continuedAttentionId = "";
    if (!deferredAttentionId && storedId) localStorage.removeItem(deferredAttentionStorageKey(activeSpace.id));
  }

  async function returnFocusToConversation() {
    await tick();
    composerElement?.focus();
  }

  function hasActiveBackgroundWork() {
    return roomOverview?.backgroundWork.some((work) => work.status === "wartet_kurz" || work.status === "wird_vorbereitet") ?? false;
  }

  function mergePersistedMessages(persisted: ConversationMessage[]): UiMessage[] {
    const merged: UiMessage[] = [...persisted];
    for (const message of messages) {
      if (message.id === "welcome" || merged.some((entry) => entry.id === message.id)) continue;
      // A stream can close before the server response is read by the client. In
      // that case the persisted teacher message has a different id than the
      // optimistic one; avoid displaying the same turn twice.
      if (message.id.startsWith("optimistic-") && merged.some((entry) => entry.author === message.author && entry.text === message.text)) continue;
      merged.push(message);
    }
    return merged;
  }

  async function loadMaterials(spaceId: string, loadVersion = spaceLoadVersion) {
    materialsLoading = true;
    materialMessage = "";
    try {
      const result = await api.listMaterials(spaceId);
      if (!isCurrentSpaceLoad(spaceId, loadVersion)) return;
      materials = result.materials;
      materialTargetSelection = Object.fromEntries(result.materials.map((material) => [material.id, materialTargetSelection[material.id] ?? ""]));
    } catch (err) {
      materialMessage = err instanceof Error ? err.message : "Die Materialien konnten noch nicht geladen werden.";
    } finally {
      materialsLoading = false;
    }
  }

  async function refreshWorkflowProjection(spaceId: string, loadVersion = spaceLoadVersion) {
    if (!isCurrentSpaceLoad(spaceId, loadVersion) || workflowRefreshInFlight) return;
    workflowRefreshInFlight = true;
    try {
      const [requests, overview] = await Promise.all([api.getServiceRequests(spaceId), api.getRoomOverview(spaceId)]);
      if (!isCurrentSpaceLoad(spaceId, loadVersion)) return;
      serviceRequests = requests.requests;
      roomOverview = overview;
      syncAttentionDisposition(overview.attentionCard);
      if (overview.attentionCard.kind === "result_review") await loadMaterials(spaceId, loadVersion);
    } catch {
      // The closed status bar remains usable if a transient poll fails.
    } finally {
      workflowRefreshInFlight = false;
    }
  }

  async function actOnAttention() {
    if (!activeSpace || !roomOverview?.attentionCard.primaryAction || attentionBusy) return;
    const action = roomOverview.attentionCard.primaryAction;
    attentionBusy = true;
    error = "";
    try {
      if (action.kind === "accept_proposal") {
        const result = await api.acceptGuidedProposal(activeSpace.id, action.targetId);
        serviceRequests = [...serviceRequests.filter((entry) => entry.id !== result.request.id), result.request];
        serviceMessage = result.teacherFacingMessage;
      } else {
        const result = await api.reviewServiceRequest(activeSpace.id, action.targetId);
        serviceRequests = serviceRequests.map((entry) => entry.id === result.serviceRequest.id ? result.serviceRequest : entry);
        planningBoard = result.planningBoard;
        serviceMessage = result.teacherFacingMessage;
        await loadMaterials(activeSpace.id);
      }
      roomOverview = await api.getRoomOverview(activeSpace.id);
      syncAttentionDisposition(roomOverview.attentionCard);
      playFeedbackSound();
      await returnFocusToConversation();
    } catch (err) {
      error = err instanceof Error ? err.message : "Dieser Schritt konnte noch nicht gespeichert werden.";
    } finally {
      attentionBusy = false;
    }
  }

  function discussAttention() {
    const card = roomOverview?.attentionCard;
    if (!card) return;
    continuedAttentionId = card.id;
    deferredAttentionId = "";
    focusConversation(`Lass uns das gemeinsam weiterdenken: ${card.title} `, card.discussAction.focus);
  }

  async function deferAttention() {
    if (!activeSpace || !roomOverview || roomOverview.attentionCard.kind === "continue_conversation") return;
    const card = roomOverview.attentionCard;
    deferredAttentionId = card.id;
    continuedAttentionId = "";
    localStorage.setItem(deferredAttentionStorageKey(activeSpace.id), card.id);
    pinnwandOpen = false;
    await returnFocusToConversation();
  }

  async function reopenDeferredAttention() {
    if (!roomOverview || !activeSpace) return;
    deferredAttentionId = "";
    continuedAttentionId = "";
    localStorage.removeItem(deferredAttentionStorageKey(activeSpace.id));
    closePinnwand();
    await tick();
    focusRegionElement?.focus();
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
  function openBoardItemDetail(item: PlanningBoardItem) {
    focusedObject = { type: "work-item", id: item.id };
    companionExpanded = false;
    boardDetail = item;
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
    focusedObject = { type: "material", id: material.id };
    companionExpanded = false;
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
      syncAttentionDisposition(roomOverview.attentionCard);
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

  function contextualMessages() {
    if (!focusedObject) return messages.slice(-5);
    const object = focusedObject;
    const markerMessageIds = (roomOverview?.conversationMarkers ?? [])
      .filter((marker) => marker.id === object.id || marker.sourceMessageId === object.id || marker.targetId === object.id)
      .map((marker) => marker.sourceMessageId);
    const matchingIndexes = messages.map((message, index) => {
      if (object.type === "message" && message.id === object.id) return index;
      return markerMessageIds.includes(message.id) ? index : -1;
    }).filter((index) => index >= 0);
    if (matchingIndexes.length === 0) return messages.slice(-5);
    const indexes = new Set(matchingIndexes.flatMap((index) => [index - 1, index, index + 1]).filter((index) => index >= 0 && index < messages.length));
    return messages.filter((_message, index) => indexes.has(index));
  }

  function companionStripMessages() {
    const latestCompanionMessage = [...messages].reverse().find((message) => message.author === "critical_friend");
    return latestCompanionMessage ? [latestCompanionMessage] : messages.slice(-1);
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
    if (kind === "open_decision") return (roomOverview?.decisions ?? []).map((decision) => ({ value: `decision:${decision.id}`, label: `Entscheidung: ${decision.title}` }));
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
      recentMarkerId = result.marker.id;
      if (recentMarkerTimer !== null) window.clearTimeout(recentMarkerTimer);
      recentMarkerTimer = window.setTimeout(() => { recentMarkerId = ""; recentMarkerTimer = null; }, 4200);
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
    if (marker.targetType === "thinking_state") {
      await returnToConversation();
      return;
    }
    if (marker.targetType === "board_item") {
      await selectPerspective("preparation", { type: "work-item", id: marker.targetId });
      boardDetail = planningBoard?.items.find((item) => item.id === marker.targetId) ?? null;
    } else if (marker.targetType === "material") {
      await selectPerspective("materials", { type: "material", id: marker.targetId });
      expandedMaterialId = marker.targetId;
    } else if (marker.targetType === "service_request") {
      statusDetailsOpen = true;
      focusMode = "preparation";
      focusedObject = { type: "work-item", id: marker.targetId };
      roomAccessOpen = false;
    } else {
      focusMode = "conversation";
      focusedObject = null;
    }
  }

  async function openMarkerOrigin(marker: ConversationMarker) {
    markerReturnMessageId = marker.sourceMessageId;
    highlightedMessageId = marker.sourceMessageId;
    await returnToConversation();
  }

  async function returnToConversation() {
    focusMode = "conversation";
    focusedObject = markerReturnMessageId ? { type: "message", id: markerReturnMessageId } : null;
    previousFocusMode = "conversation";
    roomAccessOpen = false;
    pinnwandOpen = false;
    messageFilter = "all";
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

  function backgroundStatusLabel(backgroundWork: { title: string; status: string }[] | undefined, requests: ServiceRequest[], message: string) {
    if (sending) return "Pedagogical Companion antwortet";
    const activeRequest = backgroundWork?.find((work) => work.status === "wartet_kurz" || work.status === "wird_vorbereitet");
    if (activeRequest) return activeRequest.title + " wird vorbereitet";
    const activeServiceRequest = requests.find((request) => request.status === "approved" || request.status === "queued" || request.status === "in_progress");
    if (activeServiceRequest) return "Vorbereitung wird vorbereitet";
    if (message) return message;
    return "Gespräch bereit";
  }

  function backgroundWorkTeacherStatus(status: string) {
    if (status === "wartet_kurz") return "wartet kurz";
    if (status === "wird_vorbereitet" || status === "in_progress") return "wird vorbereitet";
    if (status === "liegt_zur_pruefung_bereit" || status === "returned") return "liegt zur Pr\u00fcfung bereit";
    if (status === "konnte_noch_nicht_erstellt_werden" || status === "failed") return "braucht Aufmerksamkeit";
    return "bereit";
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
    if (marker.targetType === "decision") return roomOverview?.decisions.find((decision) => decision.id === marker.targetId)?.title ?? "Entscheidung";
    return marker.label;
  }
  function markerOriginLabel(marker: ConversationMarker) {
    const source = messages.find((message) => message.id === marker.sourceMessageId);
    const time = source ? formatMessageTime(source) : "";
    return time ? `Aus dem Gespräch · ${time}` : "Aus dem Gespräch";
  }
  function isConfirmedDecisionMarker(marker: ConversationMarker, decisionIds: Set<string>) {
    return marker.kind === "open_decision" && marker.targetType === "decision" && decisionIds.has(marker.targetId);
  }
  function pinboardTraceType(marker: ConversationMarker, decisionIds: Set<string>) {
    return isConfirmedDecisionMarker(marker, decisionIds) ? "Entscheidung" : markerKindLabel(marker.kind);
  }
  function focusedObjectFromFocus(focus: PedagogicalFocus | null): FocusedObject {
    if (!focus) return null;
    if (focus.kind === "learning_moment" || focus.kind === "transition") return { type: "landscape-node", id: focus.id };
    if (focus.kind === "teaching_window" || focus.kind === "placement") return { type: "teaching-window", id: focus.id };
    if (focus.kind === "planning_item") return { type: "work-item", id: focus.id };
    return { type: "material", id: focus.id };
  }
  function focusModeLabel(mode: FocusMode) {
    return { conversation: "Gespräch", pinboard: "Pinnwand", "thinking-state": "Denkstand", landscape: "Lernlandschaft", timeline: "Zeit & Dramaturgie", preparation: "Vorbereitungen", materials: "Materialien", knowledge: "Knowledge & Quellen" }[mode];
  }
  function focusedObjectLabel(mode: FocusMode, object: FocusedObject, overview: typeof roomOverview, landscape: typeof learningLandscape, plan: typeof temporalPlan, board: typeof planningBoard, availableMaterials: MaterialMetadata[], availableMessages: UiMessage[]) {
    if (!object) {
      if (mode === "landscape") return landscape?.title ?? "gemeinsamer Lernweg";
      if (mode === "timeline") return "Unterrichtsfenster und Übergänge";
      if (mode === "preparation") return "laufende und zurückgekehrte Vorbereitungen";
      if (mode === "materials") return "Unterrichtsmaterialien und Ergebnisse";
      if (mode === "thinking-state") return "strukturierter aktueller Denkstand";
      if (mode === "pinboard") return "kuratierten Spuren";
      return "der gemeinsame Denkstand";
    }
    if (object.type === "note") return overview?.conversationMarkers.find((marker) => marker.id === object.id)?.label ?? "ausgewählte Spur";
    if (object.type === "landscape-node") return landscape?.moments.find((moment) => moment.id === object.id)?.title ?? "ausgewählter Lernmoment";
    if (object.type === "teaching-window") return plan?.windows.find((window) => window.id === object.id)?.title ?? "ausgewähltes Zeitfenster";
    if (object.type === "work-item") return board?.items.find((item) => item.id === object.id)?.title ?? "Arbeitsvorhaben";
    if (object.type === "material") return availableMaterials.find((material) => material.id === object.id)?.title ?? "ausgewähltes Material";
    return availableMessages.find((message) => message.id === object.id)?.text ?? "ausgewählter Gesprächsbeitrag";
  }
  function companionPrompt(mode: FocusMode, object: FocusedObject) {
    if (mode === "pinboard" && object?.type === "note") return "Was möchtest du an diesem Gedanken weiterdenken?";
    if (mode === "pinboard") return "Welche Spur möchtest du aufgreifen?";
    if (mode === "thinking-state") return "Was möchtest du an diesem Denkstand weiterdenken?";
    if (mode === "landscape") return "Was möchtest du an diesem Lernmoment weiterdenken?";
    if (mode === "timeline") return "Was möchtest du an diesem Zeitfenster weiterdenken?";
    if (mode === "preparation") return "Was möchtest du an dieser Vorbereitung klären oder prüfen?";
    if (mode === "materials") return "Was möchtest du an diesem Material ändern oder prüfen?";
    return "Beschreibe kurz deine Unterrichtsidee oder die offene Frage.";
  }
  function chooseRoomView(view: FocusMode) {
    roomAccessOpen = false;
    statusDetailsOpen = false;
    if (view === "conversation") {
      previousFocusMode = focusMode;
      focusMode = "conversation";
      focusedObject = null;
      companionStrip = false;
      pinnwandOpen = false;
      void returnFocusToConversation();
      return;
    }
    pinnwandOpen = false;
    void selectPerspective(view);
  }

  function handleCompanionDoubleClick(event: MouseEvent) {
    if (focusMode === "conversation") return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, textarea, select, input, a, summary")) return;
    void chooseRoomView("conversation");
  }
  function openPinnwand() {
    void selectPerspective("pinboard");
    pinnwandOpen = true;
    statusDetailsOpen = false;
    roomAccessOpen = false;
  }
  function closePinnwand() {
    pinnwandOpen = false;
    focusMode = "conversation";
    focusedObject = null;
    void returnFocusToConversation();
  }
  function selectPinnwandTrace(marker: ConversationMarker) {
    focusedObject = { type: "note", id: marker.id };
    companionExpanded = false;
  }
  function toggleBackgroundWork() {
    statusDetailsOpen = !statusDetailsOpen;
    if (statusDetailsOpen) {
      previousFocusMode = focusMode;
      focusMode = "preparation";
      focusedObject = null;
    } else {
      focusMode = "conversation";
      focusedObject = null;
    }
  }
  async function openSettings() {
    roomAccessOpen = false;
    settingsOpen = true;
    try {
      runtimeStatus = (await api.getRuntimeStatus()).harnessAvailability.teacherFacingMessage;
    } catch {
      runtimeStatus = "Die Runtime-Konfiguration konnte nicht geprüft werden.";
    }
  }
  async function scrollConversationToEnd(behavior: ScrollBehavior = "smooth") {
    await tick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    messagesElement?.scrollTo({ top: messagesElement.scrollHeight, behavior });
  }

async function sendMessage() {
    if (!activeSpace || !draftMessage.trim() || sending) return;
    const spaceId = activeSpace.id;
    const loadVersion = spaceLoadVersion;
    const focus = activeFocus;
    const text = draftMessage.trim();
    draftMessage = "";
    sending = true;
    thinkingStatus = "Ich bereite den Kontext vor …";
    error = "";
    const optimisticTeacherMessageId = `optimistic-${uuid()}`;
    messages = [...messages, { id: optimisticTeacherMessageId, author: "teacher", text }];
    await scrollConversationToEnd();
    try {
      await scanText(text);
      let streamError = "";
      const streamResult = await api.sendMessageStream(
        spaceId,
        text,
        {
          onStatus: (status) => {
            thinkingStatus = thinkingStatusLabel(status);
          },
          onComplete: (reply, teacherMessageId) => {
            if (!isCurrentSpaceLoad(spaceId, loadVersion)) return;
            lastFailedMessage = null;
            messages = [
              ...messages.map((message) => message.id === optimisticTeacherMessageId
                ? { ...message, id: teacherMessageId ?? optimisticTeacherMessageId, createdAt: message.createdAt ?? new Date().toISOString() }
                : message),
              { id: reply.id, author: "critical_friend", text: reply.text, createdAt: reply.createdAt }
            ];
          },
          onError: (message) => {
            streamError = message;
          }
        },
        focus ?? undefined
      );
      if (streamError) throw new Error(streamError);
      if (!streamResult.completed) throw new Error("Der Gesprächsabschluss wurde nicht empfangen. Bitte prüfe den Verlauf erneut.");
      const persisted = await api.getMessages(spaceId);
      if (!isCurrentSpaceLoad(spaceId, loadVersion)) return;
      messages = mergePersistedMessages(persisted.messages);
      await scrollConversationToEnd();
      const state = await api.getThinkingState(spaceId);
      if (!isCurrentSpaceLoad(spaceId, loadVersion)) return;
      cards = state.cards;
      roomOverview = await api.getRoomOverview(spaceId);
      syncAttentionDisposition(roomOverview.attentionCard);
      if (!isCurrentSpaceLoad(spaceId, loadVersion)) return;
    } catch (err) {
      error = err instanceof Error ? err.message : "Die Antwort konnte noch nicht vorbereitet werden.";
      // Die Nachricht wurde möglicherweise bereits serverseitig persistiert
      // (Persistierung erfolgt vor dem Harness-Aufruf). Für den Retry wird die
      // optimistische Nachricht entfernt und der Text gemerkt; der erneute
      // Versand erzeugt dann eine saubere, einzelne Nachricht im Verlauf.
      lastFailedMessage = { text, focus: focus ? { ...focus } : null };
      messages = messages.filter((message) => message.id !== optimisticTeacherMessageId);
      await syncConversationAfterFailure(spaceId, loadVersion);
    } finally {
      sending = false;
      thinkingStatus = "";
    }
  }

  /** Lädt den Verlauf nach einem fehlgeschlagenen Turn neu, damit bereits
   *  persistierte Nachrichten (z. B. die Lehrkraftnachricht) sichtbar bleiben. */
  async function syncConversationAfterFailure(spaceId: string, loadVersion: number) {
    try {
      const persisted = await api.getMessages(spaceId);
      if (!isCurrentSpaceLoad(spaceId, loadVersion)) return;
      messages = mergePersistedMessages(persisted.messages);
      await scrollConversationToEnd();
    } catch {
      // Verlauf konnte nicht aktualisiert werden; die Fehlermeldung bleibt sichtbar.
    }
  }

  /** Sendet die zuletzt fehlgeschlagene Nachricht erneut. */
  async function retryLastMessage() {
    if (!activeSpace || !lastFailedMessage || sending) return;
    const text = lastFailedMessage.text;
    const focus = lastFailedMessage.focus;
    lastFailedMessage = null;
    error = "";
    draftMessage = text;
    activeFocus = focus;
    await sendMessage();
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
    focusMode = "conversation";
    focusedObject = null;
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
    return markdownToHtmlShared(markdown);
  }
  function htmlToMarkdown(html: string): string {
    return htmlToMarkdownShared(html);
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

  async function selectPerspective(view: FocusMode, object: FocusedObject = null) {
    previousFocusMode = focusMode;
    previousFocusedObject = focusedObject;
    focusMode = view;
    focusedObject = object;
    pinnwandOpen = view === "pinboard";
    companionExpanded = false;
    companionStrip = false;
    if (view === "conversation" || !activeSpace) {
      await returnFocusToConversation();
      return;
    }
    planningLoading = true; planningError = "";
    try { const [artifacts, layout, plan] = await Promise.all([api.getPlanningArtifacts(activeSpace.id), api.getLearningLandscapeLayout(activeSpace.id), api.getTemporalPlan(activeSpace.id)]); applyLandscapeLayout(layout); learningLandscape = artifacts.learningLandscape; planningBoard = artifacts.planningBoard; temporalPlan = plan; makeCanvas(); if (view === "materials") await loadMaterials(activeSpace.id); }
    catch (err) { planningError = err instanceof Error ? err.message : "Die Planung konnte nicht geladen werden."; }
    finally { planningLoading = false; await tick(); focusRegionElement?.focus(); }
  }
  async function focusConversation(prompt: string, focus?: PedagogicalFocus) {
    if (focus) activeFocus = focus;
    focusedObject = focusedObjectFromFocus(focus ?? activeFocus);
    previousFocusMode = focusMode;
    focusMode = "conversation";
    pinnwandOpen = false;
    draftMessage = prompt;
    await tick();
    composerElement?.focus();
  }
  async function saveDecision() {
    if (!activeSpace || decisionToRecord.trim().length < 3 || decisionReason.trim().length < 3) return;
    try {
      const result = await api.recordDecision(activeSpace.id, decisionToRecord, decisionReason);
      if (decisionMarkerSourceId) {
        try {
          await api.createConversationMarker(activeSpace.id, {
            sourceMessageId: decisionMarkerSourceId,
            kind: "open_decision",
            targetType: "decision",
            targetId: result.decision.id,
            label: result.decision.title
          });
        } catch {
          serviceMessage = "Die Entscheidung ist festgehalten; der Gespr\\u00e4chsbezug konnte noch nicht erg\\u00e4nzt werden.";
        }
      }
      decisionMarkerSourceId = "";
      decisionModalOpen = false;
      await focusConversation(`Wir haben festgehalten: ${decisionToRecord.trim()} (Begründung: ${decisionReason.trim()}). Lass uns prüfen, was daraus als Nächstes folgt.`);
      cards = (await api.getThinkingState(activeSpace.id)).cards;
      roomOverview = await api.getRoomOverview(activeSpace.id);
      syncAttentionDisposition(roomOverview.attentionCard);
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
    decisionMarkerSourceId = [...messages].reverse().find((message) => message.id !== "welcome")?.id ?? "";
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
    if (node.type === "learningMoment") {
      focusedObject = { type: "landscape-node", id: node.id };
      companionExpanded = false;
      openMomentDetail(node.id);
    }
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
    focusedObject = { type: "landscape-node", id };
    companionExpanded = false;
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
  function openWindowDetail(window: TeachingWindow) {
    focusedObject = { type: "teaching-window", id: window.id };
    companionExpanded = false;
    windowDetail = window;
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
    focusedObject = { type: "teaching-window", id: placement.windowId };
    companionExpanded = false;
    placementDraft = { ...placement };
  }
  function focusPlacementInConversation(placement: TimePlacement) {
    placementDraft = null;
    focusConversation("Zur zeitlichen Platzierung weiterdenken: ", {
      kind: "placement",
      id: placement.id,
      label: `${momentTitle(placement.momentId)} · ${windowTitle(placement.windowId)}`
    });
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

  $: renderedMessages = focusMode === "conversation"
    ? messageFilter === "all" ? messages : roomOverview ? visibleMessages() : []
    : companionStrip ? companionStripMessages()
      : companionExpanded ? (messageFilter === "all" ? messages : roomOverview ? visibleMessages() : []) : contextualMessages();
  $: currentFocusedObjectLabel = focusedObjectLabel(focusMode, focusedObject, roomOverview, learningLandscape, temporalPlan, planningBoard, materials, messages);
  $: currentComposerPrompt = companionPrompt(focusMode, focusedObject);
  $: hasBlockingFinding = findings.some((finding) => finding.severity === "block_export");
  $: attentionFocused = !!roomOverview?.attentionCard
    && roomOverview.attentionCard.kind !== "continue_conversation"
    && roomOverview.attentionCard.id !== deferredAttentionId
    && roomOverview.attentionCard.id !== continuedAttentionId;
  $: attentionDeferred = !!roomOverview?.attentionCard
    && roomOverview.attentionCard.kind !== "continue_conversation"
    && roomOverview.attentionCard.id === deferredAttentionId;
  $: visiblePinnwandMarkers = (roomOverview?.conversationMarkers ?? [])
    .filter((marker) => marker.kind === "captured_note" || marker.kind === "open_decision")
    .slice(-5)
    .reverse();
  $: confirmedDecisionIds = new Set((roomOverview?.decisions ?? []).map((decision) => decision.id));
  $: pinnwandThoughts = visiblePinnwandMarkers.filter((marker) => marker.kind === "captured_note").slice(0, 3);
  $: pinnwandOpenQuestions = visiblePinnwandMarkers.filter((marker) => marker.kind === "open_decision" && !isConfirmedDecisionMarker(marker, confirmedDecisionIds)).slice(0, 2);
  $: pinnwandDecisions = visiblePinnwandMarkers.filter((marker) => isConfirmedDecisionMarker(marker, confirmedDecisionIds)).slice(0, 2);
  $: pinnwandSections = [
    { id: "supports", title: "Was trägt gerade?", hint: "Bewusst festgehaltene Gedanken", items: pinnwandThoughts },
    { id: "open", title: "Was ist noch offen?", hint: "Fragen und Spannungen", items: pinnwandOpenQuestions },
    { id: "decisions", title: "Was wurde entschieden?", hint: "Begründet festgehalten", items: pinnwandDecisions }
  ].filter((section) => section.items.length > 0);
  $: filteredSpaces = spaces.filter((space) => {
    const query = roomSearch.trim().toLocaleLowerCase("de-DE");
    const matchesQuery = !query || [space.title, space.subject, space.targetGroup].filter(Boolean).some((value) => value?.toLocaleLowerCase("de-DE").includes(query));
    return matchesQuery;
  });
  $: roomCategoryFolders = roomCategoryNames.map((category) => ({ category, spaces: filteredSpaces.filter((space) => roomCategories[space.id] === category) }));
  $: uncategorizedSpaces = filteredSpaces.filter((space) => !roomCategories[space.id]);
</script>

<svelte:head><title>{activeSpace?.title ?? "Pädagogischer Denkraum"} · ptspace</title></svelte:head>

<div class:rail-collapsed={railCollapsed} class:reduce-motion={reducedMotion} class="app-shell">
  <aside class="room-rail" aria-label="Planungsräume">
    <div class="brand-row"><button class="rail-toggle" on:click={() => (railCollapsed = !railCollapsed)} aria-label={railCollapsed ? "Planungsräume einblenden" : "Planungsräume ausblenden"}>{#if railCollapsed}<PanelLeftOpen size={18} />{:else}<PanelLeftClose size={18} />{/if}</button>
      <div class="brand-mark"><BookOpen size={18} /></div>
      <div><strong>Planungsräume</strong><span>ptspace</span></div>
    </div>

    <nav class="rail-primary" aria-label="Planungsraum-Navigation">
      <button class="new-room-button" on:click={() => (createRoomModal = true)}><Plus size={16} /><span>Neuen Planungsraum</span></button>
      <button class="rail-link" on:click={openKnowledgebase}><BookOpen size={16} /><span>Knowledgebase</span></button>
    </nav>

    <section class="room-browser" aria-labelledby="room-browser-title">
      <div class="rail-section-heading"><strong id="room-browser-title">Planungsräume</strong><small>{filteredSpaces.length}</small></div>
      <label class="room-search"><Search size={15} aria-hidden="true" /><span class="sr-only">Planungsräume durchsuchen</span><input bind:value={roomSearch} placeholder="Planungsräume durchsuchen" /></label>
      <div class="room-list">
      {#if loading}<p>Planungsräume werden geladen.</p>
      {:else}
        {#if spaces.length === 0}<p>Noch kein Planungsraum. Lege links einen ersten Raum an.</p>
        {:else if filteredSpaces.length === 0}<p>Kein Planungsraum passt zu deiner Suche.</p>{/if}
        <section class:drop-target={!!draggedSpaceId} class="room-category-folder uncategorized-folder" on:dragover={allowRoomDrop} on:drop={dropSpaceUncategorized} aria-labelledby="uncategorized-folder-title">
          <button class="folder-heading" on:click={() => toggleRoomCategory("")}><ChevronDown class={openRoomCategories[""] === false ? "folder-closed" : ""} size={14} aria-hidden="true" /><Folder size={15} aria-hidden="true" /><strong id="uncategorized-folder-title">Unkategorisiert</strong><small>{uncategorizedSpaces.length}</small></button>
          {#if openRoomCategories[""] !== false}<div class="room-folder-items">{#each uncategorizedSpaces as space}<article class:active={activeSpace?.id === space.id} class="room-entry" draggable="true" on:dragstart={(event) => startRoomDrag(space.id, event)}>
            <button class="room-entry-open" on:click={() => openSpace(space)}><span>{space.title}</span><small>{space.subject || "Fach offen"} · {space.targetGroup || "Zielgruppe offen"}</small></button>
            <button class="room-entry-menu" on:click={() => (roomMenuOpenId = roomMenuOpenId === space.id ? "" : space.id)} aria-label={`Kategorie für ${space.title} ändern`} aria-expanded={roomMenuOpenId === space.id}><MoreHorizontal size={15} /></button>
            {#if roomMenuOpenId === space.id}<div class="room-entry-menu-popover" role="menu"><span>Zu Kategorie verschieben</span>{#each roomCategoryNames as category}<button role="menuitem" on:click={() => assignRoomCategory(space.id, category)}>{category}</button>{/each}<button role="menuitem" on:click={() => assignRoomCategory(space.id, "")}>Unkategorisiert</button></div>{/if}
          </article>{/each}{#if uncategorizedSpaces.length === 0}<p class="folder-empty">Keine passenden Räume</p>{/if}</div>{/if}
        </section>
        {#each roomCategoryFolders as folder}
          <section class:drop-target={!!draggedSpaceId} class="room-category-folder" on:dragover={allowRoomDrop} on:drop={(event) => dropSpaceInCategory(folder.category, event)} aria-labelledby={`folder-${folder.category}`}>
            <button class="folder-heading" on:click={() => toggleRoomCategory(folder.category)}><ChevronDown class={openRoomCategories[folder.category] === false ? "folder-closed" : ""} size={14} aria-hidden="true" /><Folder size={15} aria-hidden="true" /><strong id={`folder-${folder.category}`}>{folder.category}</strong><small>{folder.spaces.length}</small></button>
            {#if openRoomCategories[folder.category] !== false}<div class="room-folder-items">{#each folder.spaces as space}<article class:active={activeSpace?.id === space.id} class="room-entry" draggable="true" on:dragstart={(event) => startRoomDrag(space.id, event)}>
              <button class="room-entry-open" on:click={() => openSpace(space)}><span>{space.title}</span><small>{space.subject || "Fach offen"} · {space.targetGroup || "Zielgruppe offen"}</small></button>
              <button class="room-entry-menu" on:click={() => (roomMenuOpenId = roomMenuOpenId === space.id ? "" : space.id)} aria-label={`Kategorie für ${space.title} ändern`} aria-expanded={roomMenuOpenId === space.id}><MoreHorizontal size={15} /></button>
              {#if roomMenuOpenId === space.id}<div class="room-entry-menu-popover" role="menu"><span>Zu Kategorie verschieben</span>{#each roomCategoryNames as category}<button role="menuitem" on:click={() => assignRoomCategory(space.id, category)}>{category}</button>{/each}<button role="menuitem" on:click={() => assignRoomCategory(space.id, "")}>Unkategorisiert</button></div>{/if}
            </article>{/each}{#if folder.spaces.length === 0}<p class="folder-empty">Ordner ist leer</p>{/if}</div>{/if}
          </section>
        {/each}
      {/if}
      </div>
      <button class="new-category-button" on:click={() => { roomCategoryError = ""; newCategoryName = ""; newCategoryModal = true; }}><Plus size={14} /> Neue Kategorie</button>
    </section>
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
  {#if newCategoryModal}
    <div class="planning-overlay" role="presentation" on:click={() => (newCategoryModal = false)}>
      <dialog class="start-modal category-modal" open aria-label="Neue Kategorie anlegen" on:click|stopPropagation>
        <header><div><span>Planungsräume sortieren</span><h2>Neue Kategorie</h2></div><button class="icon-button" on:click={() => (newCategoryModal = false)} aria-label="Schließen"><X size={20} /></button></header>
        <form class="start-form" on:submit|preventDefault={createRoomCategory}>
          <label>Kategoriename<input bind:value={newCategoryName} placeholder="z. B. Unterrichtsentwürfe" /></label>
          {#if roomCategoryError}<p class="category-error" role="alert">{roomCategoryError}</p>{/if}
          <button type="submit"><Plus size={16} /> Kategorie anlegen</button>
        </form>
      </dialog>
    </div>
  {/if}
  <main class="planning-room">
    <header class="topbar">
      <div><span>Planungsräume</span><h1>{activeSpace?.title ?? "Neuer pädagogischer Denkraum"}</h1></div>
      <div class="topbar-actions">
        {#if activeSpace}<button class="room-access-toggle" on:click={() => (roomAccessOpen = !roomAccessOpen)} aria-label="Perspektive wechseln" aria-expanded={roomAccessOpen} aria-controls="room-access"><MoreHorizontal size={16} /> Perspektive <span>{roomAccessOpen ? "schließen" : "wechseln"}</span></button>{/if}
        {#if activeSpace && roomAccessOpen}
          <nav id="room-access" class="room-nav" aria-label="Bereiche im Planungsraum">
            <button class:active={focusMode === "conversation"} on:click={() => chooseRoomView("conversation")}>Gespräch</button>
            <button class:active={focusMode === "pinboard"} on:click={openPinnwand}>Auf den Tisch: Pinnwand</button>
            <button class:active={focusMode === "thinking-state"} on:click={() => chooseRoomView("thinking-state")}>Auf den Tisch: Denkstand</button>
            <button class:active={focusMode === "landscape"} on:click={() => chooseRoomView("landscape")}>Auf den Tisch: Lernlandschaft</button>
            <button class:active={focusMode === "timeline"} on:click={() => chooseRoomView("timeline")}>Auf den Tisch: Zeit &amp; Dramaturgie</button>
            <button class:active={focusMode === "preparation"} on:click={() => chooseRoomView("preparation")}>Auf den Tisch: Vorbereitungen</button>
            <button class:active={focusMode === "knowledge"} on:click={() => chooseRoomView("knowledge")}>Auf den Tisch: Knowledge &amp; Quellen</button>
            <button class:active={focusMode === "materials"} on:click={() => chooseRoomView("materials")}>Auf den Tisch: Materialien</button>
            <button on:click={() => { roomAccessOpen = false; openPlanning(); }}>Unterrichtsplanung</button>
            <button on:click={openSettings}>Einstellungen</button>
          </nav>
        {/if}
        {#if activeSpace && simulatedMode}<button class="runtime-status-access" on:click={openSettings} aria-haspopup="dialog">Vorbereitete Antworten <span>Details</span></button>{/if}
      </div>
    </header>
    {#if error}
      <div class="notice error" role="status"><AlertCircle size={18} /> {error}
        {#if lastFailedMessage}<button class="retry-button" on:click={retryLastMessage} disabled={sending}><RotateCcw size={14} /> Erneut senden</button>{/if}
      </div>
    {/if}

    {#if activeSpace}
      {#if statusDetailsOpen && roomOverview}
        <section id="background-work" class="background-work-view" aria-label="Im Hintergrund">
          <header class="background-work-heading">
            <div><span>Vorbereitungen · Auf den Tisch</span><h2>Im Hintergrund</h2><p>Wir sprechen gerade über laufende und zurückgekehrte Vorbereitungen. Sie bleiben an dasselbe Gespräch und diesen Planungsraum gebunden.</p></div>
          </header>
          <div class="background-work-list" aria-label="Vorbereitungen">
            {#each roomOverview.backgroundWork as work}
              <article class="background-work-item">
                <div><span>Aus dem Gespr&auml;ch</span><h3>{work.title}</h3><p>Ein fachlicher Arbeitsauftrag wird f&uuml;r den n&auml;chsten Gespr&auml;chsschritt vorbereitet.</p></div>
                <strong>{backgroundWorkTeacherStatus(work.status)}</strong>
              </article>
            {:else}
              <p class="background-work-empty">Im Hintergrund ist gerade keine Vorbereitung sichtbar.</p>
            {/each}
          </div>
          <div class="background-work-actions"><button on:click={() => chooseRoomView("preparation")}><ArrowRight size={15} /> Vorbereitungen ansehen</button><button class="ghost" on:click={toggleBackgroundWork}>Im Gespr&auml;ch weiterdenken</button></div>
        </section>
      {:else}
      <section class:attention-is-focused={focusMode === "conversation" && attentionFocused} class:pinnwand-open={pinnwandOpen} class:focus-mode-active={focusMode !== "conversation"} class={`workspace-grid focus-mode-${focusMode}`} bind:this={workspaceElement} style={`--primary-width: ${primaryWidth}%`}>
        <section class:companion-strip={focusMode !== "conversation" && companionStrip} class="conversation-panel" aria-label="Gespräch im pädagogischen Denkraum" on:dblclick={handleCompanionDoubleClick}>
          {#if focusMode === "conversation" || !companionStrip}
           <div class="conversation-heading">
            <MessageSquareText size={18} />
            <div><strong>Gespräch</strong><span>Gemeinsam weiterdenken · Herkunft bleibt sichtbar</span></div>
            <div class="conversation-tools">
              {#if focusMode === "conversation"}<details class="conversation-options">
                <summary>Ansicht</summary>
                <label class="message-filter"><span>Gespräch anzeigen</span><select bind:value={messageFilter} aria-label="Gespräch filtern"><option value="all">Alle Beiträge</option><option value="captured">Festgehaltenes</option><option value="decisions">Offene Entscheidungen</option><option value="work">Vorbereitungen &amp; Ergebnisse</option></select></label>
              </details>{/if}

             </div>
           </div>
          {/if}
          {#if focusMode !== "conversation"}
            <div class:companion-strip-heading={companionStrip} class="companion-heading">
              <div><strong>{companionStrip ? "Companion" : "Begleitendes Gespräch"}</strong><span>Wir sprechen gerade über: {currentFocusedObjectLabel}</span></div>
              <div class="companion-actions">
                <button class="quiet-button" on:click={() => chooseRoomView("conversation")}>Gespräch groß öffnen</button>
                {#if !companionStrip}<button class="quiet-button" on:click={() => (companionExpanded = !companionExpanded)} aria-expanded={companionExpanded}>{companionExpanded ? "Kontext zeigen" : "Vollständigen Faden öffnen"}</button><button class="quiet-button" on:click={() => (companionStrip = true)}>Begleitung verkleinern</button>{:else}<button class="quiet-button" on:click={() => (companionStrip = false)}>Kontext zeigen</button>{/if}
              </div>
            </div>
          {/if}
            {#if roomOverview && focusMode === "conversation" && attentionFocused}
            {@const attention = roomOverview.attentionCard}
            <section class="conversation-focus-layer" bind:this={focusRegionElement} tabindex="-1" aria-live="assertive" aria-labelledby="conversation-focus-heading" aria-describedby="conversation-focus-rationale">
              <div class="conversation-focus-kicker"><Lightbulb size={17} /><span>Jetzt wichtig</span><small>Aus dem Gespräch hervorgegangen</small></div>
              <h2 id="conversation-focus-heading">{attention.title}</h2>
              <p id="conversation-focus-rationale">{attention.rationale}</p>
              {#if attention.preview}<details class="attention-preview"><summary>Entwurf ansehen{attention.preview.truncated ? " · gekürzt" : ""}</summary><pre>{attention.preview.content}</pre></details>{/if}
              {#if attention.automaticCheck || attention.criticalFriendCheck}<div class="review-checks">
                {#if attention.automaticCheck}<span><strong>Automatische Vorprüfung:</strong> {attention.automaticCheck.status === "passed" ? "bestanden" : attention.automaticCheck.status === "failed" ? "nicht bestanden" : "ausstehend"}</span>{/if}
                {#if attention.criticalFriendCheck}<span><strong>Begleitende Prüfung:</strong> {attention.criticalFriendCheck.status === "passed" ? "keine blockierende Abweichung" : attention.criticalFriendCheck.status === "blocked" ? "blockiert" : attention.criticalFriendCheck.status === "concerns" ? "mit Rückfragen" : "ausstehend"}</span>{/if}
              </div>{/if}
              <div class="attention-actions conversation-focus-actions">
                {#if attention.primaryAction}<button on:click={actOnAttention} disabled={attentionBusy}>{attentionBusy ? "Speichert …" : attention.primaryAction.label}</button>{/if}
                <button class="ghost" on:click={discussAttention}>Weiterreden</button>
                <button class="quiet-action" on:click={deferAttention}>Später zurückstellen</button>
              </div>
            </section>
          {/if}
          <div class="messages" bind:this={messagesElement} role="log" aria-live="polite" aria-label="Gesprächsverlauf">
            {#if conversationLoading}<p class="conversation-status" aria-live="polite">Gesprächsverlauf wird geladen …</p>{/if}
            {#if conversationLoadError}<p class="conversation-status error" role="status">{conversationLoadError}</p>{/if}
            {#if renderedMessages.length === 0}<p class="conversation-empty">Für diesen Filter gibt es noch keine markierte Gesprächsstelle.</p>{/if}
            {#each renderedMessages as message}
              {@const messageMarkers = markersForMessage(message.id)}
              <article class:teacher={message.author === "teacher"} class:context-message={isContextMessage(message)} class:highlighted={highlightedMessageId === message.id} class="message" data-message-id={message.id}>
                <div class="avatar" aria-hidden="true">{message.author === "teacher" ? "L" : "CF"}</div>
                <div class="message-content">
                  <div class="message-meta"><strong>{message.author === "teacher" ? "Lehrkraft" : "Pedagogical Companion"}</strong>{#if formatMessageTime(message)}<time>{formatMessageTime(message)}</time>{/if}</div>
                  <div class="message-body markdown-preview">{@html markdownToHtml(message.text)}</div>
                  {#if messageMarkers.length > 0}<div class="message-markers" aria-label="Gesprächsbezüge">{#each messageMarkers as marker}<button class="message-marker" on:click={() => openMarkerTarget(marker)} title="{markerKindLabel(marker.kind)} öffnen"><span aria-hidden="true">{markerGlyph(marker.kind)}</span> {markerKindLabel(marker.kind)} · {marker.label}</button>{/each}</div>{/if}
                  <div class="message-actions"><button class="message-action" disabled={message.id === "welcome"} on:click={() => openMarkerComposer(message)}>Gedanken festhalten</button></div>
                </div>
              </article>
            {/each}
            {#if sending}<article class="message thinking"><div class="avatar" aria-hidden="true">CF</div><p><span class="thinking-dots" aria-hidden="true"></span>{thinkingStatus || "Ich prüfe deine Frage und halte den Denkstand gleich sichtbar fest."}</p></article>{/if}
          </div>
          {#if focusMode === "conversation"}<div class="conversation-traces-access"><button class="traces-access" on:click={openPinnwand} aria-label={"Pinnwand öffnen: " + (roomOverview?.conversationMarkers.length ?? 0) + " kuratierte Spuren"}><span class="traces-access-label">Pinnwand</span><strong>{roomOverview?.conversationMarkers.length ?? 0} kuratierte Spuren</strong><ArrowRight size={15} /></button>{#if recentMarkerId}{@const recentMarker = roomOverview?.conversationMarkers.find((marker) => marker.id === recentMarkerId)}{#if recentMarker}<div class="trace-echo" role="status" aria-live="polite"><span>Gerade festgehalten</span><strong>{recentMarker.label}</strong><small>{markerKindLabel(recentMarker.kind)} · aus dem Gespräch</small></div>{/if}{/if}</div>{/if}
          <div class="composer-wrap">{#if activeFocus}<div class="focus-chip"><span>Bezug: {focusKindLabels[activeFocus.kind]} · {activeFocus.label}</span><button on:click={() => (activeFocus = null)} aria-label="Fokus aufheben"><X size={13} /></button></div>{/if}<div class="privacy-hint"><ShieldCheck size={15} /> Für die Planung reichen Beschreibungen ohne Namen einzelner Schüler:innen.</div><form class="composer" on:submit|preventDefault={sendMessage}><textarea bind:this={composerElement} bind:value={draftMessage} rows="3" placeholder={currentComposerPrompt} on:keydown={handleComposerKeydown}></textarea><button type="submit" disabled={sending || !draftMessage.trim()} aria-label="Nachricht senden"><ArrowUp size={18} /></button></form></div>
        </section>
        <button class="resize-handle" aria-label="Breite der Arbeitsbereiche anpassen" on:pointerdown={startResize}><GripVertical size={18} /></button>
         <section class="perspective-panel" aria-label="Aktiver Fokusbereich" aria-hidden={focusMode === "conversation" && attentionFocused ? "true" : undefined}>
           {#if focusMode !== "conversation"}<section class="focus-mode-heading" tabindex="-1" bind:this={focusRegionElement} aria-labelledby="focus-mode-title"><span class="focus-mode-kicker">{focusModeLabel(focusMode)} · Auf den Tisch</span><h2 id="focus-mode-title">{currentFocusedObjectLabel}</h2><p><strong>Auf dem Tisch liegt:</strong> {focusModeLabel(focusMode)}</p><p><strong>Wir sprechen gerade über:</strong> {currentFocusedObjectLabel}</p><div class="focus-mode-actions"><button class="focus-return" on:click={() => chooseRoomView("conversation")}><MessageSquareText size={14} /> Darüber sprechen</button><button class="focus-return quiet-button" on:click={() => chooseRoomView("conversation")}>Zurück zum Gespräch</button></div></section>{/if}
           {#if markerReturnMessageId}<button class="marker-return" on:click={returnToConversation}>Zur auslösenden Gesprächsstelle zurück <ArrowRight size={14} /></button>{/if}
            {#if focusMode === "thinking-state"}
              <section class="thinking-state-view" aria-label="Strukturierter Denkstand">
                <header class="thinking-state-intro"><span>Strukturierte Zusammenfassung</span><h2>Der aktuelle Denkstand</h2><p>Hier liegt die verdichtete Planung. Die Pinnwand bewahrt davon getrennt nur wenige Spuren des Denkprozesses.</p></header>
                <div class="thinking-state-grid">
                  <section class="thinking-state-field"><span>Thema</span><strong>{activeSpace?.title ?? "Noch offen"}</strong></section>
                  <section class="thinking-state-field"><span>Fach / Lernbereich</span><strong>{activeSpace?.subject || "Noch offen"}</strong></section>
                  <section class="thinking-state-field"><span>Zielgruppe</span><strong>{activeSpace?.targetGroup || "Noch offen"}</strong></section>
                  <section class="thinking-state-field thinking-state-wide"><span>Aktuelle Intention</span><p>{activeSpace?.initialIdea || cards.find((card) => card.id === "denkstand")?.summary || "Die pädagogische Intention wird im Gespräch weiter geschärft."}</p></section>
                  <section class="thinking-state-field thinking-state-wide"><span>Bestätigte Entscheidungen</span>{#if roomOverview?.decisions.length}<ul>{#each roomOverview.decisions.slice(-4).reverse() as decision}<li>{decision.title}</li>{/each}</ul>{:else}<p>Noch keine Entscheidung ist begründet festgehalten.</p>{/if}</section>
                  <section class="thinking-state-field thinking-state-wide"><span>Offene Fragen</span>{#if (cards.find((card) => card.id === "offene-entscheidungen")?.previewItems.length ?? 0) > 0}<ul>{#each (cards.find((card) => card.id === "offene-entscheidungen")?.previewItems ?? []).slice(0, 4) as item}<li>{decisionParts(item).question}</li>{/each}</ul>{:else}<p>Derzeit ist keine offene Frage festgehalten.</p>{/if}</section>
                  <section class="thinking-state-field thinking-state-wide"><span>Relevante Lernreise</span>{#if learningLandscape}<strong>{learningLandscape.title}</strong><ul>{#each learningLandscape.moments.slice(0, 4) as moment}<li>{moment.title}</li>{/each}</ul>{:else}<p>Die Lernlandschaft ist noch nicht geöffnet.</p>{/if}</section>
                </div>
                <section class="thinking-card design-pad thinking-state-notes"><div class="pad-heading"><div><strong>Gemeinsamer Denkstand</strong><span>Bewusst speichern erstellt eine nachvollziehbare Version und wird im nächsten Gespräch berücksichtigt.</span></div><button on:click={() => (editingDesign = !editingDesign)}>{editingDesign ? "Lesen" : "Gemeinsam schreiben"}</button></div>{#if editingDesign}<div class="tiptap-editor" use:tiptap aria-label="Gemeinsamer Denkstand"></div><div class="pad-actions"><button on:click={saveDesignNotes} disabled={savingDesign}>{savingDesign ? "Speichert …" : "Änderung festhalten"}</button></div>{:else}<div class="design-preview markdown-preview">{@html markdownToHtml(designNotes)}</div>{/if}</section>
              </section>
            {:else if focusMode === "pinboard"}
              <section class="pinnwand-drawer" aria-label="Geöffnete Pinnwand">
                <header class="pinnwand-drawer-heading">
                  <div><span>Gedächtnisschicht</span><h2>Pinnwand</h2><p>Was für das gegenwärtige Weiterdenken noch trägt.</p></div>
                  <button class="quiet-button" on:click={closePinnwand}>Schließen</button>
                  <div class="pinnwand-drawer-actions"><button class="quiet-button" on:click={() => (exportMenuOpen = !exportMenuOpen)}>Mehr</button>{#if exportMenuOpen}<div class="export-menu"><button on:click={() => approve("markdown")} disabled={hasBlockingFinding}>Markdown freigeben</button><button on:click={() => approve("okf_markdown")} disabled={hasBlockingFinding}>Zum Teilen vormerken</button>{#if markdownApproval}<a href={api.backendUrl + "/api/planning-spaces/" + activeSpace.id + "/export/markdown"} target="_blank" rel="noreferrer">Markdown ansehen</a>{/if}</div>{/if}</div>
                </header>
                {#if attentionDeferred && roomOverview}<button class="pinnwand-deferred" on:click={reopenDeferredAttention}><span aria-hidden="true">?</span><span><strong>Später zurückgestellt</strong><small>{roomOverview.attentionCard.title}</small></span><ArrowRight size={14} /></button>{/if}
                {#if pinnwandSections.length > 0}
                  <div class="pinnwand-sections" aria-label="Kuratierte Pinnwandspuren">
                    {#each pinnwandSections as section}
                      <section class="pinnwand-section" aria-labelledby={`pinnwand-section-${section.id}`}>
                        <header><div><h3 id={`pinnwand-section-${section.id}`}>{section.title}</h3><span>{section.hint}</span></div><small>{section.items.length}</small></header>
                        <div class="pinnwand-traces">
                          {#each section.items as marker}
                            <article class:selected={focusedObject?.type === "note" && focusedObject.id === marker.id} class="pinnwand-trace">
                              <button type="button" class="pinnwand-trace-select" on:click={() => selectPinnwandTrace(marker)}><span class="trace-type">{pinboardTraceType(marker, confirmedDecisionIds)}</span><strong>{marker.label}</strong><small>{markerOriginLabel(marker)}</small></button>
                              <div class="pinnwand-trace-actions"><button on:click={() => openMarkerTarget(marker)}>Im Gespräch aufgreifen</button><button on:click={() => openMarkerOrigin(marker)}>Zur Herkunft</button></div>
                            </article>
                          {/each}
                        </div>
                      </section>
                    {/each}
                  </div>
                {:else}
                  <p class="pinnwand-empty">Noch keine kuratierte Spur trägt das gegenwärtige Weiterdenken. Im Gespräch kannst du einen Gedanken bewusst festhalten.</p>
                {/if}
                <button class="thinking-state-access" on:click={() => chooseRoomView("thinking-state")}><span>Strukturierte Planung</span><strong>Gemeinsamen Denkstand ansehen</strong><ArrowRight size={15} /></button>
              </section>
            {:else if planningLoading}<p class="planning-empty">Planung wird geöffnet …</p>
          {:else if planningError}<p class="planning-error">{planningError}</p>
          {:else if focusMode === "knowledge"}
            <div class="knowledge-view">
              <div class="perspective-title"><span>Knowledge &amp; Quellen</span><h2>Geprüfte Bezugsquellen</h2><p>Quellen und fachliche Bezüge erhalten hier einen eigenen, ruhigen Zugang. Die Recherche bleibt an das Gespräch und den gemeinsamen Denkstand gebunden.</p></div>
              <div class="knowledge-empty"><BookOpen size={22} /><strong>Noch keine Quelle festgehalten</strong><p>Wenn eine Quelle im Gespräch relevant wird, greifen wir sie gemeinsam auf und halten ihren pädagogischen Bezug fest.</p><button on:click={() => focusConversation("Welche Quelle oder welcher fachliche Bezug sollte für unseren Denkstand geprüft werden? ")}>Im Gespräch anstoßen</button></div>
            </div>          {:else if focusMode === "landscape" && learningLandscape}
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
          {:else if focusMode === "timeline" && temporalPlan}<div class="timeline-view"><header><span>Zeit & Dramaturgie</span><h2>Unterrichtsfenster</h2><p>Ziehe Lernmomente aus der Ablage in ein Unterrichtsfenster. Erst deine Bestätigung legt eine zeitliche Platzierung an.</p><div class="title-actions"><button class="add-moment-button" on:click={() => openWindowForm()}><Plus size={15} /> Unterrichtsfenster hinzufügen</button>{#if temporalPlan.windows.length > 0 && unplacedMoments().length > 0}<button class="add-moment-button ghost-action" on:click={() => requestProposal("temporal_placement")} disabled={proposalLoading}><Lightbulb size={15} /> Platzierung vorschlagen lassen</button>{/if}</div></header>
            {#each timelineNotices() as notice}<p class="timeline-notice"><TriangleAlert size={14} /> {notice}</p>{/each}
            <section class="unplaced-tray" aria-label="Noch nicht eingeplante Lernmomente"><h3>Ablage · noch nicht eingeplant</h3>{#if unplacedMoments().length === 0}<p class="muted">Alle Lernmomente sind mindestens einmal eingeplant.</p>{:else}<div class="tray-moments">{#each unplacedMoments() as moment}<button class="tray-moment" draggable="true" on:dragstart={() => (draggedMomentId = moment.id)} on:click={() => openMomentDetail(moment.id)}><strong>{moment.title}</strong><small>{momentKindLabels[moment.kind] ?? moment.kind}</small></button>{/each}</div>{/if}</section>
            {#if temporalPlan.windows.length === 0}<p class="planning-empty">Noch keine Unterrichtsfenster. Lege oben ein erstes Fenster an, um Lernmomente zeitlich zu platzieren.</p>{:else}<div class="timeline-track">{#each temporalPlan.windows as window}{@const conflicts = windowConflicts(window)}<section class="teaching-window" class:has-conflict={conflicts.length > 0} role="group" aria-label={window.title} on:dragover|preventDefault on:drop={() => onWindowDrop(window)}><div class="window-head"><div><button class="window-title-link" on:click={() => openWindowDetail(window)}>{window.title}</button><span>{windowKindLabels[window.kind]} · {window.durationMinutes} min</span></div><div class="window-tools"><button on:click={() => openWindowForm(window)} aria-label="Fenster bearbeiten"><Settings size={14} /></button><button on:click={() => requestDeleteWindow(window)} aria-label="Fenster löschen"><X size={14} /></button></div></div>
                    {#if conflicts.length > 0}<ul class="window-conflicts">{#each conflicts as conflict}<li><TriangleAlert size={12} /> {conflict}</li>{/each}</ul>{/if}
                    <div class="window-moments">{#if placementsInWindow(window.id).length === 0}<p class="drop-hint">Lernmoment hierher ziehen</p>{:else}{#each placementsInWindow(window.id) as placement}<button class="placement-block" class:mode-parallel={placement.mode === "parallel"} class:mode-choice={placement.mode === "choice"} class:mode-individual={placement.mode === "individual"} class:mode-group={placement.mode === "group"} on:click={() => openPlacementEditor(placement)}><span class="placement-time">{formatMinute(placement.startMinute)}–{formatMinute(placement.startMinute + placement.durationMinutes)}</span><strong>{momentTitle(placement.momentId)}</strong><span class="placement-tags"><em class="tag-role">{dramaturgicalRoleLabels[placement.dramaturgicalRole]}</em><em class="tag-mode tag-mode-{placement.mode}">{placementModeLabels[placement.mode]}</em></span></button>{/each}{/if}</div></section>{/each}</div>{/if}</div>
          {:else if focusMode === "timeline"}<p class="planning-empty">Die Zeitplanung wird vorbereitet …</p>
          {:else if focusMode === "preparation" && planningBoard}<div class="board-view inline">{#each boardColumns as column}<section class="board-column" role="list" aria-label={column.label} on:dragover|preventDefault on:drop={() => moveBoardItem(column.id)}><header><strong>{column.label}</strong><span>{column.hint}</span></header><div class="board-cards">{#each planningBoard.items.filter((item) => item.column === column.id) as item}<button class="board-card" draggable="true" on:dragstart={() => (draggedBoardItem = item.id)} on:click={() => openBoardItemDetail(item)}><span class="board-kind">{boardKindLabels[item.kind] ?? item.kind}</span><strong>{item.title}</strong><small>{boardStatusLabels[item.status] ?? item.status}</small></button>{/each}</div></section>{/each}</div>
                    {:else if focusMode === "materials"}
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
                    <dl class="material-metadata"><div><dt>Entstanden</dt><dd>{materialDate(material.createdAt)}</dd></div><div><dt>Prüfung</dt><dd>{materialDate(material.reviewedAt)}</dd></div><div><dt>Entstehungsgrund</dt><dd>{material.sourceRequest ? "Begleitete Vorbereitung" : "Noch nicht festgehalten"}</dd></div><div><dt>Bezüge</dt><dd>{materialRelationLabels(material).length}</dd></div></dl>
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
        </section>
      </section>
    {/if}
    {#if activeSpace}<button class="statusbar" on:click={toggleBackgroundWork} aria-live="polite" aria-expanded={statusDetailsOpen} aria-controls="background-work"><span>{statusDetailsOpen ? "Zur&uuml;ck im Gespr&auml;ch" : "Im Hintergrund"}</span><strong>{statusDetailsOpen ? "Gespr&auml;ch &ouml;ffnen" : backgroundStatusLabel(roomOverview?.backgroundWork, serviceRequests, serviceMessage)}</strong></button>{/if}
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
          <label>Art des Bezugs<select value={markerKind} on:change={handleMarkerKindChange}><option value="captured_note">Festgehaltener Gedanke</option><option value="open_decision">Offene Entscheidung · entsteht aus einer begründeten Entscheidung</option><option value="work_started">Vorbereitung gestartet</option><option value="result_returned">Ergebnis zurückgekehrt</option><option value="ready_for_class">Für den Unterricht bereit</option></select></label>
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
            <div class="detail-actions"><button on:click={() => { const target = moment; closeMomentDetail(); focusConversation(`Zu „${target.title}“ weiterdenken: `, { kind: "learning_moment", id: target.id, label: target.title }); }}><MessageSquareText size={15} /> Mit dem Companion weiterdenken</button><button on:click={startEditMoment}>Bearbeiten</button><button on:click={() => { closeMomentDetail(); selectPerspective("timeline"); }}>Zeitlich einplanen</button></div>
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
          <div class="pad-actions"><button type="button" class="ghost" on:click={developMomentWithCriticalFriend}>Mit dem Companion entwickeln</button><button type="submit" disabled={newMomentForm.title.trim().length < 2}>Lernmoment aufnehmen</button></div>
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
            <div class="detail-actions"><button on:click={startEditTransition}>Bearbeiten</button><button on:click={checkTransitionWithCriticalFriend}><MessageSquareText size={15} /> Mit dem Companion prüfen</button><button on:click={proposeMissingMoment}>Fehlenden Lernmoment vorschlagen</button><button class="danger" on:click={removeTransition}>Entfernen</button></div>
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
          <div class="detail-actions"><button on:click={() => clarifyBoardItem(item)}><MessageSquareText size={15} /> Im Gespräch klären</button><button class="danger" on:click={() => discardBoardItem(item)}>Verwerfen</button></div>
          <p class="muted">Das Planungsboard bleibt eine Übersicht. Eine Vorbereitung startet und ein Ergebnis wird freigegeben ausschließlich über „Jetzt wichtig“ im Gespräch.</p>
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
          {#if workerMaterial}<button class="link-action" on:click={() => { approvalConfirm = null; focusMode = "materials"; }}>Entwurf zuerst ansehen</button>{/if}
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
          <div class="pad-actions"><button type="button" class="ghost" on:click={() => focusPlacementInConversation(draft)}>Mit dem Companion weiterdenken</button><button type="button" class="danger" on:click={() => removePlacement(draft)}>Platzierung entfernen</button><button type="submit">Änderung festhalten</button></div>
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
            <div class="detail-actions"><button on:click={() => { const target = detail; windowDetail = null; openWindowForm(target); }}>Fenster bearbeiten</button><button on:click={() => { windowDetail = null; focusConversation(`Zur Dramaturgie von „${detail.title}“ weiterdenken: `, { kind: "teaching_window", id: detail.id, label: detail.title }); }}><MessageSquareText size={15} /> Mit dem Companion weiterdenken</button></div>
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
        <header class="planning-modal-header"><div class="planning-modal-context"><span>Unterrichtsplanung &middot; aus dem Denkraum</span><h2>{learningLandscape.title}</h2><p>Die Lernlandschaft bleibt mit dem Gespr&auml;ch und diesem Planungsraum verbunden.</p></div><div class="planning-modal-actions"><button class="planning-return" on:click={() => { planningModal = false; focusMode = "conversation"; }}>Zur&uuml;ck ins Gespr&auml;ch</button><button class="icon-button" on:click={() => (planningModal = false)} aria-label="Unterrichtsplanung schlie&szlig;en"><X size={20} /></button></div></header>
        <nav class="planning-tabs" aria-label="Planungsansichten"><button role="tab" aria-selected={planningTab === "landscape"} class:active={planningTab === "landscape"} on:click={() => (planningTab = "landscape")}>Lernlandschaft</button><button role="tab" aria-selected={planningTab === "board"} class:active={planningTab === "board"} on:click={() => (planningTab = "board")}>Planungsboard</button></nav>
        <section class="planning-modal-content">
          {#if planningTab === "landscape"}
            <div class="modal-landscape-toolbar"><div><strong>Lernlandschaft</strong><span>Canvas und lineare Lesansicht greifen auf dieselbe Landschaft zu.</span></div><div class="title-actions"><button class="add-moment-button" on:click={() => (landscapeMode = "canvas")}><MapIcon size={14} /> Raumansicht</button><button class="add-moment-button" on:click={() => (landscapeMode = "linear")}><List size={14} /> Linear lesen</button><button class="add-moment-button ghost-action" on:click={() => openGroupForm()}><Layers size={14} /> Fläche hinzufügen</button><button class="add-moment-button ghost-action" on:click={resetLandscapeLayout}><RotateCcw size={14} /> Layout zurücksetzen</button></div></div>
            {#if landscapeMode === "canvas"}<div class="modal-flow-canvas flow-canvas" role="application" aria-label="Lernlandschaft im Canvas"><SvelteFlow bind:nodes={canvasNodes} bind:edges={canvasEdges} nodeTypes={canvasNodeTypes} fitView={landscapeViewport === undefined} initialViewport={landscapeViewport} nodesDraggable={true} nodesConnectable={true} nodesFocusable={true} edgesFocusable={true} onnodedragstop={() => void saveLandscapeLayout()} onmoveend={saveLandscapeViewport} onconnect={handleCanvasConnect} onnodeclick={(event) => handleCanvasNodeClick(event.node)} onedgeclick={(event) => openTransitionDetail(event.edge.id)}><Background /><Controls /><MiniMap /></SvelteFlow></div>{:else}<div class="linear-landscape modal-linear-landscape" aria-label="Lineare Lesansicht der Lernlandschaft"><p class="linear-landscape-intro">Diese Lesansicht nutzt dieselben Lernmomente und &Uuml;berg&auml;nge wie die Raumansicht. Beide Darstellungen bleiben gleichwertig erreichbar.</p>{#each linearMoments() as moment, index}<article class="linear-moment"><div class="linear-moment-index" aria-hidden="true">{index + 1}</div><div class="linear-moment-content"><span class="learning-moment-kind">{momentKindLabels[moment.kind] ?? moment.kind}</span><h3>{moment.title}</h3><p>{moment.didacticPurpose || "Didaktische Funktion noch offen"}</p>{#if moment.learningActivity}<small><strong>Lernaktivit&auml;t:</strong> {moment.learningActivity}</small>{/if}{#if landscapeGroups.some((group) => group.memberIds.includes(moment.id))}<div class="linear-groups">{#each landscapeGroups.filter((group) => group.memberIds.includes(moment.id)) as group}<span>{landscapeGroupKindLabels[group.kind]}: {group.title}</span>{/each}</div>{/if}<div class="linear-moment-actions"><button on:click={() => openMomentDetail(moment.id)}>Lernmoment &ouml;ffnen</button>{#each transitionsFrom(moment.id) as transition}<span class="linear-transition"><strong>{transitionKindLabels[transition.kind]}</strong> &rarr; {momentTitle(transition.to)}</span>{/each}</div></div></article>{/each}</div>{/if}
          {:else}<div class="board-view inline">{#each boardColumns as column}<section class="board-column" role="list" aria-label={column.label}><header><strong>{column.label}</strong><span>{column.hint}</span></header><div class="board-cards">{#each planningBoard?.items.filter((item) => item.column === column.id) ?? [] as item}<button class="board-card" on:click={() => { planningModal = false; boardDetail = item; }}><span class="board-kind">{boardKindLabels[item.kind] ?? item.kind}</span><strong>{item.title}</strong><small>{boardStatusLabels[item.status] ?? item.status}</small></button>{/each}</div></section>{/each}</div>{/if}
        </section>
      </dialog>
    </div>
  {/if}
  {#if proposal}
    {@const current = proposal}
    <div class="planning-overlay" role="presentation" on:click={() => (proposal = null)}>
      <dialog class="start-modal detail-modal" open aria-label="Vorschlag des Pedagogical Companion" on:click|stopPropagation>
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

<style>
  .conversation-status.simulated {
    margin: 0.25rem 0 0.75rem;
    padding: 0.55rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #d9b45f;
    background: #fbf3df;
    color: #6b5320;
    font-size: 0.85rem;
    line-height: 1.35;
  }
</style>
