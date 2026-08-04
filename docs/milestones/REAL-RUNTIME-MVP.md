# Meilenstein: Real Runtime MVP

Stand: 2026-08-04

## 1. Ziel

`ptspace-app` wird vom lokalen Mock-/Hybridprototyp zu einem reproduzierbaren, harness-basierten MVP weiterentwickelt.

Der Meilenstein umfasst vier zusammenhängende Entwicklungsziele:

1. Kernel und App semantisch synchronisieren
2. persistente Runtime-Sessions und kontrollierte Kontextkompression einführen
3. den vorhandenen Kernablauf mit einem echten Harness betreiben
4. den Ablauf durch E2E- und Zugänglichkeitsabnahme absichern

Der Meilenstein erweitert nicht primär den Funktionsumfang. Er macht den vorhandenen Kernprozess konsistent, real ausführbar, testbar und belastbar.

## 2. Nicht Teil dieses Meilensteins

Bis zur Abnahme werden nicht begonnen:

- neue Worker-Arten,
- zusätzliche Exportformate,
- weitere Räume oder Dashboard-Bereiche,
- Forgejo-Integration,
- produktive Nextcloud-Integration,
- produktiver Betrieb mit Schüler:innendaten,
- automatische Veränderungen kanonischer Artefakte ohne Vorschau und Zustimmung,
- breiter Ausbau des Knowledge-Systems, sofern er für den Referenzablauf nicht erforderlich ist.

## 3. Verbindliche Architektur

```text
pedagogical-thinking-space
= pädagogischer Kernel und normative Semantik

ptspace-app frontend
= lehrkräftebezogene Oberfläche

ptspace-app backend
= Schutz-, Policy-, Session- und Orchestrierungsschicht

Harness adapter
= austauschbarer Runtimevertrag

OpenCode oder kompatibler Harness
= reale Ausführungsumgebung

Planning-Space Workspace
= kanonische pädagogische Artefakte und interne Git-Versionierung
```

Der Browser spricht niemals direkt mit dem Harness. Mock- und Real-Harness implementieren denselben Adaptervertrag.

---

## M1 – Kernel/App Alignment

### Ziel

Die App verwendet die aktuelle systemisch-reflexive Konzeption des Pedagogical Companion und kompatible Kernelverträge.

### Aufgaben

- aktuelle Kernel-Quellen und App-Kopien beziehungsweise Templates inventarisieren;
- verwendeten Kernel-Commit oder eine gleichwertige Kernelversion pro Planungsraum nachvollziehbar speichern;
- UI, Prompts, Tests und Dokumentation auf **Pedagogical Companion** umstellen;
- `Critical Friend` nur noch als mögliche reflexive Fähigkeit behandeln;
- Companion-Verhalten an `SYSTEMIC_STANCE.md`, `MANIFEST.md` und die aktuelle Orchestrierung angleichen;
- Beobachtung, Aussage, Interpretation und Hypothese in Prompt- und Ergebnisverträgen unterscheiden;
- Reflexionstiefe an verfügbare Zeit und Energie der Lehrkraft anpassen;
- veraltete oder nicht mehr vorhandene Refactor-Verweise bereinigen;
- App-Schemas und Kernelverträge vergleichen, Abweichungen synchronisieren oder ausdrücklich versionieren;
- einen automatisierten Kompatibilitätscheck ergänzen.

### Abnahmekriterien

- In der lehrkräftebezogenen Oberfläche erscheint `Critical Friend` nicht mehr als Rollenname.
- Der Systemkontext verwendet nachweisbar die aktuelle Companion-Haltung.
- Die verwendete Kernelversion ist pro Planungsraum nachvollziehbar.
- Inkompatible Kernelverträge werden automatisiert erkannt.
- App und Kernel besitzen keine ungeklärten parallelen pädagogischen Datenmodelle.

---

## M2 – Persistente Runtime-Sessions

### Ziel

Jeder Planungsraum besitzt eine gespeicherte, wiederaufnehmbare und isolierte Runtime-Session.

### Mindestmodell

```ts
interface RuntimeSession {
  planningSpaceId: string;
  runtime: string;
  runtimeSessionId: string;
  model?: string;
  kernelVersion: string;
  contextVersion: number;
  createdAt: string;
  lastUsedAt: string;
  status: "active" | "stale" | "failed" | "closed";
}
```

### Aufgaben

