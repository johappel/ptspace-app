import {
  LearningLandscape,
  Material,
  PlanningBoard,
  WorkspaceConsistencyFinding
} from "@ptspace/shared";

/**
 * Skill `workspace-consistency-check` (L5b.5) – deterministischer Kern.
 *
 * Diese Prüfung verwendet ausschließlich deterministische Logik. Nach der
 * Architekturregel „deterministisch bevorzugen“ wird KEIN LLM benötigt, um die
 * hier abgedeckten Fälle zu erkennen. Semantisch offene Pflegefragen (nicht Teil
 * dieses Kerns) blieben einem späteren, optionalen semantischen Schritt
 * vorbehalten.
 *
 * Ergebnis sind ausschließlich Vorschläge (`WorkspaceConsistencyFinding`).
 * Fachlich relevante Änderungen werden nicht automatisch angewendet.
 */

export type WorkspaceSnapshot = {
  landscape: LearningLandscape;
  board: PlanningBoard;
  materials: Material[];
  /** Offene Fragen als bereits geparste Zeilen (ohne Aufzählungszeichen). */
  openQuestions: string[];
  /** Bereits akzeptierte Entscheidungen als Titel/Text. */
  decisions: string[];
};

export function checkWorkspaceConsistency(snapshot: WorkspaceSnapshot): WorkspaceConsistencyFinding[] {
  const findings: WorkspaceConsistencyFinding[] = [];
  const momentIds = new Set(snapshot.landscape.moments.map((moment) => moment.id));
  const boardItemIds = new Set(snapshot.board.items.map((item) => item.id));

  // 1. Material verweist auf nicht mehr existierenden Lernmoment oder Board-Item.
  for (const material of snapshot.materials) {
    for (const momentId of material.relatedMoments) {
      if (!momentIds.has(momentId)) {
        findings.push({
          id: `orphan-moment-${material.id}-${momentId}`,
          kind: "orphaned_material_reference",
          severity: "suggestion",
          detectedBy: "deterministic",
          message: `Das Material „${material.title}“ verweist auf einen Lernmoment, der nicht mehr existiert.`,
          targetType: "material",
          targetId: material.id
        });
      }
    }
    for (const boardItemId of material.relatedBoardItems) {
      if (!boardItemIds.has(boardItemId)) {
        findings.push({
          id: `orphan-board-${material.id}-${boardItemId}`,
          kind: "orphaned_material_reference",
          severity: "suggestion",
          detectedBy: "deterministic",
          message: `Das Material „${material.title}“ verweist auf ein Arbeitsvorhaben, das nicht mehr existiert.`,
          targetType: "material",
          targetId: material.id
        });
      }
    }
    // 2. Fehlende Provenance eines Materials.
    if (!material.sourceRequest) {
      findings.push({
        id: `missing-provenance-${material.id}`,
        kind: "missing_provenance",
        severity: "info",
        detectedBy: "deterministic",
        message: `Für das Material „${material.title}“ ist keine Herkunft dokumentiert.`,
        targetType: "material",
        targetId: material.id
      });
    }
  }

  // 3. Board-Karte verweist auf nicht mehr existierenden Lernmoment.
  for (const item of snapshot.board.items) {
    for (const nodeId of item.relatedNodes) {
      if (!momentIds.has(nodeId)) {
        findings.push({
          id: `board-orphan-${item.id}-${nodeId}`,
          kind: "inconsistent_reference",
          severity: "suggestion",
          detectedBy: "deterministic",
          message: `Das Arbeitsvorhaben „${item.title}“ bezieht sich auf einen Lernmoment, der nicht mehr existiert.`,
          targetType: "board_item",
          targetId: item.id
        });
      }
    }
  }

  // 4. Offene Frage, die durch eine akzeptierte Entscheidung erledigt scheint.
  const normalizedDecisions = snapshot.decisions.map(normalize);
  for (const question of snapshot.openQuestions) {
    const normalizedQuestion = normalize(question);
    if (!normalizedQuestion) continue;
    const overlapping = normalizedDecisions.find((decision) => strongOverlap(normalizedQuestion, decision));
    if (overlapping) {
      findings.push({
        id: `resolved-question-${hash(question)}`,
        kind: "resolved_open_question",
        severity: "suggestion",
        detectedBy: "deterministic",
        message: `Die offene Frage „${question}“ scheint durch eine getroffene Entscheidung bereits geklärt.`,
        targetType: "open_question",
        targetId: question
      });
    }
  }

  return findings;
}

function normalize(text: string): string {
  return text
    .toLocaleLowerCase("de")
    .replace(/[^a-zäöüß0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "welche", "welcher", "welches", "soll", "sollen", "wir", "der", "die", "das",
  "ein", "eine", "und", "oder", "für", "mit", "im", "in", "am", "zum", "zur",
  "ist", "sind", "wie", "was", "wer", "wo", "eher", "noch", "beginnt", "beginnen"
]);

/** Grobe deterministische Überlappungsheuristik über bedeutungstragende Wörter. */
function strongOverlap(a: string, b: string): boolean {
  const wordsA = new Set(a.split(" ").filter((word) => word.length > 3 && !STOPWORDS.has(word)));
  const wordsB = new Set(b.split(" ").filter((word) => word.length > 3 && !STOPWORDS.has(word)));
  if (wordsA.size === 0) return false;
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared += 1;
  return shared / wordsA.size >= 0.6;
}

function hash(text: string): string {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(value).toString(36);
}
