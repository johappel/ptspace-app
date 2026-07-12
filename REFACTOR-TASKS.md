# REFACTOR-TASKS.md

# Refactoring-Aufgaben für Kernel und App

## Arbeitsregeln für den Agenten

Bearbeite die Aufgaben in der angegebenen Reihenfolge.

Nach jeder Aufgabe:

1. führe die zugehörigen Tests aus,
2. behebe Fehler,
3. dokumentiere geänderte Dateien,
4. markiere die Aufgabe erst danach als abgeschlossen.

Keine Aufgabe darf stillschweigend übersprungen werden.

Bei Unklarheiten gilt:

- Kernel vor App.
- Bestehende Daten erhalten.
- Keine pädagogische Semantik ausschließlich in der App.
- Keine automatische Freigabe durch Drag-and-drop.
- Keine KI-Änderung ohne sichtbare Zustimmung.
- Kein zweites unabhängiges Datenmodell einführen.

---

# Phase 0 – Bestand sichern

## T-000 Repository-Zustand prüfen

- [ ] Default-Branch beider Repositories bestimmen.
- [ ] Aktuelle Tests in beiden Repositories ausführen.
- [ ] Bestehende Fehler dokumentieren.
- [ ] Keine Refactoring-Fehler mit bereits vorhandenen Fehlern vermischen.

**Abnahme:**

- Es gibt eine kurze Bestandsnotiz.
- Alle Ausgangsfehler sind dokumentiert.

## T-001 Relevante Kernel-Verträge erfassen

Lies mindestens:

- `README.md`
- `LEARNING_DESIGN.md`
- `specs/LEARNING_DESIGN_SCHEMA.md`
- `specs/LEARNING_LANDSCAPE_SCHEMA.md`
- `specs/PLANNING_BOARD_SCHEMA.md`
- `specs/SERVICE_REQUEST_SCHEMA.md`
- `ORCHESTRATION.md`
- `services/WORKER.md`
- `services/KNOWLEDGE.md`

**Abnahme:**

- Eine Liste der aktuell kanonischen Artefakte ist dokumentiert.
- Widersprüche werden vor Änderungen benannt.

---

# Phase 1 – Kernel-Verträge vereinheitlichen

## T-100 Quellen der Wahrheit festlegen

Überarbeite die Kernel-Dokumentation so, dass eindeutig gilt:

```text
learning-design.md
= übergeordnetes pädagogisches Verständnis

learning-landscape.md
= Lernmomente und Übergänge

temporal-plan.yml
= Unterrichtsfenster und zeitliche Platzierungen

planning-board.yml
= Arbeitsvorhaben

decisions.yml
= begründete Entscheidungen

materials/
= Entwürfe und geprüfte Materialien
```

- [ ] README aktualisieren.
- [ ] Learning-Design-Dokumentation aktualisieren.
- [ ] Orchestration-Regeln aktualisieren.
- [ ] Widersprüchliche Aussagen zur „single source of truth“ präzisieren.

**Abnahme:**

- Jede Datei besitzt eine klar abgegrenzte Verantwortung.
- Keine Datei wird als Quelle für Inhalte beschrieben, die einer anderen Datei gehören.

## T-101 Begriffsdefinitionen ergänzen

Ergänze verbindliche Definitionen für:

- Lernmoment
- Lernaktivität
- Übergang
- Materialbedarf
- Material
- Planungsboard-Karte
- Unterrichtsfenster
- zeitliche Platzierung

**Abnahme:**

- Definitionen erscheinen in einer zentralen Kernel-Datei.
- Alle betroffenen Schemas verweisen auf dieselben Begriffe.

## T-102 Learning-Landscape-Schema erweitern

Erweitere `LEARNING_LANDSCAPE_SCHEMA.md`.

Ein Lernmoment braucht mindestens:

- `id`
- `title`
- `type`
- `function`
- `learning_activity`
- `expected_experience`
- `material_needs`
- `materials`
- `open_questions`
- `status`

Ein Übergang braucht mindestens:

- `id`
- `from`
- `to`
- `type`
- `rationale`

Entferne Zeitfenster und Platzierungen aus dem Lernlandschaftsschema, nachdem die Migration vorbereitet wurde.

**Abnahme:**

- Das Schema enthält keine kanonischen Zeitdaten mehr.
- Beispiele und Validierungsregeln sind vollständig.

## T-103 Temporal-Plan-Schema erstellen

