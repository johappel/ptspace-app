# PRODUCT_SPEC.md

# ptspace-app

> Eine pädagogische Web-Anwendung für professionelles Unterrichtsdenken mit einem Critical Friend.

---

## 1. Kurzbeschreibung

`ptspace-app` ist eine Web-Anwendung, in der Lehrkräfte allein oder gemeinsam Unterrichtsideen mit einem Critical Friend weiterentwickeln können.

Die Anwendung verbindet dialogisches Nachdenken, strukturierte Unterrichtsplanung, verantwortete Materialerstellung, interne Versionierung und exportierbare Ergebnisse.

Sie basiert konzeptionell auf dem Repository `pedagogical-thinking-space`, macht dessen Architektur aber für Lehrkräfte in einer gewohnten, nicht-technischen Umgebung nutzbar.

Die App ist ausdrücklich kein reiner Materialgenerator und keine sichtbare Agentenplattform.

---

## 2. Produktthese

Bisherige KI-Unterstützung im Bildungsbereich wird häufig als Generator verstanden:

```text
Prompt → Material
```

`ptspace-app` verschiebt den Fokus:

```text
Unterrichtsidee → Dialog → Learning Design → geprüfte Umsetzung → Export
```

Der zentrale Mehrwert liegt nicht darin, schneller Arbeitsblätter zu produzieren, sondern darin, pädagogische Urteilsbildung zu unterstützen.

---

## 3. Zielgruppe

Primäre Zielgruppen:

- Lehrkräfte
- Fachschaften
- Jahrgangsteams
- Fortbildner:innen
- religionspädagogische Arbeitsstellen
- OER-Communities
- didaktische Entwicklungsgruppen

Sekundäre Zielgruppen:

- Schulleitungen
- Medienberater:innen
- Hochschuldidaktik
- Studienseminare
- Bildungsadministration

---

## 4. Nutzungsszenarien

### Szenario 1: Einzelne Lehrkraft denkt eine Unterrichtsidee weiter

Eine Lehrkraft hat eine grobe Idee, aber noch keinen tragfähigen Unterrichtsentwurf.

Sie öffnet einen Planungsraum und beschreibt die Idee.

Der Critical Friend hilft, Intention, Zielgruppe, Lernreise, mögliche Spannungen und nächste Schritte zu klären.

Am Ende entstehen ein Denkstand, offene Entscheidungen und erste Materialentwürfe.

### Szenario 2: Zwei oder mehr Lehrkräfte planen gemeinsam

Mehrere Lehrkräfte arbeiten in einem gemeinsamen Planungsraum.

Der Critical Friend moderiert:

- fasst zusammen
- fragt nach
- markiert Dissens
- hält offene Entscheidungen sichtbar
- schlägt nächste Schritte vor

Die Kollaboration findet nicht als Git-Kollaboration statt, sondern als gemeinsamer pädagogischer Chatraum.

### Szenario 3: Aus einem Learning Design entstehen Materialien

Wenn das Learning Design ausreichend geklärt ist, schlägt der Critical Friend vor, Material vorbereiten zu lassen.

Ein Worker erstellt einen Entwurf.

Der Critical Friend prüft, ob der Entwurf zum Learning Design passt.

Erst danach sieht die Lehrkraft das Ergebnis.

### Szenario 4: Export in den Schulalltag

Fertige Materialien können exportiert werden:

- PDF
- DOCX
- Markdown
- H5P
- Moodle-Paket
- Quellenübersicht
- OKF-Paket
- Ablage in einer externen Nextcloud

### Szenario 5: Austausch als OKF

Ein gelungenes Learning Design oder ein didaktisches Muster kann als OKF-kompatibles Paket exportiert werden.

Der Export enthält kuratierte Ergebnisse, nicht den rohen Chatverlauf.

---

## 5. Zentrale Produktprinzipien

### 5.1 Dialog vor Produktion

Die App beginnt nicht mit der Frage:

```text
Was soll generiert werden?
```

sondern mit:

