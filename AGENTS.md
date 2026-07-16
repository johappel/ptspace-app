# AGENTS.md

---

!!! folge den Anweisungen in [REFACTOR-AGENTS.md](REFACTOR-AGENTS.md)

Passe die folgenden Inhalte im Sinne der `REFACTOR-GOALS.md` und des verbindlichen UX-Zielbilds in [REFACTOR-UX.md](REFACTOR-UX.md) an.

---

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

Die begleitende Oberfläche dokumentiert, ordnet und macht Entwicklungen sichtbar. Sie führt aber nicht den Denkprozess.

### Entscheidung 2a: Der Planungsraum wird als Denkraum, nicht als Dashboard gestaltet

Das Gespräch bildet das visuelle und funktionale Zentrum.

Denkstand, offene Entscheidungen, Hintergrundarbeit, Lernlandschaft, Zeitplanung, Knowledge und Materialien erscheinen als aus dem Gespräch hervorgehende oder räumlich zugeordnete Bereiche.

Räumliche Metaphern dürfen Orientierung und Nachvollziehbarkeit verbessern, aber niemals professionelle Arbeitsansichten, klare Beschriftungen, Tastaturbedienung oder Barrierefreiheit ersetzen.

Animationen dienen ausschließlich dazu, fachlich relevante Zustandsübergänge sichtbar zu machen. Gamification, Belohnungsmechaniken, vermenschlichte Worker und dauerhaft bewegte Dekoration sind ausgeschlossen.

Die verbindlichen Einzelheiten stehen in `REFACTOR-UX.md`.

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

### Entscheidung 18: opencode ist austauschbarer Harness, aber im Ziel-MVP Kerninfrastruktur

`opencode` oder ein kompatibler Harness ist für das Zielprodukt nicht bloß ein späteres optionales Add-on. Die App wird als lehrkräftefreundliche Oberfläche und Schutzschicht für einen harness-basierten Pedagogical Thinking Space entwickelt.

Die App darf trotzdem nicht zu einer opencode-Oberfläche werden. Die Harness-Schicht muss austauschbar bleiben und hinter einem Backend-Adapter liegen.

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
  fachliche Klärung im bestehenden Gespräch, keine technische Permission
```

### Entscheidung 21: Raumereignisse bleiben nachvollziehbar

Wenn aus einer Gesprächsstelle ein festgehaltener Gedanke, eine offene Entscheidung, ein Arbeitsvorhaben oder ein Ergebnis hervorgeht, wird die Herkunft bidirektional verknüpft.

Die Verknüpfung ist eine App-Projektion. Sie ersetzt weder das kanonische Artefakt noch macht sie den gesamten Chat kanonisch.

### Entscheidung 22: Bewegung erklärt Zustände, sie belohnt nicht

Animation und optionaler Ton dürfen einen tatsächlichen Zustandsübergang verdeutlichen. Sie dürfen keine Belohnungslogik erzeugen, die Aufmerksamkeit dauerhaft binden oder Fokus und Scrollposition verändern.

---

## 4. Arbeitsregeln für Coding-Agenten

1. Vor Änderungen `REFACTOR-AGENTS.md`, `REFACTOR-GOALS.md`, `REFACTOR-UX.md`, `PRODUCT_SPEC.md`, `UI_SPEC.md`, `TASKS.md` und den jeweils relevanten Detailplan vollständig lesen.
2. Pädagogische Semantik nicht im App-Repo neu erfinden.
3. Bestehende, nicht zum Auftrag gehörende Änderungen nicht verändern.
4. Keine Secrets, `.env`-Werte, vollständigen Prompts oder personenbezogenen Daten committen.
5. Backend-Verträge vor UI-Eigenlogik bevorzugen.
6. Keine zweite Workflowstrecke neben „Jetzt wichtig“ erzeugen.
7. Jede räumliche oder animierte Funktion mit einer funktionsgleichen barrierefreien Alternative umsetzen.
8. Nach jedem Task die angegebenen Tests ausführen.
9. Handoffs enthalten geänderte Dateien, Tests, bekannte Einschränkungen und den nächsten freigegebenen Task.
10. Nur der koordinierende Agent ändert zentrale Task-Checkboxen.

## 5. UX-Prüffragen für jeden Frontend-Task

Vor der Abnahme ist zu prüfen:

- Bleibt das Gespräch der Mittelpunkt?
- Entsteht ein Dashboard mit konkurrierenden Karten?
- Ist die Herkunft eines neuen Zustands nachvollziehbar?
- Ist der Bereich ohne Illustration, Ton und Animation erreichbar?
- Verändert eine Animation Fokus oder Scrollposition?
- Werden technische Begriffe sichtbar?
- Entsteht ein zusätzlicher Bestätigungs- oder Pflichtschritt?
- Funktioniert der Ablauf mit Tastatur und Screenreader?
