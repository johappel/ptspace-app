import { describe, expect, it } from "vitest";
import {
  parseTemporalPlan,
  serializeTemporalPlan,
  emptyTemporalPlan,
  assertTemporalPlanReferences
} from "../src/services/planning/TemporalPlanCodec.js";

const sample = `schema: ptspace.temporal-plan/v1
title: Standardplanung
landscape: learning-landscape.md

windows:
  - id: tw-01
    title: Stunde 1 – Irritation und Positionierung
    kind: lesson
    duration_minutes: 45
  - id: tw-02
    title: Stunde 2 – Vertiefung
    kind: lesson
    duration_minutes: 45

placements:
  - id: tp-01
    moment_id: lm-impuls
    window_id: tw-01
    start_minute: 0
    duration_minutes: 8
    dramaturgical_role: opening
    mode: common
    note: Kein vorwegnehmendes Unterrichtsgespräch.
  - id: tp-02
    moment_id: lm-position
    window_id: tw-01
    start_minute: 8
    duration_minutes: 20
    dramaturgical_role: exploration
    mode: common
  - id: tp-03
    moment_id: lm-impuls
    window_id: tw-02
    start_minute: 0
    duration_minutes: 10
    dramaturgical_role: consolidation
    mode: choice
`;

describe("temporal plan codec", () => {
  it("parses an empty temporal plan", () => {
    const plan = parseTemporalPlan("schema: ptspace.temporal-plan/v1\ntitle: Leer\nlandscape: learning-landscape.md\nwindows: []\nplacements: []\n");
    expect(plan.windows).toHaveLength(0);
    expect(plan.placements).toHaveLength(0);
  });

  it("parses multiple windows and placements", () => {
    const plan = parseTemporalPlan(sample);
    expect(plan.windows).toHaveLength(2);
    expect(plan.placements).toHaveLength(3);
    expect(plan.placements[0]).toMatchObject({ momentId: "lm-impuls", windowId: "tw-01", startMinute: 0, durationMinutes: 8, dramaturgicalRole: "opening", mode: "common" });
  });

  it("allows a learning moment to be placed more than once", () => {
    const plan = parseTemporalPlan(sample);
    const impulsPlacements = plan.placements.filter((placement) => placement.momentId === "lm-impuls");
    expect(impulsPlacements).toHaveLength(2);
  });

  it("supports parallel and choice placements", () => {
    const plan = parseTemporalPlan(sample);
    expect(plan.placements.some((placement) => placement.mode === "choice")).toBe(true);
  });

  it("rejects an unknown window reference", () => {
    const invalid = sample.replace("window_id: tw-02", "window_id: tw-ghost");
    expect(() => parseTemporalPlan(invalid)).toThrow(/unknown_window/);
  });

  it("rejects an unknown moment reference against a landscape", () => {
    const plan = parseTemporalPlan(sample);
    expect(() => assertTemporalPlanReferences(plan, new Set(["lm-position"]))).toThrow(/unknown_moment/);
  });

  it("rejects overbooking beyond the window duration", () => {
    const invalid = sample.replace("start_minute: 8\n    duration_minutes: 20", "start_minute: 40\n    duration_minutes: 20");
    expect(() => parseTemporalPlan(invalid)).toThrow(/exceeds_window/);
  });

  it("survives a read-write-read roundtrip without losing fields", () => {
    const first = parseTemporalPlan(sample);
    const second = parseTemporalPlan(serializeTemporalPlan(first));
    expect(second).toEqual(first);
  });

  it("regression: changing a placement and reloading keeps deep equality (T-402)", () => {
    const plan = parseTemporalPlan(sample);
    const changed = {
      ...plan,
      placements: plan.placements.map((placement) =>
        placement.id === "tp-02"
          ? { ...placement, startMinute: 10, durationMinutes: 25, dramaturgicalRole: "deepening" as const, note: "Mehr Zeit für den Austausch." }
          : placement
      )
    };
    const reloaded = parseTemporalPlan(serializeTemporalPlan(changed));
    expect(reloaded).toEqual(changed);
    const reloadedPlacement = reloaded.placements.find((placement) => placement.id === "tp-02");
    expect(reloadedPlacement).toMatchObject({ startMinute: 10, durationMinutes: 25, dramaturgicalRole: "deepening", note: "Mehr Zeit für den Austausch." });
  });

  it("creates a valid empty plan", () => {
    const plan = emptyTemporalPlan("Neu");
    expect(serializeTemporalPlan(plan)).toContain("windows: []");
    expect(serializeTemporalPlan(plan)).toContain("placements: []");
  });
});