- Session-Store und Lebenszyklus definieren;
- Session beim ersten realen Gespräch erzeugen;
- Session bei weiteren Nachrichten wiederaufnehmen;
- Backend-Neustarts, verlorene Harness-Sessions und kontrollierte Neuerzeugung behandeln;
- Parallelzugriffe und Run-Locking pro Planungsraum definieren;
- technische Diagnose ermöglichen, ohne Sessiondetails in den normalen Lehrkräftedialog zu tragen;
- Mock- und Real-Adapter auf denselben Sessionvertrag umstellen;
- Isolation zwischen Planungsräumen testen.

### Abnahmekriterien

- Zwei aufeinanderfolgende Nachrichten desselben Planungsraums verwenden dieselbe Runtime-Session.
- Ein Backend-Neustart verliert die Zuordnung nicht.
- Eine verlorene Harness-Session wird kontrolliert wiederhergestellt.
- Zwei Planungsräume verwenden getrennte Sessions und Kontexte.
- Der Runtimezustand wird nach einem Frontend-Neuladen korrekt angezeigt.

---

## M3 – Kontextbudget und Gesprächsverdichtung

### Ziel

Lange Gespräche bleiben relevant, verständlich und wirtschaftlich, ohne bestätigte Entscheidungen oder offene Spannungen zu verlieren.

### Kontextschichten

```text
1. stabiler Kernelkontext
2. kanonischer aktueller Denkstand
3. aktueller lokaler Fokus
4. jüngster relevanter Gesprächsausschnitt
5. verdichteter älterer Gesprächsstand
```

### Nicht-kanonisches Runtime-Read-Model

Beispielsweise:

```text
runtime/context-summary.yml
```

mit mindestens:

```yaml
version:
generated_at:
based_on_message_until:
confirmed_intentions:
confirmed_decisions:
open_questions:
rejected_options:
current_focus:
relevant_rationales:
tentative_hypotheses:
unresolved_tensions:
```

### Regeln

- `learning-design`, `decisions`, Lernlandschaft, Zeitplanung und weitere kanonische Artefakte bleiben maßgeblich.
- Die Runtime-Zusammenfassung darf keine Entscheidungen erfinden oder vorläufige Hypothesen als Tatsachen behandeln.
- Die letzten relevanten Nachrichten bleiben unverändert verfügbar.
- Kompression erfolgt nach einem expliziten Token-, Nachrichten- oder Größenbudget.
- Verdichtungen sind versioniert und diagnostizierbar.
- Geladene Kontextbestandteile und ungefähre Tokenkosten werden technisch protokolliert, ohne unnötige personenbezogene Inhalte zu loggen.

### Abnahmekriterien

- Ein synthetisches Gespräch mit mindestens 50 Nachrichten bleibt sinnvoll fortsetzbar.
- Bestätigte Entscheidungen werden nach Kompression korrekt berücksichtigt.
- Verworfene Optionen erscheinen nicht erneut als beschlossene Planung.
- Promptgröße und Antwortlänge wachsen nicht linear mit jeder Nachricht.
- Die pro Run geladenen Kontextbestandteile sind nachvollziehbar.

---

## M4 – Real-Harness-Referenzablauf

### Ziel

Der vorhandene Kernprozess funktioniert mit einem realen Harness und nicht nur mit simulierten Antworten.

### Mindestvertrag

```ts
interface HarnessAdapter {
  health(): Promise<HarnessHealth>;
  createSession(input: CreateSessionInput): Promise<RuntimeSessionHandle>;
  resumeSession(input: ResumeSessionInput): Promise<RuntimeSessionHandle>;
  sendMessage(input: SendMessageInput): AsyncIterable<HarnessEvent>;
  cancelRun(input: CancelRunInput): Promise<void>;
  closeSession(input: CloseSessionInput): Promise<void>;
}
```

### Aufgaben

- Real-Harness-Adapter vervollständigen;
- Sessionerzeugung und Wiederaufnahme integrieren;
- Streamingereignisse für Mock und Realmodus vereinheitlichen;
- Dateiänderungen, Service Requests und Ergebnisse vor Übernahme validieren;
- technische Permission-Anfragen durch Backend-Policies behandeln;
- Zugriffe außerhalb des erlaubten Workspace blockieren;
- Runtime-Fehler in lehrkräfteverständliche Zustände übersetzen;
- Mock-/Simulationsmodus und Realmodus eindeutig kennzeichnen;
- Referenzkonfiguration und lokalen Startweg dokumentieren.

### Referenzablauf

```text
Planungsraum anlegen
→ Anliegen im Gespräch klären
→ Denkstand aktualisieren
→ Lernlandschaft lesen oder verändern
→ Vorbereitung vorschlagen
→ Lehrkraft bestätigt
→ realer Hintergrundauftrag startet
→ Ergebnis wird validiert und geprüft
→ Lehrkraft gibt Ergebnis frei
```

