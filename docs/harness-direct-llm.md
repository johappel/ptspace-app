# Harness-Adapter: Direkter Modellzugriff (direct-llm)

Status: implementiert und durch Unit-Tests abgedeckt (`backend/test/DirectLlmAdapter.test.ts`). Realer Smoke-Test gegen ein Freimodell steht noch aus (GW-310-Äquivalent).

## Zweck

`direct-llm` ist die neue empfohlene Standardstufe für echte Modellkonversation. Sie ersetzt im Standardpfad die opencode-Runtime durch einen direkten, OpenAI-kompatiblen HTTP-Aufruf aus dem Backend.

```text
Browser → ptspace-backend → DirectLlmAdapter → Chat-Completion-API (z. B. OpenRouter)
```

Damit entfallen aus dem Standardpfad:

- Docker-Container und CLI-Spawn,
- opencode-spezifische Flags und JSONL-Parsing,
- `auth.json`-Secret-Mounts,
- Provider-/Modell-Konfigurationstraps der opencode-CLI,
- Windows-Probleme beim Spawnen von `.ps1`-Wrappern.

## Architektur

Die harness-unabhängige Pädagogik-Logik ist in gemeinsame Module ausgelagert und wird von allen Adaptern geteilt:

```text
backend/src/services/harness/
  HarnessAdapter.ts      Interface (unverändert)
  prompts.ts             Critical-Friend-, Worker- und Review-Prompts
  workspaceDiff.ts       Snapshot/Diff, Pfad-Guard, Review-Isolation
  replyTranslation.ts    teacher-facing Übersetzung, Behauptungs-Guard, STATUS/NOTE-Parsing
  DirectLlmAdapter.ts    direkte Ausführungsstufe (dieses Dokument)
  OpenCodeDockerAdapter.ts  optionale Agenten-Stufe (siehe harness-opencode.md)
  MockHarnessAdapter.ts  Entwicklungs- und Testmodus
```

## Sicherheitsmodell

Anders als eine Agenten-Runtime führt das **Backend selbst** alle Dateioperationen aus:

- Das Modell erhält den Workspace-Inhalt nur lesend als Kontext (Denkstand, Entscheidungen, offene Fragen, nächste Schritte).
- Worker-Ergebnisse werden als Text geliefert; das Backend schreibt sie ausschließlich nach dem vertraglich festgelegten Pfad (`safeRelativeOutputPath`, Escape außerhalb des Workspaces wird abgelehnt).
- Die fachliche Prüfung läuft auf einer temporären Kopie des Workspaces; Schreibversuche des Modells sind strukturell unmöglich.
- Der API-Key bleibt im Backend-Umfeld und erscheint nie in Chat, Workspace, Git oder UI.

## Konfiguration

```env
PTSPACE_HARNESS=direct-llm
PTSPACE_REAL_HARNESS_ENABLED=true
PTSPACE_DIRECT_LLM_BASE_URL=https://openrouter.ai/api/v1
PTSPACE_DIRECT_LLM_MODEL=tencent/hy3:free
PTSPACE_DIRECT_LLM_TIMEOUT_MS=120000
PTSPACE_LLM_API_KEY=...        # oder weiterhin OPENROUTER_API_KEY
```

`checkAvailability` prüft Freigabe, API-Key, Modellname und Kernel-Basisdateien — ohne kostenpflichtigen Modellaufruf.

## Verhalten

| Ablauf | Umsetzung |
| --- | --- |
| `sendMessage` | Critical-Friend-Prompt + Workspace-Kontext → Completion → `toTeacherFacingReply` + `guardUnsupportedClaims` |
| `requestTask` | Worker-Prompt + Workspace-Kontext → Completion → Backend schreibt Datei; `BLOCKED` wird respektiert |
| `reviewTask` | Review-Prompt auf temporärer Workspace-Kopie → `STATUS/NOTE`-Parsing |

Fehler werden in teacher-facing Meldungen übersetzt (fehlender Key, Timeout, allgemeiner Fehler).

## Aktivierung

```powershell
$env:PTSPACE_HARNESS="direct-llm"
$env:PTSPACE_REAL_HARNESS_ENABLED="true"
pnpm --filter @ptspace/backend dev
```

Das Backend liest die Konfiguration beim Start; nach `.env`-Änderungen neu starten.

## Verhältnis zu opencode

opencode bleibt als optionale Stufe für echte Agentenläufe erhalten (Kernel-Evolution, freie Workspace-Arbeit). Für den Real-Runtime-MVP und den geführten Zwei-Häkchen-Workflow ist `direct-llm` der Standardpfad.
