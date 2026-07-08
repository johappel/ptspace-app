# Harness-Adapter: opencode

Status: Entwurf für die nächste Harness-Stufe. Echte Ausführung ist noch nicht aktiviert.

## Zweck

`opencode` ist der Referenz-Harness für den ersten integrierten Docker-Prototyp. Die App bleibt dennoch harness-neutral: Der Browser spricht nur mit dem Backend, und das Backend spricht nur über `HarnessAdapter` mit der Runtime.

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
- `OpenCodeDockerAdapter` existiert als deaktivierter Prototyp.
- `OpenCodeDockerAdapter` führt noch kein `opencode` aus.
- Policy-Simulation ist getestet, bevor echte Runtime-Ereignisse verarbeitet werden.

## Aktivierungsregel

Echte Ausführung darf erst aktiviert werden, wenn alle Bedingungen erfüllt sind:

- ein Container arbeitet nur auf einem einzelnen Planungsraum-Workspace,
- jede Dateioperation wird durch `PermissionPolicy` geprüft,
- Netzwerkzugriff ist standardmäßig nicht frei,
- Commands führen nicht zu Installationen, Docker-Pulls oder Runtime-Änderungen,
- Secrets werden weder in Chat, Workspace, Git noch Export geschrieben,
- technische Fragen werden nicht an Lehrkräfte durchgereicht,
- Änderungen werden nach der Runtime-Ausführung validiert und versioniert.

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

## Testabdeckung

Die aktuelle Stufe prüft:

- erlaubte Dateioperation im Planungsraum,
- abgelehnte Dateioperation außerhalb des Planungsraums,
- Admin-Pflicht für technische Commands,
- Admin-Pflicht für Netzwerkzugriffe,
- Ablehnung von Secrets,
- pädagogisch sinnvolle Rückfrage über `ask_critical_friend`,
- deaktivierten Docker-Adapter ohne echte Ausführung.

## Nächste Umsetzung

Die nächste Code-Stufe ist eine nicht-produktive Ende-zu-Ende-Probe mit Test-Workspace. Sie bleibt hinter einem expliziten Feature-Flag und darf keine Host-Bridge, Nextcloud, Audio-Runtime oder Provider-Konfiguration einschließen.
