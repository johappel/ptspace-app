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

Der aktive Entwicklungsmodus nutzt weiter den `MockHarnessAdapter`. Der `OpenCodeDockerAdapter` ist nur als deaktivierter Prototyp vorhanden. Echte `opencode`-Ausführung wird erst nach den Gates in `TASKS.md` Abschnitt 1.5 und nach einer nicht-produktiven Test-Workspace-Probe aktiviert.