Erstelle:

```text
specs/TEMPORAL_PLAN_SCHEMA.md
```

Definiere:

### TeachingWindow

- `id`
- `title`
- `kind`
- `duration_minutes`
- `note`

### TimePlacement

- `id`
- `moment_id`
- `window_id`
- `start_minute`
- `duration_minutes`
- `dramaturgical_role`
- `mode`
- `note`

Validiere:

- eindeutige IDs,
- bekannte Lernmoment-Referenzen,
- bekannte Unterrichtsfenster,
- keine negativen Minuten,
- `start_minute + duration_minutes <= window.duration_minutes`, sofern keine explizite Überbelegung erlaubt ist.

**Abnahme:**

- Vollständiges Beispiel vorhanden.
- Regeln für Parallelität und Wahl sind beschrieben.
- Ein Lernmoment darf mehrfach platziert werden.

## T-104 Planning-Board-Schema präzisieren

Stelle sicher, dass jede Board-Karte Referenzen besitzen kann auf:

- Lernmomente
- Unterrichtsfenster
- Entscheidungen
- Materialien
- Service Requests

Ergänze einen optionalen Materialbedarf-Bezug.

**Abnahme:**

- Board-Karte und Material sind nicht identisch.
- Board-Verschiebung erzeugt keinen Service Request.

## T-105 Material-Metadaten definieren

Definiere ein Kernel-Schema für Materialmetadaten.

Mindestens:

- `id`
- `title`
- `kind`
- `status`
- `related_moments`
- `related_windows`
- `related_board_items`
- `related_decisions`
- `source_request`
- `created_at`
- `reviewed_at`

**Abnahme:**

- Kein Material ohne pädagogischen Bezug.
- Status „ready_for_class“ erfordert ausdrückliche fachliche Freigabe.

## T-106 Agentenregeln ergänzen

Ergänze in `AGENTS.md` und relevanten Rollen:

- Lernmomente dürfen vorgeschlagen, aber nicht ungefragt kanonisch erzeugt werden.
- Lernaktivitäten werden innerhalb eines Lernmoments entwickelt.
- Materialbedarf erzeugt höchstens einen Board-Vorschlag.
- Worker dürfen keine pädagogischen Grundentscheidungen treffen.
- Zeitplatzierungen dürfen nur nach Lehrkraft-Zustimmung geändert werden.

**Abnahme:**

- Regeln sind explizit und testbar formuliert.

---

# Phase 2 – Kernel-Beispiele und Migration

## T-200 Beispielworkspace aktualisieren

Erstelle oder aktualisiere einen vollständigen Beispielworkspace mit:

- `learning-design.md`
- `learning-landscape.md`
- `temporal-plan.yml`
- `planning-board.yml`
- `decisions.yml`
- mindestens einem Materialbedarf
- mindestens einer Board-Karte
- mindestens einem Materialentwurf

**Abnahme:**

- Alle Referenzen sind gültig.
- Der Workspace ist ohne App verständlich.

## T-201 Migrationsregel dokumentieren

Definiere Migration von alten Landschaften mit:

```yaml
teaching_windows:
placements:
```

zu:

```text
temporal-plan.yml
```

**Abnahme:**

- Migration ist deterministisch.
- Keine Zeitdaten gehen verloren.
- Bereits bestehende IDs bleiben erhalten, sofern sie gültig sind.

---

# Phase 3 – App-Domain aus Kernel ableiten

## T-300 Parallelmodelle inventarisieren

Suche in `ptspace-app` nach:

- `LearningDesignSchema`
- `learningJourney.phases`
- `activities`
- `nextSteps`
- `teachingWindows`
- `placements`
- `materials`
- `decisions`

Dokumentiere jedes Feld als:

- kanonisch,
- View Model,
- Legacy,
- zu entfernen.

**Abnahme:**

- Vollständige Mapping-Tabelle vorhanden.

## T-301 Gemeinsame Schemas umbauen

Überarbeite `packages/shared`.

Erstelle oder aktualisiere:

- `LearningMomentSchema`
- `LandscapeTransitionSchema`
- `LearningLandscapeSchema`
- `TeachingWindowSchema`
- `TimePlacementSchema`
- `TemporalPlanSchema`
- `PlanningBoardItemSchema`
- `MaterialSchema`

Entferne Zeitdaten aus `LearningLandscapeSchema`.

**Abnahme:**

