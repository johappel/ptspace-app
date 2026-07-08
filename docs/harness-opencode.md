# Harness-Adapter: opencode

Status: produktionsnaher Docker-Dialogtest mit OpenRouter erfolgreich durchgeführt. Echte Ausführung bleibt standardmäßig deaktiviert und muss bewusst konfiguriert werden.

## Zweck

`opencode` ist der Referenz-Harness für den ersten integrierten Test. Die App bleibt harness-neutral: Der Browser spricht nur mit dem Backend, und das Backend spricht nur über `HarnessAdapter` mit der Runtime.

```text
Browser → ptspace-backend → HarnessAdapter → OpenCodeDockerAdapter
  → /workspace        konkreter Planungsraum
  → /ptspace-kernel   pedagogical-thinking-space als pädagogische Engine
```

## PTSPACE-Kernel

`F:\code\pedagogical-thinking-space` ist nicht nur eine Sammlung von Anweisungen. Das Repository ist die pädagogische Engine des Systems: Critical Friend, Learning Design, Orchestration, Knowledge, Capabilities, Services, Worker und Queue.

Der Harness bekommt deshalb zwei getrennte Kontexte:

- `/workspace`: der konkrete Planungsraum der Lehrkraft; hier wird normale Unterrichtsplanung gespeichert.
- `/ptspace-kernel`: der PTSPACE-Kernel; hier liest der Harness zuerst `AGENTS.md`, `CRITICAL_FRIEND.de.md`, `LEARNING_DESIGN.de.md` und `ORCHESTRATION.md`.

Kernel-Evolution ist möglich, aber nicht als beliebiges Mitschreiben während jedes Chats. Wenn eine Aufgabe ausdrücklich Wissen, Fähigkeiten, Services oder Worker weiterentwickeln soll, können definierte Kernel-Arbeitsbereiche als beschreibbare Overlays freigegeben werden.

```env
PTSPACE_KERNEL_DIR=../pedagogical-thinking-space
PTSPACE_EXTERNAL_KERNEL_CONTEXT_ENABLED=false
PTSPACE_KERNEL_WRITE_ENABLED=false
PTSPACE_KERNEL_WRITABLE_DIRS=capabilities,knowledge,queue,services,workspace
```

Standardmäßig bleibt Kernel-Schreiben aus. Außerdem wird voller Kernelkontext für externe Provider blockiert, bis `PTSPACE_EXTERNAL_KERNEL_CONTEXT_ENABLED=true` als Admin-Entscheidung gesetzt ist. Für kontrollierte Evolutionsläufe kann `PTSPACE_KERNEL_WRITE_ENABLED=true` gesetzt werden. Dann werden nur die benannten Arbeitsbereiche beschreibbar gemountet; der Kernel-Root bleibt als Referenz geschützt.

## Umsetzungsstand

- `HarnessAdapter` beschreibt Verfügbarkeit, Sitzungen, Nachrichten, strukturierte Ereignisse und Policy-Simulation.
- `MockHarnessAdapter` nutzt diese Schnittstelle für den sicheren Entwicklungsmodus.
- `OpenCodeDockerAdapter` kann eine echte Testausführung anstoßen, wenn sie explizit konfiguriert ist.
- Docker-Runner nutzt das Testimage `ptspace/opencode-test:1.17.13`.
- Das Image hat `opencode` als Entrypoint; der Adapter übergibt deshalb direkt `run --pure --format json --dir /workspace`.
- OpenRouter-Auth wird als temporär erzeugtes `auth.json` außerhalb des Repos gemountet und danach gelöscht.
- Der Kernel wird als `/ptspace-kernel` eingebunden; beschreibbare Kernel-Zonen sind gesondert konfigurierbar.
- Die App-Schicht reicht Provider-, Modell-, Secret- und Kernel-Status nur an den Backend-Adapter weiter, nicht an die Lehrkräfte-UI.

## Aktivierung für einen produktionsnahen Docker-Test

```env
PTSPACE_HARNESS=opencode-docker
PTSPACE_REAL_HARNESS_ENABLED=true
PTSPACE_OPENCODE_RUNNER=docker
PTSPACE_OPENCODE_DOCKER_IMAGE=ptspace/opencode-test:1.17.13
PTSPACE_OPENCODE_ALLOW_NETWORK=true
PTSPACE_OPENCODE_TIMEOUT_MS=120000
PTSPACE_OPENCODE_PROVIDER=openrouter
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
PTSPACE_OPENCODE_MODEL=tencent/hy3:free
PTSPACE_KERNEL_DIR=../pedagogical-thinking-space
PTSPACE_EXTERNAL_KERNEL_CONTEXT_ENABLED=false
```

`OPENROUTER_API_KEY` muss in `.env` oder einer späteren Secret-Store-Konfiguration liegen. Er darf nicht im Chat, Workspace, Git, Export oder UI-Text erscheinen.

## Sicherheitsgrenzen

- kein `--auto`,
- `--pure`, damit keine externen Plugins geladen werden,
- normale Unterrichtsplanung schreibt nur in `/workspace`,
- Kernel wird als Engine-Kontext gelesen,
- Kernel-Evolution nur über freigegebene Arbeitsbereiche,
- keine Secrets im Chat,
- kein Host-Bridge-Zugriff,
- keine Nextcloud-, Audio- oder Provider-Automation,
- technische Pfade und Kernel-Details werden aus Antworten an Lehrkräfte entfernt.

## Verifikation

- Testimage `ptspace/opencode-test:1.17.13` gebaut und mit `--version` geprüft.
- Direkte Dockerdiagnose mit OpenRouter: Exit 0, JSONL-Modellantwort, keine Key-Ausgabe.
- Produktnaher Backend-Test: `/health` 200, Planungsraum 201, Gespräch 200, Harness `docker`, Modellantwort als Reply.
- Backend-Tests decken Secret-Mount, Entrypoint-Argumente, JSONL-Textauswertung, Kernel-Mount und beschreibbare Kernel-Arbeitsbereiche ab.

## Nächster Schritt

Die nächste Stufe ist nicht mehr nur OpenRouter-Grundfunktion. Sie muss klären, welche Kernel-Evolutionsläufe die App selbst anbieten darf: Knowledge Proposal, Capability Proposal, Service-/Worker-Änderung, Review, Freigabe und Versionierung im PTSPACE-Kernel.
