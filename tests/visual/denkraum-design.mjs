import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const runtimeRoot = path.join(repoRoot, "tests", "visual", "runtime");
const screenshotRoot = path.join(repoRoot, "tests", "visual", "screenshots");
const backendUrl = "http://127.0.0.1:4174";
const frontendUrl = "http://127.0.0.1:4173";
const fixedBackgroundTimestamp = "2026-01-15T09:00:00.000Z";

const spaces = {};
const processes = [];

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(label, check, timeout = 30000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(label + " wurde nicht rechtzeitig bereit" + (lastError ? ": " + lastError.message : "."));
}

function startProcess(command, args, cwd, env) {
  const child = spawn(process.execPath, [command, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write("[" + path.basename(command) + "] " + chunk));
  child.stderr.on("data", (chunk) => process.stderr.write("[" + path.basename(command) + "] " + chunk));
  processes.push(child);
  return child;
}

async function stopProcesses() {
  for (const child of processes.reverse()) {
    if (child.exitCode !== null) continue;
    child.kill();
  }
  await Promise.all(processes.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once("exit", resolve);
    setTimeout(resolve, 2000);
  })));
}

async function api(endpoint, init = {}) {
  const response = await fetch(backendUrl + endpoint, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) }
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error((init.method ?? "GET") + " " + endpoint + " antwortete mit " + response.status + ": " + JSON.stringify(body));
  }
  return body;
}

async function createSpace(key, title, initialIdea) {
  const space = await api("/api/planning-spaces", {
    method: "POST",
    body: JSON.stringify({
      title,
      subject: "Religion",
      targetGroup: "Klasse 9",
      initialIdea
    })
  });
  spaces[key] = space;
  return space;
}

async function addConversation(space, message) {
  const result = await api("/api/planning-spaces/" + space.id + "/conversation", {
    method: "POST",
    body: JSON.stringify({ message })
  });
  await sleep(500);
  const lockPath = path.join(runtimeRoot, "planning-workspaces", space.workspaceSlug, ".git", "index.lock");
  await waitFor("Git-Sicherung " + space.title, async () => {
    try {
      await fs.access(lockPath);
      return false;
    } catch {
      return true;
    }
  }, 10000);
  return result.reply.id;
}

async function addGuidedProposal(space, sourceMessageId, title) {
  const result = await api("/api/planning-spaces/" + space.id + "/guided-proposals", {
    method: "POST",
    body: JSON.stringify({
      sourceMessageId,
      title,
      rationale: "Diese Frage soll vor dem nächsten Entwurf gemeinsam geklärt werden.",
      expectedResult: "Ein kleiner, nachvollziehbarer Entwurf für die gemeinsame fachliche Prüfung.",
      capability: "create_student_instruction"
    })
  });
  return result.proposal;
}

