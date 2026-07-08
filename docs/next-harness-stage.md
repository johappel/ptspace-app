# Nächste Harness-Stufe

Status: vorbereitet, getestet, nicht aktiviert.

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
- Der `OpenCodeDockerAdapter` ist als deaktivierter Prototyp vorhanden.
- Die Policy-Simulation prüft `allow`, `deny`, `requires_admin_approval` und `ask_critical_friend`.
- Echte `opencode`-Ausführung bleibt blockiert, bis Runtime, Containergrenze und Admin-Freigabe separat umgesetzt sind.

## Ziel der nächsten Stufe

Die nächste Stufe ist nicht der produktive Harness-Betrieb, sondern eine kleine Ende-zu-Ende-Probe in einem Test-Workspace. Die Lehrer:innenoberfläche bleibt unverändert: Planungsräume, Gemeinsam nachdenken, Denkstand, Nächste Schritte, Materialien und Freigaben.

## Nicht-Ziele

- keine direkte Browser-Harness-Kommunikation,
- keine technischen Freigabefragen an Lehrkräfte,
- keine Host-Bridge ohne separates Sicherheitsreview,
- keine Secrets im Chat,
- keine Providerwahl als Lehrer:innenlast,
- keine Nextcloud-, Provider- oder Audio-Runtime-Anbindung.

## Nächster technischer Schritt

1. Containerkonzept für genau einen Planungsraum-Workspace beschreiben.
2. Test-Workspace ohne sensible Inhalte vorbereiten.
3. Adapterausführung hinter explizitem Feature-Flag ergänzen.
4. Backend-Policy vor jedem Datei-, Netzwerk-, Command- und Secret-Ereignis erzwingen.
5. Änderungen aus der Runtime nach der Ausführung validieren, filtern und versionieren.
6. Erst danach eine nicht-produktive Ende-zu-Ende-Probe durchführen.

## Abbruchkriterien

Die Integration wird nicht aktiviert, wenn:

- der Harness außerhalb des Planungsraum-Workspaces lesen oder schreiben will,
- ein Secret, Token oder lokaler Auth-Ordner sichtbar würde,
- technische Permission-Prompts in der Lehrer:innenoberfläche landen würden,
- die Runtime Installationen, Docker-Pulls oder Paketänderungen selbst auslösen will,
- sensible Lerngruppendetails in Export, OKF oder externe Ablage gelangen könnten.
