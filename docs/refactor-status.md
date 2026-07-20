# Refactoring-Status

Dieses Protokoll dokumentiert die Bearbeitung von `REFACTOR-TASKS.md`. Der
pädagogische Kernel bleibt die fachliche Quelle; Änderungen in der App werden
erst aus seinen Verträgen abgeleitet.

## 2026-07-18 - L4/L4a Materialbereich und Denkraum

### Umsetzung

- Der Materialbereich zeigt Materialart, Status, Entstehungs- und Prüfdatum,
  Entstehungsgrund, pädagogische Bezüge und eine lesbare Vorschau.
- Material kann aus derselben Ansicht atomar einem Lernmoment oder einem
  Arbeitsvorhaben zugeordnet werden; die Zuordnung wird in Materialmanifest,
  Lernlandschaft und Planungsboard gemeinsam gespeichert und bei Fehlern
  zurückgerollt.
- Die Hauptansicht priorisiert das Gespräch, bietet eingeklappte teacher-facing
  Raumzugänge, eine kompakte Pinnwand, Marker mit Rücksprung und Filter sowie
  eine nicht technische Hintergrundarbeitsleiste.
- Permanente Wahlkanten-Animation wurde entfernt. Bewegung ist reduziert
  abschaltbar; optionale Töne sind standardmäßig aus und die Funktionen bleiben
  ohne Illustration, Animation und Ton erreichbar.

### Geänderte Dateien

- `frontend/src/routes/+page.svelte`
- `frontend/src/routes/styles.css`
- `frontend/src/lib/api.ts`
- `backend/src/routes/thinkingState.ts`
- `backend/src/routes/roomOverview.ts`
- `backend/test/ConversationMarkerApi.test.ts`
- `TASKS.md`

Die bestehende Fremdänderung an `backend/learning-design.md` wurde nicht
angefasst.

### Tests und offene Abnahme

- `pnpm -r --workspace-concurrency=1 check`
- `pnpm -r --workspace-concurrency=1 build`
- `pnpm -r --workspace-concurrency=1 test` - 27 Testdateien, 125 Tests
- `git diff --check`
- Der Browser-Test konnte nicht ausgeführt werden: Es war keine Browser-Instanz
  verfügbar. Tastatur- und Screenreader-Abnahme bleiben deshalb offen.

Nächster freigegebener Bereich ist L5/L5a; er wird in diesem Durchlauf nicht
vorweggenommen.
## 2026-07-20 - L5/L5a geführter Arbeitsfluss und Review

### Umsetzung

- Critical-Friend-Vorschläge werden als persistentes, nicht-kanonisches Proposal-Read-Model gespeichert; ältere offene Vorschläge werden nachvollziehbar abgelöst.
- Das erste Häkchen erzeugt atomar Board-Karte, Service Request, Queue-Eintrag und Herkunftsmarker. Der Status bleibt über Reload und Polling sichtbar.
- Automatische Vorprüfung, Critical-Friend-Prüfung und Lehrkraftfreigabe werden getrennt gespeichert und im einzigen `Jetzt wichtig`-Gegenstand angezeigt.
- Das Ergebnis erscheint direkt zur fachlichen Prüfung; das zweite Häkchen setzt Material, Board und Request gemeinsam auf `ready_for_class` beziehungsweise `reviewed`.
- Der Stift setzt nur den Fokus im bestehenden Gespräch. Direkte Board-/Startaktionen aus dem Gespräch wurden entfernt; das Board bleibt Übersicht.
- Der Real-Harness-Review läuft in einer temporären Workspace-Kopie. Unerwartete Schreibversuche blockieren den Review und können den echten Denkraum nicht verändern.

### Tests und offene Abnahme

- `pnpm -r --workspace-concurrency=1 check` außerhalb der Sandbox: erfolgreich; Svelte-Check 0 Fehler und 0 Warnungen.
- `pnpm -r --workspace-concurrency=1 test` außerhalb der Sandbox: Shared 6 Tests, Backend 28 Testdateien/127 Tests, Frontend-Skript ohne Tests erfolgreich.
- `pnpm -r --workspace-concurrency=1 build` außerhalb der Sandbox: erfolgreich; nur bekannte generierte SvelteKit-/Chunkgrößen-Warnungen.
- `backend/test/OpenCodeDockerAdapter.test.ts`: 14 Tests einschließlich Review-Isolation bestanden; `git diff --check` ist sauber.
- Der lokale Real-Harness-Smoke-Test mit echtem Runtime-Prozess sowie Browser-, Tastatur- und Screenreader-Abnahme bleiben offen. Es ist keine Browserinstanz verfügbar.

### Noch offen

- L5 für strukturelle `LandscapeChangeProposal`-Vorschau und Canvas-Diff ist noch nicht abgeschlossen.
- Ein echter lokaler Runtime-Smoke-Test darf erst mit einem synthetischen Planungsraum und freigegebener Harness-Konfiguration erfolgen.
## 2026-07-17 – L0-Vertragsabgleich und Worker-Grenze

