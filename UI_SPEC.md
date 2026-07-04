# UI_SPEC.md

# ptspace-app UI Specification

> Die Oberfläche von `ptspace-app` ist kein Agenten-Cockpit, kein Repo-Browser und keine IDE.  
> Sie ist ein pädagogischer Planungstisch für Lehrkräfte, der einen harness-basierten Pedagogical Thinking Space sicher und verständlich bedienbar macht.

---

## 1. UI-Leitbild

Die Anwendung soll sich anfühlen wie ein ruhiger professioneller Denkraum:

```text
Lehrkraft / Planungsteam
        ↕
Gespräch mit Critical Friend
        ↕
gemeinsamer Denkstand
        ↕
Materialien, Exporte, Austausch
```

Die UI übersetzt technische Strukturen konsequent in pädagogische Begriffe. Lehrkräfte sollen nicht mit Repositories, YAML-Dateien, Shell-Kommandos, Service-Request-Dateinamen, Harness-Permissions oder Provider-Details konfrontiert werden.

Zentrale UX-Regel:

> Links wird gedacht. Rechts wird sichtbar, was aus dem Denken geworden ist.

---

## 2. Grundlayout des Planungsraums

Der zentrale Arbeitsbereich besteht aus zwei Hauptzonen:

```text
┌───────────────────────────────────────────────┐
│ ptspace · <Planungsraum-Titel>                 │
├────────────────────────┬──────────────────────┤
│ Gespräch               │ Denkstand             │
│ mit Critical Friend    │                       │
│                        │ Unterrichtsidee        │
│                        │ Lernanliegen           │
│                        │ Offene Entscheidungen  │
│                        │ Nächste Schritte       │
│                        │ Entwürfe               │
│                        │ Bereit für Unterricht  │
└────────────────────────┴──────────────────────┘
```

### Linke Seite: Gespräch

Die linke Seite enthält den Dialog mit dem Critical Friend.

Sie dient der gemeinsamen pädagogischen Reflexion:

- Unterrichtsideen einbringen,
- Fragen klären,
- Entscheidungen vorbereiten,
- Zweifel prüfen,
- Erfahrungen und Wissen einbeziehen,
- nächste Schritte vereinbaren.

Die linke Seite ist nicht der Ort für technische Prompts.

Nicht teacher-facing:

```text
opencode permission ask
service_request status queued
bash command requires approval
container runtime missing
```

Teacher-facing:

```text
„Ich habe den Denkstand aktualisiert.“
„Sollen wir diese Entscheidung festhalten?“
„Ich kann daraus einen ersten Entwurf vorbereiten.“
„Für Audio fehlt hier noch eine freigegebene Runtime.“
```

### Rechte Seite: Denkstand

Die rechte Seite ist kein Menü und kein Dateibrowser. Sie ist eine lebendige, verdichtete Darstellung des aktuellen Planungsstands.

Sie zeigt:

- was schon geklärt ist,
- was noch offen ist,
- welche nächsten Schritte sinnvoll sind,
- welche Entwürfe entstanden sind,
- was für Unterricht oder Austausch bereitsteht.

---

## 3. Rechte Denkstand-Spalte als Kartenmodell

Die rechte Seite besteht aus kompakten, aufklappbaren Karten. Sie zeigt im Normalzustand Überblick statt Volltext.

Beispiel:

```text
Denkstand

Unterrichtsidee
Klimakrise, Ohnmacht und neue Handlungsfähigkeit

Lernanliegen
SuS sollen trotz politischer und emotionaler Ohnmacht ...

Offene Entscheidungen                      (3)
▸ Einstieg klären
▸ theologische Perspektive schärfen
▸ Ergebnis der Stunde bestimmen

Nächste Schritte                           (2)
▸ Lehrplanbezug prüfen
▸ Lernreise skizzieren

Entwürfe                                   (1)
▸ erster Gesprächsimpuls

Bereit für Unterricht                       (0)
Noch nichts freigegeben
```

### 3.1 Normalzustand einer Karte

Jede Karte zeigt im kompakten Zustand:

- Titel,
- kurze Zusammenfassung,
- Anzahl der offenen oder vorhandenen Einträge,
- die wichtigsten ein bis drei Einträge,
- optional einen Statushinweis.

Beispiel:

```text
Offene Entscheidungen (3)
▸ Einstieg klären
▸ theologische Perspektive schärfen
▸ Ergebnis der Stunde bestimmen
```

### 3.2 Aufgeklappter Zustand einer Karte

Bei Klick auf eine Karte wird sie aufgeklappt oder in einem Detailpanel geöffnet.

