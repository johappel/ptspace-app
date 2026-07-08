<script lang="ts">
  import { onMount } from "svelte";
  import { AlertCircle, ArrowUp, BookOpen, CheckCircle2, ChevronDown, FileText, Lightbulb, MessageSquareText, Plus, ShieldCheck, TriangleAlert } from "lucide-svelte";
  import { api, type ExportApproval, type PlanningSpace, type SensitiveFinding, type ThinkingCard } from "$lib/api";

  type UiMessage = { id: string; author: "teacher" | "critical_friend"; text: string };

  let spaces: PlanningSpace[] = [];
  let activeSpace: PlanningSpace | null = null;
  let cards: ThinkingCard[] = [];
  let messages: UiMessage[] = [];
  let findings: SensitiveFinding[] = [];
  let markdownApproval: ExportApproval | null = null;
  let okfApproval: ExportApproval | null = null;
  let expandedCard = "denkstand";
  let loading = true;
  let sending = false;
  let error = "";
  let draftMessage = "";
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
    const state = await api.getThinkingState(space.id);
    cards = state.cards;
    const exportStatus = await api.getExportStatus(space.id);
    markdownApproval = exportStatus.markdown;
    okfApproval = exportStatus.okfMarkdown;
    findings = [];
  }

  async function sendMessage() {
    if (!activeSpace || !draftMessage.trim() || sending) return;
    const text = draftMessage.trim();
    draftMessage = "";
    sending = true;
    error = "";
    messages = [...messages, { id: crypto.randomUUID(), author: "teacher", text }];
    try {
      await scanText(text);
      const result = await api.sendMessage(activeSpace.id, text);
      messages = [...messages, { id: result.reply.id, author: "critical_friend", text: result.reply.text }];
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
          <div class="messages">
            {#each messages as message}
              <article class:teacher={message.author === "teacher"} class="message">
                <div class="avatar">{message.author === "teacher" ? "L" : "CF"}</div><p>{message.text}</p>
              </article>
            {/each}
            {#if sending}<article class="message thinking"><div class="avatar">CF</div><p>Ich ordne den Gedanken und aktualisiere den Denkstand.</p></article>{/if}
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