- Typen entsprechen exakt den Kernel-Verträgen.
- Es gibt keine unabhängig erfundene App-Semantik.

## T-302 Legacy-LearningDesign entschärfen

Das bestehende App-`LearningDesignSchema` darf keine konkurrierenden kanonischen Listen mehr führen.

Mindestens:

- `learningJourney.phases` nicht unabhängig editierbar,
- `activities` nicht parallel zur Lernlandschaft pflegen,
- `nextSteps` nicht parallel zum Planungsboard pflegen,
- `materials` nur als abgeleitete Übersicht oder Kernel-Referenz.

Wähle eine der folgenden Strategien:

1. vollständig aus Kernel-Dateien ableiten,
2. als klar bezeichnetes Read Model behalten.

**Abnahme:**

- Kein Write-Pfad speichert doppelte pädagogische Semantik.

---

# Phase 4 – Codec und Persistenz

## T-400 Learning-Landscape-Codec erweitern

Der Codec muss vollständig lesen und schreiben:

- Lernmomente
- Lernaktivität
- erwartete Erfahrung
- Materialbedarfe
- Materialreferenzen
- offene Fragen
- Status
- Übergänge
- Übergangsbegründung

**Tests:**

- Parse-Test
- Serialize-Test
- Read-Write-Read-Roundtrip
- unbekannter Typ wird abgelehnt
- ungültige Referenz wird abgelehnt

## T-401 Temporal-Plan-Codec implementieren

Erstelle einen separaten Codec für `temporal-plan.yml`.

Er muss vollständig lesen und schreiben:

- Unterrichtsfenster
- Dauer
- Platzierungen
- Startzeit
- Dauer
- dramaturgische Rolle
- Modus
- Notiz

**Tests:**

- leeres Temporal Plan
- mehrere Fenster
- mehrfach platzierter Lernmoment
- parallele Platzierungen
- Wahlplatzierung
- ungültige Fensterreferenz
- ungültige Lernmomentreferenz
- Überbelegung

## T-402 Datenverlust-Test ergänzen

Erstelle einen Regressionstest für den bisher kritischen Fehler:

1. Temporal Plan laden.
2. Eine Platzierung ändern.
3. Speichern.
4. Neu laden.
5. Tiefengleichheit prüfen.

**Abnahme:**

- Kein Feld geht verloren.

## T-403 WorkspaceManager erweitern

Der WorkspaceManager muss:

- `temporal-plan.yml` anlegen,
- bestehende alte Zeitdaten migrieren,
- fehlende Dateien mit gültigen Defaults erzeugen,
- niemals bestehende Daten überschreiben.

**Abnahme:**

- Alte und neue Workspaces können geöffnet werden.

## T-404 API-Routen erweitern

Erweitere oder trenne die API für:

- Lernlandschaft
- Temporal Plan
- Planungsboard
- Materialien

Empfohlen:

```text
GET /planning-spaces/:id/learning-landscape
PUT /planning-spaces/:id/learning-landscape

GET /planning-spaces/:id/temporal-plan
PUT /planning-spaces/:id/temporal-plan

GET /planning-spaces/:id/planning-board
PUT /planning-spaces/:id/planning-board
```

**Abnahme:**

- Jede Route validiert serverseitig.
- Jede semantische Änderung erzeugt eine Git-Version.
- Layoutdaten bleiben getrennt.

---

# Phase 5 – Lernlandschaft in der App

## T-500 Lernmoment-Detailansicht implementieren

Ein Klick auf eine Node öffnet eine Detailansicht mit:

- Titel
- Typ
- didaktische Funktion
- Lernaktivität
- erwartete Lernerfahrung
- Materialbedarf
- Materialreferenzen
- offene Fragen
- Status
- zeitliche Platzierungen

Aktionen:

- `Mit Critical Friend weiterdenken`
- `Bearbeiten`
- `Materialbedarf als Arbeitsvorhaben`
- `Zeitlich einplanen`

**Abnahme:**

- Änderungen werden erst nach Speichern kanonisch.
- KI-Vorschläge sind als Vorschläge markiert.

## T-501 Lernmoment hinzufügen

Implementiere:

```text
+ Lernmoment hinzufügen
```

Minimaler Dialog:

- pädagogischer Typ
- Titel
- Funktion
- Lernaktivität
- erwartete Erfahrung

Zusätzliche Aktion:

```text
Mit Critical Friend entwickeln
```

**Abnahme:**

