# UI_SPEC.md

# ptspace-app UI Specification

Stand: 2026-07-16

> Die Oberfläche von `ptspace-app` ist kein Agenten-Cockpit, kein Repo-Browser, keine IDE und kein Verwaltungsdashboard.  
> Sie ist ein gemeinsamer pädagogischer Denkraum, der einen harness-basierten Pedagogical Thinking Space sicher und verständlich bedienbar macht.

Die verbindlichen Gestaltungsprinzipien stehen ergänzend in `REFACTOR-UX.md`.

---

## 1. UI-Leitbild

Die Anwendung soll sich anfühlen wie ein ruhiger professioneller Denkraum:

```text
Lehrkraft / Planungsteam
        ↕
Gespräch mit Critical Friend
        ↓
festgehaltene Gedanken · Entscheidungen · Arbeitsvorhaben
        ↓
Lernlandschaft · Zeitplanung · Knowledge · Materialien
```

Zentrale UX-Regel:

> Im Zentrum wird gemeinsam gedacht.  
> Im Raum wird sichtbar, was aus dem Denken hervorgegangen ist.

Die UI übersetzt technische Strukturen konsequent in pädagogische Begriffe. Lehrkräfte werden nicht mit Repositories, YAML-Dateien, Shell-Kommandos, Service-Request-Dateinamen, Harness-Permissions oder Provider-Details konfrontiert.

---

## 2. Grundlayout des Planungsraums

Der zentrale Arbeitsbereich besteht nicht aus gleichgewichtigen Dashboard-Spalten. Er besitzt eine klare visuelle Hierarchie:

```text
┌─────────────────────────────────────────────────────────────┐
│ Planungsraum · Titel                         Einstellungen   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│             gemeinsamer Denk- und Gesprächsraum              │
│                                                             │
│   [Windrose]                           [Pinnwand]            │
│   Lernlandschaft                       Jetzt wichtig         │
│                                                             │
│          Gespräch mit Critical Friend                        │
│          und dauerhaft erreichbare Eingabe                   │
│                                                             │
│   [Sanduhr]       [Werkstatt]        [Bücherregal]           │
│   Zeit            Im Hintergrund     Knowledge               │
│                                                             │
│                         [Materialmappe]                       │
└─────────────────────────────────────────────────────────────┘
```

Die Illustration ist optional. Die semantischen Bereiche und ihre Beschriftungen sind verbindlich.

### 2.1 Visuelle Priorität

1. Gespräch und Eingabe
2. genau ein Gegenstand unter „Jetzt wichtig“
3. laufende Hintergrundarbeit
4. räumliche beziehungsweise lineare Bereichszugänge
5. vollständige Übersichten und Detailansichten

### 2.2 Gemeinsame Arbeitsszene

Die Hauptansicht darf zwei abstrahierte Perspektiven an einer gemeinsamen Arbeitsfläche zeigen.

Zulässig:

- reduzierte Silhouetten,
- Licht- oder Präsenzpunkte,
- gemeinsamer Tisch,
- Blatt, Skizze oder Plan als Mittelpunkt.

Nicht zulässig:

- detaillierte Avatare,
- simulierte Mimik oder Emotionalität,
- dauerndes Gestikulieren,
- Figuren, die technische Agentenrollen darstellen,
- spielartige Belohnungsanimationen.

---

## 3. Gesprächsbereich

### 3.1 Rolle

Das Gespräch mit dem Critical Friend ist die primäre Interaktionsform.

Es dient der gemeinsamen pädagogischen Reflexion:

- Unterrichtsideen einbringen,
- Fragen klären,
- Entscheidungen vorbereiten,
- Zweifel prüfen,
- Erfahrungen und Wissen einbeziehen,
- nächste Schritte vereinbaren,
- Ergebnisse fachlich prüfen.

Der Gesprächsbereich ist nicht der Ort für technische Prompts.