```text
Welche Lernerfahrung soll entstehen?
```

### 5.2 Critical Friend als sichtbares Gegenüber

Der Critical Friend ist der sichtbare professionelle Gesprächspartner.

Andere Dienste bleiben im Hintergrund.

### 5.3 Learning Design als gemeinsamer Denkstand

Das Learning Design ist nicht identisch mit einem Arbeitsblatt, Stundenplan, Moodle-Kurs oder PDF.

Es ist der strukturierte pädagogische Denkstand, aus dem Materialien abgeleitet werden.

### 5.4 Pädagogische Sprache statt technischer Oberfläche

Die App zeigt nicht:

```text
workspace/
service-requests/
drafts/
rendered/
```

Sie zeigt:

```text
Denkstand
Offene Entscheidungen
Nächste Schritte
Entwürfe
Materialien
Für den Unterricht bereit
```

### 5.5 Verantwortlichkeit bleibt bei der Lehrkraft

Die App unterstützt Entscheidungen, ersetzt sie aber nicht.

Der Critical Friend darf begründet widersprechen, aber nicht entscheiden.

Worker dürfen Materialien vorbereiten, aber keine pädagogischen Grundentscheidungen treffen.

### 5.6 Datenschutz durch Architektur

Sensible Informationen sollen nicht unkontrolliert in LLMs, Exporte oder externe Ablagen geraten.

Das Backend ist Schutzschicht.

Nextcloud ist Zielablage für freigegebene Dateien, nicht interner Denkraum.

---

## 6. Informationsarchitektur der UI

Die erste UI-Version soll bewusst einfach bleiben.

### Hauptnavigation

```text
Planungsräume
Gespräch
Denkstand
Nächste Schritte
Materialien
Export
```

### Planungsraum-Ansicht

Empfohlenes Layout:

```text
┌──────────────────────────────────────────────┬──────────────────────────────┐
│ Gespräch mit dem Critical Friend              │ Denkstand                    │
│                                               │ Offene Entscheidungen         │
│                                               │ Nächste Schritte              │
├──────────────────────────────────────────────┴──────────────────────────────┤
│ Materialien / Entwürfe / Für den Unterricht bereit                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Start eines Planungsraums

Mögliche Begrüßung:

```text
Hallo, ich habe Zeit für dich.
Woran möchtest du heute weiterdenken?
```

### Rechte Seitenleiste

Die Seitenleiste soll nicht alles zeigen, sondern nur das, was den Denkprozess stützt:

- Was wir schon verstanden haben
- Offene Entscheidungen
- Nächste sinnvolle Schritte
- In Arbeit
- Für den Unterricht bereit

---

## 7. Kernfunktionen

### 7.1 Planungsraum anlegen

Pflichtfelder in Version 0.1:

- Titel
- Fach / Lernbereich, optional
- Zielgruppe, optional
- kurze Idee

Optional später:

- Schule / Organisation
- Lehrplanraum
- Lizenzwunsch
- Beteiligte
- Datenschutzmodus

### 7.2 Gespräch mit Critical Friend

Der Gesprächsbereich ermöglicht:

- Freitext der Lehrkraft
- Antworten des Critical Friend
- Zusammenfassungen
- Markierung wichtiger Entscheidungen
- Vorschlag nächster Schritte

Der Critical Friend soll ruhig und knapp bleiben.

### 7.3 Denkstand anzeigen

Der Denkstand wird während des Gesprächs aktualisiert.

Er enthält:

- Thema
- Kontext
- Zielgruppe
- Lernanliegen
- Lernreise
- Lernmomente
- Aktivitäten
- Materialien
- offene Fragen
- Entscheidungen

### 7.4 Offene Entscheidungen

Offene Entscheidungen werden sichtbar gesammelt.

Beispiel:

```text
Noch offen:
- Welche Erfahrung eröffnet die Stunde?
- Welche theologische Perspektive trägt die Lernreise?
- Soll am Ende ein persönlicher Transfer oder eine gemeinsame Aktion stehen?
```

### 7.5 Nächste Schritte

Die App schlägt nächste sinnvolle Schritte vor.

Beispiele:

```text
- Lehrplanbezug prüfen
- Lernreise in drei Phasen skizzieren
- Einstiegsidee formulieren
- Arbeitsauftrag für Klasse 9 vorbereiten
- Quellenlage prüfen
```

Intern können diese Schritte Service Requests erzeugen.

### 7.6 Materialien

Materialien entstehen erst, wenn entsprechende Entscheidungen geklärt sind.

Mögliche Materialtypen:

- Stundenverlauf
- Arbeitsblatt
- Gesprächsimpuls
- Bildimpuls
- Präsentation
- H5P-Aktivität
- Moodle-Struktur
- Quellenübersicht
- Lehrkraftnotizen

### 7.7 Export

Version 0.1:

- Markdown
- PDF
- DOCX
- OKF-Markdown

Später:

- Nextcloud
- H5P
- Moodle-ZIP
- LiaScript
- PPTX

---

## 8. Datenmodell, fachlich

### PlanningSpace

```yaml
id: string
title: string
status: active | archived | exported
participants: Participant[]
created_at: datetime
updated_at: datetime
learning_design: LearningDesign
open_questions: OpenQuestion[]
decisions: Decision[]
next_steps: NextStep[]
materials: Material[]
exports: Export[]
```

### LearningDesign

```yaml
context:
  subject: string
  grade: string
  setting: string
  constraints: string[]
