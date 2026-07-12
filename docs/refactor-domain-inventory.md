# Domain-Inventar für den Kernel-Refactor

| App-Feld | Einordnung nach Refactor | Kanonische Quelle / Ziel |
| --- | --- | --- |
| `LearningDesign.learningJourney.phases` | Legacy | Lernmomente in `learning-landscape.md`; nur abgeleitete Anzeige zulässig |
| `LearningDesign.activities` | Legacy | `learning_activity` innerhalb eines Lernmoments |
| `LearningDesign.materials` | Legacy Read Model | Materialmetadaten und Referenzen im Workspace |
| `PlanningSpace.decisions` | Legacy Read Model | `decisions.yml` |
| `PlanningSpace.nextSteps` | Legacy Read Model | priorisierte Projektion von `planning-board.yml` |
| `PlanningSpace.materials` | Legacy Read Model | `materials/` mit Metadaten |
| `LearningLandscape.teachingWindows` | Legacy, zu entfernen | `temporal-plan.yml` |
| `LearningLandscape.placements` | Legacy, zu entfernen | `temporal-plan.yml` |
| `LearningLandscape.moments` und `transitions` | kanonisch | `learning-landscape.md` |
| `PlanningBoard.items` | kanonisch | `planning-board.yml` |
| Canvas-Nodes und -Edges | View Model | aus Landschaft und `learning-landscape.layout.json` |

## Migrationsregel

Legacy-Daten bleiben lesbar. Neue Schreibpfade dürfen keine der als Legacy
markierten semantischen Listen mehr kanonisch speichern. Nicht eindeutig
überführbare Daten werden als Review-Aufgabe markiert, nicht gelöscht.