# Nächste Harness-Stufe

Status: produktionsnaher Docker-Dialogtest mit OpenRouter erfolgreich durchgeführt. Echte Ausführung bleibt standardmäßig deaktiviert und ist nur über Backend-Konfiguration erreichbar.

## Voraussetzung

Echte Harness-Ausführung startet nur, wenn diese Punkte stabil sind:

- isolierter Planungsraum-Workspace mit eigenem Git-Repo,
- PermissionPolicy für Datei-, Netzwerk-, Command- und Secret-Anfragen,
- Exportfilter und Exportfreigabe,
- Sensibilitätsprüfung vor Export und Weitergabe,
- Tests für verbotene Pfade, Secrets und technische Prompts,
- keine technischen Permission-Fragen in der Lehrkräfte-UI.

## Umgesetzt in dieser Stufe

- Das `HarnessAdapter`-Interface unterstützt strukturierte Verfügbarkeit, Ereignisse und Policy-Simulation.
- Der `MockHarnessAdapter` nutzt die erweiterte Schnittstelle weiter als sichere Entwicklungsruntime.
- Der `OpenCodeDockerAdapter` kann mit Feature-Flag echte Testläufe anstoßen.
- Der Docker-Runner nutzt das Testimage `ptspace/opencode-test:1.17.13`.
- Der Container-Entrypoint ist korrekt berücksichtigt: Docker erhält nach dem Image direkt `run --pure --format json --dir /workspace`.
- OpenRouter-Auth wird als temporäres `auth.json` außerhalb des Repos erzeugt, read-only gemountet und danach gelöscht.
- JSONL-Ausgaben von `opencode --format json` werden auf Modelltext ausgewertet.
- Ein produktnaher Backend-Test erreicht OpenRouter erfolgreich über Planungsraum → Backend → Adapter → Docker → Modell.

## Nicht-Ziele

- keine direkte Browser-Harness-Kommunikation,
- keine technischen Freigabefragen an Lehrkräfte,
- keine Host-Bridge ohne separates Sicherheitsreview,
- keine Secrets im Chat,
- keine Providerwahl als Lehrer:innenlast,
- keine Nextcloud-, Provider- oder Audio-Runtime-Automation.

## Verifizierter produktnaher Test

Der erfolgreiche Test nutzte einen nicht-sensiblen temporären Planungsraum und temporäre Daten-/Workspace-Verzeichnisse außerhalb des Repos.

Ergebnis:

- `/health`: 200,
- Harness-Modus: `docker`,
- Planungsraum erstellen: 201,
- Gespräch senden: 200,
- OpenRouter-Modellantwort wurde als Reply ausgewertet,
- temporäre Testdaten wurden danach gelöscht,
- der API-Key erschien nicht in Ausgabe, Workspace, Git oder UI-Antwort.

## Nächste Stufe

Die nächste Stufe ist eine Betriebs- und Sicherheitsstufe, nicht bloß mehr Harness-Ausführung:

1. Authentifizierung und Rollenmodell für mehrere Lehrkräfte klären.
2. Produktiven Secret-Store statt `.env` für Schulbetrieb planen.
3. Datenaufbewahrung, Löschung und Archivierung modellieren.
4. Admin-Oberfläche für Integrationen und Runtimes entwerfen.
5. Host-Bridge nur nach separatem Sicherheitsreview prototypisieren.
6. Reputationstest und Transparenzhinweise für KI-generierte Materialien abschließen.