Beispiel:

```text
Offene Entscheidungen

1. Einstieg der Stunde
   Noch offen: Beginnen wir mit persönlicher Erfahrung,
   Nachrichtenausschnitt oder symbolischem Bild?

   [Im Gespräch klären] [Als entschieden markieren]

2. Theologische Perspektive
   Noch offen: Hoffnung, Verantwortung, Klage oder Berufung?

   [Im Gespräch klären] [Quelle suchen lassen]

3. Ergebnis der Stunde
   Noch offen: Gespräch, Aktion, persönlicher Vorsatz,
   Positionslinie oder gemeinsames Manifest?

   [Im Gespräch klären]
```

Die wichtigste Interaktion bleibt dialogisch. Ein Klick auf **„Im Gespräch klären“** setzt den Fokus im Chat:

```text
Critical Friend:
„Lass uns die offene Entscheidung zum Einstieg kurz klären. Soll der Einstieg eher emotional öffnen oder sachlich orientieren?“
```

---

## 4. Warum Karten statt Tabs oder vollständiger Listen?

### Nicht alle Inhalte vollständig untereinander

Wenn alle Inhalte dauerhaft vollständig sichtbar sind, wird die Denkstand-Spalte schnell zu lang und überfordernd. Die rechte Seite soll Orientierung geben, nicht ein zweites Dokument werden.

### Nicht nur Tabs

Tabs hätten den Nachteil, dass immer nur ein Bereich sichtbar ist. Der Denkstand soll aber gerade parallel zeigen:

```text
- Es gibt noch 3 offene Entscheidungen.
- Es gibt 2 nächste Schritte.
- Es gibt 1 Entwurf.
- Noch nichts ist freigegeben.
```

### Deshalb: kompakte, aufklappbare Denkstand-Karten

Dieses Muster verbindet Überblick und Detailtiefe.

---

## 5. Teacher-facing Begriffe

Technische Workspace-Strukturen werden nicht direkt angezeigt.

```text
Technische Struktur                       UI-Begriff
----------------------------------------------------
learning-design.md                        Denkstand
context                                   Rahmen
educational_intention                     Lernanliegen
learning_journey                          Lernreise
decisions.md                              Entscheidungen
open-questions.md                         Offene Fragen
tasks/                                    Nächste Schritte
service-requests/                         Aufträge im Hintergrund
drafts/                                   Entwürfe
materials/                                Materialien
exports/                                  Bereit für Unterricht
knowledge/_proposals/                     Zum Teilen vorgeschlagen
capabilities/                             Fähigkeiten im Hintergrund
opencode session                          Laufender Denkraum
```

Die UI darf Dateipfade nur in Admin-, Debug- oder Entwickleransichten zeigen.

---

## 6. Hauptnavigation

Die Hauptnavigation soll knapp bleiben.

Empfohlene Bereiche:

```text
Planungsräume
Gespräch
Materialien
Export / Teilen
Einstellungen
```

Im Planungsraum selbst werden die wesentlichen Bereiche über die rechte Denkstand-Spalte zugänglich gemacht:

```text
Denkstand
Offene Entscheidungen
Nächste Schritte
Entwürfe
Materialien
Bereit für Unterricht
Zum Teilen vorgeschlagen
```

---

## 7. Planungsräume

Ein Planungsraum ist das zentrale Kollaborationsobjekt.

Er enthält:

- Titel,
- Zielgruppe,
- Fach / Lernbereich,
- Beteiligte,
- Chatverlauf,
- aktuellen Denkstand,
- Entscheidungen,
- offene Fragen,
- nächste Schritte,
- Worker-Ergebnisse,
- Materialien,
- Exporte,
- interne Versionen.

Kollaboration findet nicht als Git-Kollaboration statt, sondern als gemeinsamer pädagogischer Dialograum mit dem Critical Friend.

---

## 8. Gesprächsbereich

### 8.1 Tonalität

Der Chat soll ruhig, kollegial und konzentriert wirken.

Nicht:

```text
„Gib deinen Prompt ein.“
„Agent führt Task aus.“
„Tool call pending.“
```

Sondern:

```text
„Woran möchtest du heute weiterdenken?“
„Ich sehe hier eine Spannung, die für das Learning Design wichtig sein könnte.“
„Sollen wir diesen Gedanken erst klären, bevor Material entsteht?“
```

### 8.2 Eingabefeld

Das Eingabefeld soll offene pädagogische Sprache unterstützen.

Placeholder-Beispiele:

```text
„Beschreibe deine Unterrichtsidee ...“
„Was ist gerade noch unklar?“
„Woran möchtest du weiterdenken?“
```

### 8.3 Vorschläge im Chat

Der Critical Friend darf teacher-facing Aktionen vorschlagen:

```text
[Diese Entscheidung festhalten]
[Im Gespräch vertiefen]
[Ersten Entwurf vorbereiten]
[Lehrplanbezug prüfen]
[Als offene Frage stehen lassen]
```

Diese Buttons erzeugen intern Tasks oder Service Requests, zeigen aber keine technischen Details.

---

## 9. Statusanzeigen

Die App braucht ruhige Statusanzeigen für laufende Hintergrundarbeit.

Teacher-facing Status:

```text
bereit
ich denke kurz mit
Denkstand aktualisiert
Entwurf wird vorbereitet
Ergebnis wird geprüft
wartet auf deine pädagogische Entscheidung
freigegeben
für Unterricht bereit
Integration fehlt
Admin-Freigabe nötig
```

Nicht teacher-facing:

```text
queued
in-progress
returned
reviewed
opencode permission ask
service request yaml invalid
provider secret missing
```

Technische Zustände werden durch Backend und Critical Friend übersetzt.

---

## 10. Aufgaben und Aktionen

### 10.1 Aufgaben als pädagogische nächste Schritte

Tasks heißen in der UI nicht „Tasks“, sondern meist:

```text
Nächste Schritte
```

Beispiele:

```text
- Lernanliegen klären
- Lehrplanbezug prüfen
- Lernreise skizzieren
- ersten Schülerauftrag entwerfen
- Differenzierung ergänzen
- Material auf Sprache prüfen
- OKF-Paket vorbereiten
```

### 10.2 Aktionssprache

Teacher-facing Aktionen sollen professionell verständlich sein:

```text
Im Gespräch klären
Entwurf vorbereiten
Prüfen lassen
Für Unterricht freigeben
Zum Teilen vorschlagen
In Nextcloud exportieren
```

Nicht:

```text
Run worker
Execute service request
Render output
Approve tool call
Commit files
```

---

## 11. Materialbereich

Materialien werden nach pädagogischem Status gruppiert:

```text
Entwürfe
- noch nicht geprüft
- aus dem Learning Design abgeleitet

In Prüfung
- Critical Friend prüft Passung
- ggf. Review Worker

Für Unterricht bereit
- von Lehrkraft freigegeben
- exportierbar

Zum Teilen vorgeschlagen
- OKF-kompatibel vorbereitet
- noch nicht kuratiert
```

Ein Material zeigt:

- Titel,
- Typ,
- Kurzbeschreibung,
- Entstehungsgrund,
- Bezug zum Learning Design,
- Status,
- letzte Änderung,
- mögliche Aktionen.

---

## 12. Export / Teilen

Export ist eine bewusste Handlung.

Mögliche Ziele:

```text
- Markdown
- PDF
- DOCX
- H5P
- Moodle-Paket
- OKF-Paket
- externe Nextcloud
```

Der rohe Chat wird nicht automatisch exportiert.

OKF-Export enthält kuratierte Ergebnisse:

```text
- Learning Design
- Entscheidungen
- Quellen
- Materialien
- didaktische Muster
- Knowledge Proposals
```

Nextcloud-Export enthält fertige Unterrichtsdateien, nicht interne Denkraum-Dateien.

---

## 13. Integrationen und Einstellungen

Integrationen werden nicht im Chat konfiguriert.

Teacher-facing Integrationsbereich:

```text
Einstellungen
  Integrationen
    Nextcloud
    Audio / TTS
    Exportformate
```

Admin-facing Bereich:

```text
Administration
  Runtimes
    opencode
    local_tts
    comfyui
  Provider
    ElevenLabs
    local LLM
  Secrets
  Policies
```

Der Critical Friend darf erklären, wo eine Integration eingerichtet wird, darf aber keine API-Keys im Chat entgegennehmen.

Beispiel:

```text
„Bitte poste den API-Key nicht im Chat. Du kannst ihn unter Einstellungen → Integrationen → ElevenLabs hinterlegen. Ich sehe den Schlüssel nicht, sondern nur, ob die Integration verfügbar ist.“
```

---

## 14. Fehler- und Fehlende-Fähigkeiten-Dialoge

Fehlende technische Fähigkeiten werden nicht als technische Fehlermeldung angezeigt.

Nicht:

```text
ComfyUI container not found
provider secret missing
tts-generation skill unavailable
```

Sondern:

```text
„Lokale Audioerzeugung ist hier noch nicht eingerichtet. Ich kann zunächst das Dialogskript und ein Sprecher:innen-Konzept vorbereiten. Für die eigentliche Audiofassung braucht es eine freigegebene Audio-Runtime oder eine erlaubte TTS-Integration.“
```

Bei administrativ relevanten Themen:

```text
„Ich kann einen kurzen Installationsvorschlag für die Administration vorbereiten.“
```

---

## 15. Lehrer:innen-Modus und Admin-Modus

### Lehrer:innen-Modus

Zeigt keine technischen Artefakte:

- keine Shell,
- kein YAML,
- keine Git-Kommandos,
- keine Dateipfade,
- keine Provider-Secrets,
- keine technischen Permission-Prompts.

### Admin-/Entwicklungsmodus

Darf technische Details zeigen:

- Harness-Status,
- Workspace-Pfade,
- Service-Request-YAML,
- Logs,
- Runtime-Status,
- Provider-Konfiguration,
- Policy-Entscheidungen.

Diese Modi müssen klar getrennt sein.

---

## 16. Mobile und Tablet

Die App soll im Browser auf Tablet und Desktop nutzbar sein.

Auf kleinen Bildschirmen wird aus dem Zwei-Spalten-Layout ein fokussiertes Layout:

```text
[Gespräch]
[Denkstand]
[Materialien]
[Export]
```

Die rechte Denkstand-Spalte kann auf Tablet als ausziehbares Panel erscheinen.

Lokale Runtimes wie ComfyUI sind nicht für Tablet-Betrieb gedacht. Tablets bedienen die App, führen aber keine schweren Worker aus.

---

## 17. UI-Entscheidungen

- **Entscheidung 39:** Die UI wird als pädagogischer Planungstisch beschrieben, nicht als Agenten-, Repo- oder IDE-Oberfläche.
- **Entscheidung 40:** SvelteKit + Tailwind ist der vorgeschlagene Frontend-Stack.
- **Entscheidung 41:** Das Backend bleibt als eigene Schutz- und Orchestrierungsschicht getrennt vom Frontend.
- **Entscheidung 42:** Lehrer:innen-Modus zeigt keine technischen Artefakte wie Dateipfade, YAML, Git, Shell, Permissions oder Provider-Details.
- **Entscheidung 43:** UI-Komponenten übersetzen Workspace-Zustände in pädagogische Begriffe.
- **Entscheidung 44:** Die rechte Seite besteht aus kompakten, aufklappbaren Denkstand-Karten.
- **Entscheidung 45:** Karten zeigen im Normalzustand Zusammenfassung, Anzahl und wichtigste Einträge.
- **Entscheidung 46:** Klick auf eine Karte öffnet Details und pädagogische Aktionen.
- **Entscheidung 47:** Die wichtigste Aktion heißt nicht technisch „Task ausführen“, sondern z. B. „Im Gespräch klären“, „Entwurf vorbereiten“, „Prüfen lassen“, „Für Unterricht freigeben“.
- **Entscheidung 48:** Detailaktionen führen zurück in den Dialog mit dem Critical Friend, statt die Lehrkraft in technische Bearbeitungsformulare zu schicken.

---

## 18. Nicht-Ziele der UI

Die UI soll nicht sein:

- ChatGPT-Klon,
- Prompt-Bibliothek,
- sichtbare Agentenplattform,
- IDE,
- Git-Client,
- Forgejo-Ersatz,
- Dateimanager,
- Schulplattform-Automatisierer,
- Admin-Konsole für Lehrkräfte.

Sie soll sein:

> Eine sichere, ruhige und professionelle Oberfläche für einen harness-basierten pädagogischen Denkraum.

---

## Harness Settings UI

Harness selection is an advanced setting, not part of the normal planning conversation.

Suggested location:

```text
Einstellungen
  → Harness
```

The UI may offer:

```text
○ Integrated Docker Harness
○ Local Desktop Harness via Bridge
○ External Institutional Harness
○ Development / Mock Harness
```

Advanced users may choose local tools such as Claude Code, Codex or Hermes if the corresponding bridge is available.

Teacher-facing status language:

```text
Local Claude Code harness: available through desktop bridge
Integrated opencode harness: available
External school harness: not configured
```

Do not show raw technical details such as auth file paths, API keys, OAuth tokens, shell commands or container mounts in the teacher-facing flow.

If a local harness is not available, the Critical Friend may say:

> "No approved local harness is currently available. You can start the desktop bridge or use the integrated harness if it is configured."

The Critical Friend must never ask the user to paste credentials into the chat.

