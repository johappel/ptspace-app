# Harness-Adapter: opencode

Status: produktionsnahe Testintegration vorbereitet. Echte Ausführung bleibt standardmäßig deaktiviert.

## Zweck

`opencode` ist der Referenz-Harness für den ersten integrierten Test. Die App bleibt harness-neutral: Der Browser spricht nur mit dem Backend, und das Backend spricht nur über `HarnessAdapter` mit der Runtime.

```text
Browser
  → ptspace-backend
    → HarnessAdapter
      → OpenCodeDockerAdapter
        → opencode-Runtime im begrenzten Planungsraum-Workspace
```

## Umsetzungsstand

- `HarnessAdapter` beschreibt Verfügbarkeit, Sitzungen, Nachrichten, strukturierte Ereignisse und Policy-Simulation.
- `MockHarnessAdapter` nutzt diese Schnittstelle für den sicheren Entwicklungsmodus.
- `OpenCodeDockerAdapter` kann eine echte Testausführung anstoßen, wenn sie explizit konfiguriert ist.
- Ohne Feature-Flag meldet der Adapter `requires_admin_configuration`.
- Docker-Runner benötigt ein freigegebenes Container-Image.
- Lokaler Runner ist nur für Funktionsprüfung vorgesehen, nicht als produktionsnahe Schutzgrenze.

## Aktivierung für einen kontrollierten Funktionstest

```env
PTSPACE_HARNESS=opencode-docker
PTSPACE_REAL_HARNESS_ENABLED=true
PTSPACE_OPENCODE_RUNNER=local
PTSPACE_OPENCODE_COMMAND=opencode
PTSPACE_OPENCODE_ALLOW_NETWORK=false
PTSPACE_OPENCODE_TIMEOUT_MS=120000
```

Dieser Modus prüft die Backend-Integration mit lokal installiertem `opencode`. Er ist kein Nachweis für produktionsnahe Isolation, weil der lokale Prozess technisch im Host-Kontext läuft.

## Aktivierung für einen produktionsnahen Test

```env
PTSPACE_HARNESS=opencode-docker
PTSPACE_REAL_HARNESS_ENABLED=true
PTSPACE_OPENCODE_RUNNER=docker
PTSPACE_OPENCODE_DOCKER_IMAGE=<freigegebenes-opencode-image>
PTSPACE_OPENCODE_ALLOW_NETWORK=false
PTSPACE_OPENCODE_TIMEOUT_MS=120000
```

Der Docker-Runner startet `opencode run --pure --format json --dir /workspace` mit genau einem gemounteten Planungsraum-`project/`-Verzeichnis. Netzwerk bleibt standardmäßig aus. Wenn ein Modellzugriff nötig ist, muss er als Admin-Entscheidung bewusst freigegeben werden.

## Policy-Fluss

```text
Harness-Ereignis
  → Backend klassifiziert Anfrage
  → PermissionPolicy entscheidet
  → allow | deny | requires_admin_approval | ask_critical_friend
  → Adapter setzt Entscheidung technisch um
  → UI erhält nur pädagogisch sinnvolle Status- oder Rückfragetexte
```

`ask_critical_friend` ist ausschließlich für pädagogisch entscheidbare Fragen vorgesehen. Beispiele sind Zweck, Ton, Freigabe, Unterrichtseinsatz oder Materialstatus. Shell-, Datei-, Netzwerk-, Provider- oder Secret-Fragen gehören nicht in den Lehrkräfte-Dialog.

## Sicherheitsgrenzen

- kein `--auto`,
- `--pure`, damit keine externen Plugins geladen werden,
- Ausführung nur im `project/`-Ordner des Planungsraums,
- keine Secrets im Chat,
- kein Host-Bridge-Zugriff,
- keine Nextcloud-, Audio- oder Provider-Automation,
- Runtime-Änderungen werden nach der Ausführung als Workspace-Events sichtbar und per Git-Version gespeichert.

## Testabdeckung

Die aktuelle Stufe prüft:

- deaktivierten Adapter ohne Feature-Flag,
- fehlendes Docker-Image als `requires_setup`,
- erlaubte Dateioperation im Planungsraum,
- abgelehnte Dateioperation außerhalb des Planungsraums,
- Admin-Pflicht für technische Commands,
- Admin-Pflicht für Netzwerkzugriffe,
- Ablehnung von Secrets,
- pädagogisch sinnvolle Rückfrage über `ask_critical_friend`,
- Fake-Runner-Ausführung mit Änderung an kuratierten Dateien.

## Nächster Schritt

Für den produktionsnahen Test braucht es jetzt ein freigegebenes opencode-Container-Image und einen nicht-sensiblen Test-Planungsraum. Erst danach sollte Netzwerk- oder Providerzugriff separat bewertet werden.
