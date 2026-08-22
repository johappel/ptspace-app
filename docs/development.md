# Entwicklung

## Voraussetzungen

- Node.js 22
- pnpm 11

## Start

```powershell
pnpm install
pnpm --filter @ptspace/backend dev
pnpm --filter @ptspace/frontend dev
```

Backend: http://localhost:5174
Frontend: http://localhost:5173

## Prüfen

```powershell
pnpm --filter @ptspace/shared check
pnpm --filter @ptspace/backend test
pnpm --filter @ptspace/frontend check
pnpm build
```

## Wichtige Grenze

Der aktive Entwicklungsmodus nutzt weiter den `MockHarnessAdapter`. Echte Modellzugriffe sind nur aktiv, wenn sie ausdrücklich über Umgebungsvariablen eingeschaltet werden.

## Echter Modellzugriff (empfohlener Standardpfad)

Für echte Modellkonversation wird der direkte Modellzugriff ohne Agenten-Runtime empfohlen (Details: `harness-direct-llm.md`):

```powershell
$env:PTSPACE_HARNESS="direct-llm"
$env:PTSPACE_REAL_HARNESS_ENABLED="true"
$env:PTSPACE_DIRECT_LLM_MODEL="tencent/hy3:free"
# API-Key in .env: PTSPACE_LLM_API_KEY oder OPENROUTER_API_KEY
pnpm --filter @ptspace/backend dev
```

## Produktionsnaher opencode-Test

Der erste produktionsnahe Test wird nicht über den normalen Compose-Stack gestartet, weil der Backend-Container dafür keinen Docker-Socket erhalten soll. Für den Test läuft das Backend lokal auf dem Host und startet einen separaten opencode-Container mit genau einem Planungsraum-Mount.

Die inhaltlichen Planungsräume liegen unter der konfigurierten Datenwurzel, standardmäßig getrennt vom Code:

```text
<PTSPACE_PLANNING_WORKSPACES_DIR>/<planungsraum-slug>/
```

Wichtig: Der Workspace gehört **nicht** in ein Code-Repository. Kernel- und App-Repository bleiben frei von Nutzerdaten; `PTSPACE_KERNEL_DIR` dient nur als lesender Engine-Kontext. Die App liest Denkstand, Entscheidungen, offene Fragen, nächste Schritte, Knowledge Proposals und Materialien aus genau diesem Verzeichnis. `PTSPACE_WORKSPACES_DIR` enthält nur technische Laufzeitdaten wie den Chatverlauf.

```powershell
$env:PTSPACE_HARNESS="opencode-docker"
$env:PTSPACE_HARNESS="opencode-docker"
$env:PTSPACE_REAL_HARNESS_ENABLED="true"
$env:PTSPACE_OPENCODE_RUNNER="docker"
$env:PTSPACE_OPENCODE_DOCKER_IMAGE=ptspace/opencode-test:1.17.13"ptspace/opencode-test:1.17.13"
$env:PTSPACE_OPENCODE_ALLOW_NETWORK="false"
pnpm --filter @ptspace/backend dev
```

Für einen reinen Funktionscheck der Backend-Verdrahtung kann lokal installiertes `opencode` verwendet werden. Dieser Modus ist nicht als produktionsnahe Isolation zu werten:

```powershell
$env:PTSPACE_HARNESS="opencode-docker"
$env:PTSPACE_REAL_HARNESS_ENABLED="true"
$env:PTSPACE_OPENCODE_RUNNER="local"
pnpm --filter @ptspace/backend dev
```