### Abnahmekriterien

- Der Referenzablauf funktioniert nach einem frischen Clone ohne manuelle Workspace-Korrekturen.
- Der Harness schreibt ausschließlich innerhalb des erlaubten Workspace.
- Ein abgebrochener Auftrag beschädigt keine kanonischen Dateien.
- Mock- und Realmodus verwenden dieselben API-Routen und Domainverträge.
- Der Modus und der Zustand einer laufenden Arbeit sind nach Reload korrekt erkennbar.

---

## M5 – Browser-E2E und CI-Gates

### Ziel

Der zentrale Produktablauf und kritische Recovery-Fälle werden in einem realen Browser automatisch geprüft.

### Verbindliche Szenarien

1. Planungsraum erstellen und wieder öffnen.
2. Persistente Session über mehrere Nachrichten.
3. Kontextkompression nach langem Gespräch.
4. Vorschlag unter `Jetzt wichtig` bestätigen.
5. Hintergrundarbeit starten und Status verfolgen.
6. Ergebnis prüfen und freigeben.
7. Gesprächsmarker öffnen und zur Ausgangsstelle zurückkehren.
8. Canvas und Zeitansicht wechseln, ohne Informationen zu verlieren.
9. Runtime-Abbruch und Wiederaufnahme.
10. Ungültige oder unzulässige Harness-Ausgabe abweisen.

### Abnahmekriterien

- E2E-Tests laufen reproduzierbar lokal.
- E2E-Tests laufen in GitHub Actions.
- Fehlgeschlagene Kernchecks verhindern das Zusammenführen.
- Testdaten sind synthetisch und enthalten keine personenbezogenen Daten.

---

## M6 – Zugänglichkeitsabnahme

### Ziel

Der Referenzablauf ist ohne Maus, Animation, Ton oder räumliche Illustration nutzbar.

### Prüfbereiche

- vollständige Tastaturnavigation;
- sichtbarer und logischer Fokus;
- Screenreader-Bezeichnungen und Statusansagen;
- korrektes Modal- und Dialog-Fokusmanagement;
- semantische Überschriftenstruktur;
- keine ausschließlich farbliche Statusvermittlung;
- Reduced Motion und abschaltbare Töne;
- responsive Nutzung;
- ausreichende Kontraste;
- funktionsgleiche lineare Alternative zum Canvas.

### Abnahmekriterien

- Der Referenzablauf kann vollständig mit Tastatur durchgeführt werden.
- Ein automatischer Accessibility-Scan enthält keine kritischen Verstöße.
- Die wichtigsten Ansichten wurden mit einem Screenreader als Smoke-Test geprüft.
- Animation und Ton können vollständig deaktiviert werden.
- Ohne Canvas-Interaktion bleibt die Planung vollständig erreichbar.

---

## 4. Reihenfolge und Abhängigkeiten

```text
M1 Kernel/App Alignment
→ M2 persistente Sessions
→ M3 Kontextbudget und Kompression
→ M4 Real-Harness-Referenzablauf
→ M5 Browser-E2E und CI
→ M6 Zugänglichkeitsabnahme
```

E2E- und Accessibility-Testgerüste dürfen früh vorbereitet werden. Ein späterer Meilenstein darf jedoch keine ungelöste Architekturfrage eines früheren Meilensteins stillschweigend umgehen.

## 5. Handoff pro PR

Jeder Handoff dokumentiert:

- bearbeitetes Issue und Meilensteinziel;
- geänderte Dateien;
- Architekturentscheidungen;
- ausgeführte Tests und Ergebnisse;
- bekannte Einschränkungen;
- Risiken für nachfolgende Arbeit;
- ausdrücklich noch nicht bearbeitete Punkte.

## 6. Definition of Done

Der Meilenstein ist abgeschlossen, wenn:

- App und Kernel semantisch synchronisiert sind;
- jeder Planungsraum eine persistente Runtime-Session besitzt;
- lange Gespräche kontrolliert verdichtet werden;
- der zentrale Ablauf mit einem realen Harness funktioniert;
- der vollständige Ablauf durch E2E-Tests geschützt ist;
- die zentrale Nutzerreise tastatur- und screenreadertauglich ist;
- der Mockmodus nicht mehr die einzige verlässlich funktionierende Betriebsart ist;
- Installation und Referenzablauf von einem frischen Clone reproduziert werden können.
