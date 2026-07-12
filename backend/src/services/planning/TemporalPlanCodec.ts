import { TemporalPlan, TemporalPlanSchema } from "@ptspace/shared";

// The kernel artifact `temporal-plan.yml` uses a small, well-defined subset of YAML.
// To avoid a runtime YAML dependency we parse that subset explicitly and validate the
// result with the shared schema plus the cross-reference rules from the temporal-plan
// contract (TEMPORAL_PLAN_SCHEMA).

function scalar(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function numeric(value: string, field: string): number {
  const parsed = Number(scalar(value));
  if (!Number.isFinite(parsed)) throw new Error(`temporal_plan_invalid_number:${field}`);
  return parsed;
}

type Section = "none" | "windows" | "placements";

export function parseTemporalPlan(yaml: string): TemporalPlan {
  const normalized = yaml.replace(/\\n/g, "\n");
  const lines = normalized.split("\n");

  const meta: Record<string, string> = {};
  const windows: Array<Record<string, unknown>> = [];
  const placements: Array<Record<string, unknown>> = [];
  let section: Section = "none";
  let current: Record<string, unknown> | undefined;

  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;

    const topLevel = raw.match(/^([a-z_]+):\s*(.*)$/);
    if (topLevel && !raw.startsWith(" ")) {
      const [, key, value] = topLevel;
      if (key === "windows") { section = "windows"; current = undefined; continue; }
      if (key === "placements") { section = "placements"; current = undefined; continue; }
      meta[key] = scalar(value);
      section = "none";
      continue;
    }

    const itemStart = raw.match(/^\s{2}-\s+([a-z_]+):\s*(.*)$/);
    if (itemStart && section !== "none") {
      current = {};
      if (section === "windows") windows.push(current);
      else placements.push(current);
      const [, key, value] = itemStart;
      applyField(section, current, key, value);
      continue;
    }

    const nested = raw.match(/^\s{4}([a-z_]+):\s*(.*)$/);
    if (nested && current && section !== "none") {
      const [, key, value] = nested;
      applyField(section, current, key, value);
    }
  }

  const plan = TemporalPlanSchema.parse({
    schema: meta.schema,
    title: meta.title,
    landscape: meta.landscape ?? "learning-landscape.md",
    windows,
    placements
  });

  assertInternalConsistency(plan);
  return plan;
}

function applyField(section: Section, target: Record<string, unknown>, key: string, rawValue: string): void {
  const value = rawValue;
  if (section === "windows") {
    if (key === "id") target.id = scalar(value);
    else if (key === "title") target.title = scalar(value);
    else if (key === "kind") target.kind = scalar(value);
    else if (key === "duration_minutes") target.durationMinutes = numeric(value, "duration_minutes");
    else if (key === "note") target.note = scalar(value);
    return;
  }
  if (key === "id") target.id = scalar(value);
  else if (key === "moment_id") target.momentId = scalar(value);
  else if (key === "window_id") target.windowId = scalar(value);
  else if (key === "start_minute") target.startMinute = numeric(value, "start_minute");
  else if (key === "duration_minutes") target.durationMinutes = numeric(value, "duration_minutes");
  else if (key === "dramaturgical_role") target.dramaturgicalRole = scalar(value);
  else if (key === "mode") target.mode = scalar(value);
  else if (key === "note") target.note = scalar(value);
}

// Internal consistency: unique ids, known window references, and placements that do
// not exceed their window duration. Moment references are validated against a concrete
// learning landscape via `assertTemporalPlanReferences`.
export function assertInternalConsistency(plan: TemporalPlan): void {
  const windowIds = new Set<string>();
  for (const window of plan.windows) {
    if (windowIds.has(window.id)) throw new Error(`temporal_plan_duplicate_window:${window.id}`);
    windowIds.add(window.id);
  }
  const placementIds = new Set<string>();
  for (const placement of plan.placements) {
    if (placementIds.has(placement.id)) throw new Error(`temporal_plan_duplicate_placement:${placement.id}`);
    placementIds.add(placement.id);
    const window = plan.windows.find((entry) => entry.id === placement.windowId);
    if (!window) throw new Error(`temporal_plan_unknown_window:${placement.windowId}`);
    if (placement.startMinute + placement.durationMinutes > window.durationMinutes) {
      throw new Error(`temporal_plan_placement_exceeds_window:${placement.id}`);
    }
  }
}

export function assertTemporalPlanReferences(plan: TemporalPlan, knownMomentIds: Set<string>): void {
  for (const placement of plan.placements) {
    if (!knownMomentIds.has(placement.momentId)) {
      throw new Error(`temporal_plan_unknown_moment:${placement.momentId}`);
    }
  }
}

function yamlScalar(value: string): string {
  return /[:#]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

export function serializeTemporalPlan(plan: TemporalPlan): string {
  const lines = [
    `schema: ${plan.schema}`,
    `title: ${yamlScalar(plan.title)}`,
    `landscape: ${plan.landscape}`,
    "",
    "windows:"
  ];
  if (plan.windows.length === 0) lines[lines.length - 1] = "windows: []";
  for (const window of plan.windows) {
    lines.push(`  - id: ${window.id}`);
    lines.push(`    title: ${yamlScalar(window.title)}`);
    lines.push(`    kind: ${window.kind}`);
    lines.push(`    duration_minutes: ${window.durationMinutes}`);
    if (window.note) lines.push(`    note: ${yamlScalar(window.note)}`);
  }
  lines.push("", plan.placements.length === 0 ? "placements: []" : "placements:");
  for (const placement of plan.placements) {
    lines.push(`  - id: ${placement.id}`);
    lines.push(`    moment_id: ${placement.momentId}`);
    lines.push(`    window_id: ${placement.windowId}`);
    lines.push(`    start_minute: ${placement.startMinute}`);
    lines.push(`    duration_minutes: ${placement.durationMinutes}`);
    lines.push(`    dramaturgical_role: ${placement.dramaturgicalRole}`);
    lines.push(`    mode: ${placement.mode}`);
    if (placement.note) lines.push(`    note: ${yamlScalar(placement.note)}`);
  }
  return lines.join("\n") + "\n";
}

export function emptyTemporalPlan(title: string): TemporalPlan {
  return TemporalPlanSchema.parse({
    schema: "ptspace.temporal-plan/v1",
    title,
    landscape: "learning-landscape.md",
    windows: [],
    placements: []
  });
}
