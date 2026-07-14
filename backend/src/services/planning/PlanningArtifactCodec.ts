import {
  LearningLandscape, LearningLandscapeSchema, LearningMomentKind, LearningMomentStatus, LandscapeTransitionKind,
  PlanningBoard, PlanningBoardSchema
} from "@ptspace/shared";

const momentKinds: Record<string, LearningMomentKind> = {
  impuls: "impulse", impulse: "impulse", lernort: "learning_place", station: "learning_place",
  positionierung: "positioning", erkundung: "inquiry", inquiry: "inquiry",
  wahlphase: "choice", wahl: "choice", übung: "practice", uebung: "practice",
  projektphase: "project", projekt: "project", produkt: "product", reflexion: "reflection",
  leistungsrückmeldung: "assessment", leistungsrueckmeldung: "assessment", assessment: "assessment"
};

const transitionKinds: Record<string, LandscapeTransitionKind> = {
  pflichtweg: "required", required: "required", wahl: "choice", choice: "choice",
  parallel: "parallel", rückkehr: "return", rueckkehr: "return", return: "return",
  treffpunkt: "meeting_point", meeting_point: "meeting_point",
  voraussetzung: "prerequisite", prerequisite: "prerequisite"
};

const germanKinds: Record<LearningMomentKind, string> = {
  impulse: "Impuls", learning_place: "Lernort", positioning: "Positionierung",
  inquiry: "Erkundung", choice: "Wahlphase", practice: "Übung", project: "Projektphase",
  product: "Produkt", reflection: "Reflexion", assessment: "Leistungsrückmeldung", other: "Anderes"
};

const germanTransitions: Record<LandscapeTransitionKind, string> = {
  required: "Pflichtweg", choice: "Wahl", parallel: "Parallel", return: "Rückkehr",
  meeting_point: "Treffpunkt", prerequisite: "Voraussetzung"
};

const momentStatuses = new Set<LearningMomentStatus>(["draft", "in_progress", "ready", "needs_revision"]);

function parseStatus(value: string): LearningMomentStatus {
  const normalizedValue = normalized(value) as LearningMomentStatus;
  return momentStatuses.has(normalizedValue) ? normalizedValue : "draft";
}