### Umsetzung

- `MaterialSchema` bildet jetzt die Kernel-Materialmetadaten ab: pädagogische Referenzen, `sourceRequest`, Reviewzeitpunkt und die Kernel-Statuswerte.
- Der Board-Material-Worker erhält validiert das Arbeitsvorhaben, erwartete Ergebnis, Zielgruppe und die Beschreibungen der verknüpften Lernmomente.
- Board-Karten und Lernmomente werden vor dem Anlegen eines Materialauftrags im selben Planungsraum geprüft.
- Der Real-Harness prüft den Capability-Vertrag `CREATE_BOARD_MATERIAL.md`; der Frontend-Typ für die automatische Vorprüfung ist ergänzt.

### Tests

- Shared-Domain: 6 Tests bestanden.
- Backend gezielt: 23 Tests bestanden.
- Backend vollständig: 25 Testdateien / 117 Tests bestanden.
- Shared-, Backend- und Frontend-Typecheck bestanden.

### Offene Einschränkung und nächster Task

- `F:\code\pedagogical-thinking-space\capabilities\workers\CREATE_BOARD_MATERIAL.md` liegt im gekoppelten Kernel-Repository als unversionierte Fremdänderung vor und wurde nicht verändert.
- Nach Klärung und Versionierung des Kernel-Vertrags folgt als nächster L0-Schritt die verlustfreie Abbildung bestehender `service-requests/` als Board-Karten; danach werden ungültige Landschafts-, Kanten- und Materialreferenzen serverseitig abgelehnt.
## Phase 0 – Bestand sichern

### T-000 Repository-Zustand prüfen

- **Default-Branch:** Beide Repositories verwenden aktuell `main`.
- **Ausgangszustand:** `pedagogical-thinking-space` ist sauber. In
  `ptspace-app` waren vor dem Refactoring bereits `AGENTS.md` geändert sowie
  `REFACTOR-AGENTS.md`, `REFACTOR-GOAL.md` und `REFACTOR-TASKS.md` unversioniert.
  Diese Dateien wurden nicht verändert.
- **Kernel-Prüfung:** `python scripts/check_repo.py` schlägt im Ausgangszustand
  fehl. Der Prüfer durchsucht `.opencode/node_modules` und meldet dadurch sechs
  fremde README-Verweise; zusätzlich fehlt im Service-Request-Schema die vom
  Prüfer erwartete Zeichenfolge `knowledge_output`.
- **App-Tests:** `pnpm test` ist erfolgreich: 37 Tests bestanden. Der
  Sandbox-Lauf konnte wegen `spawn EPERM` keinen Testprozess starten; außerhalb
  der Sandbox war der Lauf erfolgreich.
- **App-Typecheck und Build:** `pnpm check` und `pnpm build` sind erfolgreich.
  Der Build meldet Svelte-Hinweise in generiertem Code sowie ein Client-Chunk
  über 500 kB, ohne den Build zu verhindern.

### T-001 Relevante Kernel-Verträge erfassen

Gelesen wurden: `README.md`, `LEARNING_DESIGN.md`,
`specs/LEARNING_DESIGN_SCHEMA.md`, `specs/LEARNING_LANDSCAPE_SCHEMA.md`,
`specs/PLANNING_BOARD_SCHEMA.md`, `specs/SERVICE_REQUEST_SCHEMA.md`,
`ORCHESTRATION.md`, `services/WORKER.md` und `services/KNOWLEDGE.md`.

Aktuell kanonisch beschrieben sind `learning-design.md`,
`learning-landscape.md`, `planning-board.yml`, Materialordner und der
Service-Request-Workflow. Der aktuelle Kernel hat noch keine kanonische
`temporal-plan.yml`; Zeitfenster und Platzierungen stehen entgegen dem
Refactoring-Ziel noch im Lernlandschaftsschema. Außerdem führt das
Learning-Design-Schema Lernmomente, Aktivitäten und Materialien als eigene
Abschnitte, die nach dem Zielmodell nur noch übergeordnete bzw. abgeleitete
Sichten sein dürfen.

### Nächste Aufgabe

T-100: Kernel-Quellen der Wahrheit vereinheitlichen. Dafür sind Änderungen im
Repository `pedagogical-thinking-space` erforderlich.

## Phase 3 – App-Domain aus Kernel ableiten

### T-302 Legacy-LearningDesign entschärfen

Gewählte Strategie: **klar bezeichnetes Read Model** (Variante 2). Das App-seitige
`LearningDesignSchema` führt keine konkurrierenden kanonischen Listen mehr.

