import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

// SYSTEM-ZIEL auf API-Ebene: Aus dem Gespräch muss ein sichtbarer Denkstand
// entstehen (AGENTS.md Entscheidung 1 + REFACTOR-UX). Diese Suite fährt den
// vollständigen Turn über die HTTP-Routen mit dem deterministischen Mock-Harness
// und prüft anschließend die Denkstand-Projektion.
//
// Ergebnis dieser Suite:
// - GRUNDFUNKTION: Der Turn läuft, eine Companion-Antwort kommt, und die Karte
//   "Offene Entscheidungen" füllt sich aus dem Gespräch.
// - ZIEL: "Denkstand" wächst aus dem Gespräch (Harness schreibt learning-design.md)
//   und "Nächste Schritte" speisen sich aus next-steps.md.

let tempRoot: string;
const oldEnv: Record<string, string | undefined> = {};
const envKeys = ["PTSPACE_DATA_DIR", "PTSPACE_WORKSPACES_DIR", "PTSPACE_PLANNING_WORKSPACES_DIR", "PTSPACE_HARNESS", "PTSPACE_REAL_HARNESS_ENABLED"];

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-denkstand-e2e-"));
  for (const key of envKeys) oldEnv[key] = process.env[key];
  process.env.PTSPACE_DATA_DIR = path.join(tempRoot, "data");
  process.env.PTSPACE_WORKSPACES_DIR = path.join(tempRoot, "workspaces");
  process.env.PTSPACE_PLANNING_WORKSPACES_DIR = path.join(tempRoot, "planning-workspaces");
  process.env.PTSPACE_HARNESS = "mock";
  process.env.PTSPACE_REAL_HARNESS_ENABLED = "false";
});

afterEach(async () => {
  for (const key of envKeys) {
    const value = oldEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
});

type App = Awaited<ReturnType<typeof buildApp>>;
type ThinkingCard = { id: string; title: string; summary: string; previewItems: string[] };

async function createSpace(app: App): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/planning-spaces",
    payload: { title: "Wozu braucht es Religion?", subject: "Religion", targetGroup: "Klasse 9", initialIdea: "Religion und Moderne." }
  });
  return response.json<{ id: string }>().id;
}

async function sendMessage(app: App, id: string, message: string) {
  return app.inject({ method: "POST", url: `/api/planning-spaces/${id}/conversation`, payload: { message } });
}

async function thinkingState(app: App, id: string): Promise<ThinkingCard[]> {
  const response = await app.inject({ method: "GET", url: `/api/planning-spaces/${id}/thinking-state` });
  expect(response.statusCode).toBe(200);
  return response.json<{ cards: ThinkingCard[] }>().cards;
}

function card(cards: ThinkingCard[], cardId: string): ThinkingCard {
  const found = cards.find((entry) => entry.id === cardId);
  if (!found) throw new Error(`Denkstand-Karte fehlt: ${cardId}`);
  return found;
}

describe("Gespräch → Denkstand (E2E über die API)", () => {
  it("GRUNDFUNKTION: Ein Turn liefert eine Companion-Antwort", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      const response = await sendMessage(app, id, "Passt das eigentlich zum Lehrplan?");
      expect(response.statusCode).toBe(200);
      expect(response.json<{ reply: { text: string } }>().reply.text).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it("GRUNDFUNKTION: 'Offene Entscheidungen' füllen sich aus dem Gespräch", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      await sendMessage(app, id, "Passt das eigentlich zum Lehrplan?");
      const cards = await thinkingState(app, id);
      expect(card(cards, "offene-entscheidungen").previewItems.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it("ZIEL: Das Gespräch reichert den 'Denkstand' an", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      // Seed-unabhängig prüfen: Der Denkstand VOR dem Turn wird mit dem Denkstand
      // NACH dem Turn verglichen. Wächst er nicht, hat das Gespräch nichts beigetragen.
      const before = card(await thinkingState(app, id), "denkstand").previewItems;
      await sendMessage(app, id, "Passt das eigentlich zum Lehrplan? Mir geht es um Urteilsbildung statt Wissensvermittlung.");
      const after = card(await thinkingState(app, id), "denkstand").previewItems;
      // Der Harness schreibt learning-design.md im Turn fort -> der Denkstand wächst.
      expect(after.length).toBeGreaterThan(before.length);
    } finally {
      await app.close();
    }
  });

  it("ZIEL: 'Nächste Schritte' füllen sich aus dem Gespräch", async () => {
    const app = await buildApp();
    try {
      const id = await createSpace(app);
      await sendMessage(app, id, "Passt das eigentlich zum Lehrplan?");
      const cards = await thinkingState(app, id);
      // Route liest next-steps.md (vom Harness geschrieben) plus Board-Karten.
      expect(card(cards, "nächste-schritte").previewItems.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});