- Keine technische Feldsprache im Lehrkräfte-Modus.
- Node wird erst nach bewusster Bestätigung gespeichert.

## T-502 Übergangs-Detailansicht implementieren

Ein Klick auf eine Connection zeigt:

- Ausgangsmoment
- Zielmoment
- Übergangstyp
- pädagogische Begründung

Aktionen:

- bearbeiten
- entfernen
- mit Critical Friend prüfen
- fehlenden Lernmoment vorschlagen

**Abnahme:**

- Connection enthält keine vollständige Lernaktivität.
- Aus „fehlenden Lernmoment vorschlagen“ entsteht zunächst nur ein Vorschlag.

## T-503 Layout getrennt speichern

Node-Positionen, Gruppen und Viewport werden ausschließlich in:

```text
learning-landscape.layout.json
```

gespeichert.

**Abnahme:**

- Reines Verschieben erzeugt keine semantische Git-Version.
- Semantische Änderungen erzeugen eine Version.

---

# Phase 6 – Materialbedarf und Planungsboard

## T-600 Materialbedarf erfassen

Ermögliche in der Lernmoment-Detailansicht:

- Materialbedarf hinzufügen
- Materialbedarf bearbeiten
- Materialbedarf entfernen
- als Board-Karte vorschlagen

**Abnahme:**

- Materialbedarf allein startet keinen Worker.

## T-601 Board-Vorschlag erzeugen

Aus einem Materialbedarf kann eine Board-Karte vorgeschlagen werden.

Die Karte enthält:

- Titel
- Art
- Bezug zum Lernmoment
- optional Bezug zu einem Unterrichtsfenster
- erwartetes Ergebnis
- Freigabe erforderlich

**Abnahme:**

- Erst Lehrkraft-Zustimmung schreibt die Karte kanonisch.

## T-602 Board-Karten-Detailansicht

Zeige:

- Arbeitsvorhaben
- Bezüge
- Status
- Materialbedarf
- Service Request
- Worker-Ergebnisse
- Reviewstatus

Aktionen:

- im Gespräch klären
- Entwurf beauftragen
- Ergebnis prüfen
- freigeben
- verwerfen

**Abnahme:**

- Drag-and-drop zwischen Board-Spalten startet keinen Worker.
- `Entwurf beauftragen` erfordert explizite Aktion.

## T-603 Next-Steps vereinheitlichen

Die Seitenleiste zeigt genau eine priorisierte Board-Karte.

Entferne jede parallele kanonische Next-Step-Liste.

**Abnahme:**

- „Nächster Schritt“ ist immer eine Projektion des Planungsboards.

---

# Phase 7 – Zeit & Dramaturgie

## T-700 Temporal-Plan laden und speichern

Die Zeitansicht verwendet ausschließlich `temporal-plan.yml`.

**Abnahme:**

- Kein Zeitfeld kommt aus `learning-landscape.md`.
- Kein Zeitfeld wird nur im Browserzustand gehalten.

## T-701 Unterrichtsfenster verwalten

Implementiere:

- Unterrichtsfenster hinzufügen
- Titel ändern
- Typ ändern
- Dauer ändern
- Fenster löschen mit Sicherheitsprüfung

**Abnahme:**

- Ein Fenster mit Platzierungen kann nicht ohne Warnung gelöscht werden.

## T-702 Nicht platzierte Lernmomente anzeigen

Zeige alle Lernmomente ohne Platzierung in einer eigenen Ablage.

**Abnahme:**

- Die Liste ist aus Lernlandschaft und Temporal Plan abgeleitet.

## T-703 Drag-and-drop implementieren

Lernmomente können in Unterrichtsfenster gezogen werden.

Beim Drop entsteht eine neue `TimePlacement`.

Standardwerte:

- `start_minute`: nächster freier Zeitpunkt
- `duration_minutes`: Vorschlagswert, nicht automatisch kanonisch ohne Bestätigung
- `dramaturgical_role`: `other`
- `mode`: `common`

Öffne nach Drop einen kleinen Bestätigungsdialog.

**Abnahme:**

- Lernmoment wird nicht dupliziert.
- Lernlandschaft bleibt unverändert.
- Platzierung wird nach Bestätigung gespeichert.

## T-704 Reihenfolge und Dauer bearbeiten

Ermögliche:

- Startzeit ändern
- Dauer ändern
- Reihenfolge ändern
- dramaturgische Rolle ändern
- Modus ändern
- Platzierung entfernen

