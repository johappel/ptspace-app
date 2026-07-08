# Nächste Harness-Stufe

Status: produktionsnahe Testintegration vorbereitet, echte Ausführung standardmäßig deaktiviert.

## Voraussetzung

Echte Harness-Ausführung startet erst, wenn diese Punkte stabil sind:

- isolierter Planungsraum-Workspace mit eigenem Git-Repo,
- PermissionPolicy für Datei-, Netzwerk-, Command- und Secret-Anfragen,
- Exportfilter und Exportfreigabe,
- Sensibilitätsprüfung vor Export und Weitergabe,
- Tests für verbotene Pfade, Secrets und technische Prompts.

## Umgesetzt in dieser Stufe

- Das `HarnessAdapter`-Interface unterstützt strukturierte Verfügbarkeit, Ereignisse und Policy-Simulation.
- Der `MockHarnessAdapter` nutzt die erweiterte Schnittstelle weiter als sichere Entwicklungsruntime.
- Der `OpenCodeDockerAdapter` kann mit Feature-Flag echte Testläufe anstoßen.
- Die Policy-Simulation prüft `allow`, `deny`, `requires_admin_approval` und `ask_critical_friend`.
- Der lokale Runner ist als Funktionsprüfung möglich.
- Der Docker-Runner ist für den produktionsnahen Test vorbereitet und verlangt ein freigegebenes Image.

## Nicht-Ziele

- keine direkte Browser-Harness-Kommunikation,
- keine technischen Freigabefragen an Lehrkräfte,
- keine Host-Bridge ohne separates Sicherheitsreview,
- keine Secrets im Chat,
- keine Providerwahl als Lehrer:innenlast,
- keine Nextcloud-, Provider- oder Audio-Runtime-Anbindung.

## Produktiver Test

Ein produktionsnaher Test ist erst sinnvoll, wenn ein freigegebenes opencode-Container-Image vorhanden ist. Der Test läuft dann mit:

- genau einem nicht-sensiblen Test-Planungsraum,
- `PTSPACE_HARNESS=opencode-docker`,
- `PTSPACE_REAL_HARNESS_ENABLED=true`,
- `PTSPACE_OPENCODE_RUNNER=docker`,
- `PTSPACE_OPENCODE_DOCKER_IMAGE=<freigegebenes-image>`,
- Netzwerk standardmäßig aus.

## Abbruchkriterien

Die Integration wird nicht aktiviert, wenn:

- der Harness außerhalb des Planungsraum-Workspaces lesen oder schreiben will,
- ein Secret, Token oder lokaler Auth-Ordner sichtbar würde,
- technische Permission-Prompts in der Lehrer:innenoberfläche landen würden,
- die Runtime Installationen, Docker-Pulls oder Paketänderungen selbst auslösen will,
- sensible Lerngruppendetails in Export, OKF oder externe Ablage gelangen könnten.