Nicht teacher-facing:

```text
opencode permission ask
service_request status queued
bash command requires approval
container runtime missing
```

Teacher-facing:

```text
„Sollen wir diesen Gedanken festhalten?“
„Ich kann daraus einen ersten Entwurf vorbereiten.“
„Der Entwurf wird im Hintergrund vorbereitet.“
„Das Ergebnis ist da. Passt es für deinen Unterricht?“
```

### 3.2 Tonalität

Der Chat wirkt ruhig, kollegial und konzentriert.

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

### 3.3 Eingabefeld

Das Eingabefeld bleibt dauerhaft erreichbar.

Placeholder-Beispiele:

```text
„Beschreibe deine Unterrichtsidee oder die offene Frage.“
„Was ist gerade noch unklar?“
„Woran möchtest du weiterdenken?“
```

Ein Fokus-Chip kann anzeigen, worauf sich die nächste Nachricht bezieht:

```text
Weiterreden über: Einstieg in Lernmoment 2
Weiterreden über: Entwurf „KI-Tagebuch“
Weiterreden über: offene Entscheidung zur Ergebnissicherung
```

Der Fokus-Chip verändert keine kanonischen Daten.

---

## 4. Gesprächsmarker und Herkunft

Relevante Nachrichten können teacher-facing Marker tragen.

```ts
type ConversationMarkerKind =
  | 'captured_note'
  | 'open_decision'
  | 'work_started'
  | 'result_returned'
  | 'ready_for_class';
```

Darstellung:

| Marker | Bedeutung | Ziel |
|---|---|---|
| Zettel | Gedanke festgehalten | Pinnwand / Denkstand |
| Fragezeichen | offene Entscheidung entstanden | Entscheidungsdetail |
| Arbeitszeichen | Vorbereitung gestartet | Werkstatt / Arbeitsvorhaben |
| Ergebniszeichen | Ergebnis zurückgekehrt | Ergebnisprüfung |
| Häkchen | für Unterricht freigegeben | Material |

Regeln:

- Marker sind mit sichtbarem Kurzlabel oder Accessible Name versehen.
- Ein Klick öffnet das Ziel.
- Das Ziel bietet einen Rücksprung zur auslösenden Nachricht.
- Marker verweisen nur auf validierte Ziele desselben Planungsraums.
- Ein Marker ist kein Ersatz für das kanonische Zielartefakt.
- Der gesamte Chat wird dadurch nicht kanonisch.

### 4.1 Chatfilter

Im Gespräch werden folgende Filter angeboten:

```text
Alle
Festgehaltenes
Offene Entscheidungen
Vorbereitungen und Ergebnisse
```

Ein Filter zeigt neben der markierten Nachricht genügend Kontext. Die ungefilterte chronologische Ansicht bleibt jederzeit erreichbar.

---

## 5. Pinnwand und gemeinsamer Denkstand

Die Pinnwand ist eine kompakte Projektion, kein vollständiges zweites Dokument.

Sie zeigt im Normalzustand:

- den zuletzt relevanten festgehaltenen Gedanken,
- genau eine aktuell wichtige Entscheidung oder Ergebnisprüfung,
- einen Hinweis auf weitere Einträge.

Beispiel:

```text
Pinnwand

Zuletzt festgehalten
„Die Schüler:innen sollen KI-Nutzung nicht nur bewerten,
sondern ihr eigenes Handeln begründen können.“

Jetzt wichtig
? Soll Gottesebenbildlichkeit als Impuls oder vertieftes Konzept vorkommen?

[Öffnen] [Weiterreden]
```

Ein Klick auf „Denkstand ansehen“ öffnet die vollständige strukturierte Ansicht.

Die vollständige Ansicht kann enthalten:

- Metadaten,
- Lernanliegen,
- aktuelle Begründungen,
- offene Entscheidungen,
- getroffene Entscheidungen,
- nächste sinnvolle Schritte,
- Bezüge zu Lernmomenten,
- Links zurück in das Gespräch.

