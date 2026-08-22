import { Skill, SkillSchema, SkillStatus } from "@ptspace/shared";

/**
 * PTS-eigene Skill Registry (L5b.3).
 *
 * Die Registry bleibt PTS-owned: eine adaptive Runtime darf einen Skill
 * ausführen, aber nicht definieren, was ein gültiger produktiver PTS-Skill ist.
 * Nur `reviewed` oder `approved` Skills dürfen automatisch produktiv ausgewählt
 * werden. Automatisch erzeugte Skill-Kandidaten starten immer als
 * `experimental` und werden nicht ohne Prüfung promotet.
 *
 * Diese erste Registry ist bewusst klein und in-memory. Sie ist kein
 * Skill-Management-Produkt, sondern eine testbare Abstraktion für den L5b-Thin-Slice.
 */

const PRODUCTIVE_STATUSES: ReadonlySet<SkillStatus> = new Set<SkillStatus>(["reviewed", "approved"]);

export class SkillRegistry {
  private readonly skills = new Map<string, Skill>();

  constructor(initial: Skill[] = []) {
    for (const skill of initial) this.register(skill);
  }

  /** Validiert und legt einen Skill ab (überschreibt gleiche id). */
  register(skill: Skill): Skill {
    const parsed = SkillSchema.parse(skill);
    this.skills.set(parsed.id, parsed);
    return parsed;
  }

  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  list(): Skill[] {
    return [...this.skills.values()];
  }

  /** Nur produktiv einsetzbare Skills (reviewed/approved). */
  listProductive(): Skill[] {
    return this.list().filter((skill) => PRODUCTIVE_STATUSES.has(skill.status));
  }

  /** Prüft, ob ein Skill produktiv ausgewählt werden darf. */
  isSelectable(id: string): boolean {
    const skill = this.skills.get(id);
    return Boolean(skill && PRODUCTIVE_STATUSES.has(skill.status));
  }

  /**
   * Liefert einen produktiv einsetzbaren Skill oder wirft, wenn er unbekannt
   * oder nicht freigegeben ist. So kann keine experimentelle Fähigkeit still
   * produktiv ausgeführt werden.
   */
  requireSelectable(id: string): Skill {
    const skill = this.skills.get(id);
    if (!skill) throw new Error("skill_not_found");
    if (!PRODUCTIVE_STATUSES.has(skill.status)) throw new Error("skill_not_selectable");
    return skill;
  }
}

/** Die beiden L5b-Thin-Slice-Skills als PTS-definierte, geprüfte Fähigkeiten. */
export function defaultSkills(): Skill[] {
  return [
    SkillSchema.parse({
      id: "contrastive-research",
      purpose:
        "Nicht einfach passende Materialien suchen, sondern bewusst eine kontrastierende Perspektive zum aktuellen Denkstand erschließen.",
      status: "reviewed" as const,
      applicableWhen: [
        "Der aktuelle Entwurf wirkt konzeptionell geschlossen.",
        "Es werden bewusst alternative Perspektiven gesucht."
      ],
      inputs: ["aktueller Denkstand", "dominante Annahme"],
      outputs: ["kuratierte Perspektive mit Herkunft und Unsicherheit"],
      constraints: [
        "Keine ungefilterte Trefferliste zurückgeben.",
        "Ergebniszahl begrenzen.",
        "Quellenqualität, Kontext, Datum und Unsicherheit erhalten."
      ],
      provenance: "PTS L5b.4 (contrastive-research)",
      qualityHistory: []
    }),
    SkillSchema.parse({
      id: "workspace-consistency-check",
      purpose:
        "Den Planungsraum kontinuierlich auf Inkonsistenzen, veraltete Zustände und Pflegebedarfe prüfen. Deterministische Prüfung wird bevorzugt.",
      status: "approved" as const,
      applicableWhen: [
        "Eine Entscheidung wurde akzeptiert.",
        "Die Lernlandschaft hat sich geändert.",
        "Ein Material wurde ergänzt oder entfernt."
      ],
      inputs: ["Lernlandschaft", "Planungsboard", "offene Fragen", "Materialien"],
      outputs: ["Liste von Konsistenzbefunden als Vorschläge"],
      constraints: [
        "Fachliche Änderungen nur vorschlagen, nicht automatisch anwenden.",
        "LLM nur für semantisch offene Fälle verwenden."
      ],
      provenance: "PTS L5b.5 (workspace-consistency-check)",
      qualityHistory: []
    })
  ];
}