async function proposeStudentInstruction(space, reason) {
  const result = await api("/api/planning-spaces/" + space.id + "/service-requests/student-instruction", {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  return result.serviceRequest;
}

async function seedStates() {
  const dr02 = await createSpace(
    "dr02",
    "Gemeinsame Verantwortung im Alltag",
    "Die Lerngruppe soll eine konkrete Erfahrung von Verantwortung gemeinsam deuten."
  );
  await addConversation(dr02, "Die Lerngruppe bringt sehr unterschiedliche Erfahrungen von Verantwortung mit. Wir sollten zuerst genau zuhören.");

  const dr04 = await createSpace(
    "dr04",
    "Offene Entscheidung im Einstieg",
    "Vor dem Einstieg soll eine zentrale pädagogische Frage gemeinsam geklärt werden."
  );
  const dr04Message = await addConversation(dr04, "Für den Einstieg ist noch offen, welche Erfahrung die Lernenden wirklich ins Gespräch bringt.");
  await addGuidedProposal(dr04, dr04Message, "Welche Erfahrung soll den Einstieg tragen?");

  const dr05 = await createSpace(
    "dr05",
    "Arbeitsauftrag im Hintergrund",
    "Ein erster Arbeitsauftrag soll aus dem Gespräch heraus vorbereitet werden."
  );
  await addConversation(dr05, "Wir haben den pädagogischen Anlass geklärt. Ein kleiner Entwurf darf jetzt vorbereitet werden.");
  const dr05Request = await proposeStudentInstruction(dr05, "Der geklärte pädagogische Anlass soll in einem kleinen Entwurf sichtbar werden.");
  await shapeRequestProjection(dr05, dr05Request, "in_progress", "Arbeitsauftrag als Entwurf vorbereiten");
  const dr05Overview = await api("/api/planning-spaces/" + dr05.id + "/room-overview");
  if (!dr05Overview.backgroundWork.some((work) => work.status === "wird_vorbereitet")) {
    throw new Error("DR-05-Seed enthält keine laufende Hintergrundarbeit.");
  }

  const dr06 = await createSpace(
    "dr06",
    "Ergebnis zur Prüfung",
    "Ein Entwurf soll als Gesprächsgegenstand zurückkehren und fachlich geprüft werden."
  );
  await addConversation(dr06, "Der Entwurf soll die gemeinsame Frage aufnehmen und ausdrücklich zur Prüfung zurückkehren.");
  const dr06Request = await proposeStudentInstruction(dr06, "Der Entwurf soll als Gesprächsgegenstand zurückkehren und fachlich geprüft werden.");
  await api("/api/planning-spaces/" + dr06.id + "/service-requests/" + dr06Request.id + "/approve", { method: "POST", body: "{}" });
  await shapeRequestProjection(dr06, dr06Request, "returned", "Ergebnis zur Prüfung");
}

async function shapeRequestProjection(space, request, status, title) {
  const requestPath = path.join(runtimeRoot, "planning-workspaces", space.workspaceSlug, "service-requests", request.id + ".json");
  const stored = JSON.parse(await fs.readFile(requestPath, "utf8"));
  stored.status = status;
  stored.input = { ...stored.input, title };
  stored.createdAt = fixedBackgroundTimestamp;
  stored.updatedAt = fixedBackgroundTimestamp;
  if (status === "in_progress") {
    delete stored.automaticCheck;
    delete stored.criticalFriendCheck;
    delete stored.review;
  } else {
    stored.automaticCheck = { status: "passed", note: "Die Datei ist vorhanden und enthält eine lesbare Entwurfsstruktur.", checkedAt: fixedBackgroundTimestamp };
    stored.criticalFriendCheck = { status: "passed", note: "Keine blockierende Abweichung.", checkedAt: fixedBackgroundTimestamp };
  }
  await fs.writeFile(requestPath, JSON.stringify(stored, null, 2) + "\n", "utf8");
}

async function waitForApp(page) {
  await page.goto(frontendUrl, { waitUntil: "domcontentloaded" });
  try {
    await waitFor("Frontend", async () => (await page.locator(".new-room-button").count()) === 1);
    await waitFor("Planungsr�ume geladen", async () => {
      const roomList = page.locator(".room-list");
      return (await roomList.locator("button").count()) > 0 || (await roomList.innerText()).includes("Noch kein Planungsraum");
    });
  } catch (error) {
    throw error;
  }
}

async function openSpace(page, space) {
  await page.evaluate((spaceId) => localStorage.setItem("ptspace.last-opened-planning-space", spaceId), space.id);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitFor("Gespräch " + space.title, async () => (await page.locator(".topbar h1").textContent())?.trim() === space.title);
  await waitFor("geladener Denkraum " + space.title, async () => (await page.locator(".conversation-panel .messages").count()) === 1);
  await waitFor("Gesprächsbeiträge " + space.title, async () => (await page.locator(".messages article.message").count()) > 1);
}

async function assertText(page, selector, text) {
  await waitFor("Text " + text, async () => (await page.locator(selector).allTextContents()).some((content) => content.includes(text)));
}

async function stabilizeScreenshot(page) {
  await page.addStyleTag({ content: "time { visibility: hidden !important; }" });
  await page.evaluate(() => {
    document.querySelectorAll("[data-message-id^='optimistic-']").forEach((element) => element.remove());
  });
}

async function capture(page, name, options = {}) {
  await stabilizeScreenshot(page);
  const output = path.join(screenshotRoot, name + ".png");
  await page.screenshot({
    path: output,
    fullPage: true,
    animations: "disabled",
    mask: [page.locator("time")],
    maskColor: "#f4f1e8",
    ...options
  });
  console.log("Screenshot: " + path.relative(repoRoot, output));
}

async function run() {
  await fs.rm(runtimeRoot, { recursive: true, force: true });
  await fs.mkdir(runtimeRoot, { recursive: true });
  await fs.mkdir(screenshotRoot, { recursive: true });

  const backendCommand = path.join(repoRoot, "backend", "node_modules", "tsx", "dist", "cli.mjs");
  const viteCommand = path.join(repoRoot, "frontend", "node_modules", "vite", "bin", "vite.js");
  startProcess(backendCommand, ["src/app.ts"], path.join(repoRoot, "backend"), {
    PORT: "4174",
    BACKEND_PORT: "4174",
    PTSPACE_DATA_DIR: path.join(runtimeRoot, "data"),
    PTSPACE_WORKSPACES_DIR: path.join(runtimeRoot, "workspaces"),
    PTSPACE_PLANNING_WORKSPACES_DIR: path.join(runtimeRoot, "planning-workspaces"),
    PTSPACE_HARNESS: "mock",
    PTSPACE_REAL_HARNESS_ENABLED: "false"
  });
  await waitFor("Backend health", async () => {
    const response = await fetch(backendUrl + "/health");
    return response.ok;
  });
  startProcess(viteCommand, ["--host", "127.0.0.1", "--port", "4173", "--config", "vite.config.ts"], path.join(repoRoot, "frontend"), {
    FRONTEND_PORT: "4173",
    PUBLIC_BACKEND_URL: backendUrl
  });
  await waitFor("Frontend HTTP", async () => {
    const response = await fetch(frontendUrl);
    return response.ok;
  });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      colorScheme: "light",
      reducedMotion: "no-preference"
    });
    const page = await context.newPage();
    await waitForApp(page);
    await page.locator(".rail-toggle").click();
    await page.locator(".new-room-button").dispatchEvent("click");
    await waitFor("DR-01-Dialog", async () => (await page.locator("dialog[open]").count()) === 1);
    await assertText(page, "dialog[open]", "Woran möchtest du weiterdenken?");
    await capture(page, "dr-01-new-space-desktop");
    await context.close();

    await seedStates();

    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      colorScheme: "light",
      reducedMotion: "no-preference"
    });
    const desktopPage = await desktop.newPage();
    await waitForApp(desktopPage);

    await openSpace(desktopPage, spaces.dr02);
    await assertText(desktopPage, ".conversation-panel", "Critical Friend");
    await assertText(desktopPage, ".attention-card", "Jetzt wichtig");
    await capture(desktopPage, "dr-02-conversation-desktop");

    await openSpace(desktopPage, spaces.dr04);
    await assertText(desktopPage, ".attention-card", "Welche Erfahrung soll den Einstieg tragen?");
    await capture(desktopPage, "dr-04-open-decision-desktop");

    await openSpace(desktopPage, spaces.dr05);
    await assertText(desktopPage, ".statusbar", "Im Hintergrund");
    await desktopPage.locator("button.statusbar").click();
    await assertText(desktopPage, "#background-work", "Arbeitsauftrag als Entwurf vorbereiten");
    await capture(desktopPage, "dr-05-background-work-desktop");

    await openSpace(desktopPage, spaces.dr06);
    await assertText(desktopPage, ".attention-card", "Ergebnis zur Prüfung");
    await assertText(desktopPage, ".attention-card", "Entwurf ansehen");
    await capture(desktopPage, "dr-06-result-review-desktop");
    await desktop.close();

    const narrow = await browser.newContext({
      viewport: { width: 640, height: 900 },
      deviceScaleFactor: 1,
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      colorScheme: "light",
      reducedMotion: "no-preference"
    });
    const narrowPage = await narrow.newPage();
    await waitForApp(narrowPage);
    await openSpace(narrowPage, spaces.dr02);
    await assertText(narrowPage, ".conversation-panel", "Gespräch");
    await capture(narrowPage, "dr-08-conversation-narrow");
    await narrow.close();

    const reduced = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      colorScheme: "light",
      reducedMotion: "reduce"
    });
    await reduced.addInitScript(() => localStorage.setItem("ptspace.reduced-motion", "true"));
    const reducedPage = await reduced.newPage();
    await waitForApp(reducedPage);
    await openSpace(reducedPage, spaces.dr02);
    await waitFor("Reduced-Motion-Klasse", async () => (await reducedPage.locator(".app-shell.reduce-motion").count()) === 1);
    const mediaReduced = await reducedPage.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!mediaReduced) throw new Error("Der Reduced-Motion-Kontext wurde nicht wirksam.");
    await assertText(reducedPage, ".conversation-panel", "Gespräch");
    await capture(reducedPage, "dr-09-reduced-motion");
    await reduced.close();
  } finally {
    await browser.close();
  }
}

try {
  await run();
  console.log("Playwright-Design-Harness erfolgreich: 7 Referenzzustände erzeugt.");
} finally {
  await stopProcesses();
}