---

## 6. „Jetzt wichtig“

Die API liefert höchstens eine `AttentionCard`.

Priorität:

1. Sicherheits- oder Blockierungsproblem,
2. fertiges Ergebnis zur Lehrkraftprüfung,
3. angenommener Vorschlag, dessen Start fehlgeschlagen ist,
4. neuer Gesprächsvorschlag,
5. konkrete offene pädagogische Entscheidung,
6. erstes offenes Arbeitsvorhaben,
7. Gespräch fortsetzen.

Eine entscheidbare Karte zeigt höchstens zwei Aktionen:

```text
✓ Passt
✎ Weiterreden
```

beziehungsweise:

```text
✓ Passt für den Unterricht
✎ Weiterreden
```

Regeln:

- Das Häkchen führt die zulässige Aktion unmittelbar aus.
- Kein Bestätigungsmodal.
- Kein zweiter Start- oder Freigabeschritt.
- Der Stift setzt nur den Gesprächsfokus.
- Das Ergebnis ist vor der Freigabe sichtbar.
- Mehrere offene Gegenstände werden nicht als konkurrierender Kartenstapel gezeigt.

---

## 7. Räumliche Bereichszugänge

### 7.1 Windrose / Lernlandschaft

Öffnet die Lernlandschaft und springt bei vorhandenem Fokus zum relevanten Lernmoment.

Accessible Label:

```text
Lernlandschaft öffnen
```

### 7.2 Sanduhr / Zeit & Dramaturgie

Öffnet Unterrichtsfenster, zeitliche Platzierungen, Konflikte und Dramaturgie.

Accessible Label:

```text
Zeit und Dramaturgie öffnen
```

### 7.3 Werkstatt / Vorbereitungen

Öffnet die kompakte Übersicht laufender, zurückgekehrter und blockierter Arbeitsvorhaben.

Accessible Label:

```text
Vorbereitungen im Hintergrund öffnen
```

### 7.4 Bücherregal / Knowledge

Öffnet Quellen, geprüfte Bezüge, Abrufdatum, Unsicherheit und Knowledge Proposals.

Accessible Label:

```text
Knowledge und Quellen öffnen
```

### 7.5 Materialmappe / Materialien

Öffnet Entwürfe, zur Prüfung stehende und freigegebene Unterrichtsmaterialien.

Accessible Label:

```text
Materialien öffnen
```

### 7.6 Alternative lineare Navigation

Alle Raumzugänge werden zusätzlich in einer linearen, per Tastatur erreichbaren Navigation angeboten.

```text
Planung
- Lernlandschaft
- Zeit & Dramaturgie
- Planungsboard

Wissen und Ergebnisse
- Knowledge und Quellen
- Materialien

Aktivität
- Im Hintergrund
```

---

## 8. Lernlandschaft

Die Lernlandschaft stellt didaktische Zusammenhänge dar.

Sie unterstützt:

- lineare Lernreisen,
- Wahlwege,
- Stationen,
- parallele Lernmomente,
- Übergänge mit didaktischer Bedeutung,
- Gruppenflächen für Phasen oder Räume,
- Canvas- und lineare Lesansicht.

Ein aus dem Denkraum übergebener Fokus öffnet den passenden Lernmoment.

Strukturelle KI-Vorschläge benötigen:

- Vorschau,
- erkennbare Änderungen,
- Übernehmen,
- im Gespräch ändern,
- Verwerfen.

Ohne Zustimmung erfolgt keine kanonische Änderung.

---

## 9. Zeit & Dramaturgie

Die Zeitansicht zeigt:

- Unterrichtsfenster,
- Lernmomente pro Zeitfenster,
- mehrfach verwendete Lernmomente,
- Wahl- und Stationsmomente,
- Konflikte,
- unzugeordnete Lernmomente,
- dramaturgische Hinweise.

