# Architektur MVP 0.1

Der erste Umsetzungsschnitt folgt der Reihenfolge aus `TASKS.md`:

1. gemeinsame Domain-Schemas,
2. isolierter Workspace pro Planungsraum,
3. Backend-Policy fuer technische Entscheidungen,
4. MockHarnessAdapter,
5. Tests der Schutzgrenzen,
6. erst danach echte Harness-Adapter.

## Aktueller Stand

- Frontend: SvelteKit mit lehrkraeftefreundlicher Planungsraum-Oberflaeche.
- Backend: Fastify API mit Planungsraeumen, Gespraech, Denkstand und Markdown-Export.
- Shared: TypeScript- und Zod-Modelle fuer zentrale Fachobjekte.
- Harness: nur MockHarnessAdapter, keine echte opencode-Ausfuehrung.
- Policy: erste PermissionPolicy fuer Workspace-Grenzen, Secrets, Kommandos und Netzwerkzugriffe.

## Schutzprinzip

Das Frontend spricht nie direkt mit einem Harness. Alle Nachrichten laufen ueber das Backend. Echte Harness-Adapter duerfen erst angeschlossen werden, wenn WorkspaceManager, PermissionPolicy und Schutztests erweitert wurden.
