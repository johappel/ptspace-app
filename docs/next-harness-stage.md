# Nächste Harness-Stufe

Status: geplant, nicht aktiviert.

## Voraussetzung

Echte Harness-Ausführung startet erst, wenn diese Punkte stabil sind:

- isolierter Planungsraum-Workspace mit eigenem Git-Repo,
- PermissionPolicy für Datei-, Netzwerk-, Command- und Secret-Anfragen,
- Exportfilter und Exportfreigabe,
- Sensibilitätsprüfung vor Export und Weitergabe,
- Tests für verbotene Pfade, Secrets und technische Prompts.

## Ziel der nächsten Stufe

Die nächste Stufe ist ein `OpenCodeDockerAdapter` hinter dem bestehenden `HarnessAdapter`. Die Lehrer:innenoberfläche bleibt unverändert: Planungsräume, Gemeinsam nachdenken, Denkstand, Nächste Schritte, Materialien und Freigaben.

## Nicht-Ziele

- keine direkte Browser-Harness-Kommunikation,
- keine technischen Freigabefragen an Lehrkräfte,
- keine Host-Bridge ohne separates Sicherheitsreview,
- keine Secrets im Chat,
- keine Providerwahl als Lehrer:innenlast.

## Geplanter Ablauf

1. Adapter-Schnittstelle um strukturierte Events und Policy-Anfragen erweitern.
2. `OpenCodeDockerAdapter` zunächst nur gegen Test-Workspace betreiben.
3. Policy-Simulation testen: allow, deny, requires_admin_approval, ask_critical_friend.
4. Workspace-Mount im Container auf genau einen Planungsraum begrenzen.
5. Keine Nextcloud-, Provider- oder Audio-Runtime anbinden.
6. Erst danach kleine Ende-zu-Ende-Probe mit einem nicht-sensiblen Beispielplanungsraum.

## Abbruchkriterien

Die Integration wird nicht aktiviert, wenn:

- der Harness außerhalb des Planungsraum-Workspaces lesen oder schreiben kann,
- technische Prompts in die UI gelangen,
- Secrets im Workspace, Chat oder Export auftauchen können,
- Admin-Freigaben nicht technisch getrennt sind,
- Tests für Policy-Entscheidungen fehlen.