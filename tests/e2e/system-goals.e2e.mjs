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

    // Denkstand-Projektion VOR dem Gespräch festhalten (für den Wachstumsvergleich).
    const denkstandBefore = ((await api(`/api/planning-spaces/${space.id}/thinking-state`)).cards.find((entry) => entry.id === "denkstand")?.previewItems.length) ?? 0;

    // --- GRUNDFUNKTION: Der Chat antwortet ---
    const messagesBefore = await page.locator(".messages article.message").count();
    await page.locator(".composer textarea").fill("Passt das eigentlich zum Lehrplan? Mir geht es um Urteilsbildung statt Wissensvermittlung.");
    await page.locator(".composer button[type=\"submit\"]").click();
    let replied = false;
    try {
      await waitFor("Companion-Antwort", async () => (await page.locator(".messages article.message").count()) > messagesBefore, 45000);
      replied = true;
    } catch {
      replied = false;
    }
    check("Grundfunktion", "Der Chat liefert eine Antwort", replied);

    // --- GRUNDFUNKTION: Perspektivwechsel auf den Denkstand ---
    // Die Bereiche liegen hinter dem Umschalter "Perspektive wechseln" in der Kopfzeile.
    let denkstandVisible = false;
    try {
      await page.locator(".room-access-toggle").click();
      await page.locator("#room-access button", { hasText: "Auf den Tisch: Denkstand" }).first().click();
      await waitFor("Denkstand-Ansicht", async () => (await page.locator(".thinking-state-view").count()) === 1, 15000);
      denkstandVisible = true;
    } catch {
      denkstandVisible = false;
    }
    check("Grundfunktion", "Perspektive lässt sich auf den Denkstand umschalten", denkstandVisible);

    // --- GRUNDFUNKTION: Der Kopf steht nicht mehr auf "Gespräch" ---
    const kicker = denkstandVisible ? ((await page.locator(".focus-mode-kicker").first().textContent()) ?? "").trim() : "Gespräch";
    check("Grundfunktion", "Der Kopf steht nicht mehr nur auf 'Gespräch'", !/^Gespräch/i.test(kicker), `Kopf: "${kicker}"`);

    // --- GRUNDFUNKTION: Offene Fragen entstehen aus dem Gespräch ---
    const denkstandText = denkstandVisible ? ((await page.locator(".thinking-state-view").innerText()) ?? "") : "";
    check(
      "Grundfunktion",
      "Aus dem Gespräch entstehen sichtbare 'Offene Fragen'",
      denkstandVisible && !denkstandText.includes("keine offene Frage festgehalten")
    );

    // --- ZIEL (aktuell offen): Das Gespräch reichert den Denkstand an ---
    // Seed-unabhängig: der Denkstand muss durch den Turn WACHSEN, nicht nur aus
    // den Stammdaten des Raums bestehen.
    const denkstandAfter = ((await api(`/api/planning-spaces/${space.id}/thinking-state`)).cards.find((entry) => entry.id === "denkstand")?.previewItems.length) ?? 0;
    check("Ziel", "Das Gespräch reichert den Denkstand an (wächst gegenüber dem Ausgangsstand)", denkstandAfter > denkstandBefore, `vorher ${denkstandBefore}, nachher ${denkstandAfter}`);

    await context.close();
  } finally {
    await browser.close();
  }
}

function report() {
  const basics = results.filter((entry) => entry.kind === "Grundfunktion");
  const goals = results.filter((entry) => entry.kind === "Ziel");
  const line = (entry) => `  ${entry.ok ? "PASS" : "FAIL"}  ${entry.label}${entry.detail ? ` — ${entry.detail}` : ""}`;

  console.log("\n=== GRUNDFUNKTIONEN (müssen grün sein) ===");
  basics.forEach((entry) => console.log(line(entry)));
  console.log("\n=== ZIELE (dürfen aktuell rot sein) ===");
  goals.forEach((entry) => console.log(line(entry)));

  const basicsFailed = basics.filter((entry) => !entry.ok).length;
  const goalsFailed = goals.filter((entry) => !entry.ok).length;
  console.log(`\nGrundfunktionen fehlgeschlagen: ${basicsFailed} / ${basics.length}`);
  console.log(`Ziele offen: ${goalsFailed} / ${goals.length}`);
  return basicsFailed + goalsFailed;
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
