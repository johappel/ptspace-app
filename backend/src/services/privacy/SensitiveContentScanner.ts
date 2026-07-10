import { SensitiveFinding } from "@ptspace/shared";

const studentNamePattern = /\b(?:schüler|schülerin|lernender|lernende)\s+([A-ZÄÖÜ][a-zäöüß]{2,})\b/giu;
const gradePattern = /\b(?:note|zensur)\s*(?:ist|:|=)?\s*(?:[1-6]|ungenügend|mangelhaft|ausreichend|befriedigend|gut|sehr gut)\b/giu;
const diagnosisPattern = /\b(?:adhs|autismus|depression|angststörung|lrs|dyskalkulie|diagnose|förderbedarf|sonderpädagogisch)\b/giu;
const familyPattern = /\b(?:eltern\s+sind\s+getrennt|scheidung|pflegefamilie|jugendamt|häusliche\s+gewalt|familiäre\s+probleme)\b/giu;
const conflictPattern = /\b(?:mobbt|mobbing|verweigert|stört\s+ständig|aggressiv|auffällig|konflikt\s+mit)\b/giu;
const secretPattern = /\b(?:api[_-]?key|token|passwort|password|secret)\s*[:=]/giu;

export class SensitiveContentScanner {
  scan(text: string): SensitiveFinding[] {
    return [
      ...this.find(text, studentNamePattern, "student_name", "review", "Nutze möglichst keine Namen einzelner Schüler:innen.", "Formuliere als Beschreibung der Lerngruppe, z. B. 'einige Lernende ...'."),
      ...this.find(text, gradePattern, "grade", "review", "Noten einzelner Personen sind für die Planung meist nicht nötig.", "Beschreibe den Lernstand ohne personenbezogene Bewertung."),
      ...this.find(text, diagnosisPattern, "diagnosis", "block_export", "Diagnosen und Förderbedarfe sind besonders sensible Informationen.", "Beschreibe nur die didaktisch relevante Unterstützung, ohne Diagnosebezug."),
      ...this.find(text, familyPattern, "family_detail", "block_export", "Familiäre Details gehören nicht in Export oder Chat, wenn sie nicht zwingend nötig sind.", "Beschreibe die Unterrichtssituation allgemeiner und ohne private Details."),
      ...this.find(text, conflictPattern, "personal_conflict", "review", "Personenbezogene Konfliktbeschreibungen können stigmatisieren.", "Formuliere beobachtbare Gruppendynamiken ohne Zuschreibung an einzelne Personen."),
      ...this.find(text, secretPattern, "secret", "block_export", "Zugangsdaten dürfen nicht im Planungsraum stehen.", "Entferne Zugangsdaten und nutze später eine geschützte Integrationsverwaltung.")
    ];
  }

  private find(
    text: string,
    pattern: RegExp,
    kind: SensitiveFinding["kind"],
    severity: SensitiveFinding["severity"],
    message: string,
    suggestion: string
  ): SensitiveFinding[] {
    const findings: SensitiveFinding[] = [];
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({
        id: `${kind}-${findings.length + 1}`,
        kind,
        severity,
        excerpt: match[0],
        message,
        suggestion
      });
    }
    return findings;
  }
}