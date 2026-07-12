import { describe, expect, it } from "vitest";
import { LearningLandscapeSchema } from "@ptspace/shared";
import { parseLearningLandscape, serializeLearningLandscape } from "../src/services/planning/PlanningArtifactCodec.js";

const sample = `---
schema: ptspace.learning-landscape/v1
title: Hoffnung trotz Krise
structure: branching
---

# Lernlandschaft

## lm-impuls – Irritation durch ein Bild
- Typ: Impuls
- Funktion: Vorverständnisse wecken
- Erwartete Lernerfahrung: Die Lernenden stutzen und werden neugierig.
- Lernaktivität: Ein Bild wird ohne Kommentar gezeigt.
- Materialbedarf: Bildimpuls, Beobachtungsauftrag
- Materialien: mat-bild
- Offene Fragen: Welches Bild trägt die Irritation?; Wie lange wirken lassen?
- Status: draft
- Übergänge:
  - lm-position | Wahl | Die Lernenden wählen eine Perspektive.

## lm-position – Eigene Position sichtbar machen
- Typ: Positionierung
- Funktion: Spannungen sichtbar machen
- Erwartete Lernerfahrung: Unterschiede werden plausibel.
- Lernaktivität: Positionierung auf einer Raumlinie.
- Status: in_progress
`;

describe("learning landscape codec", () => {
  it("parses all moment and transition fields", () => {
    const landscape = parseLearningLandscape(sample);
    expect(landscape.moments).toHaveLength(2);
    const impuls = landscape.moments[0];
    expect(impuls.kind).toBe("impulse");
    expect(impuls.materialNeeds).toEqual(["Bildimpuls", "Beobachtungsauftrag"]);
    expect(impuls.materialIds).toEqual(["mat-bild"]);
    expect(impuls.openQuestions).toEqual(["Welches Bild trägt die Irritation?", "Wie lange wirken lassen?"]);
    expect(impuls.status).toBe("draft");
    expect(landscape.transitions).toHaveLength(1);
    expect(landscape.transitions[0]).toMatchObject({ from: "lm-impuls", to: "lm-position", kind: "choice", rationale: "Die Lernenden wählen eine Perspektive." });
    expect(landscape.moments[1].status).toBe("in_progress");
  });

  it("serializes into a parseable representation", () => {
    const landscape = parseLearningLandscape(sample);
    const serialized = serializeLearningLandscape(landscape);
    expect(serialized).toContain("- Materialbedarf: Bildimpuls, Beobachtungsauftrag");
    expect(serialized).toContain("- Offene Fragen: Welches Bild trägt die Irritation?; Wie lange wirken lassen?");
    expect(serialized).toContain("- Status: draft");
  });

  it("survives a read-write-read roundtrip without losing fields", () => {
    const first = parseLearningLandscape(sample);
    const second = parseLearningLandscape(serializeLearningLandscape(first));
    expect(second).toEqual(first);
  });

  it("falls back to a safe kind for an unknown type instead of crashing", () => {
    const withUnknownType = sample.replace("- Typ: Impuls", "- Typ: Zaubertrick");
    expect(parseLearningLandscape(withUnknownType).moments[0].kind).toBe("other");
  });

  it("rejects a transition that references an unknown moment", () => {
    const invalid = sample.replace("  - lm-position | Wahl", "  - lm-ghost | Wahl");
    expect(() => parseLearningLandscape(invalid)).toThrow();
  });

  it("rejects an unknown schema version", () => {
    const invalid = sample.replace("ptspace.learning-landscape/v1", "ptspace.learning-landscape/v0");
    expect(() => parseLearningLandscape(invalid)).toThrow();
  });

  it("keeps the shared schema and codec aligned on transition references", () => {
    expect(() => LearningLandscapeSchema.parse({
      schema: "ptspace.learning-landscape/v1",
      title: "x",
      moments: [],
      transitions: [{ id: "t", from: "a", to: "b", kind: "required", rationale: "" }]
    })).toThrow();
  });
});
