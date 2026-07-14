import { describe, expect, it } from "vitest";
import { parseLearningLandscape, parsePlanningBoard, serializeLearningLandscape, serializePlanningBoard } from "../src/services/planning/PlanningArtifactCodec.js";

describe("PlanningArtifactCodec", () => {
  it("parses and serializes a canonical learning landscape without losing transitions", () => {
    const source = `---
schema: ptspace.learning-landscape/v1
title: KI und Gottesbild
structure: branching
---

# Lernlandschaft

## lm-impuls – KI begegnet Menschenbildern

- Typ: Impuls
- Funktion: Irritation und persönlicher Zugang
- Erwartete Lernerfahrung: Menschenbilder sind nicht neutral.
- Lernaktivität: Lernende reagieren auf Bild- und Textimpulse.
- Materialien: material-impulsbilder
- Übergänge:
  - lm-positionieren | Pflichtweg

## lm-positionieren – Was macht einen Menschen aus?

- Typ: Positionierung
- Funktion: eigene Deutungen sichtbar machen
- Lernaktivität: Position Line mit Begründung.
`;

    const landscape = parseLearningLandscape(source);
    expect(landscape.moments).toHaveLength(2);
    expect(landscape.transitions).toEqual([expect.objectContaining({ from: "lm-impuls", to: "lm-positionieren", kind: "required" })]);
    expect(parseLearningLandscape(serializeLearningLandscape(landscape))).toEqual(landscape);
  });

  it("parses and serializes the canonical planning board", () => {
    const source = `schema: ptspace.planning-board/v1
items:
  - id: pb-dramaturgy
    title: Didaktische Dramaturgie entwickeln
    kind: design
    column: prepare
    related_nodes: [lm-impuls, lm-positionieren]
    related_windows: [tw-02]
    status: proposed
    requires_teacher_approval: true
`;

    const board = parsePlanningBoard(source);
    expect(board.items[0]).toMatchObject({ id: "pb-dramaturgy", column: "prepare", relatedNodes: ["lm-impuls", "lm-positionieren"] });
    expect(parsePlanningBoard(serializePlanningBoard(board))).toEqual(board);
  });

  it("keeps the material need and expected result of a board card across a roundtrip", () => {
    const source = `schema: ptspace.planning-board/v1
items:
  - id: pb-worksheet
    title: Arbeitsblatt zum Impuls
    kind: produce
    column: prepare
    related_nodes: [lm-impuls]
    material_need: Bildimpuls mit Leitfragen
    expected_result: Ein differenziertes Arbeitsblatt als Entwurf
    status: proposed
    requires_teacher_approval: true
`;

    const board = parsePlanningBoard(source);
    expect(board.items[0]).toMatchObject({
      materialNeed: "Bildimpuls mit Leitfragen",
      expectedResult: "Ein differenziertes Arbeitsblatt als Entwurf"
    });
    expect(parsePlanningBoard(serializePlanningBoard(board))).toEqual(board);
  });
});
