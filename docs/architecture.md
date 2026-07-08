# Architektur MVP 0.1

Der erste Umsetzungsschnitt folgt der Reihenfolge aus `TASKS.md`:

1. gemeinsame Domain-Schemas,
2. isolierter Workspace pro Planungsraum,
3. Backend-Policy für technische Entscheidungen,
4. MockHarnessAdapter,
5. Tests der Schutzgrenzen,
6. deaktivierter Docker-Harness-Prototyp,
7. erst danach echte Harness-Ausführung in einer nicht-produktiven Ende-zu-Ende-Probe.

## Aktueller Stand

- Frontend: SvelteKit mit lehrkräftefreundlicher Planungsraum-Oberfläche.
- Backend: Fastify API mit Planungsräumen, Gespräch, Denkstand und Markdown-/OKF-Export.
- Shared: TypeScript- und Zod-Modelle für zentrale Fachobjekte.
- Harness: `MockHarnessAdapter` aktiv; `OpenCodeDockerAdapter` als deaktivierter Prototyp vorbereitet.
- Policy: PermissionPolicy für Workspace-Grenzen, Secrets, Kommandos, Netzwerkzugriffe und pädagogisch sinnvolle Rückfragen.
- Datenschutz: sensible Inhalte werden regelbasiert markiert, Exporte brauchen Freigabe.

## Schutzprinzip

Das Frontend spricht nie direkt mit einem Harness. Alle Nachrichten laufen über das Backend. Echte Harness-Ausführung darf erst aktiviert werden, wenn WorkspaceManager, PermissionPolicy, Exportfreigabe, Sensibilitätsprüfung und Schutztests gemeinsam greifen.

## Nächste Harness-Grenze

Der nächste Schritt ist keine produktive `opencode`-Aktivierung, sondern eine kleine nicht-produktive Ende-zu-Ende-Probe mit Test-Workspace. Host-Bridge, Nextcloud, Provider-Secrets und Audio-Runtime bleiben dabei ausgeschlossen.
