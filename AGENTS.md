# AGENTS.md

> Arbeitsanweisung für KI-/Coding-Agenten im Repository `ptspace-app`.
>
> Dieses Repository implementiert nicht den pädagogischen Kernel selbst, sondern eine nutzbare Web-Anwendung für Lehrkräfte auf Grundlage von `pedagogical-thinking-space`.

---

## 1. Grundverständnis

`ptspace-app` ist eine pädagogische Planungsumgebung für Lehrkräfte.

Die Anwendung soll Lehrkräfte nicht in eine technische Agenten-, Git- oder Coding-Oberfläche führen. Sie übersetzt die Architektur von `pedagogical-thinking-space` in eine alltagstaugliche, ruhige und professionelle Arbeitsumgebung.

Die zentrale Produktidee lautet:

> Lehrkräfte arbeiten in einem gemeinsamen pädagogischen Denkraum mit einem Critical Friend.
> Technische Dienste, Agenten, Harnesses, Git, Worker und Renderer bleiben im Hintergrund.

Die App ist deshalb keine Oberfläche für `opencode`, kein Chatbot-Spielzeug und kein Materialgenerator. Sie ist eine strukturierte Umgebung für professionelles pädagogisches Denken, gemeinsame Planung und verantwortete Materialerstellung.

---

## 2. Verhältnis zum Kernel-Repository

Das bestehende Repository `pedagogical-thinking-space` ist der pädagogische Kernel beziehungsweise die Referenzarchitektur.

Es beschreibt:

- Critical Friend
- Learning Design
- Orchestration
- Memory
- Knowledge
- Worker
- Renderer
- Service Requests
- Capabilities
- Knowledge Proposals

`ptspace-app` implementiert daraus eine konkrete Anwendung.

### Nicht vermischen

Das App-Repository soll nicht zum Sammelort für alle Kernel-Prinzipien werden. Änderungen an den pädagogischen Grundbegriffen gehören primär in `pedagogical-thinking-space`.

Das App-Repository darf Kernel-Dateien verwenden, synchronisieren, referenzieren oder als Template einbinden, aber es soll die Ebenen sauber trennen:

```text
pedagogical-thinking-space
= pädagogisches Betriebssystem / Kernel / Referenzmodell

ptspace-app
= Web-Anwendung für Lehrkräfte

ptspace-deploy, optional später
= konkrete Betriebs-, Docker- und Infrastrukturkonfigurationen
```

---

## 3. Zentrale Produktentscheidungen

Diese Entscheidungen gelten als verbindliche Grundlage für die Entwicklung.

### Entscheidung 1: Lehrkräfte sehen pädagogische Zustände, keine Repo-Strukturen

Die UI darf keine technischen Ordnerlogiken wie `drafts/`, `rendered/`, `workspace/`, `service-requests/` oder `decisions.md` in den Vordergrund stellen.

Stattdessen nutzt sie pädagogische Begriffe:

```text
Gespräch
Denkstand
Offene Entscheidungen
Nächste Schritte
Entwürfe
Materialien
Für den Unterricht bereit
Zum Teilen vorgeschlagen
```

### Entscheidung 2: Der Critical Friend bleibt die primäre Interaktionsform

Die Lehrkraft interagiert vorrangig mit dem Critical Friend.

Die rechte beziehungsweise begleitende Oberfläche dokumentiert, ordnet und macht Entwicklungen sichtbar. Sie führt aber nicht den Denkprozess.

### Entscheidung 3: Tasks heißen nicht Tasks

Technische Tasks, Jobs oder Service Requests werden in der UI als „nächste sinnvolle Schritte“, „Vorschläge“ oder „in Arbeit“ angezeigt.

Beispiel:

```text
Vorschlag:
„Soll ich den Lehrplanbezug prüfen?“
```

Nicht:

```text
Create knowledge service request sr-2026-001.
```

### Entscheidung 4: Outputs sind Unterrichtsmaterialien, keine Render-Artefakte

Technische Begriffe wie `rendered`, `output`, `artifact` oder `draft` dürfen intern verwendet werden, aber die UI spricht von:

- Entwurf
- Material
- Arbeitsblatt
- Stundenverlauf
- Quellenübersicht
- Präsentation
- Für den Unterricht bereit