**Abnahme:**

- Alle Änderungen überstehen einen Reload.

## T-705 Parallelität und Wahl darstellen

Darstellung:

- `common`: volle Breite
- `parallel`: nebeneinander
- `choice`: alternative Spuren
- `individual` und `group`: klar beschriftet

Verlasse dich nicht ausschließlich auf Farbe.

**Abnahme:**

- Wahlphasen werden nicht als Pflichtreihenfolge dargestellt.

## T-706 Konflikte anzeigen

Erkenne:

- zeitliche Überlappung bei `common`
- Überschreitung der Fensterdauer
- fehlende Dauer
- unplatzierte zentrale Lernmomente
- Platzierung ohne gültige Referenz

**Abnahme:**

- Konflikte sind lehrkräfteverständlich formuliert.

## T-707 Stunden-Detailansicht implementieren

Für ein Unterrichtsfenster:

### Ansicht A

Visuelle Dramaturgie.

### Ansicht B

Tabellarischer Verlaufsplan mit:

- Zeit
- dramaturgische Funktion
- Lernaktivität
- erwartete Erfahrung
- Lehrkraftrolle
- Sozialform oder Modus
- Material
- Notiz

Felder ohne Kernel-Daten dürfen als optionale Platzierungsdetails ergänzt werden, nicht als unabhängige zweite Quelle.

**Abnahme:**

- Beide Ansichten bearbeiten dasselbe Temporal Plan.

---

# Phase 8 – Critical Friend und Vorschläge

## T-800 Kontextfokus vereinheitlichen

Auswählbare Kontexte:

- Lernmoment
- Übergang
- Unterrichtsfenster
- Platzierung
- Board-Karte
- Material

Der Fokus wird an den bestehenden Chat übergeben.

**Abnahme:**

- Es gibt nur einen Gesprächsverlauf.

## T-801 Lernmoment-Vorschlag implementieren

Der Critical Friend kann einen strukturierten Vorschlag erzeugen.

Der Vorschlag enthält:

- Begründung
- vorgeschlagenen Lernmoment
- erwartete Konsequenz
- mögliche Übergänge
- mögliche Zeitwirkung

Aktionen:

- Vorschau
- übernehmen
- im Gespräch ändern
- verwerfen

**Abnahme:**

- Ohne Übernehmen keine kanonische Änderung.

## T-802 Übergangs-Vorschlag implementieren

Analog zu T-801.

**Abnahme:**

- Kein stilles Ändern von Connections.

## T-803 Temporal-Plan-Vorschlag implementieren

Der Critical Friend darf eine Platzierung oder Zeitänderung vorschlagen.

**Abnahme:**

- Keine Zeitänderung ohne Lehrkraft-Zustimmung.

## T-804 Board-Vorschlag implementieren

Der Critical Friend schlägt höchstens ein priorisiertes Arbeitsvorhaben auf einmal vor.

**Abnahme:**

- Vorschlag ist noch kein Service Request.

---

# Phase 9 – Worker und Materialien

## T-900 Service Request an Board-Karte binden

Jeder Worker-Service-Request benötigt:

- `related_board_item`
- mindestens einen pädagogischen Bezug
- erwartetes Ergebnis
- Constraints
- Reviewbedarf

**Abnahme:**

- Kein globaler ungebundener Materialauftrag.

## T-901 Worker-Ergebnis zurückführen

Worker-Ergebnis erscheint:

- auf der Board-Karte,
- im Materialbereich,
- am zugehörigen Lernmoment.

Status zuerst:

```text
Entwurf zur Prüfung
```

**Abnahme:**

- Ergebnis wird nicht automatisch `ready_for_class`.

## T-902 Fachliche Freigabe implementieren

Freigabe erfordert:

- sichtbare Prüfung,
- bestätigende Aktion,
- dokumentierten Zeitpunkt,
- Referenz auf prüfende Person oder Rolle.

**Abnahme:**

- Kein Drag-and-drop kann diese Freigabe ersetzen.

---

# Phase 10 – Migration

## T-1000 Alte Zeitdaten migrieren

Beim ersten Öffnen eines alten Workspace:

1. Zeitdaten aus `learning-landscape.md` lesen.
2. `temporal-plan.yml` erzeugen.
3. Originaldaten sichern.
4. Lernlandschaft in neues Format schreiben.
5. Git-Version mit verständlicher Nachricht erzeugen.

