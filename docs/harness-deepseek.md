# DeepSeek Harness – Adaptive Runtime (L5b Evaluation)

Status: **Spike / Evaluation.** Der DeepSeek Harness wird als Kandidat für die
**adaptive Runtime** der Ausführungsarchitektur evaluiert (siehe
`EXECUTION_ARCHITECTURE.md`). Er ist keine neue Baseline und ersetzt weder
`DirectLlmAdapter` (Baseline für begrenzte semantische Aufgaben) noch
`OpenCodeDockerAdapter` (Coding-/Kernel-Stufe).

## 1. Zweck

Die adaptive Runtime soll offene Aufgaben ermöglichen, deren Ablauf nicht im
Voraus vollständig festgelegt werden kann:

- Skills
- offene Recherche und Perspektivenerschließung
- persistente Runtime-Sessions
- selbstorganisierte bounded Workflows
- Workflow Memory
- Hintergrundarbeit
- Context Injection
- selektive Subagents
- Runtime Learning

Ein reiner „send message → receive answer“-Pfad gilt **nicht** als Erfolg –
das kann `DirectLlmAdapter` einfacher.

## 2. Architektur und Adaptergrenze

DeepSeek-spezifische Konzepte leben ausschließlich innerhalb von
`backend/src/services/harness/DeepSeekHarnessAdapter.ts`. Es dürfen keine
DeepSeek-Typen in die PTS-Domain (`@ptspace/shared`) oder das Frontend gelangen.

```text
PTS Domain / Orchestration
        │
        ▼
HarnessAdapter (PTS-neutral)
        │
        ▼
DeepSeekHarnessAdapter
        │  (kapselt DeepSeek vollständig)
        ▼
DeepSeekRuntimeTransport (injizierbare, schmale Grenze)
```

Der reale Transport wird über `DeepSeekRuntimeTransport` injiziert. Ohne
verbundenen Transport meldet der Adapter `requires_setup`, statt instabile
Upstream-API-Details zu erraten. Dadurch bleibt die Adaptergrenze mit Fake/Stub
testbar (`backend/test/DeepSeekHarnessAdapter.test.ts`).

## 3. Installation / Konfiguration

```text
PTSPACE_HARNESS=deepseek
PTSPACE_REAL_HARNESS_ENABLED=true
PTSPACE_LLM_API_KEY=...            # (alternativ OPENROUTER_API_KEY)
PTSPACE_DEEPSEEK_VERSION=<gepinnte Version/Commit>
```

Der reale DeepSeek-Transport ist im aktuellen Spike **noch nicht angebunden**;
`createHarness()` in `app.ts` erzeugt den Adapter ohne `runtime`, sodass er
`requires_setup` meldet, bis die Integration nach der Evaluation aktiviert wird.

## 4. Session Mapping

- `createSession()` bildet auf eine **persistente** DeepSeek-Session pro
  Planungsraum ab und versucht zuerst ein `resumeSession()` (kein doppelter
  Session-Aufbau nach Backend-Neustart).
- Runtime-Sessions sind **operativer** Zustand. Der Planungsraum bleibt ohne
  DeepSeek-Session rekonstruierbar; kanonische Entscheidungen werden immer aus
  dem Workspace gelesen, nicht aus Session History.

## 5. Event Mapping

Native DeepSeek-Agent-Loop-Events werden **nicht** nach außen gereicht. Der
Adapter liefert nur PTS-neutrale `HarnessEvent`s (`status`,
`waiting_for_backend_policy`, `workspace_update`).

## 6. Skill Mapping

Die Skill Registry (`backend/src/services/runtime/SkillRegistry.ts`) bleibt
PTS-owned. DeepSeek darf einen Skill ausführen, aber nicht definieren, was ein
gültiger produktiver PTS-Skill ist. Nur `reviewed`/`approved` Skills sind
produktiv auswählbar; automatisch erzeugte Kandidaten starten als
`experimental` und werden nicht ohne Prüfung promotet.

## 7. Policy Boundary

- Der Browser spricht nie direkt mit der Runtime.
- Backend-Policy ist autoritativ (`simulatePolicy()` zeigt die Grenzen).
- Secrets gelangen nicht in Modellkontext, Workspace, Git oder teacher-facing
  Fehlermeldungen.
- Worker-/Review-Ausführung läuft im Spike bewusst **nicht** über DeepSeek
  (`requestTask()` wirft `deepseek_adapter_task_not_supported`); Direct LLM
  bleibt dafür Baseline.

## 8. Runtime Usage / Telemetrie

`sendMessage()` liefert eine providerunabhängige `RuntimeUsage`
(`modelCalls`, `inputTokens`, `outputTokens`, `cachedTokens`, `toolCalls`,
`runtimeMs`). Fehlende Providerdaten bleiben `undefined`; es wird nichts
geschätzt. Die Struktur ist für L6 (Qualität/Ökonomie) vorbereitet und enthält
keine Gesprächsinhalte, Secrets oder personenbezogenen Daten.

## 9. Bekannte Einschränkungen / Upstream-Risiken

- DeepSeek Harness befindet sich in aktiver Entwicklung; die verwendete Version
  ist über `PTSPACE_DEEPSEEK_VERSION` zu pinnen.
- Der reale Transport ist noch nicht angebunden (`BLOCKED` bis Upstream-Stabilität
  bewertet ist).
- Skills, Workflow Memory und Runtime-Lernen sind als PTS-owned Verträge
  vorbereitet, aber noch nicht über DeepSeek ausgeführt.

## 10. Smoke-Test

```bash
pnpm --filter @ptspace/backend test -- DeepSeekHarnessAdapter
```

## 11. Vergleich mit Direct LLM

| Aufgabe                        | Direct LLM              | Adaptive Runtime (DeepSeek) |
| ------------------------------ | ----------------------- | --------------------------- |
| normaler Companion-Turn        | einfacher, günstiger    | Overkill                    |
| offene Perspektivenrecherche   | nur mit hartem Workflow | vermuteter Mehrwert         |
| bekannter Worker-Entwurf       | ausreichend             | nicht nötig                 |
| Workspace-Maintenance          | deterministisch + Check | nur bei semantischen Fällen |

Diese Tabelle bleibt bis zur Anbindung des realen Transports eine Hypothese; die
Usage-Struktur liefert die Datenbasis für die spätere reale Bewertung.