### Entscheidung 5: Technische Architektur bleibt im Hintergrund

Repo, Git, opencode, Worker, Renderer und Provider dürfen in der App-Architektur vorhanden sein, aber nicht die mentale Oberfläche der Lehrkraft bestimmen.

### Entscheidung 6: Nextcloud ist externe Zielablage, nicht interner Denkraum

Eine Schul-Nextcloud kann angebunden werden, bleibt aber außerhalb des Docker-Stacks.

In Nextcloud landen nur freigegebene oder exportierte Materialien, nicht automatisch rohe Dialoge, persönliche Reflexionen, interne Service Requests oder sensible Annahmen zur Lerngruppe.

### Entscheidung 7: Version 1 nutzt lokales Git statt Forgejo

Für den ersten Prototyp genügt lokales Git im Workspace-Volume.

Forgejo ist optional und wird erst relevant, wenn institutionelle Repo-Verwaltung, Web-Review, Adminoberflächen oder komplexere Kollaboration benötigt werden.

### Entscheidung 8: Der Docker-Stack enthält App und Runtime, nicht die Schul-Nextcloud

Geplant sind:

- Frontend
- Backend
- Harness-Anbindung, z. B. opencode
- Queue / Hintergrundjobs
- Datenbank
- Workspace-Volume mit Git

Nextcloud bleibt extern und wird über WebDAV oder eine geeignete API angebunden.

### Entscheidung 9: Das Backend ist die Schutzschicht

Browser und Nextcloud sprechen nie direkt mit opencode oder einem Harness.

Alle Zugriffe laufen über das Backend. Das Backend prüft Rechte, begrenzt erlaubte Operationen, isoliert Workspaces und entscheidet, was gespeichert, exportiert oder verworfen wird.

### Entscheidung 10: Kollaboration bedeutet gemeinsamer pädagogischer Dialograum

Kollaboration wird nicht primär als gemeinsames Bearbeiten eines Git-Repos verstanden.

Mehrere Lehrkräfte arbeiten in einem gemeinsamen Planungsraum mit dem Critical Friend.

### Entscheidung 11: Der Critical Friend moderiert gemeinsame Denkprozesse

In kollaborativen Planungsräumen fasst der Critical Friend zusammen, markiert Dissens, hält offene Entscheidungen sichtbar und schützt vor vorschneller Produktion.

### Entscheidung 12: OKF ist Austausch- und Kurationsformat, nicht Rohformat des Chats

Der rohe Chatverlauf wird nicht automatisch als OKF exportiert.

OKF dient für kuratierte, wiederverwendbare Ergebnisse:

- Learning Designs
- Knowledge Proposals
- Methoden- und Didaktikmuster
- Quellenpakete
- Capability Proposals
- Materialpakete

### Entscheidung 13: Exportiert wird professionelles Wissen, nicht der gesamte Denkprozess

Exportfähig sind strukturierte Ergebnisse, nicht automatisch Suchbewegungen, Missverständnisse, persönliche Reflexionen oder sensible Gruppendetails.

### Entscheidung 14: `ptspace-app` ist die konkrete pädagogische Arbeitsumgebung

Das App-Repo implementiert das Nutzungserlebnis. Der Kernel bleibt Modell, Regelwerk und Referenz.

### Entscheidung 15: Die App übersetzt konsequent technische Strukturen in Lehrkräfte-Sprache

Alle UI-Begriffe müssen aus dem Schul- und Planungsalltag heraus verständlich sein.

### Entscheidung 16: Der gemeinsame Planungsraum ist das zentrale Kollaborationsobjekt

Nicht das Git-Repo, nicht der Branch, nicht die Datei, sondern der Planungsraum ist das zentrale Objekt.

### Entscheidung 17: Git intern, OKF extern, Nextcloud als Ablage

```text
Git
= interne Versionierung des Denkraums

OKF
= Austauschformat für kuratierte, wiederverwendbare Inhalte

Nextcloud
= externe Ablage fertiger Dateien im Schulalltag
```

### Entscheidung 18: opencode ist austauschbarer Harness, nicht sichtbare Umgebung

