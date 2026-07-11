<script lang="ts">
  import { onMount, tick } from "svelte";
  import { AlertCircle, ArrowUp, BookOpen, CheckCircle2, ChevronDown, FileText, GripVertical, Lightbulb, Map, MessageSquareText, PanelLeftClose, PanelLeftOpen, Plus, ShieldCheck, TriangleAlert, X } from "lucide-svelte";
  import { api, type ExportApproval, type LearningLandscape, type PlanningBoard, type PlanningBoardItem, type PlanningSpace, type SensitiveFinding, type ServiceRequest, type ThinkingCard, type WorkerMaterial } from "$lib/api";
  import { Background, Controls, MiniMap, SvelteFlow } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { uuid } from "$lib/uuid";

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
  let workspaceElement: HTMLElement | null = null;
  let railCollapsed = false;
  let primaryWidth = 58;
  let newRoom = { title: "", subject: "", targetGroup: "", initialIdea: "" };
  let planningModal = false;
  let createRoomModal = false;
  let roomView: "conversation" | "landscape" | "board" = "conversation";
  let planningTab: "landscape" | "board" = "landscape";
  let learningLandscape: LearningLandscape | null = null;
  let planningBoard: PlanningBoard | null = null;
  let planningError = "";
  let planningLoading = false;
  let canvasNodes: any[] = [];
  let canvasEdges: any[] = [];
  let draggedBoardItem: string | null = null;
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
      if (!activeSpace && spaces.length > 0) await openSpace(spaces[0]);
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
  }

  async function scrollConversationToEnd() {
  await tick();
  messagesElement?.scrollTo({ top: messagesElement.scrollHeight, behavior: "smooth" });
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
        ? { ...item, column, status: column === "ready" ? "ready" : item.status }
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

  function startResize(event: PointerEvent) {
    const bounds = workspaceElement?.getBoundingClientRect();
    if (!bounds) return;
    const move = (moveEvent: PointerEvent) => { primaryWidth = Math.min(72, Math.max(42, ((moveEvent.clientX - bounds.left) / bounds.width) * 100)); };
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

  async function selectPerspective(view: "conversation" | "landscape" | "board") {
    roomView = view;
    if (view === "conversation" || !activeSpace) return;
    planningLoading = true; planningError = "";
    try { const artifacts = await api.getPlanningArtifacts(activeSpace.id); learningLandscape = artifacts.learningLandscape; planningBoard = artifacts.planningBoard; makeCanvas(); }
    catch (err) { planningError = err instanceof Error ? err.message : "Die Planung konnte nicht geladen werden."; }
    finally { planningLoading = false; }
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
      <div class="topbar-actions">{#if activeSpace}<nav class="room-nav" aria-label="Perspektiven"><button class:active={roomView === "conversation"} on:click={() => selectPerspective("conversation")}>Gespräch & Denkstand</button><button class:active={roomView === "landscape"} on:click={() => selectPerspective("landscape")}>Lernlandschaft</button><button class:active={roomView === "board"} on:click={() => selectPerspective("board")}>Planungsboard</button></nav>{/if}<div class="status-pill"><ShieldCheck size={16} /> Geschützter Planungsraum</div></div>
    </header>

    {#if error}<div class="notice error"><AlertCircle size={18} /> {error}</div>{/if}

    {#if activeSpace}
      <section class="workspace-grid" bind:this={workspaceElement} style={`--primary-width: ${primaryWidth}%`}>
        <section class="conversation-panel" aria-label="Gemeinsam nachdenken">
          {#if roomView !== "conversation"}
            <div class="perspective-workspace">
              {#if planningLoading}<p class="planning-empty">Planung wird geöffnet …</p>
              {:else if planningError}<p class="planning-error">{planningError}</p>
              {:else if roomView === "landscape" && learningLandscape}
                <div class="landscape-view inline"><aside class="landscape-summary"><span>Struktur</span><strong>{learningLandscape.structure}</strong><p>{learningLandscape.moments.length} Lernmomente · {learningLandscape.transitions.length} Verbindungen</p><p>Ein Lernmoment ist nicht automatisch eine Stunde.</p></aside><div class="flow-canvas"><SvelteFlow bind:nodes={canvasNodes} bind:edges={canvasEdges} fitView nodesDraggable={true} nodesConnectable={false} elementsSelectable={true}><Background /><Controls /><MiniMap /></SvelteFlow></div></div>
              {:else if roomView === "board" && planningBoard}
                <div class="board-view inline">{#each boardColumns as column}<section class="board-column" role="list" aria-label={column.label} on:dragover|preventDefault on:drop={() => moveBoardItem(column.id)}><header><strong>{column.label}</strong><span>{column.hint}</span></header><div class="board-cards">{#each planningBoard.items.filter((item) => item.column === column.id) as item}<article class="board-card" role="listitem" draggable="true" on:dragstart={() => (draggedBoardItem = item.id)}><span class="board-kind">{item.kind}</span><strong>{item.title}</strong>{#if item.relatedNodes.length}<small>Bezug: {item.relatedNodes.join(", ")}</small>{/if}</article>{/each}{#if planningBoard.items.filter((item) => item.column === column.id).length === 0}<p class="board-empty">Noch kein Arbeitsvorhaben.</p>{/if}</div></section>{/each}</div>
              {/if}
            </div>
          {:else}          <div class="messages" bind:this={messagesElement}>
            {#each messages as message}
              <article class:teacher={message.author === "teacher"} class="message">
                <div class="avatar">{message.author === "teacher" ? "L" : "CF"}</div><p>{message.text}</p>
              </article>
            {/each}
            {#if sending}<article class="message thinking"><div class="avatar">CF</div><p><span class="thinking-dots" aria-hidden="true"></span>Ich prüfe deine Frage und halte den Denkstand gleich sichtbar fest.</p></article>{/if}
          </div>
          <div class="composer-wrap">
            <div class="privacy-hint"><ShieldCheck size={15} /> Für die Planung reichen Beschreibungen ohne Namen einzelner Schüler:innen.</div>
            <form class="composer" on:submit|preventDefault={sendMessage}>
              <textarea bind:value={draftMessage} rows="3" placeholder="Beschreibe kurz deine Unterrichtsidee oder die offene Frage." on:keydown={handleComposerKeydown}></textarea>
              <button type="submit" disabled={sending || !draftMessage.trim()} aria-label="Nachricht senden"><ArrowUp size={18} /></button>
            </form>
          </div>
        {/if}
        </section>

        <button class="resize-handle" aria-label="Breite der Arbeitsbereiche anpassen" on:pointerdown={startResize}><GripVertical size={18} /></button>

        <aside class="thinking-panel" aria-label="Denkstand">
          {#if roomView !== "conversation"}
            <div class="context-chat-heading"><MessageSquareText size={18} /><div><strong>Im Gespräch weiterdenken</strong><span>{roomView === "board" ? "Zum Planungsboard" : "Zur Lernlandschaft"}</span></div></div>
            <div class="context-messages">{#each messages.slice(-6) as message}<article class:teacher={message.author === "teacher"} class="message"><div class="avatar">{message.author === "teacher" ? "L" : "CF"}</div><p>{message.text}</p></article>{/each}</div>
            <form class="composer compact" on:submit|preventDefault={sendMessage}><textarea bind:value={draftMessage} rows="3" placeholder="Zu dieser Ansicht weiterdenken …" on:keydown={handleComposerKeydown}></textarea><button type="submit" disabled={sending || !draftMessage.trim()} aria-label="Nachricht senden"><ArrowUp size={18} /></button></form>
          {:else}          <div class="panel-heading"><Lightbulb size={18} /><div><strong>Denkstand</strong><span>Orientierung, keine Aufgabenflut</span></div></div>

          <section class="thinking-card design-pad">
            <div class="pad-heading"><div><strong>Gemeinsamer Denkstand</strong><span>Deine Ergänzungen bleiben für das weitere Gespräch sichtbar.</span></div><button on:click={() => (editingDesign = !editingDesign)}>{editingDesign ? "Lesen" : "Gemeinsam schreiben"}</button></div>
            {#if editingDesign}<textarea bind:value={designNotes} rows="13" aria-label="Gemeinsamer Denkstand"></textarea><div class="pad-actions"><button on:click={saveDesignNotes} disabled={savingDesign}>{savingDesign ? "Speichert …" : "Änderung festhalten"}</button></div>{:else}<div class="design-preview">{designNotes}</div>{/if}
          </section>
          {#if findings.length > 0}
            <section class="sensitive-card" class:blocking={hasBlockingFinding}>
              <div class="sensitive-heading"><TriangleAlert size={18} /><strong>Sensible Hinweise prüfen</strong></div>
              <ul>
                {#each findings as finding}<li><span>{finding.message}</span><small>{finding.suggestion}</small></li>{/each}
              </ul>
            </section>
          {/if}

          {#each cards as card}
            <section class="thinking-card">
              <button class="card-toggle" on:click={() => (expandedCard = expandedCard === card.id ? "" : card.id)}>
                <span>{card.title}</span><span class:open={expandedCard === card.id} class="chevron"><ChevronDown size={16} /></span>
              </button>
              <p>{card.summary}</p>
              {#if expandedCard === card.id}<ul>{#each card.previewItems.length ? card.previewItems : ["Noch nichts festgehalten."] as item}<li>{item}</li>{/each}</ul>{/if}
            </section>
          {/each}

          <section class="thinking-card service-card">
            <strong>Materialentwurf</strong>
            {#if serviceRequests.length === 0}
              <p>Wenn der Denkstand trägt, kannst du einen ersten Arbeitsauftrag als prüfbaren Entwurf vormerken.</p>
              <div class="service-actions"><button on:click={proposeStudentInstruction}>Als nächsten Schritt vorschlagen</button></div>
            {:else}
              {#each serviceRequests as serviceRequest}
                {#if serviceRequest.status === "proposed"}
                  <p>„Arbeitsauftrag vorbereiten“ ist vorgemerkt und wartet auf deine Zustimmung.</p>
                  <div class="service-actions"><button on:click={() => approveServiceRequest(serviceRequest)}>Entwurf vorbereiten lassen</button></div>
                {:else if serviceRequest.status === "reviewed"}
                  <p>{serviceRequest.review?.note ?? "Der Entwurf wurde geprüft und liegt zur Entscheidung bereit."}</p>
                  {#if workerMaterial}
                    <div class="service-actions"><button on:click={() => (showWorkerMaterial = !showWorkerMaterial)}>{showWorkerMaterial ? "Entwurf schließen" : "Entwurf ansehen"}</button></div>
                    {#if showWorkerMaterial}<pre class="worker-material">{workerMaterial.content}</pre>{/if}
                  {/if}
                {:else if serviceRequest.status === "failed"}
                  <p>Der Entwurf konnte noch nicht sicher vorbereitet werden.</p>
                {:else}
                  <p>Der Entwurf wird vorbereitet und kehrt zunächst zum Critical Friend zurück.</p>
                {/if}
              {/each}
            {/if}
            {#if serviceMessage}<p class="service-message">{serviceMessage}</p>{/if}
          </section>

          <section class="ready-card"><CheckCircle2 size={18} /><div><strong>Für den Unterricht bereit</strong><span>{markdownApproval ? "Markdown freigegeben." : "Noch nichts freigegeben."}</span></div></section>

          <section class="export-actions">
            <button on:click={() => approve("markdown")} disabled={hasBlockingFinding}>Markdown freigeben</button>
            {#if markdownApproval}<a href={`${api.backendUrl}/api/planning-spaces/${activeSpace.id}/export/markdown`} target="_blank" rel="noreferrer"><FileText size={16} /> Markdown ansehen</a>{/if}
            <button on:click={() => approve("okf_markdown")} disabled={hasBlockingFinding}>OKF freigeben</button>
            {#if okfApproval}<a href={`${api.backendUrl}/api/planning-spaces/${activeSpace.id}/export/okf`} target="_blank" rel="noreferrer"><FileText size={16} /> OKF-Markdown ansehen</a>{/if}
          </section>
        {/if}
        </aside>
      </section>
    {:else}
      <section class="empty-state"><MessageSquareText size={34} /><h2>Lege einen Planungsraum an.</h2><p>Der erste Umsetzungsschnitt arbeitet mit einer geschützten Backend-Grenze und einem simulierten Gegenüber.</p></section>
    {/if}
  </main>
</div>




