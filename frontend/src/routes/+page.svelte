<script lang="ts">
  import { onMount, tick } from "svelte";
  import { AlertCircle, ArrowUp, BookOpen, CheckCircle2, ChevronDown, FileText, Lightbulb, MessageSquareText, Plus, ShieldCheck, TriangleAlert } from "lucide-svelte";
  import { api, type ExportApproval, type PlanningSpace, type SensitiveFinding, type ServiceRequest, type ThinkingCard, type WorkerMaterial } from "$lib/api";
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
let messagesElement: HTMLDivElement | null = null;
  let newRoom = { title: "", subject: "", targetGroup: "", initialIdea: "" };

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

  function handleComposerKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  $: hasBlockingFinding = findings.some((finding) => finding.severity === "block_export");
</script>

<svelte:head><title>ptspace-app</title></svelte:head>

<div class="app-shell">
  <aside class="room-rail" aria-label="Planungsräume">
    <div class="brand-row">
      <div class="brand-mark"><BookOpen size={18} /></div>
      <div><strong>Planungsräume</strong><span>ptspace</span></div>
    </div>

    <form class="new-room" on:submit|preventDefault={createSpace}>
      <label>Titel<input bind:value={newRoom.title} placeholder="z. B. Hoffnung trotz Krise" /></label>
      <label>Fach<input bind:value={newRoom.subject} placeholder="Religion" /></label>
      <label>Zielgruppe<input bind:value={newRoom.targetGroup} placeholder="Klasse 9" /></label>
      <label>Kurze Idee<textarea bind:value={newRoom.initialIdea} rows="3" placeholder="Woran möchtest du weiterdenken?"></textarea></label>
      <button type="submit"><Plus size={16} /> Planungsraum anlegen</button>
    </form>

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

  <main class="planning-room">
    <header class="topbar">
      <div><span>Gemeinsam nachdenken</span><h1>{activeSpace?.title ?? "Neuer pädagogischer Denkraum"}</h1></div>
      <div class="status-pill"><ShieldCheck size={16} /> Geschützter Planungsraum</div>
    </header>

    {#if error}<div class="notice error"><AlertCircle size={18} /> {error}</div>{/if}

    {#if activeSpace}
      <section class="workspace-grid">
        <section class="conversation-panel" aria-label="Gemeinsam nachdenken">
          <div class="messages" bind:this={messagesElement}>
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
        </section>

        <aside class="thinking-panel" aria-label="Denkstand">
          <div class="panel-heading"><Lightbulb size={18} /><div><strong>Denkstand</strong><span>Orientierung, keine Aufgabenflut</span></div></div>

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
        </aside>
      </section>
    {:else}
      <section class="empty-state"><MessageSquareText size={34} /><h2>Lege einen Planungsraum an.</h2><p>Der erste Umsetzungsschnitt arbeitet mit einer geschützten Backend-Grenze und einem simulierten Gegenüber.</p></section>
    {/if}
  </main>
</div>