`opencode` kann als Runtime oder Harness dienen. Die App darf aber nicht zu einer opencode-Oberfläche werden.

Die Harness-Schicht muss austauschbar bleiben.

### Entscheidung 19: Harness-Permissions werden nicht an Lehrkräfte durchgereicht

Technische `ask`-Prompts aus opencode oder einem anderen Harness dürfen nicht direkt in den Lehrkräfte-Dialog gelangen.

Die Lehrkraft soll keine Shell-, Datei-, Netzwerk- oder Provider-Risiken beurteilen müssen.

### Entscheidung 20: Das Backend übersetzt technische Permissions in Policies

Das Backend entscheidet technische Erlaubnisse nach Policy:

```text
allow
  ungefährlich, im Workspace, durch Service Request gedeckt

deny
  außerhalb des Workspaces, riskant, nicht gedeckt, sensibel

requires_admin_approval
  Installation, Provider-Freigabe, Runtime-Änderung, Secrets, Systemzugriffe

ask_critical_friend
  nur wenn daraus eine sinnvolle pädagogische oder organisatorische Rückfrage entsteht
```

### Entscheidung 21: Der Critical Friend fragt nur professionell sinnvoll Entscheidbares

Der Critical Friend fragt Lehrkräfte nach pädagogischem Zweck, Ton, Freigabe, Unterrichtseinsatz, Export oder Teilbarkeit.

Er fragt nicht nach Docker-Kommandos, API-Requests, Shell-Befehlen, Paketinstallationen, Ports, GPU-Konfigurationen oder Dateisystemrisiken.

### Entscheidung 22: Audio Worker Capability gehört zur lokalen App

Audioerzeugung, z. B. ein Dialog zwischen zwei Schüler:innen und einer Lehrkraft, ist kein direkter Chatbefehl. In `ptspace-app` wird sie als **Audio Worker Capability** modelliert. Diese Capability beschreibt den pädagogischen Workflow, die erlaubten Inputs, die Reviewpflichten, die Sicherheitsregeln, die Rückgabe an den Critical Friend und die möglichen Fallbacks. Sie entscheidet nicht selbst, welche technische Runtime benutzt wird.

Der eigentliche ausführende Skill, z. B. `tts-generation`, liegt im Harness oder in der Runtime-Schicht, etwa bei `opencode`, einem MCP-Tool, einem lokalen Worker-Container oder einem externen Provider-Adapter. Die Capability ist also der app-seitige Vertrag; der Skill ist die technische Ausführung.

```text
ptspace-app Audio Worker Capability
  = pädagogischer und organisatorischer Auftrag
  = Transcript, Review, Freigabe, Transparenz, Rückgabe

opencode / Harness Skill `tts-generation`
  = konkrete technische Ausführung
  = ElevenLabs, ComfyUI, lokales TTS, Script-only-Fallback
```

Der Critical Friend darf eine Audio Worker Capability vorschlagen. Das Backend routet sie auf einen freigegebenen Skill oder fällt sicher auf Script-only zurück.

### Entscheidung 23: Die Lehrkraft entscheidet Zweck und Nutzung, nicht den Provider

Bei Audio entscheidet die Lehrkraft über pädagogischen Zweck, Rollen, Ton, Länge, Freigabe und Nutzung.

Die Wahl zwischen lokalem TTS, ComfyUI, ElevenLabs oder Script-only-Fallback ist Aufgabe von Backend-Policy und Admin-Konfiguration.

### Entscheidung 24: Providerwahl ist Policy, nicht UI-Last

Provider werden über freigegebene Integrationen und verfügbare Runtimes gewählt. Die UI darf technische Providerwahl nur dann erklären, wenn die Lehrkraft ausdrücklich danach fragt oder wenn eine pädagogisch relevante Entscheidung betroffen ist.

### Entscheidung 25: Technische Permissions werden nicht als Lehrerfragen formuliert

Nicht erlaubt:

```text
Allow POST request to external TTS API?
Soll ich ComfyUI per Docker installieren?
Darf ich pip install ausführen?
```

Erlaubt:

```text
Soll das Audio eher wie ein realistisches Klassengespräch wirken oder bewusst wie ein Hörspiel erkennbar sein?
Soll ich aus dem geprüften Skript jetzt eine Audiofassung erstellen?
Soll ich einen Admin-Vorschlag für eine lokale Audio-Runtime vorbereiten?
```

### Entscheidung 26: Audioartefakte benötigen Transcript, Review und Status

Jedes KI-generierte Audio benötigt ein Transcript, einen Review-Vermerk, einen Status als Entwurf oder freigegebenes Material und einen Transparenzhinweis für den Unterrichtseinsatz.

### Entscheidung 27: Voice Cloning und identifizierbare Stimmen sind im Default-System ausgeschlossen

Die App darf standardmäßig keine Stimmen realer Schüler:innen, Lehrkräfte, Eltern, Kolleg:innen oder öffentlicher Personen klonen oder imitieren.

### Entscheidung 28: Worker dürfen keine Runtime eigenmächtig installieren oder verändern

Worker dürfen Materialien erzeugen, aber keine Laufzeitumgebung verändern. Verboten sind automatische Installationen, Docker-Pulls, Paketinstallationen, Systemupdates oder eigenmächtige Aktivierung neuer Provider.

### Entscheidung 29: Fehlende Runtimes führen zu Fallback oder Admin Request

Wenn z. B. ComfyUI oder eine lokale TTS-Runtime fehlt, wird nicht die Lehrkraft mit einer technischen Installationsfrage konfrontiert. Die App nutzt Script-only-Fallback oder erstellt einen Admin Request.

### Entscheidung 30: API-Keys und Secrets werden niemals im Chat eingegeben

API-Keys, Tokens, Passwörter und Zugangsdaten dürfen nicht im Dialog abgefragt, verarbeitet oder gespeichert werden. Sie gehören in Integrations-Einstellungen, Admin-Konfiguration oder einen Secret Store.

### Entscheidung 31: Providerfreigaben sind Backend-/Admin-Aufgabe

Ob ElevenLabs, lokale Modelle, ComfyUI oder andere Dienste verfügbar sind, entscheidet die Instanzkonfiguration. Der Critical Friend darf den Status erklären, aber keine Secrets entgegennehmen und keine Provider selbst freischalten.

### Entscheidung 32: Die Lehrkraft wird beraten, aber nicht zur Administratorin gemacht

Der Critical Friend darf erklären, wo ein API-Key sicher eingetragen wird oder warum eine lokale Installation auf Tablet, PC oder Server sinnvoll oder nicht sinnvoll ist. Er darf aber keine Installation auslösen und keine technischen Risikoentscheidungen an die Lehrkraft delegieren.

### Entscheidung 33: Realistische KI-Audios sind didaktisch und ethisch besonders prüfpflichtig

Realistische Stimmen können Autorität, Authentizität oder soziale Nähe vortäuschen. Deshalb sind Transparenz, generische synthetische Stimmen, Transcript, Review und klare didaktische Funktion verpflichtend.

---

## 4. Zentrale Fachobjekte der App

Die App soll fachlich objektbasiert gedacht werden. Dateien sind interne Repräsentationen, nicht die primäre Produktlogik.

Wichtige Objekte:

```text
PlanningSpace
Conversation
CriticalFriendSession
LearningDesign
Decision
OpenQuestion
NextStep
ServiceRequest
WorkerResult
Material
ExportPackage
OKFPackage
NextcloudExport
VersionSnapshot
```

### PlanningSpace

Ein Planungsraum ist das zentrale Arbeitsobjekt.

Er enthält:

- Titel
- Thema
- Fach / Lernbereich
- Zielgruppe
- Beteiligte
- Dialog
- Denkstand
- offene Entscheidungen
- nächste Schritte
- Materialien
- Exporte
- interne Versionen

### LearningDesign

Das Learning Design ist der strukturierte Denkstand.

Es enthält mindestens:

- Kontext
- Zielgruppe
- pädagogische Intention
- Lernreise
- Lernmomente
- Aktivitäten
- Materialien
- Reflexionsfragen
- offene Fragen
- Entscheidungen und Begründungen

### Decision

Eine Entscheidung ist nicht nur ein Ergebnis, sondern enthält:

- Entscheidung
- Begründung
- Alternativen
- Unsicherheiten
- Zeitpunkt
- beteiligte Personen

### NextStep

Ein nächster Schritt ist die pädagogisch formulierte Oberfläche eines internen Tasks oder Service Requests.

Beispiele:

- Lehrplanbezug prüfen
- Lernreise skizzieren
- Arbeitsauftrag entwerfen
- Quellenlage prüfen
- Material für Klasse 9 sprachlich vereinfachen

### ServiceRequest

Service Requests sind das interne Nervensystem der App.

Sie entsprechen dem Schema aus `pedagogical-thinking-space/specs/SERVICE_REQUEST_SCHEMA.md`.

Sie werden in der UI nur indirekt sichtbar.

---

## 5. Erwartete Repository-Struktur

Eine mögliche erste Struktur:

```text
ptspace-app/
  README.md
  AGENTS.md
  PRODUCT_SPEC.md
  LICENSE
  .env.example
  docker-compose.yml

  frontend/
    package.json
    src/
      app/
      components/
      features/
        conversation/
        thinking-state/
        planning-space/
        materials/
        export/
      lib/

  backend/
    package.json oder pyproject.toml
    src/
      api/
      auth/
      planning_spaces/
      critical_friend/
      service_requests/
      workspaces/
      git_store/
      okf/
      nextcloud/
      harness/
      jobs/

  kernel/
    README.md
    # optional: synchronisierte oder referenzierte Kernel-Dateien

  docs/
    architecture.md
    data-protection.md
    ui-language.md
    okf-export.md
    nextcloud-integration.md
    harness-opencode.md

  examples/
    planning-spaces/

  tests/
```

Die genaue Technologie ist noch offen. Änderungen an der Struktur sind erlaubt, wenn sie die Produktentscheidungen nicht verletzen.

---

## 6. UI-Prinzipien

Die Oberfläche soll ruhig, kollegial und lehrkräftefreundlich sein.

### Hauptbereiche

Minimaler Zielzustand:

```text
Gespräch | Denkstand | Nächste Schritte | Materialien | Export
```

Oder als Layout:

```text
links / zentral: Gespräch mit dem Critical Friend
rechts: Denkstand, offene Entscheidungen, nächste Schritte
unten / eigener Bereich: Materialien und Exporte
```

### Sprache

Die App spricht wie ein erfahrener Kollege, nicht wie ein Tool, eine Verwaltungssoftware oder ein KI-Demo-System.

Vermeiden:

```text
Agent ausführen
Task starten
Render erzeugen
Repository synchronisieren
Service Request dispatchen
```

Verwenden:

```text
weiterdenken
prüfen
zusammenfassen
als Entwurf vorbereiten
für den Unterricht bereitstellen
zum Teilen vormerken
```

### Keine Überforderung

Immer nur ein sinnvoller nächster Schritt.

Keine Listenflut. Keine permanenten Automationsvorschläge. Kein Dashboard voller technischer Zustände.

---

## 7. Backend-Prinzipien

Das Backend ist nicht nur API-Schicht, sondern Schutz- und Orchestrierungsschicht.

Es ist verantwortlich für:

- Authentifizierung
- Autorisierung
- Planungsräume
- Workspace-Isolation
- Git-Versionierung
- Service-Request-Validierung
- Harness-Kommunikation
- Job-Queue
- Datenschutzregeln
- Exportfreigaben
- Nextcloud-Anbindung
- OKF-Import und -Export

### Verboten

- Browser darf nicht direkt auf opencode zugreifen.
- Browser darf keine Shell-Kommandos auslösen.
- Harness darf nicht außerhalb eines isolierten Workspaces arbeiten.
- Exporte nach Nextcloud dürfen nicht automatisch rohe Dialoge enthalten.
- Worker dürfen keine pädagogischen Grundentscheidungen treffen.
- Worker dürfen keine Runtime eigenmächtig installieren, verändern oder erweitern.
- API-Keys, Tokens und Passwörter dürfen nie im Chat abgefragt oder gespeichert werden.
- Technische Harness-Permissions dürfen nicht direkt an Lehrkräfte durchgereicht werden.

---

## 8. Harness-Anbindung