intention:
  summary: string
  learners_should:
    know: string[]
    understand: string[]
    experience: string[]
    become_able_to: string[]
learning_journey:
  starting_point: string
  phases: Phase[]
  turning_points: string[]
activities: Activity[]
materials: MaterialRef[]
reflection:
  learner_reflection: string[]
  teacher_reflection: string[]
open_questions: string[]
```

### Decision

```yaml
id: string
title: string
decision: string
reason: string
alternatives: string[]
uncertainties: string[]
decided_by: string[]
created_at: datetime
```

### NextStep

```yaml
id: string
label: string
description: string
kind: reflect | knowledge | worker | renderer | export
status: suggested | accepted | in_progress | done | discarded
related_service_request: string | null
```

### ServiceRequest

Orientiert sich am Kernel-Schema:

```yaml
id: string
status: proposed | approved | queued | in_progress | completed | returned | reviewed | discarded | failed
service: memory | knowledge | worker | renderer | review
mode: retrieve | research | draft | render | validate | summarize | propose
reason: string
input: object
expected_output: object
constraints: object
return_to: critical_friend
requires_approval: boolean
```

---

## 9. Technische Zielarchitektur

### Version 0.1 / Prototyp

```text
Browser
  ↓
Frontend
  ↓
Backend
  ↓
Harness Client, z. B. opencode
  ↓
LLM Provider / lokales Modell

Backend
  ↓
Workspace-Volume mit lokalem Git

Backend
  ↓
Export-Dateien
```

### Spätere Zielarchitektur

```text
┌───────────────────────────────┐
│ Browser-Frontend              │
│ Gespräch | Denkstand | Export │
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│ ptspace-backend               │
│ Auth, Rechte, Workspaces       │
│ Service Requests, Datenschutz  │
└───────┬───────────────┬───────┘
        │               │
┌───────▼───────┐   ┌───▼────────────┐
│ Harness        │   │ lokales Git     │
│ opencode o. ä. │   │ Versionierung   │
└───────┬───────┘   └────────────────┘
        │
┌───────▼────────────────────────────┐
│ Projekt-Workspace                   │
│ Learning Design, Entscheidungen     │
│ Service Requests, Materialien       │
└───────┬────────────────────────────┘
        │