- **Entfernt aus `LearningDesignSchema`** (`packages/shared/src/index.ts`):
  `learningJourney.phases`, `activities` und `materials`. Diese Listen waren
  parallele Kanoniken zu `learning-landscape.md` (Lernmomente/Lernaktivitäten)
  und `materials/` (Materialien). Übrig bleibt die narrative Rahmung: `context`,
  `intention`, `learningJourney` (nur `startingPoint` + `turningPoints`) und
  `reflection`. Ein Doc-Kommentar markiert das Schema explizit als abgeleitetes
  Read Model der Datei `learning-design.md`.
- **`createEmptyLearningDesign`** entsprechend angepasst (keine `phases`,
  `activities`, `materials` mehr).
- **`PlanningSpaceSchema`**: `openQuestions`, `decisions`, `nextSteps` und
  `materials` sind mit einem Doc-Kommentar als Read-Model-Projektionen der
  Kernel-Dateien (`open-questions.md`, `decisions.yml`, `planning-board.yml`,
  `materials/`) gekennzeichnet.
- **`PlanningSpaceStore.create`**: Das parallele kanonische Seeding von
  `nextSteps` ("Lernanliegen klären") wurde entfernt. Neue Räume starten mit
  `nextSteps: []`; der nächste Schritt ist ausschließlich eine Projektion von
  `planning-board.yml` (siehe `thinking-state`-Route).

Kein Schreibpfad speichert damit doppelte pädagogische Semantik. `store.save`
wird ohnehin nirgends aufgerufen, und `PlanningSpaceStore.readAll` liest ohne
Zod-Parse (reiner Cast) – bestehende `planning-spaces.json`-Daten mit alten
Feldern bleiben verlustfrei erhalten und werden nicht überschrieben.

**Nebenbefund (T-301-Überbleibsel behoben):** `backend/src/routes/roomOverview.ts`
verwies noch auf das in T-301 aus `LearningLandscapeSchema` entfernte
`landscape.teachingWindows` und brach Typecheck/Build (`pnpm dev` Exit 1). Der
Fortschrittsschritt „Unterricht planen“ stützt sich bis zur Temporal-Plan-
Anbindung (T-700) nun auf `planning-board.yml`.

**Geänderte Dateien:**

- `packages/shared/src/index.ts`
- `backend/src/storage/PlanningSpaceStore.ts`
- `backend/src/routes/roomOverview.ts`
- `backend/test/ServiceRequestWorkflow.test.ts`

**Tests:** `pnpm --filter @ptspace/shared build`, Typecheck (Shared + Backend),
`pnpm --filter @ptspace/frontend check` (0 Fehler) und `pnpm -r test`
(Shared 4, Backend 33 Tests) erfolgreich.

### Nächste Aufgabe

T-400: Learning-Landscape-Codec erweitern (Phase 4 – Codec und Persistenz).

## Phase 4 – Codec und Persistenz

Zur Vervollständigung der Kernel-Verträge (T-301/T-102) wurden im Shared-Schema
zwei fehlende Lernmomentfelder ergänzt (`materialNeeds`, `status`) und der
Übergang von `note` auf `rationale` umgestellt.

### T-400 Learning-Landscape-Codec erweitern

- `parseLearningLandscape`/`serializeLearningLandscape`
  (`backend/src/services/planning/PlanningArtifactCodec.ts`) lesen und schreiben
  nun vollständig: Materialbedarf (`- Materialbedarf:`), Materialreferenzen,
  offene Fragen (`- Offene Fragen:` als `;`-Liste), Status (`- Status:`) und die
  Übergangsbegründung (drittes Pipe-Segment).
- Frontend-Typen (`frontend/src/lib/api.ts`) an `materialNeeds`, `status` und
  `rationale` angepasst.
- Tests: `backend/test/LearningLandscapeCodec.test.ts` (Parse, Serialize,
  Read-Write-Read-Roundtrip, unbekannter Typ → `other`, ungültige
  Übergangsreferenz abgelehnt, unbekannte Schemaversion abgelehnt).

### T-401 Temporal-Plan-Codec implementieren

- Neuer Codec `backend/src/services/planning/TemporalPlanCodec.ts`
  (`parseTemporalPlan`, `serializeTemporalPlan`, `assertInternalConsistency`,
  `assertTemporalPlanReferences`, `emptyTemporalPlan`). Handgeschriebener
  YAML-Subset-Parser (keine Laufzeitabhängigkeit).
- Validierung: eindeutige Fenster-/Platzierungs-IDs, bekannte Fensterreferenz,
  keine negativen Minuten (Schema), `start + duration <= window.duration`
  (Überbelegung), Lernmomentreferenz gegen die Landschaft.
- Tests: `backend/test/TemporalPlanCodec.test.ts` (leerer Plan, mehrere Fenster,
  mehrfach platzierter Lernmoment, parallele/Wahl-Platzierung, ungültige
  Fenster-/Lernmomentreferenz, Überbelegung, Roundtrip).

### T-402 Datenverlust-Regressionstest

- In `TemporalPlanCodec.test.ts`: Platzierung ändern → serialisieren → neu laden
  → Tiefengleichheit (`toEqual`). Kein Feld geht verloren.

