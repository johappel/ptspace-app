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