┌───────▼────────────────────────────┐
│ externe Schul-Nextcloud             │
│ nur freigegebene Exporte            │
└────────────────────────────────────┘
```

---

## 10. Repository-Workspaces

Intern kann jeder Planungsraum als Ordner mit Git-Repository gespeichert werden.

```text
workspaces/<planning-space-id>/
  .git/
  learning-design.md
  decisions.md
  open-questions.md
  next-steps.md
  conversation-summary.md
  service-requests/
  drafts/
  materials/
  exports/
  okf/
```

Der rohe Chat muss nicht vollständig als Markdown im Workspace liegen. Er kann je nach Datenschutzmodus in der Datenbank, gekürzt, zusammengefasst oder gar nicht dauerhaft gespeichert werden.

---

## 11. Datenschutzmodell

### Grundsatz

Die App soll Datenminimierung fördern.

### Datenschutzmodi, später

Mögliche Modi:

```text
Privat
- nur eigene Planungsräume
- keine Freigabe

Team
- gemeinsamer Planungsraum
- Beteiligte sehen Dialog und Denkstand

Export
- nur ausgewählte Materialien werden ausgegeben

Kurationsvorschlag
- sensible Inhalte werden entfernt
- OKF-Paket wird als Vorschlag erzeugt
```

### Sensible Inhalte

Die App soll warnen bei:

- Namen von Schüler:innen
- Noten
- Diagnosen
- Verhaltensbeschreibungen einzelner Personen
- familiären Details
- personenbezogenen Konflikten

Die App soll Umformulierungen anbieten:

```text
Statt „Max verweigert oft die Mitarbeit“ besser:
„Einige Lernende ziehen sich in offenen Gesprächsphasen eher zurück.“
```

---

## 12. OKF-Konzept

OKF ist das Austauschformat für kuratierte Ergebnisse.

### Exportierbare OKF-Typen

```text
learning_design
knowledge_proposal
method_pattern
source_collection
material_package
capability_proposal
```

### Beispiel Learning Design OKF

```markdown
---
type: learning_design
title: "Treu bleiben statt Angst"
status: proposal
subject: religion
grade: 9
license: CC BY 4.0
source_status: teacher_generated_review_needed
tags:
  - klima
  - handlungsfähigkeit
  - resilienz
  - religion
---

# Lernanliegen

...

# Lernreise

...

# Entscheidungen

...

# Offene Fragen

...
```

### Nicht OKF

Nicht als OKF exportieren:

- kompletter Chatverlauf
- persönliche Reflexionen ohne Freigabe
- sensible Lerngruppendetails
- unfertige interne Worker-Ergebnisse

---

## 13. Nextcloud-Integration

Nextcloud ist externe Schulablage.

### Ziel

Lehrkräfte sollen fertige Materialien dort finden, wo sie ohnehin arbeiten.

### Exportlogik

Die App fragt vor Export:

```text
Was möchtest du in Nextcloud ablegen?

[ ] Stundenentwurf.pdf
[ ] Arbeitsblatt.docx
[ ] Präsentation.pptx
[ ] Quellenübersicht.pdf
[ ] OKF-Paket.zip
```

### Nicht automatisch exportieren

- Chatverlauf
- interne Notizen
- Service Requests
- personenbezogene Beschreibungen
- unfertige Entwürfe ohne Freigabe

---

## 14. Rollen und Rechte

Version 0.1 kann einfach starten.

Später mögliche Rollen:

```text
Owner
- besitzt Planungsraum
- kann exportieren und löschen

Participant
- kann mitdenken und schreiben

Viewer
- kann lesen

Reviewer
- kann kommentieren / prüfen

