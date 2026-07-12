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