Die Zeitansicht verändert nicht die semantische Lernlandschaft. Sie platziert bestehende Lernmomente zeitlich.

---

## 10. Planungsboard

Das Planungsboard ist eine Arbeitsübersicht, keine Pflichtstation des geführten Workflows.

Spalten:

```text
Noch klären
Vorbereiten
Zur Prüfung
Bereit
```

Board-Verschiebungen starten niemals Worker.

Ein angenommener Gesprächsvorschlag erzeugt serverseitig atomar:

- genau eine Board-Karte,
- genau einen Service Request,
- genau einen Queue-Eintrag.

Die Lehrkraft muss das Board dafür nicht öffnen.

---

## 11. Werkstattleiste und Hintergrundarbeit

Laufende Arbeit wird klein, persistent und nicht unterbrechend angezeigt.

Beispiel:

```text
Im Hintergrund
◌ Lehrplanbezug wird geprüft
◌ Arbeitsauftrag wird vorbereitet
1 Ergebnis wartet auf deine Prüfung
```

Die kompakte Leiste zeigt:

- Anzahl,
- teacher-facing Titel,
- teacher-facing Status,
- gegebenenfalls Ergebniszugang.

Nicht anzeigen:

```text
queued
worker-3
service-request-id
provider
harness
workspace path
prompt
```

Verhalten:

- SSE für Ereignisse,
- GET-Zustand bleibt autoritativ,
- begrenztes Polling bei Verbindungsabbruch,
- kein automatischer Perspektivwechsel,
- kein Fokusraub,
- ruhiger `aria-live="polite"`-Hinweis bei Fertigstellung,
- subtile Animation nur während realer Aktivität.

---

## 12. Materialien und Ergebnisprüfung

Materialien werden nach pädagogischem Status gruppiert:

```text
Entwürfe
Zur Prüfung
Für Unterricht bereit
```

Ein fertiges Ergebnis erscheint zunächst direkt in „Jetzt wichtig“.

Die Karte zeigt:

- Materialtitel,
- Entstehungsgrund,
- Bezug zum Lernmoment,
- Markdown-Vorschau oder vollständigen aufklappbaren Inhalt,
- AutomaticCheck,
- Critical-Friend-Prüfung,
- Aktionen `✓ Passt für den Unterricht` und `✎ Weiterreden`.

Der Materialbereich bleibt Sammlung und Nachweis, nicht zusätzlicher Workflow-Schritt.

---

## 13. Knowledge

Knowledge wird nicht als technisches Dateiverzeichnis dargestellt.

Teacher-facing Informationen:

- Quelle,
- Titel,
- kurzer Bezug zur Planung,
- Abrufdatum,
- Prüfstatus,
- Unsicherheit,
- Projektbezug,
- Status eines Knowledge Proposals.

Ein Bücherregal darf als Zugang dienen. Die eigentliche Ansicht bleibt eine klare, durchsuchbare Quellen- und Wissensübersicht.

---

## 14. Sichtbare Zustandsübergänge

Zulässige kurze Übergänge:

- Zettel aus dem Gespräch zur Pinnwand,
- Fragezeichen zur offenen Entscheidung,
- Arbeitsvorhaben zur Werkstatt,
- Ergebnis zurück zur Prüfung.

Anforderungen:

- einmalig pro neuem Ereignis,
- kurz,
- nicht blockierend,
- kein Fokus- oder Scrollwechsel,
- nach Reload nicht erneut,
- Reduced-Motion-Alternative,
- Status auch ohne Animation sichtbar.

Sound ist optional, separat abschaltbar und nie einziger Bedeutungsträger.

---