Admin
- technische Verwaltung
```

Der Critical Friend ist keine Person und keine Rolle im Berechtigungssystem, sondern ein Systemakteur im Planungsraum.

---

## 15. MVP 0.1

### Ziel

Ein lokal oder institutionell betreibbarer Prototyp, der die Grundidee erfahrbar macht.

### Umfang

Muss:

- Planungsraum erstellen
- Chat mit Critical Friend
- Denkstand anzeigen
- offene Entscheidungen anzeigen
- nächste Schritte anzeigen
- Workspace-Dateien schreiben
- Git-Versionen speichern
- Markdown-Export

Soll:

- PDF/DOCX-Export
- einfacher OKF-Export
- Service Requests intern abbilden
- Harness-Schnittstelle zu opencode vorbereiten

Noch nicht:

- Forgejo
- vollständige Nextcloud-Integration
- Multi-Tenant-Betrieb
- SSO
- komplexe Worker-Landschaft
- H5P/Moodle/LiaScript-Renderer

---

## 16. MVP-User-Flow

1. Lehrkraft öffnet App.
2. Lehrkraft legt Planungsraum an.
3. Critical Friend fragt ruhig nach der Unterrichtsidee.
4. Lehrkraft beschreibt Idee.
5. Critical Friend antwortet mit einer klärenden Frage oder kurzen Zusammenfassung.
6. Denkstand aktualisiert sich.
7. Offene Entscheidungen erscheinen rechts.
8. App schlägt einen nächsten sinnvollen Schritt vor.
9. Lehrkraft bestätigt oder denkt weiter.
10. Bei ausreichender Klärung wird ein Materialentwurf vorbereitet.
11. Lehrkraft exportiert Material.

---

## 17. Qualitätskriterien

Die App ist gut, wenn Lehrkräfte sagen:

```text
Ich konnte klarer denken.
```

Nicht nur:

```text
Ich habe schneller ein Arbeitsblatt bekommen.
```

Weitere Kriterien:

- Die Lehrkraft behält Verantwortung.
- Die App produziert nicht vorschnell.
- Die UI bleibt ruhig.
- Der Denkstand ist hilfreich und nicht bürokratisch.
- Materialien sind erkennbar aus Entscheidungen abgeleitet.
- Datenschutz wird unterstützt, nicht nur juristisch erwähnt.
- Exporte sind nachvollziehbar und kontrolliert.

---

## 18. Offene Architekturfragen

Diese Fragen sind noch nicht endgültig entschieden:

1. Welche Technologie für Frontend?
   - z. B. SvelteKit, Next.js, Remix, Vue

2. Welche Technologie für Backend?
   - Node/TypeScript, Python/FastAPI, Go

3. Wie wird der Kernel eingebunden?
   - Git Submodule
   - Kopie bei Projektanlage
   - Package
   - synchronisierte Templates

4. Wie viel Chat wird gespeichert?
   - vollständig
   - gekürzt
   - nur Zusammenfassungen
   - konfigurierbar

5. Wie wird opencode isoliert?
   - Container pro Workspace
   - Prozess pro Session
   - zentraler Harness mit Workspace-Sandbox

6. Wie werden lokale und externe LLMs konfiguriert?

7. Wie wird OKF validiert?

8. Wie werden sensible Inhalte erkannt?

Diese Fragen sollten in `docs/architecture.md` weiter ausgearbeitet werden.

---

## 19. Nicht-Ziele

`ptspace-app` soll zunächst nicht sein:

- allgemeiner KI-Chat
- ChatGPT-Klon
- LMS
- Moodle-Ersatz
- Nextcloud-Ersatz
- Git-Oberfläche für Lehrkräfte
- opencode-Web-UI
- vollautomatische Unterrichtsmaschine
- Bewertungs- oder Diagnosesystem für Schüler:innen

---

## 20. Leitbild

`ptspace-app` transportiert ein bestimmtes Verständnis von Professionalität:

Lehrkräfte sind nicht bloße Auftraggeber:innen von KI-Produktion. Sie sind pädagogisch verantwortliche Subjekte, die im Dialog urteilen, abwägen, verwerfen, entscheiden und gestalten.

KI erscheint in dieser App nicht als Ersatz für professionelle Urteilskraft, sondern als strukturierter Resonanz-, Erinnerungs-, Recherche- und Umsetzungsraum.

Die Anwendung ist erfolgreich, wenn sie nicht nur bessere Materialien erzeugt, sondern bessere pädagogische Entscheidungen wahrscheinlicher macht.
