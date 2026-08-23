import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chromium } from "playwright";

// UI-END-TO-END gegen das ECHTE Frontend + Backend (deterministischer Mock-Harness).
//
// Dieser Lauf bedient die ptspace-Oberfläche wie eine Lehrkraft und prüft die
// vom Nutzer benannten Systemzusagen:
//   - Der Chat antwortet (Grundfunktion).
//   - Der Denkraum ist mehr als ein Chat: die Perspektive lässt sich auf den
//     "Denkstand" umschalten und der Kopf steht dann NICHT mehr auf "Gespräch".
//   - Aus dem Gespräch entstehen sichtbare "Offene Fragen".
//   - ZIEL (aktuell offen): der evolvierende gemeinsame Denkstand wird sichtbar.
//
// Der Lauf trennt GRUNDFUNKTIONEN (müssen grün sein) von ZIELEN (dürfen aktuell
// rot sein) und beendet sich mit Exit-Code 1, sobald irgendeine Prüfung scheitert.
// So wird sichtbar, ob überhaupt die einfachsten Dinge funktionieren.

const repoRoot = path.resolve(import.meta.dirname, "../..");
const runtimeRoot = path.join(repoRoot, "tests", "e2e", ".runtime");
const backendUrl = "http://127.0.0.1:4374";
const frontendUrl = "http://127.0.0.1:4373";

const processes = [];
const results = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(label, check, timeout = 30000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      if (await check()) return true;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`${label} wurde nicht rechtzeitig bereit${lastError ? `: ${lastError.message}` : "."}`);
}