**Abnahme:**

- Keine Zeitinformation geht verloren.
- Migration ist wiederholbar oder erkennt bereits migrierte Workspaces.

## T-1001 App-Legacy-Daten migrieren

Migriere oder mappe:

- `nextSteps` zu Board-Karten,
- App-Aktivitäten zu Lernmoment-Lernaktivitäten,
- App-Materialien zu Kernel-Materialmetadaten,
- App-Entscheidungen zu `decisions.yml`.

**Abnahme:**

- Keine stillen Löschungen.
- Nicht eindeutig migrierbare Daten werden als Review-Aufgabe markiert.

---

# Phase 11 – Tests

## T-1100 Kernel-Schema-Tests

Teste alle Beispiele gegen die dokumentierten Regeln.

## T-1101 Codec-Unit-Tests

Mindestens:

- Learning Landscape Roundtrip
- Temporal Plan Roundtrip
- Planning Board Roundtrip
- Materialmetadata Roundtrip

## T-1102 API-Integrationstests

Mindestens:

- Landschaft speichern und laden
- Temporal Plan speichern und laden
- ungültige Referenzen ablehnen
- Git-Version bei semantischer Änderung
- keine Git-Version bei Layoutänderung

## T-1103 E2E: Gespräch zu Lernmoment

Ablauf:

```text
Gespräch
→ Lernmoment-Vorschlag
→ Zustimmung
→ Node sichtbar
→ Reload
→ Node weiterhin vorhanden
```

## T-1104 E2E: Lernmoment zu Zeitfenster

Ablauf:

```text
Lernmoment
→ Drag-and-drop
→ Platzierung bestätigen
→ speichern
→ Reload
→ gleiche Position und Dauer
```

## T-1105 E2E: Materialbedarf zu Worker-Ergebnis

Ablauf:

```text
Materialbedarf
→ Board-Vorschlag
→ Zustimmung
→ Entwurf beauftragen
→ Worker-Ergebnis
→ Review
→ Freigabe
```

## T-1106 E2E: Board-Verschiebung startet nichts

Ablauf:

```text
Karte verschieben
→ kein Service Request
→ keine Worker-Ausführung
```

## T-1107 E2E: KI darf nicht still ändern

Prüfe Landschaft, Zeitplanung und Board.

---

# Phase 12 – Dokumentation und Abschluss

## T-1200 Kernel-Dokumentation abschließen

Dokumentiere:

- Artefakte
- Datenfluss
- Vorschlagslogik
- Worker-Grenze
- Migration
- Beispielworkspace

## T-1201 App-Dokumentation abschließen

Dokumentiere:

- Ableitung aus Kernel
- UI-Perspektiven
- Drag-and-drop-Semantik
- Materialworkflow
- bekannte Grenzen

## T-1202 Veraltete Dokumentation entfernen oder markieren

- Widersprüchliche Abschnitte korrigieren.
- Legacy-Dateien deutlich markieren.
- Keine zwei aktuellen Specs für denselben Sachverhalt behalten.

## T-1203 Abschlussprüfung

Führe aus:

- alle Unit-Tests
- alle Integrationstests
- alle E2E-Tests
- Typecheck
- Lint
- Build beider Repositories

Erstelle einen Abschlussbericht mit:

- geänderten Dateien
- Migrationen
- noch offenen Risiken
- Testergebnissen
- bekannten Einschränkungen

---

# Globale Definition of Done

- [ ] Kernel ist alleinige fachliche Quelle.
- [ ] App ist optionale Projektion.
- [ ] Lernmomente entstehen kontrolliert in Gespräch oder Lernlandschaft.
- [ ] Lernaktivitäten gehören zum Lernmoment.
- [ ] Connections bleiben Übergänge.
- [ ] Materialbedarf wird vom Material getrennt.
- [ ] Worker starten nur nach ausdrücklicher Freigabe.
- [ ] Zeitplanung liegt in `temporal-plan.yml`.
- [ ] Drag-and-drop erzeugt nur Platzierungen.
- [ ] Zeitdaten überstehen Read-Write-Read.
- [ ] Keine parallelen Next-Steps.
- [ ] Keine konkurrierenden Aktivitätenlisten.
- [ ] Keine ungebundenen Materialien.
- [ ] KI-Änderungen bleiben Vorschläge.
- [ ] Bestehende Workspaces sind migrierbar.
- [ ] Tests und Dokumentation sind vollständig.
