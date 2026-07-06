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

## Pruefen

```powershell
pnpm --filter @ptspace/shared check
pnpm --filter @ptspace/backend test
pnpm --filter @ptspace/frontend check
pnpm build
```

## Wichtige Grenze

Der aktuelle MVP nutzt nur den `MockHarnessAdapter`. Echte `opencode`-Ausfuehrung wird erst nach den Gates in `TASKS.md` Abschnitt 1.5 aktiviert.