`opencode` ist eine mögliche erste Harness-Implementierung.

Die App muss jedoch so gebaut werden, dass später ein anderer Harness möglich ist.

Daher sollte es eine interne Schnittstelle geben:

```ts
interface HarnessClient {
  startSession(input: StartSessionInput): Promise<SessionRef>
  sendMessage(session: SessionRef, message: UserMessage): Promise<HarnessResponse>
  readWorkspace(path: string): Promise<FileTree>
  applyResult(result: HarnessResult): Promise<void>
}
```

Oder äquivalent in einer anderen Sprache.

Der Harness darf nicht das Produktmodell bestimmen.

---

## 9. Git-Store

In Version 1 reicht lokales Git.

Pro Planungsraum wird ein isolierter Workspace angelegt:

```text
workspaces/<planning-space-id>/
  .git/
  learning-design.md
  decisions.md
  open-questions.md
  service-requests/
  drafts/
  materials/
  exports/
  okf/
```

Commits werden durch das Backend erzeugt.

In der UI erscheinen sie als gespeicherte Versionen:

```text
Gespeichert: Lernanliegen geklärt
Gespeichert: Lernreise überarbeitet
Gespeichert: Materialentwurf vorbereitet
```

---

## 10. OKF-Import und -Export

OKF ist das bevorzugte Austausch- und Kurationsformat.

Exportiert werden können:

- Learning Design
- Knowledge Proposal
- Materialpaket
- Quellenpaket
- Capability Proposal
- exemplarischer Planungsraum ohne sensible Daten

Nicht automatisch exportieren:

- roher Chat
- interne Service Requests
- private Reflexionen
- personenbezogene Informationen
- sensible Lerngruppenbeschreibungen

OKF-Dateien sollen Markdown mit YAML-Frontmatter verwenden.

---

## 11. Nextcloud-Export

Nextcloud ist externe Schulablage.

Die App kann fertige Materialien exportieren:

- PDF
- DOCX
- PPTX
- H5P
- Moodle-ZIP
- Markdown
- Quellenübersicht

Vor einem Export muss die Lehrkraft bestätigen, was exportiert wird.

Nextcloud darf nicht zur internen Arbeitsdatenbank werden.

---

## 12. Datenschutz und Sicherheit

Datenschutz ist nicht späteres Add-on, sondern Grundanforderung.

Mindestens beachten:

- keine Schüler:innendaten ohne Notwendigkeit
- Pseudonymisierung fördern
- sensible Angaben markieren
- getrennte Workspaces pro Planungsraum
- klare Exportfreigaben
- kein automatischer Upload unfertiger Reflexionen
- lokale oder datenschutzkonforme LLM-Provider ermöglichen
- Protokollierung von Exporten
- Lösch- und Archivierungsfunktionen

Die App soll Lehrkräfte aktiv dabei unterstützen, keine unnötigen personenbezogenen Daten einzugeben.

Beispiel:

```text
Hinweis: Für die Planung reicht meist eine Beschreibung der Lerngruppe ohne Namen einzelner Schüler:innen.
```

---

---

## 13. Runtime-, Integrations- und Secret-Policy

Diese App braucht eine klare Trennung zwischen pädagogischem Dialog und technischer Ausführung.

### Critical Friend

Der Critical Friend darf technische Voraussetzungen in Lehrkräfte-Sprache erklären. Er darf z. B. sagen:

```text
Für realistische Audioerzeugung ist ElevenLabs in dieser Instanz vorgesehen.
Der API-Key wird nicht hier im Gespräch eingetragen, sondern unter
Einstellungen → Integrationen → ElevenLabs.
```

Oder:

```text
Eine lokale ComfyUI-/TTS-Installation ist für ein Tablet nicht sinnvoll.
Für den Unterrichtsalltag sollte die Audioerzeugung auf einem freigegebenen Server
oder über eine geprüfte Integration laufen.
```

Er darf nicht:

- API-Keys entgegennehmen,
- Installationen auslösen,
- Docker-, Shell- oder Paketbefehle freigeben lassen,
- Lehrkräfte mit technischen Sicherheitsfragen belasten.

### Integrations UI

Secrets gehören in eine eigene Oberfläche:

```text
Einstellungen
  Integrationen
    ElevenLabs
      Status: nicht eingerichtet / eingerichtet / admin-only
      API-Key: sicher hinterlegen
      Nutzung erlaubt für: Audio Worker
      Datenschutzhinweis
      Kostenhinweis
```

Für institutionellen Betrieb zusätzlich:

```text
Admin
  Runtimes
    opencode
    local_tts
    comfyui
    export_worker
    nextcloud

  Provider
    allowed_external_tts
    allowed_llm_providers
    data_processing_status
```

### Runtime Check

Worker müssen vor Ausführung über das Backend prüfen, ob eine Capability technisch verfügbar und freigegeben ist:

```yaml
audio_generation:
  local_tts: unavailable
  comfyui: unavailable
  elevenlabs: configured
  external_tts_allowed: true
  transcript_required: true
  human_review_required: true
```

Wenn eine Runtime fehlt, gilt:

```text
fehlende Capability
  → sicherer Fallback, z. B. Script-only
  → oder Admin Request
  → keine Installationsfrage an Lehrkräfte
```

### Admin Requests

Ein Admin Request ist ein technisches Artefakt für Betreiber:innen, nicht Teil des normalen Lehrkräfte-Dialogs.

Beispiel:

```yaml
service: admin
mode: request_runtime
runtime: local_tts_comfyui
reason: >
  Audio Worker needs an approved local TTS runtime for realistic dialogue generation.
status: proposed
requires_admin_approval: true
```

In der UI kann der Critical Friend höchstens anbieten:

```text
Soll ich einen kurzen Einrichtungsvorschlag für eure Administration vorbereiten?
```

---

## 14. Erste Entwicklungsphase

Für Version 0.1 zählt nicht Vollständigkeit, sondern die richtige Grundbewegung.

### Muss

- Planungsraum anlegen
- Gespräch mit Critical Friend führen
- Denkstand sichtbar machen
- offene Entscheidungen sichtbar machen
- nächste Schritte anzeigen
- Workspace-Dateien speichern
- lokale Git-Versionen erzeugen
- einfacher Markdown/PDF/DOCX-Export

### Soll

- opencode als Harness anbinden
- Service Requests intern modellieren
- erste Worker-Jobs vorbereiten
- OKF-Export für Learning Design

### Später

- kollaborative Planungsräume mit mehreren Lehrkräften
- Nextcloud-Export
- Rollen- und Rechtekonzept
- SSO / Keycloak
- H5P / Moodle / LiaScript Renderer
- Forgejo optional
- institutionelle Wissensbasis

---

## 15. Arbeitsweise für Coding-Agenten

Wenn du als Coding-Agent in diesem Repository arbeitest:

1. Lies zuerst `PRODUCT_SPEC.md`.
2. Prüfe, ob eine Aufgabe die pädagogischen Produktentscheidungen berührt.
3. Verwende lehrkräftefreundliche Begriffe in UI und API-Antworten.
4. Halte technische Begriffe aus der UI heraus.
5. Implementiere Schutzschichten vor Automatisierung.
6. Schreibe Tests für Datenmodell, Service-Request-Logik und Exportfilter.
7. Dokumentiere Annahmen.
8. Frage nach, wenn eine Entscheidung das Menschenbild, Datenschutz oder pädagogische Verantwortung betrifft.

---

## 16. Definition of Done

Ein Feature ist nur fertig, wenn:

- es die Produktentscheidungen nicht verletzt,
- die UI pädagogisch verständlich bleibt,
- keine technischen Interna unnötig sichtbar werden,
- Datenzugriffe durch das Backend kontrolliert sind,
- sensible Daten nicht unkontrolliert exportiert werden,
- relevante Tests existieren,
- die Dokumentation aktualisiert wurde.

---

## 17. Leitfrage

Bei jeder größeren Entscheidung gilt:

> Hilft diese Änderung Lehrkräften, klarer und verantwortlicher über Unterricht nachzudenken?

Wenn die Antwort nur lautet:

> Es macht den Agenten mächtiger.

ist die Änderung wahrscheinlich falsch oder zumindest noch nicht ausreichend pädagogisch übersetzt.