function semicolonList(value: string | undefined): string[] {
  return (value ?? "").split(";").map((entry) => entry.trim()).filter(Boolean);
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function csv(value: string | undefined): string[] {
  return (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

function frontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) throw new Error("Die Lernlandschaft beginnt nicht mit dem erwarteten Metadatenblock.");
  return Object.fromEntries(match[1].split("\n").map((line) => {
    const [key, ...rest] = line.split(":");
    return [key.trim(), rest.join(":").trim()];
  }).filter(([key]) => key));
}

function field(lines: string[], label: string): string {
  const line = lines.find((value) => value.toLowerCase().startsWith(`- ${label.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

export function parseLearningLandscape(markdown: string): LearningLandscape {
  const meta = frontmatter(markdown);
  if (meta.schema !== "ptspace.learning-landscape/v1") throw new Error("Unbekannte Lernlandschaftsversion.");

  const nodePattern = /^##\s+([a-z0-9][a-z0-9-]*)\s+[–—-]\s+(.+)$/gim;
  const matches = [...markdown.matchAll(nodePattern)];
  const moments = matches.map((match, index) => {
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = index + 1 < matches.length ? (matches[index + 1].index ?? markdown.length) : markdown.length;
    const lines = markdown.slice(bodyStart, bodyEnd).split("\n").map((line) => line.trim()).filter(Boolean);
    const type = momentKinds[normalized(field(lines, "Typ"))] ?? "other";
    const transitions: Array<{ id: string; from: string; to: string; kind: LandscapeTransitionKind; rationale: string }> = [];
    const transitionIndex = lines.findIndex((line) => /^- Übergänge:/i.test(line));
    if (transitionIndex >= 0) {
      for (const line of lines.slice(transitionIndex + 1)) {
        if (!line.startsWith("- ")) break;
        const [target, kindLabel, rationale = ""] = line.slice(2).split("|").map((entry) => entry.trim());
        if (!target) continue;
        transitions.push({
          id: `${match[1]}--${target}`,
          from: match[1],
          to: target,
          kind: transitionKinds[normalized(kindLabel)] ?? "required",
          rationale
        });
      }
    }
    return {
      moment: {
        id: match[1],
        title: match[2].trim(),
        kind: type,
        didacticPurpose: field(lines, "Funktion"),
        learningActivity: field(lines, "Lernaktivität"),
        expectedExperience: field(lines, "Erwartete Lernerfahrung"),
        materialNeeds: csv(field(lines, "Materialbedarf")),
        materialIds: csv(field(lines, "Materialien")),
        openQuestions: semicolonList(field(lines, "Offene Fragen")),
        status: parseStatus(field(lines, "Status"))
      },
      transitions
    };
  });

  return LearningLandscapeSchema.parse({
    schema: meta.schema,
    title: meta.title,
    structure: meta.structure || "linear",
    moments: moments.map((entry) => entry.moment),
    transitions: moments.flatMap((entry) => entry.transitions)
  });
}

export function serializeLearningLandscape(landscape: LearningLandscape): string {
  const lines = [
    "---",
    "schema: ptspace.learning-landscape/v1",
    `title: ${landscape.title}`,
    `structure: ${landscape.structure}`,
    "---",
    "",
    "# Lernlandschaft"
  ];
  for (const moment of landscape.moments) {
    lines.push("", `## ${moment.id} – ${moment.title}`, "", `- Typ: ${germanKinds[moment.kind]}`);
    lines.push(`- Funktion: ${moment.didacticPurpose}`);
    lines.push(`- Erwartete Lernerfahrung: ${moment.expectedExperience}`);
    lines.push(`- Lernaktivität: ${moment.learningActivity}`);
    if (moment.materialNeeds.length) lines.push(`- Materialbedarf: ${moment.materialNeeds.join(", ")}`);
    if (moment.materialIds.length) lines.push(`- Materialien: ${moment.materialIds.join(", ")}`);
    if (moment.openQuestions.length) lines.push(`- Offene Fragen: ${moment.openQuestions.join("; ")}`);
    lines.push(`- Status: ${moment.status}`);
    const transitions = landscape.transitions.filter((transition) => transition.from === moment.id);
    if (transitions.length) {
      lines.push("- Übergänge:");
      for (const transition of transitions) {
        lines.push(`  - ${transition.to} | ${germanTransitions[transition.kind]}${transition.rationale ? ` | ${transition.rationale}` : ""}`);
      }
    }
  }
  return lines.join("\n") + "\n";
}

function inlineList(value: string): string[] {
  const trimmed = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  return trimmed ? trimmed.split(",").map((entry) => entry.trim()).filter(Boolean) : [];
}

export function parsePlanningBoard(yaml: string): PlanningBoard {
  // Older templates accidentally persisted escaped newlines. Normalize only at this file boundary.
  const normalizedYaml = yaml.replace(/\\n/g, "\n");
  const lines = normalizedYaml.split("\n");
  const schema = lines.find((line) => /^schema:\s*/.test(line))?.replace(/^schema:\s*/, "").trim();
  const items: Array<Record<string, unknown>> = [];
  let current: Record<string, unknown> | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    const item = raw.match(/^\s{2}-\s+id:\s*(.+)$/);
    if (item) {
      current = { id: item[1].trim(), relatedNodes: [], relatedWindows: [], materialIds: [], materialNeed: "", expectedResult: "", requiresTeacherApproval: true };
      items.push(current);
      continue;
    }
    if (!current || !/^\s{4}/.test(raw)) continue;
    const match = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === "title") current.title = value;
    if (key === "kind") current.kind = value;
    if (key === "column") current.column = value;
    if (key === "status") current.status = value;
    if (key === "related_nodes") current.relatedNodes = inlineList(value);
    if (key === "related_windows") current.relatedWindows = inlineList(value);
    if (key === "material_ids") current.materialIds = inlineList(value);
    if (key === "material_need") current.materialNeed = value;
    if (key === "expected_result") current.expectedResult = value;
    if (key === "requires_teacher_approval") current.requiresTeacherApproval = value !== "false";
  }

  return PlanningBoardSchema.parse({ schema, items });
}

function yamlList(items: string[]): string {
  return `[${items.join(", ")}]`;
}

export function serializePlanningBoard(board: PlanningBoard): string {
  const lines = ["schema: ptspace.planning-board/v1", "items:"];
  for (const item of board.items) {
    lines.push(`  - id: ${item.id}`, `    title: ${item.title}`, `    kind: ${item.kind}`, `    column: ${item.column}`);
    if (item.relatedNodes.length) lines.push(`    related_nodes: ${yamlList(item.relatedNodes)}`);
    if (item.relatedWindows.length) lines.push(`    related_windows: ${yamlList(item.relatedWindows)}`);
    if (item.materialIds.length) lines.push(`    material_ids: ${yamlList(item.materialIds)}`);
    if (item.materialNeed) lines.push(`    material_need: ${item.materialNeed}`);
    if (item.expectedResult) lines.push(`    expected_result: ${item.expectedResult}`);
    lines.push(`    status: ${item.status}`, `    requires_teacher_approval: ${item.requiresTeacherApproval}`);
  }
  return lines.join("\n") + "\n";
}