function startProcess(command, args, cwd, env) {
  const child = spawn(process.execPath, [command, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${path.basename(command)}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${path.basename(command)}] ${chunk}`));
  processes.push(child);
  return child;
}

async function stopProcesses() {
  for (const child of processes.reverse()) {
    if (child.exitCode === null) child.kill();
  }
  await Promise.all(
    processes.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) return resolve();
          child.once("exit", resolve);
          setTimeout(resolve, 2000);
        })
    )
  );
}

async function api(endpoint, init = {}) {
  const response = await fetch(backendUrl + endpoint, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${endpoint} -> ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function check(kind, label, condition, detail) {
  results.push({ kind, label, ok: Boolean(condition), detail: detail ?? "" });
}

async function bootServers() {
  await fs.rm(runtimeRoot, { recursive: true, force: true });
  await fs.mkdir(runtimeRoot, { recursive: true });

  // Binärpfade dynamisch auflösen (pnpm legt sie unter node_modules/.pnpm ab).
  const backendRequire = createRequire(path.join(repoRoot, "backend") + path.sep);
  const frontendRequire = createRequire(path.join(repoRoot, "frontend") + path.sep);
  const backendCommand = path.join(path.dirname(backendRequire.resolve("tsx/package.json")), "dist", "cli.mjs");
  const viteCommand = path.join(path.dirname(frontendRequire.resolve("vite/package.json")), "bin", "vite.js");

  startProcess(backendCommand, ["src/app.ts"], path.join(repoRoot, "backend"), {
    PORT: "4374",
    BACKEND_PORT: "4374",
    PTSPACE_DATA_DIR: path.join(runtimeRoot, "data"),
    PTSPACE_WORKSPACES_DIR: path.join(runtimeRoot, "workspaces"),
    PTSPACE_PLANNING_WORKSPACES_DIR: path.join(runtimeRoot, "planning-workspaces"),
    PTSPACE_HARNESS: "mock",
    PTSPACE_REAL_HARNESS_ENABLED: "false"
  });
  await waitFor("Backend health", async () => (await fetch(backendUrl + "/health")).ok);

  startProcess(viteCommand, ["--host", "127.0.0.1", "--port", "4373", "--config", "vite.config.ts"], path.join(repoRoot, "frontend"), {
    FRONTEND_PORT: "4373",
    PUBLIC_BACKEND_URL: backendUrl
  });
  await waitFor("Frontend HTTP", async () => (await fetch(frontendUrl)).ok);
}

async function openSpace(page, space) {
  await page.evaluate((spaceId) => localStorage.setItem("ptspace.last-opened-planning-space", spaceId), space.id);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitFor("Gespräch geladen", async () => (await page.locator(".topbar h1").textContent())?.trim() === space.title);
  await waitFor("Nachrichtenbereich", async () => (await page.locator(".conversation-panel .messages").count()) === 1);
}

function moment(id, title, kind) {
  return { id, title, kind, didacticPurpose: "", learningActivity: "", expectedExperience: "", materialNeeds: [], materialIds: [], openQuestions: [], status: "draft" };
}

// Legt über die API alle Artefakte an, die die einzelnen Perspektiven füllen.
async function seedArtifacts(space) {
  const messages = (await api(`/api/planning-spaces/${space.id}/messages`)).messages;
  const teacherMessageId = messages.find((entry) => entry.author === "teacher")?.id;
  if (!teacherMessageId) throw new Error("Keine persistierte Lehrkraft-Nachricht für die Verknüpfung gefunden.");

  // Pinnwand: ein bewusst festgehaltener Gedanke.
  await api(`/api/planning-spaces/${space.id}/conversation-markers`, {
    method: "POST",
    body: JSON.stringify({ sourceMessageId: teacherMessageId, kind: "captured_note", targetType: "thinking_state", targetId: "denkstand", label: "Erfahrung der Lernenden als Gesprächsspur" })
  });

  // Offene Entscheidung aus dem Gespräch.
  await api(`/api/planning-spaces/${space.id}/guided-proposals`, {
    method: "POST",
    body: JSON.stringify({ sourceMessageId: teacherMessageId, title: "Welche Erfahrung soll den Einstieg tragen?", rationale: "Diese Frage soll vor dem nächsten Entwurf gemeinsam geklärt werden.", expectedResult: "Ein kleiner, nachvollziehbarer Entwurf für die gemeinsame fachliche Prüfung.", capability: "create_student_instruction" })
  });

  // Lernlandschaft.
  await api(`/api/planning-spaces/${space.id}/learning-landscape`, {
    method: "PUT",
    body: JSON.stringify({ schema: "ptspace.learning-landscape/v1", title: "Von Erfahrung zu begründeter Handlung", structure: "linear", moments: [moment("lm-impuls", "Eigene Erfahrung wahrnehmen", "impulse"), moment("lm-deuten", "Perspektiven gemeinsam deuten", "inquiry")], transitions: [{ id: "tr-1", from: "lm-impuls", to: "lm-deuten", kind: "required", rationale: "Die Deutung knüpft an die Erfahrung an." }] })
  });

  // Zeit & Dramaturgie.
  await api(`/api/planning-spaces/${space.id}/temporal-plan`, {
    method: "PUT",
    body: JSON.stringify({ schema: "ptspace.temporal-plan/v1", title: "Plan", landscape: "learning-landscape.md", windows: [{ id: "tw-01", title: "Stunde 1 – Einstieg", kind: "lesson", durationMinutes: 45, note: "" }], placements: [{ id: "tp-01", momentId: "lm-impuls", windowId: "tw-01", startMinute: 5, durationMinutes: 10, dramaturgicalRole: "opening", mode: "common", note: "" }] })
  });

  // Vorbereitungen: eine bestätigte Board-Karte.
  await api(`/api/planning-spaces/${space.id}/planning-board`, {
    method: "PUT",
    body: JSON.stringify({ schema: "ptspace.planning-board/v1", items: [{ id: "pb-1", title: "Arbeitsblatt zum Impuls", kind: "produce", column: "prepare", status: "approved", relatedNodes: ["lm-impuls"], relatedWindows: [], materialIds: [], materialNeed: "Bildimpuls mit Leitfragen", expectedResult: "Ein differenziertes Arbeitsblatt als Entwurf.", requiresTeacherApproval: true, serviceRequestId: "", reviewedAt: "", reviewedBy: "" }] })
  });

  // Request + Worker: Materialentwurf beauftragen und ausführen lassen.
  const created = await api(`/api/planning-spaces/${space.id}/service-requests/board-material`, {
    method: "POST",
    body: JSON.stringify({ boardItemId: "pb-1", title: "Arbeitsblatt zum Impuls", relatedMoments: ["lm-impuls"], expectedResult: "Ein differenziertes Arbeitsblatt als Entwurf." })
  });
  const approved = await api(`/api/planning-spaces/${space.id}/service-requests/${created.serviceRequest.id}/approve`, { method: "POST", body: "{}" });
  return { approved, requestId: created.serviceRequest.id };
}

async function switchPerspective(page, buttonName) {
  if ((await page.locator("#room-access").count()) === 0) {
    await page.locator(".room-access-toggle").click();
    await waitFor("Perspektivmenü", async () => (await page.locator("#room-access").count()) === 1, 5000);
  }
  await page.locator("#room-access").getByRole("button", { name: buttonName, exact: true }).click();
}

async function checkPerspective(page, buttonName, focusClass, expectText) {
  let ok = false;
  let detail = "";
  try {
    await switchPerspective(page, buttonName);
    await waitFor(`Perspektive ${buttonName}`, async () => (await page.locator(`.workspace-grid.${focusClass}`).count()) === 1, 15000);
    if (expectText) {
      await waitFor(`Inhalt "${expectText}"`, async () => ((await page.locator(".workspace-grid").innerText().catch(() => "")) ?? "").includes(expectText), 15000);
    }
    ok = true;
  } catch (error) {
    detail = String(error.message ?? error).slice(0, 140);
  }
  check("Perspektive", `${buttonName} reagiert und ist gefüllt`, ok, detail);
}

async function run() {
  await bootServers();

  const space = await api("/api/planning-spaces", {
    method: "POST",
    body: JSON.stringify({ title: "Wozu braucht es Religion?", subject: "Religion", targetGroup: "Klasse 9", initialIdea: "Religion und Moderne." })
  });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "de-DE" });
    const page = await context.newPage();

    await page.goto(frontendUrl, { waitUntil: "domcontentloaded" });
    await waitFor("Frontend bereit", async () => (await page.locator(".new-room-button").count()) === 1);
    await openSpace(page, space);

    const denkstandBefore = ((await api(`/api/planning-spaces/${space.id}/thinking-state`)).cards.find((entry) => entry.id === "denkstand")?.previewItems.length) ?? 0;

    // --- GRUNDFUNKTION: Der Chat antwortet ---
    // Optimistische Nachrichten tragen data-message-id="optimistic-…"; erst wenn
    // zwei ECHTE Nachrichten mehr vorliegen (Lehrkraft + Antwort), ist der Turn
    // wirklich persistiert (inkl. Denkstand-Schreibvorgang).
    const realSelector = ".messages article.message:not([data-message-id^='optimistic-'])";
    const realBefore = await page.locator(realSelector).count();
    await page.locator(".composer textarea").fill("Passt das eigentlich zum Lehrplan? Mir geht es um Urteilsbildung statt Wissensvermittlung.");
    await page.locator(".composer button[type=\"submit\"]").click();
    let replied = false;
    try {
      await waitFor("Companion-Antwort", async () => (await page.locator(realSelector).count()) >= realBefore + 2, 45000);
      replied = true;
    } catch {
      replied = false;
    }
    check("Grundfunktion", "Der Chat liefert eine Antwort", replied);

    const denkstandAfter = ((await api(`/api/planning-spaces/${space.id}/thinking-state`)).cards.find((entry) => entry.id === "denkstand")?.previewItems.length) ?? 0;
    check("Grundfunktion", "Das Gespräch reichert den Denkstand an", denkstandAfter > denkstandBefore, `vorher ${denkstandBefore}, nachher ${denkstandAfter}`);

    // Alle übrigen Bereiche mit Inhalt füllen und danach die Ansicht neu laden.
    const worker = await seedArtifacts(space);
    check("Request/Worker", "Worker erstellt einen prüfbaren Entwurf", Boolean(worker.approved?.material?.content?.trim()), worker.approved?.material?.content ? "" : "kein Entwurfsinhalt");
    const requestStatus = worker.approved?.serviceRequest?.status ?? "?";
    check("Request/Worker", "Der Arbeitsauftrag durchläuft den Workflow", Boolean(requestStatus) && requestStatus !== "?" && requestStatus !== "proposed", `Status: ${requestStatus}`);
    const materials = (await api(`/api/planning-spaces/${space.id}/materials`)).materials ?? [];
    check("Request/Worker", "Das Ergebnis erscheint als Material", materials.length > 0, `Materialien: ${materials.length}`);
    const guided = (await api(`/api/planning-spaces/${space.id}/guided-proposals`)).proposals ?? [];
    check("Request/Worker", "Offene Entscheidung wird angelegt", guided.length > 0, `Vorschläge: ${guided.length}`);

    await openSpace(page, space);

    // --- ALLE UI-PERSPEKTIVEN: reagieren und sind gefüllt ---
    await checkPerspective(page, "Gespräch", "focus-mode-conversation", "");
    await checkPerspective(page, "Auf den Tisch: Denkstand", "focus-mode-thinking-state", "Der aktuelle Denkstand");
    await checkPerspective(page, "Auf den Tisch: Pinnwand", "focus-mode-pinboard", "Erfahrung der Lernenden als Gesprächsspur");
    await checkPerspective(page, "Auf den Tisch: Lernlandschaft", "focus-mode-landscape", "Eigene Erfahrung wahrnehmen");
    await checkPerspective(page, "Auf den Tisch: Zeit & Dramaturgie", "focus-mode-timeline", "Stunde 1");
    await checkPerspective(page, "Auf den Tisch: Vorbereitungen", "focus-mode-preparation", "Arbeitsblatt zum Impuls");
    await checkPerspective(page, "Auf den Tisch: Knowledge & Quellen", "focus-mode-knowledge", "Geprüfte Bezugsquellen");

    // Materialien: Perspektive füllt sich und zeigt nicht den Leerzustand.
    let materialsOk = false;
    let materialsDetail = "";
    try {
      await switchPerspective(page, "Auf den Tisch: Materialien");
      await waitFor("Materialansicht", async () => (await page.locator(".workspace-grid.focus-mode-materials").count()) === 1, 15000);
      await waitFor("Material gelistet", async () => {
        const text = (await page.locator(".workspace-grid").innerText().catch(() => "")) ?? "";
        return text.length > 0 && !text.includes("Noch kein Material liegt in diesem Planungsraum vor");
      }, 15000);
      materialsOk = true;
    } catch (error) {
      materialsDetail = String(error.message ?? error).slice(0, 140);
    }
    check("Perspektive", "Auf den Tisch: Materialien reagiert und ist gefüllt", materialsOk, materialsDetail);

    await context.close();
  } finally {
    await browser.close();
  }
}

function report() {
  const groups = ["Grundfunktion", "Perspektive", "Request/Worker"];
  const line = (entry) => `  ${entry.ok ? "PASS" : "FAIL"}  ${entry.label}${entry.detail ? ` — ${entry.detail}` : ""}`;
  let failed = 0;
  for (const group of groups) {
    const entries = results.filter((entry) => entry.kind === group);
    if (entries.length === 0) continue;
    console.log(`\n=== ${group.toUpperCase()} (muss grün sein) ===`);
    entries.forEach((entry) => console.log(line(entry)));
    failed += entries.filter((entry) => !entry.ok).length;
  }
  console.log(`\nFehlgeschlagen gesamt: ${failed} / ${results.length}`);
  return failed;
}

run()
  .then(async () => {
    await stopProcesses();
    const failures = report();
    process.exit(failures > 0 ? 1 : 0);
  })
  .catch(async (error) => {
    console.error("\nE2E-Lauf abgebrochen:", error);
    await stopProcesses();
    if (results.length) report();
    process.exit(1);
  });