### T-403 WorkspaceManager erweitern

- `WorkspaceManager.ensureWorkspace` legt `temporal-plan.yml` mit gültigem leerem
  Default an (`writeIfMissing`, überschreibt nie).
- Behobener Altbug: `planningBoardTemplate` schrieb literales `` `nitems `` statt
  Zeilenumbrüche; jetzt gültiges `schema: …\nitems: []`.

### T-404 API-Routen erweitern

- Neue Funktion `planningArtifactResourceRoutes`
  (`backend/src/routes/planningArtifacts.ts`) mit getrennten, serverseitig
  validierten Routen: `GET/PUT /planning-spaces/:id/learning-landscape`,
  `.../temporal-plan`, `.../planning-board`. Jede semantische Änderung erzeugt
  eine Git-Version; die Layout-Route bleibt versionsfrei getrennt.
- Temporal-Plan-PUT validiert Referenzen gegen die aktuelle Landschaft und die
  interne Konsistenz (Serialize+Reparse), Fehler → 422.
- In `app.ts` registriert. Frontend nutzt `temporal-plan` in der Zeitansicht
  (`frontend/src/routes/+page.svelte`), entkoppelt von der Lernlandschaft.
- Tests: `backend/test/PlanningArtifactResourceApi.test.ts` (Landschaft
  speichern/laden inkl. Git-Version, Temporal Plan speichern/laden, ungültige
  Referenz → 422, Layoutänderung erzeugt keine Git-Version).

**Geänderte/neue Dateien (Phase 4):** `packages/shared/src/index.ts`,
`backend/src/services/planning/PlanningArtifactCodec.ts`,
`backend/src/services/planning/TemporalPlanCodec.ts` (neu),
`backend/src/services/workspace/WorkspaceManager.ts`,
`backend/src/routes/planningArtifacts.ts`, `backend/src/app.ts`,
`frontend/src/lib/api.ts`, `frontend/src/routes/+page.svelte`,
`backend/test/LearningLandscapeCodec.test.ts` (neu),
`backend/test/TemporalPlanCodec.test.ts` (neu),
`backend/test/PlanningArtifactResourceApi.test.ts` (neu).

**Tests:** `pnpm -r test` (Shared 4, Backend 53), `pnpm --filter
@ptspace/frontend check` (0 Fehler), `pnpm -r build` erfolgreich.

### Nächste Aufgabe

T-500: Lernmoment-Detailansicht (Phase 5 – Lernlandschaft in der App).

## Phase 5 – Lernlandschaft in der App

Alle Detailansichten liegen in `frontend/src/routes/+page.svelte` als Dialoge
über der Perspektive „Lernlandschaft“. Änderungen werden erst nach dem Speichern
kanonisch (`api.savePlanningArtifacts` → Git-Version); reine Node-Bewegungen
bleiben über den getrennten Layout-Endpunkt versionsfrei.

### T-500 Lernmoment-Detailansicht

- Klick auf eine Node öffnet ein Detail-Modal mit Titel, pädagogischem Typ,
  didaktischer Funktion, Lernaktivität, erwarteter Lernerfahrung, Materialbedarf,
  offenen Fragen, Status und den zeitlichen Platzierungen (aus `temporal-plan.yml`).
- Aktionen: „Mit Critical Friend weiterdenken“, „Bearbeiten“ (Formular mit
  Entwurf, kanonisch erst bei „Änderung festhalten“), „Zeitlich einplanen“
  (öffnet die Zeit-Perspektive) und je Materialbedarf „Als Arbeitsvorhaben
  vorschlagen“.

### T-501 Lernmoment hinzufügen

- Button „Lernmoment hinzufügen“ öffnet einen Dialog mit pädagogischem Typ,
  Titel, Funktion, Lernaktivität und erwarteter Erfahrung (lehrkräftefreundliche
  Beschriftungen). Zusatzaktion „Mit Critical Friend entwickeln“ übergibt den
  Gedanken an das Gespräch. Die Node wird erst nach „Lernmoment aufnehmen“
  gespeichert; eine neue `id` wird lokal vergeben.

### T-502 Übergangs-Detailansicht

- Klick auf eine Connection öffnet ein Modal mit Ausgangs-/Zielmoment,
  Übergangstyp und pädagogischer Begründung. Aktionen: bearbeiten, entfernen,
  „Mit Critical Friend prüfen“ und „Fehlenden Lernmoment vorschlagen“ (beides
  zunächst nur ein Gesprächsimpuls, keine kanonische Änderung).

### T-503 Layout getrennt speichern

- Node-Positionen laufen weiterhin ausschließlich über
  `learning-landscape.layout.json` (`onnodedragstop` → Layout-Endpunkt, keine
  Git-Version). Semantische Änderungen erzeugen dagegen eine Version. Damit
  bereits durch die Trennung aus Phase 4 erfüllt.

## Phase 6 – Materialbedarf und Planungsboard

### T-600 Materialbedarf erfassen

- In der Lernmoment-Detailansicht können Materialbedarfe im Bearbeitungsformular
  hinzugefügt und entfernt werden; im Lesemodus lässt sich jeder Bedarf einzeln
  „Als Arbeitsvorhaben vorschlagen“. Ein Materialbedarf allein startet keinen
  Worker.

### T-601 Board-Vorschlag erzeugen

- Aus einem Materialbedarf entsteht ein Vorschlagsdialog mit Titel, Art,
  erwartetem Ergebnis und optionalem Unterrichtsfenster-Bezug. Erst „Ins
  Planungsboard aufnehmen“ schreibt die Karte kanonisch (Spalte `clarify`,
  Status `proposed`, `requiresTeacherApproval: true`). Dafür wurden
  `materialNeed` und `expectedResult` in `PlanningBoardItemSchema`, im Codec
  (`material_need`, `expected_result`) und im Frontend-Typ ergänzt.

### T-602 Board-Karten-Detailansicht

- Klick auf eine Board-Karte öffnet ein Detail-Modal mit Status, erwartetem
  Ergebnis, Materialbedarf, Bezügen und Freigabehinweis. Aktionen: „Im Gespräch
  klären“, „Entwurf beauftragen“ (ausdrückliche Aktion → Spalte `prepare`,
  Status `in_progress`, plus Gesprächsimpuls), „Ergebnis prüfen“, „Freigeben“
  und „Verwerfen“. Drag-and-drop zwischen Spalten ändert nur die Spalte und
  startet keinen Worker.

### T-603 Next-Steps vereinheitlichen

- `thinking-state` liest `next-steps.md` nicht mehr als Quelle der Karte
  „Nächste Schritte“; die Karte ist ausschließlich eine Projektion von
  `planning-board.yml` und zeigt genau ein priorisiertes Arbeitsvorhaben
  (`boardSteps.slice(0, 1)`). Die Legacy-Datei bleibt erhalten und durchsuchbar.

**Geänderte/neue Dateien (Phase 5 & 6):** `packages/shared/src/index.ts`,
`backend/src/services/planning/PlanningArtifactCodec.ts`,
`backend/src/routes/thinkingState.ts`, `backend/test/PlanningArtifactCodec.test.ts`,
`frontend/src/lib/api.ts`, `frontend/src/routes/+page.svelte`,
`frontend/src/routes/styles.css`.

**Tests:** `pnpm --filter @ptspace/backend test` (54 Tests), `pnpm --filter
@ptspace/frontend check` (0 Fehler, 0 Warnungen), `pnpm -r build` erfolgreich.

### Nächste Aufgabe

T-700: Temporal-Plan laden und speichern (Phase 7 – Zeit & Dramaturgie).

## Phase 7 – Zeit & Dramaturgie

Die Zeitansicht in `frontend/src/routes/+page.svelte` verwendet ausschließlich
`temporal-plan.yml` (Laden/Speichern über die bestehende `temporal-plan`-Route
aus Phase 4). Die Lernlandschaft bleibt unverändert; Platzierungen werden nur
nach ausdrücklicher Bestätigung geschrieben.

### T-700 Temporal-Plan laden und speichern

- `persistTemporalPlan` speichert jede semantische Änderung über
  `api.saveTemporalPlan`. Kein Zeitfeld kommt aus `learning-landscape.md` oder
  wird nur im Browserzustand gehalten.

### T-701 Unterrichtsfenster verwalten

- Dialog „Unterrichtsfenster hinzufügen/bearbeiten“ (Titel, Art, Dauer, Notiz);
  bei neuer Art wird die typische Dauer vorgeschlagen. Löschen eines Fensters mit
  Platzierungen erfordert eine Sicherheitsbestätigung (`windowDeleteConfirm`); die
  Lernmomente selbst bleiben erhalten.

### T-702 Nicht platzierte Lernmomente anzeigen

- Ablage „noch nicht eingeplant“ (`unplacedMoments`), abgeleitet aus Lernlandschaft
  und Temporal Plan. Ein Hinweis zählt die noch nicht eingeplanten Momente.

### T-703 Drag-and-drop

- Lernmomente lassen sich aus der Ablage in ein Fenster ziehen. Beim Drop öffnet
  ein Bestätigungsdialog mit Startminute, Dauer, dramaturgischer Rolle und Modus;
  Standardwerte werden vorgeschlagen. Erst „Platzierung speichern“ legt die
  `TimePlacement` an. Der Lernmoment wird nicht dupliziert, die Lernlandschaft
  bleibt unverändert.

### T-704 Reihenfolge und Dauer bearbeiten

- Platzierungs-Editor (`placementDraft`): Fenster, Startminute, Dauer,
  dramaturgische Rolle, Modus, Notiz ändern sowie Platzierung entfernen. Alle
  Änderungen überstehen einen Reload (Persistenz über `temporal-plan.yml`).

### T-705 Parallelität und Wahl darstellen

- Platzierungsblöcke tragen einen Modus-Tag und eine modusabhängige Rahmung
  (`common`, `parallel`, `choice`, `individual`, `group`). Die Unterscheidung
  nutzt Form und Beschriftung, nicht nur Farbe.

### T-706 Konflikte anzeigen

- `windowConflicts` erkennt fehlende Dauer, Überschreitung der Fensterdauer,
  zeitliche Überlappung gemeinsamer Momente und ungültige Referenzen. `timelineNotices`
  weist auf nicht platzierte Lernmomente hin. Meldungen sind lehrkräfteverständlich.

### T-707 Stunden-Detailansicht

- Klick auf den Fenstertitel öffnet die Stunden-Detailansicht mit visueller
  Dramaturgie (proportionale Slots) und tabellarischem Verlaufsplan (Zeit,
  Funktion, Lernaktivität, Modus). Beide Ansichten bearbeiten dasselbe Temporal
  Plan; ein Klick auf eine Tabellenzeile öffnet den Platzierungs-Editor.

## Phase 8 – Critical Friend und Vorschläge

### T-800 Kontextfokus vereinheitlichen

- Es bleibt bei einem Gesprächsverlauf. Ein wählbarer Fokus
  (Lernmoment, Übergang, Unterrichtsfenster, Platzierung, Arbeitsvorhaben,
  Material) wird als Chip über dem Composer angezeigt, an `sendMessage` übergeben
  und im Backend (`conversation.ts`) in den Kontext des Harness aufgenommen.

### T-801–T-804 Strukturierte Vorschläge

- Neuer Backend-Dienst `ProposalService` (`backend/src/services/proposals/`) und
  Route `POST /planning-spaces/:id/proposals`. Der Critical Friend erzeugt einen
  strukturierten, deterministisch aus dem Denkstand abgeleiteten Vorschlag für
  Lernmoment (mit Begründung, erwarteter Konsequenz, möglichen Übergängen und
  Zeitwirkung), Übergang, zeitliche Platzierung oder genau ein Arbeitsvorhaben.
- Die Route schreibt nichts kanonisch. Im Frontend zeigt ein Vorschau-Modal die
  Aktionen „Übernehmen“, „Im Gespräch ändern“ und „Verwerfen“. Erst „Übernehmen“
  schreibt über die bestehenden Artefakt-Routen (Lernlandschaft, Temporal Plan,
  Planungsboard). Keine Zeit- oder Landschaftsänderung ohne Zustimmung; ein
  Vorschlag ist noch kein Service Request.

## Phase 9 – Worker und Materialien

### T-900 Service Request an Board-Karte binden

- `ServiceRequestWorkflow.proposeBoardMaterial` bindet jeden Worker-Auftrag an
  eine Board-Karte (`boardItemId`), mindestens einen pädagogischen Bezug
  (`relatedMoments`), ein erwartetes Ergebnis und `reviewRequired: true`. Fehlt
  der Bezug, wird der Auftrag abgelehnt (kein globaler ungebundener Auftrag). Neue
  Capability `create_board_material`; Route
  `POST /planning-spaces/:id/service-requests/board-material`.

### T-901 Worker-Ergebnis zurückführen

- „Entwurf beauftragen“ auf der Board-Karte erzeugt und startet den gebundenen
  Auftrag. Das Ergebnis erscheint als Materialreferenz auf der Karte, im
  Materialbereich und am zugehörigen Lernmoment (`materialIds`). Der Status bleibt
  „Entwurf zur Prüfung“; die Karte wandert in die Spalte „Zur Prüfung“ und wird
  nicht automatisch `ready_for_class`.

### T-902 Fachliche Freigabe

- „Freigeben“ öffnet einen Bestätigungsdialog mit sichtbarer Prüfung (Entwurf
  ansehen), einer bestätigenden Aktion (Checkbox) und dokumentiert Zeitpunkt
  (`reviewedAt`) sowie prüfende Rolle (`reviewedBy`). Erst danach wird die Karte
  `ready`. Drag-and-drop kann diese Freigabe nicht ersetzen (Spaltenwechsel ändert
  nur die Spalte). `PlanningBoardItemSchema` und der Codec wurden um
  `serviceRequestId`, `reviewedAt`, `reviewedBy` erweitert.

**Geänderte/neue Dateien (Phase 7–9):** `packages/shared/src/index.ts`,
`backend/src/routes/conversation.ts`, `backend/src/routes/proposals.ts` (neu),
`backend/src/routes/serviceRequests.ts`, `backend/src/app.ts`,
`backend/src/services/proposals/ProposalService.ts` (neu),
`backend/src/services/serviceRequests/ServiceRequestWorkflow.ts`,
`backend/src/services/harness/MockHarnessAdapter.ts`,
`backend/src/services/planning/PlanningArtifactCodec.ts`,
`frontend/src/lib/api.ts`, `frontend/src/routes/+page.svelte`,
`frontend/src/routes/styles.css`,
`backend/test/ProposalService.test.ts` (neu),
`backend/test/ProposalApi.test.ts` (neu),
`backend/test/ServiceRequestWorkflow.test.ts`,
`backend/test/PlanningArtifactCodec.test.ts`.

**Tests:** `pnpm -r test` (Shared 4, Backend 66), `pnpm --filter
@ptspace/frontend check` (0 Fehler, 0 Warnungen), `pnpm -r build` erfolgreich.

### Nächste Aufgabe

T-1000: Alte Zeitdaten migrieren (Phase 10 – Migration).

## Phase 10 – Migration

### Relevanzbewertung (Ergebnis: kein realer Migrationslauf erforderlich)

Vor der Umsetzung wurde der Bestand geprüft:

- **Kein persistiertes Alt-Zeitformat.** In keinem Workspace existiert eine
  `learning-landscape.md` mit `teaching_windows:`/`placements:`. Zeitfenster und
  Platzierungen wurden nie in die Lernlandschaft geschrieben; sie leben seit
  Phase 4 kanonisch in `temporal-plan.yml`. T-1000 hat damit keine zu
  extrahierenden Zeitdaten (kein spekulativer Parser für ein nie erzeugtes Format).
- **Keine echten Laufzeit-Workspaces.** Das Laufzeitverzeichnis
  (`<runtimeRoot>/workspace`) existiert nicht. Die Ordner unter
  `backend/workspaces/space-<uuid>/project/` und `workspaces/` stammen aus einem
  obsoleten UUID+`project/`-Layout und werden vom aktuellen (slug-basierten) Code
  nicht mehr gelesen.
- **App-Legacy-Listen bereits als Read Model behandelt.** `activities`,
  `materials`, `decisions`, `learningJourney.phases` und `nextSteps` sind in
  `planning-spaces.json` leer bzw. Vorlage und wurden in T-302 als klar
  bezeichnete Read-Model-Projektionen entschärft. Es gibt keinen Schreibpfad, der
  daraus doppelte Semantik erzeugt.

### T-1000 / T-1001 / T-403 – umgesetzte Garantie statt Datentransformation

Die eigentliche Anforderung „bestehende Workspaces sind migrierbar“ ist durch die
Öffnungslogik aus T-403 bereits erfüllt: `WorkspaceManager.ensureWorkspace` legt
fehlende kanonische Artefakte (`temporal-plan.yml`, `planning-board.yml`,
`learning-landscape.md`) mit gültigen, leeren Defaults an (`writeIfMissing`) und
überschreibt **nie** vorhandene Dateien. Ein alter Workspace wird damit beim
Öffnen verlustfrei in das aktuelle Format überführt.

Diese Garantie ist jetzt durch einen Regressionstest abgesichert
(`backend/test/WorkspaceMigration.test.ts`):

- Ein vorbefüllter Legacy-Workspace (nur `learning-design.md`, `next-steps.md`,
  `decisions.md`, `open-questions.md`) erhält beim Öffnen valide neue Artefakte;
  keine Legacy-Datei wird überschrieben (keine stille Löschung).
- Wiederholbarkeit: Ein zweiter Öffnungsvorgang verändert keine Datei
  (bereits-migriert-Erkennung über die Existenzprüfung).
- Eine bereits vorhandene Lernlandschaft samt Lernmoment bleibt unverändert und
  wird um einen gültigen, leeren `temporal-plan.yml` ergänzt (Zeitdaten getrennt).

Für den unwahrscheinlichen Fall, dass künftig doch ein Workspace mit
Alt-Zeitdaten auftaucht, gilt die Migrationsregel aus
`docs/refactor-domain-inventory.md`: Legacy-Daten bleiben lesbar, nicht eindeutig
überführbare Daten werden als Review-Aufgabe markiert, nichts wird gelöscht.

## Phase 11 – Tests

### T-1100 Kernel-Schema-Tests

Der pädagogische Kernel (`pedagogical-thinking-space`) ist ein eigenes Repository
und in diesem Workspace nicht eingebunden. Die Kernel-Schema-Tests gehören dorthin
und werden hier nicht dupliziert. Die App-seitigen Schemas (`packages/shared`)
sind über Codec- und API-Tests abgedeckt.

### T-1101 Codec-Unit-Tests

- Learning-Landscape-Roundtrip: `backend/test/LearningLandscapeCodec.test.ts` und
  `PlanningArtifactCodec.test.ts`.
- Temporal-Plan-Roundtrip: `backend/test/TemporalPlanCodec.test.ts`.
- Planning-Board-Roundtrip: `backend/test/PlanningArtifactCodec.test.ts`.
- **Materialmetadaten-Roundtrip (neu):** `packages/shared/test/domain.test.ts`
  prüft, dass `MaterialSchema` einen JSON-Roundtrip verlustfrei übersteht und
  unbekannte `status`/`kind`-Werte ablehnt.

### T-1102 API-Integrationstests

Abgedeckt durch `backend/test/PlanningArtifactResourceApi.test.ts`:

- Lernlandschaft speichern und laden (inkl. Git-Version).
- Temporal Plan speichern und laden; ungültige Lernmomentreferenz → 422.
- **Git-Version bei semantischer Planungsboard-Änderung (neu):** `version.committed`
  ist wahr und die Versionsliste wächst.
- Keine Git-Version bei reiner Layoutänderung.

### T-1103–T-1107 E2E-Flüsse

Es existiert keine Browser-E2E-Umgebung (nur eine `playwright`-Abhängigkeit, kein
Setup). Die verbindlichen Refactoring-Garantien liegen im Backend, deshalb werden
die Abläufe deterministisch über die HTTP-Routen geprüft
(`backend/test/RefactorFlows.e2e.test.ts`):

- **T-1103** Gespräch → Lernmoment-Vorschlag → Zustimmung → Reload: Der Vorschlag
  ändert nichts; erst das Übernehmen (`PUT learning-landscape`) macht den
  Lernmoment kanonisch, der Reload zeigt ihn weiterhin.
- **T-1104** Lernmoment → Platzierung speichern → Reload: Startminute und Dauer
  überstehen den Reload identisch.
- **T-1105** Materialbedarf → Board-Karte → Materialauftrag → Ergebnis → Review →
  Freigabe: Das Worker-Ergebnis kommt als `review_needed` zurück, die Freigabe
  dokumentiert Zeitpunkt und prüfende Rolle.
- **T-1106** Reine Board-Verschiebung erzeugt keinen Service Request und keine
  Worker-Ausführung (Service-Request-Liste bleibt leer).
- **T-1107** Vorschläge (Lernmoment, Übergang, Platzierung, Arbeitsvorhaben) ändern
  Landschaft, Zeitplanung und Board nicht ohne Zustimmung.

**Neue Testdateien (Phase 10–11):** `backend/test/WorkspaceMigration.test.ts`,
`backend/test/RefactorFlows.e2e.test.ts`, Ergänzungen in
`backend/test/PlanningArtifactResourceApi.test.ts` und
`packages/shared/test/domain.test.ts`.

## Phase 12 – Dokumentation und Abschluss

### T-1200 Kernel-Dokumentation

Kernel-seitig; gehört in `pedagogical-thinking-space` und ist hier nicht
anwendbar. Die App-Ableitung ist in `docs/learning-landscape-and-board.md` und im
Domain-Inventar (`docs/refactor-domain-inventory.md`) beschrieben.

### T-1201 App-Dokumentation

Die App-Ableitung aus dem Kernel, die UI-Perspektiven, die Drag-and-drop-Semantik
(erzeugt nur Platzierungen bzw. Spaltenwechsel, nie Worker) und der Materialworkflow
sind in `docs/learning-landscape-and-board.md`, `docs/service-workflow.md` und
`docs/ui-language.md` dokumentiert. Bekannte Grenzen: keine Browser-E2E-Suite,
Kernel-Repository getrennt, Legacy-Read-Models bleiben lesbar.

### T-1202 Veraltete Dokumentation

`docs/refactor-domain-inventory.md` bleibt die maßgebliche Legacy-/Kanonisch-Tabelle.
Es gibt keine zwei konkurrierenden aktuellen Specs für denselben Sachverhalt; die
Zeitdaten sind eindeutig `temporal-plan.yml` zugeordnet.

### T-1203 Abschlussprüfung

- **Unit-/Integrations-/E2E-Tests:** `pnpm -r test` – Shared 6, Backend 75, alle
  grün.
- **Typecheck:** `pnpm -r check` – Frontend 0 Fehler / 0 Warnungen; Backend und
  Shared fehlerfrei.
- **Build:** `pnpm -r build` erfolgreich (nur bekannte Svelte-Hinweise im
  generierten SvelteKit-Code, keine Fehler).

**Geänderte/neue Dateien:** siehe Phase-10/11-Testdateien oben sowie dieses
Statusprotokoll.

**Migrationen:** Keine Datentransformation nötig (siehe Phase-10-Relevanzbewertung);
die Öffnungsgarantie ist getestet.

**Offene Risiken / bekannte Einschränkungen:**

- Kernel-Schema-Tests (T-1100) und Kernel-Dokumentation (T-1200) liegen im
  getrennten Kernel-Repository.
- Keine Browser-E2E-Suite; die E2E-Garantien werden auf API-Ebene geprüft.
- Legacy-Read-Models (`nextSteps`, `decisions`, `activities`, `materials`) bleiben
  lesbar, werden aber nicht mehr kanonisch geschrieben.
