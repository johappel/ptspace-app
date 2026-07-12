# Refactoring-Status

Dieses Protokoll dokumentiert die Bearbeitung von `REFACTOR-TASKS.md`. Der
pädagogische Kernel bleibt die fachliche Quelle; Änderungen in der App werden
erst aus seinen Verträgen abgeleitet.

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
