<script lang="ts">
  import { onMount, tick } from "svelte";
  import { AlertCircle, ArrowRight, ArrowUp, BookOpen, Check, CheckCircle2, ChevronDown, FileText, GripVertical, Lightbulb, ListChecks, Map, MessageSquareText, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Scale, ShieldCheck, Settings, TriangleAlert, X } from "lucide-svelte";
  import { api, type ExportApproval, type LearningLandscape, type PlanningBoard, type PlanningBoardItem, type PlanningSpace, type SensitiveFinding, type ServiceRequest, type ThinkingCard, type WorkerMaterial } from "$lib/api";
  import { Background, Controls, MiniMap, SvelteFlow } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { uuid } from "$lib/uuid";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";

  type UiMessage = { id: string; author: "teacher" | "critical_friend"; text: string };

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
  let error = "";
  let draftMessage = "";
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
  let railCollapsed = false;
  let primaryWidth = 58;
  let newRoom = { title: "", subject: "", targetGroup: "", initialIdea: "" };
  let planningModal = false;
  let createRoomModal = false;
  let roomView: "conversation" | "landscape" | "timeline" | "board" | "materials" = "conversation";
  let planningTab: "landscape" | "board" = "landscape";
  let learningLandscape: LearningLandscape | null = null;
  let planningBoard: PlanningBoard | null = null;
  let planningError = "";
  let planningLoading = false;
  let canvasNodes: any[] = [];
  let canvasEdges: any[] = [];
  let draggedBoardItem: string | null = null;
  const lastOpenedSpaceKey = "ptspace.last-opened-planning-space";
  const boardColumns: Array<{ id: PlanningBoardItem["column"]; label: string; hint: string }> = [
    { id: "clarify", label: "Noch klären", hint: "Entscheidungen und Recherche" },
    { id: "prepare", label: "Vorbereiten", hint: "Dramaturgie und Materialien" },
    { id: "review", label: "Zur Prüfung", hint: "Ergebnisse gemeinsam ansehen" },
    { id: "ready", label: "Bereit", hint: "fachlich freigegeben" }
  ];

  onMount(async () => {
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
    error = "";
    messages = [...messages, { id: uuid(), author: "teacher", text }];
    await scrollConversationToEnd();
    try {
      await scanText(text);
      const result = await api.sendMessage(activeSpace.id, text);
      messages = [...messages, { id: result.reply.id, author: "critical_friend", text: result.reply.text }];
    await scrollConversationToEnd();
      const state = await api.getThinkingState(activeSpace.id);
      cards = state.cards;
      roomOverview = await api.getRoomOverview(activeSpace.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Die Antwort konnte noch nicht vorbereitet werden.";
    } finally {
      sending = false;
    }
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
    canvasNodes = learningLandscape.moments.map((moment, index) => ({
      id: moment.id,
      position: { x: 80 + (index % 3) * 280, y: 70 + Math.floor(index / 3) * 180 },
      data: { label: `${moment.title}\n${moment.didacticPurpose || moment.learningActivity || "Lernmoment"}` }
    }));
    canvasEdges = learningLandscape.transitions.map((transition) => ({
      id: transition.id,
      source: transition.from,
      target: transition.to,
      type: "smoothstep",
      label: transition.kind === "required" ? "gemeinsamer Weg" : transition.kind,
      animated: transition.kind === "choice"
    }));
  }

  async function openPlanning() {
    if (!activeSpace) return;
    planningLoading = true;
    planningError = "";
    try {
      const artifacts = await api.getPlanningArtifacts(activeSpace.id);
      learningLandscape = artifacts.learningLandscape;
      planningBoard = artifacts.planningBoard;
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
    return Array.from(document.body.children).map((node) => node.tagName === "H1" ? `# ${node.textContent}` : node.tagName === "H2" ? `## ${node.textContent}` : node.tagName === "UL" ? Array.from(node.querySelectorAll("li")).map((item) => `- ${item.textContent}`).join("\n") : node.textContent?.trim() || "").filter(Boolean).join("\n\n");
  }
  function tiptap(node: HTMLElement) {
    const editor = new Editor({ element: node, extensions: [StarterKit], content: markdownToHtml(designNotes), onUpdate: ({ editor: nextEditor }) => { designNotes = htmlToMarkdown(nextEditor.getHTML()); } });
    return { destroy: () => editor.destroy() };
  }
  function startResize(event: PointerEvent) {
    const bounds = workspaceElement?.getBoundingClientRect();
    if (!bounds) return;
    const move = (moveEvent: PointerEvent) => { primaryWidth = Math.min(78, Math.max(22, ((moveEvent.clientX - bounds.left) / bounds.width) * 100)); };
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

  async function selectPerspective(view: "conversation" | "landscape" | "timeline" | "board" | "materials") {
    roomView = view;
    if (view === "conversation" || !activeSpace) return;
    planningLoading = true; planningError = "";
    try { const artifacts = await api.getPlanningArtifacts(activeSpace.id); learningLandscape = artifacts.learningLandscape; planningBoard = artifacts.planningBoard; makeCanvas(); }
    catch (err) { planningError = err instanceof Error ? err.message : "Die Planung konnte nicht geladen werden."; }
    finally { planningLoading = false; }
  }
  async function focusConversation(prompt: string) {
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

  $: hasBlockingFinding = findings.some((finding) => finding.severity === "block_export");
</script>

<svelte:head><title>ptspace-app</title></svelte:head>

<div class:rail-collapsed={railCollapsed} class="app-shell">
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
      <div><span>Gemeinsam nachdenken</span><h1>{activeSpace?.title ?? "Neuer pädagogischer Denkraum"}</h1></div>
      <div class="topbar-actions"><button class="settings-button" on:click={async () => { settingsOpen = true; try { runtimeStatus = (await api.getRuntimeStatus()).harnessAvailability.teacherFacingMessage; } catch { runtimeStatus = "Die Runtime-Konfiguration konnte nicht geprüft werden."; } }}><Settings size={16} /> Einstellungen</button>
        {#if activeSpace}<nav class="room-nav" aria-label="Perspektiven"><button class:active={roomView === "conversation"} on:click={() => selectPerspective("conversation")}>Gespräch & Denkstand</button><button class:active={roomView === "landscape"} on:click={() => selectPerspective("landscape")}>Lernlandschaft</button><button class:active={roomView === "timeline"} on:click={() => selectPerspective("timeline")}>Zeit & Dramaturgie</button><button class:active={roomView === "board"} on:click={() => selectPerspective("board")}>Planungsboard</button><button class:active={roomView === "materials"} on:click={() => selectPerspective("materials")}>Materialien</button></nav>{/if}
        <button class="statusbar" on:click={() => (statusDetailsOpen = !statusDetailsOpen)} aria-expanded={statusDetailsOpen}>
          <span>{roomOverview?.progress.filter((phase) => phase.complete).length ?? 0}/{roomOverview?.progress.length ?? 0} Etappen</span><span>{sending ? "Ich denke kurz mit" : "Gespräch bereit"}</span><span>{cards.find((card) => card.id === "offene-entscheidungen")?.previewItems.length ?? 0} offen</span><span>{markdownApproval ? "freigegeben" : "noch nicht freigegeben"}</span>
        </button>
      </div>
    </header>
    {#if statusDetailsOpen && roomOverview}<section class="status-details" aria-label="Verlauf des Planungsraums"><div><strong>Reifegrad</strong>{#each roomOverview.progress as phase}<span class:complete={phase.complete}>{phase.complete ? "✓" : "○"} {phase.label}</span>{/each}</div><div><strong>Zuletzt festgehalten</strong>{#each roomOverview.activity.slice(0, 3) as activity}<span>{activity.label}</span>{/each}</div></section>{/if}

    {#if error}<div class="notice error"><AlertCircle size={18} /> {error}</div>{/if}

    {#if activeSpace}
      <section class="workspace-grid" bind:this={workspaceElement} style={`--primary-width: ${primaryWidth}%`}>
        <section class="conversation-panel" aria-label="Gespräch mit Critical Friend">
          <div class="conversation-heading"><MessageSquareText size={18} /><div><strong>Gespräch mit Critical Friend</strong><span>{roomView === "conversation" ? "Gemeinsam weiterdenken" : "Die gewählte Perspektive bleibt rechts sichtbar"}</span></div></div>
          <div class="messages" bind:this={messagesElement}>
            {#each messages as message}<article class:teacher={message.author === "teacher"} class="message"><div class="avatar">{message.author === "teacher" ? "L" : "CF"}</div><div class="message-body markdown-preview">{@html markdownToHtml(message.text)}</div></article>{/each}
            {#if sending}<article class="message thinking"><div class="avatar">CF</div><p><span class="thinking-dots" aria-hidden="true"></span>Ich prüfe deine Frage und halte den Denkstand gleich sichtbar fest.</p></article>{/if}
          </div>
          <div class="composer-wrap"><div class="privacy-hint"><ShieldCheck size={15} /> Für die Planung reichen Beschreibungen ohne Namen einzelner Schüler:innen.</div><form class="composer" on:submit|preventDefault={sendMessage}><textarea bind:this={composerElement} bind:value={draftMessage} rows="3" placeholder="Beschreibe kurz deine Unterrichtsidee oder die offene Frage." on:keydown={handleComposerKeydown}></textarea><button type="submit" disabled={sending || !draftMessage.trim()} aria-label="Nachricht senden"><ArrowUp size={18} /></button></form></div>
        </section>
        <button class="resize-handle" aria-label="Breite der Arbeitsbereiche anpassen" on:pointerdown={startResize}><GripVertical size={18} /></button>
        <aside class="perspective-panel" aria-label="Gewählte Perspektive">
          {#if roomView === "conversation"}
            <div class="panel-heading"><Lightbulb size={18} /><div><strong>Denkstand</strong><span>Gemeinsam festhalten, was das weitere Gespräch trägt.</span></div><div class="panel-menu"><button on:click={() => (exportMenuOpen = !exportMenuOpen)}>Mehr</button>{#if exportMenuOpen}<div class="export-menu"><button on:click={() => approve("markdown")} disabled={hasBlockingFinding}>Markdown freigeben</button><button on:click={() => approve("okf_markdown")} disabled={hasBlockingFinding}>Zum Teilen vormerken</button>{#if markdownApproval}<a href={`${api.backendUrl}/api/planning-spaces/${activeSpace.id}/export/markdown`} target="_blank" rel="noreferrer">Markdown ansehen</a>{/if}</div>{/if}</div></div>
            <section class="thinking-card design-pad"><div class="pad-heading"><div><strong>Gemeinsamer Denkstand</strong><span>Bewusst speichern erstellt eine nachvollziehbare Version und wird im nächsten Gespräch berücksichtigt.</span></div><button on:click={() => (editingDesign = !editingDesign)}>{editingDesign ? "Lesen" : "Gemeinsam schreiben"}</button></div>{#if editingDesign}<div class="tiptap-editor" use:tiptap aria-label="Gemeinsamer Denkstand"></div><div class="pad-actions"><button on:click={saveDesignNotes} disabled={savingDesign}>{savingDesign ? "Speichert …" : "Änderung festhalten"}</button></div>{:else}<div class="design-preview markdown-preview">{@html markdownToHtml(designNotes)}</div>{/if}</section>
            <div class="conversation-perspective">
              {#if findings.length > 0}<section class="sensitive-card" class:blocking={hasBlockingFinding}><div class="sensitive-heading"><TriangleAlert size={18} /><strong>Sensible Hinweise prüfen</strong></div><ul>{#each findings as finding}<li><span>{finding.message}</span><small>{finding.suggestion}</small></li>{/each}</ul></section>{/if}
              {#each cards.filter((card) => card.id === "offene-entscheidungen" || card.id === "nächste-schritte") as card}
                <section class="thinking-card action-card" class:decision-card={card.id === "offene-entscheidungen"} class:next-step-card={card.id === "nächste-schritte"}>
                  <div class="action-card-heading">{#if card.id === "offene-entscheidungen"}<Scale size={18} />{:else}<ListChecks size={18} />{/if}<div><strong>{card.title}</strong><span>{card.id === "offene-entscheidungen" ? `${card.previewItems.length} noch zu klären` : "Ein sinnvoller nächster Schritt"}</span></div></div>
                  {#if card.id === "offene-entscheidungen"}<p>{card.summary}</p><div class="decision-list">{#each card.previewItems as item}{@const decision = decisionParts(item)}<article class="decision-item"><span class="decision-chip">{decision.category}</span><strong>{decision.question}</strong><div><button class="decide-action" on:click={() => focusConversation(`Lass uns diese offene Entscheidung klären: ${decision.question}`)}><Scale size={15} /> Jetzt entscheiden</button><button class="record-action" on:click={() => openDecisionDialog(decision.question)}><Check size={15} /> Begründet festhalten</button></div></article>{/each}</div>
                  {:else}{#each card.previewItems.slice(0, 1) as item}<article class="next-step-item"><strong>{item}</strong><button on:click={() => focusConversation(`Ich möchte den nächsten Schritt „${item}“ im Gespräch aufgreifen: `)}>Im Gespräch aufgreifen <ArrowRight size={14} /></button></article>{/each}<button class="board-overview" on:click={() => selectPerspective("board")}>Alle Arbeitsvorhaben im Planungsboard <ArrowRight size={14} /></button>{/if}
                </section>
              {/each}
            </div>
          {:else if planningLoading}<p class="planning-empty">Planung wird geöffnet …</p>
          {:else if planningError}<p class="planning-error">{planningError}</p>
          {:else if roomView === "landscape" && learningLandscape}<div class="perspective-title"><span>Lernlandschaft</span><h2>{learningLandscape.title}</h2><p>Wähle einen Lernmoment, um dazu im Gespräch weiterzudenken.</p></div><div class="landscape-view inline"><div class="flow-canvas"><SvelteFlow bind:nodes={canvasNodes} bind:edges={canvasEdges} fitView nodesDraggable={true} nodesConnectable={false} elementsSelectable={true} onnodeclick={(event) => { const moment = learningLandscape?.moments.find((item) => item.id === event.node.id); if (moment) focusConversation(`Zu „${moment.title}“ in der Lernlandschaft weiterdenken: `); }}><Background /><Controls /><MiniMap /></SvelteFlow></div></div>
          {:else if roomView === "timeline" && learningLandscape}<div class="timeline-view"><header><span>Zeit & Dramaturgie</span><h2>Unterrichtsfenster</h2></header><div class="timeline-track">{#each learningLandscape.teachingWindows as window}<section class="teaching-window"><h3>{window.title}</h3><span>{window.kind === "lesson" ? "Unterrichtsstunde" : window.kind === "double_lesson" ? "Doppelstunde" : window.kind === "project_block" ? "Projektblock" : "Offene Lernzeit"}</span><div class="window-moments">{#each learningLandscape.placements.filter((placement) => placement.windowId === window.id) as placement}{#each learningLandscape.moments.filter((moment) => moment.id === placement.nodeId) as moment}<button on:click={() => focusConversation(`Zu „${moment.title}“ im Zeitfenster „${window.title}“ weiterdenken: `)}><strong>{moment.title}</strong><small>{placement.note || moment.didacticPurpose}</small></button>{/each}{/each}</div></section>{/each}</div></div>
          {:else if roomView === "board" && planningBoard}<div class="board-view inline">{#each boardColumns as column}<section class="board-column" role="list" aria-label={column.label} on:dragover|preventDefault on:drop={() => moveBoardItem(column.id)}><header><strong>{column.label}</strong><span>{column.hint}</span></header><div class="board-cards">{#each planningBoard.items.filter((item) => item.column === column.id) as item}<button class="board-card" draggable="true" on:dragstart={() => (draggedBoardItem = item.id)} on:click={() => focusConversation(`Zum Arbeitsvorhaben „${item.title}“ weiterdenken: `)}><span class="board-kind">{item.kind}</span><strong>{item.title}</strong><small>Im Gespräch aufgreifen</small></button>{/each}</div></section>{/each}</div>
          {:else if roomView === "materials"}<div class="materials-view"><header><span>Materialien</span><h2>Vom Arbeitsvorhaben zum Unterricht</h2><p>Arbeitsvorhaben → Entwurf → gemeinsame Prüfung → ausdrückliche Freigabe.</p></header>{#if workerMaterial}<article class="material-card"><span>Entwurf zur Prüfung</span><h3>{workerMaterial.title}</h3><pre>{workerMaterial.content}</pre><button on:click={() => focusConversation(`Den Entwurf „${workerMaterial?.title}“ gemeinsam prüfen: `)}>Gemeinsam prüfen</button></article>{:else}<p class="planning-empty">Noch kein Entwurf. Im Planungsboard kann ein Arbeitsvorhaben bewusst vorbereitet werden.</p>{/if}</div>{/if}
        </aside>
      </section>
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
  {/if}  {#if settingsOpen}
    <div class="planning-overlay" role="presentation" on:click={() => (settingsOpen = false)}>
      <dialog class="start-modal" open aria-label="Einstellungen" on:click|stopPropagation>
        <header><div><span>Administration</span><h2>Test-Runtime</h2></div><button class="icon-button" on:click={() => (settingsOpen = false)} aria-label="Schließen"><X size={20} /></button></header>
        <div class="start-form"><p>{runtimeStatus}</p><p>Die lokale Konfiguration wird aus <code>.env</code> gelesen. Schlüssel werden hier nie angezeigt oder im Gespräch verarbeitet.</p><p>Wenn der Status eine nicht gestartete Runtime nennt, starte Docker Desktop. Nach Änderungen an <code>.env</code> das Backend neu starten und den Status erneut prüfen.</p></div>
      </dialog>
    </div>
  {/if}  </main>
</div>