## 15. Teacher-facing Begriffe

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
service-requests/                         Im Hintergrund / Vorbereitungen
drafts/                                   Entwürfe
materials/                                Materialien
exports/                                  Für Unterricht bereit
knowledge/_proposals/                     Zum Teilen vorgeschlagen
capabilities/                             Fähigkeiten im Hintergrund
opencode session                          Laufender Denkraum
```

Dateipfade erscheinen nur in Admin-, Debug- oder Entwickleransichten.

---

## 16. Statussprache

Teacher-facing:

```text
bereit
ich denke kurz mit
Denkstand aktualisiert
wird vorbereitet
wird geprüft
wartet auf deine pädagogische Entscheidung
für Unterricht bereit
Integration fehlt
Admin-Freigabe nötig
```

Nicht teacher-facing:

```text
queued
in_progress
returned
reviewed
opencode permission ask
service request yaml invalid
provider secret missing
```

Technische Zustände werden durch Backend und Critical Friend übersetzt.

---

## 17. Hauptnavigation

Die globale Navigation bleibt knapp:

```text
Planungsräume
aktueller Denkraum
Materialien
Export / Teilen
Einstellungen
```

Innerhalb des Denkraums bildet die räumliche und lineare Bereichsnavigation die vorhandenen Funktionen ab.

Die bisherige Reihe gleichgewichtiger Haupttabs wird nicht als primäre Navigation beibehalten.

---

## 18. Responsive Verhalten

Auf Desktop kann die ruhige Raumkomposition sichtbar sein.

Unterhalb definierter Breiten wird sie schrittweise vereinfacht:

### Tablet

- Gespräch dominiert.
- Pinnwand erscheint als kompakte Seiten- oder Overlaykarte.
- Raumzugänge werden als beschriftete Symbolleiste angeboten.

### Mobil

Reihenfolge:

1. Gespräch,
2. Eingabe,
3. „Jetzt wichtig“,
4. Hintergrundarbeit,
5. lineare Bereichsnavigation.

Die Illustration kann vollständig entfallen.

---

## 19. Barrierefreiheit

Verbindlich:

- vollständige Tastaturbedienung,
- sichtbare Fokuszustände,
- logische Fokusreihenfolge,
- Accessible Names für alle Symbole,
- `aria-live="polite"` für nicht dringliche Ergebnisse,
- ausreichender Kontrast,
- keine Information nur durch Farbe,
- keine Information nur durch Position,
- keine Information nur durch Bewegung,
- keine Information nur durch Ton,
- Unterstützung von `prefers-reduced-motion`,
- funktionsgleiche lineare Navigation,
- sinnvolle Screenreader-Überschriften und Landmarken.

---

## 20. Nicht zulässige UX-Muster

- konkurrierende Hauptkarten für alle offenen Entscheidungen,
- fünf gleichgewichtige Perspektivtabs als dominierende Navigation,
- automatischer Wechsel zur Material- oder Boardansicht,
- Worker- oder Provider-Cockpit,
- dauerbewegte Figuren,
- Erfolgs-Jingles,
- Punkte, Level oder Fortschrittsbelohnungen,
- versteckte Hover-only-Navigation,
- Board-Drop als Worker-Start,
- Bestätigungsmodal nach `✓ Passt`,
- technischer Status im Lehrkräftemodus.

---

## 21. Abnahme des Hauptbildschirms

Der Hauptbildschirm ist abgenommen, wenn:

- der gemeinsame Gesprächscharakter unmittelbar erkennbar ist,
- das Gespräch den größten visuellen und funktionalen Raum erhält,
- höchstens eine Karte als „Jetzt wichtig“ konkurriert,
- Pinnwand und Marker die Entstehung fachlicher Zustände nachvollziehbar machen,
- laufende Arbeit ruhig sichtbar bleibt,
- alle Bereiche beschriftet und per Tastatur erreichbar sind,
- die Anwendung ohne Illustration, Animation und Ton vollständig funktioniert,
- keine technischen Interna sichtbar werden,
- kein zusätzlicher Pflichtklick im Zwei-Häkchen-Workflow entsteht.
