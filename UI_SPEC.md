# UI_SPEC.md

# ptspace-app UI Specification

Stand: 2026-07-17

> `ptspace-app` ist kein Agenten-Cockpit, Repo-Browser, keine IDE und kein Verwaltungsdashboard.  
> Die Anwendung ist ein gemeinsamer pädagogischer Denkraum für Lehrkräfte und Critical Friend.

Verbindlich sind ergänzend `REFACTOR-UX.md`, `PRODUCT_SPEC.md`, `TASKS.md` und `docs/guided-workflow-tasks.md`.

## 1. Leitbild

```text
Lehrkraft / Planungsteam
        ↕
Gespräch mit Critical Friend
        ↓
Denkstand · Entscheidungen · Vorbereitungen
        ↓
Lernlandschaft · Zeit · Knowledge · Materialien
```

> Im Zentrum wird gemeinsam gedacht. Im Raum wird sichtbar, was aus dem Denken hervorgegangen ist.

Technische Begriffe, Dateipfade, Provider, Harness, Queue und Service-Request-IDs erscheinen nicht im Lehrkräftemodus.

## 2. Visuelle Referenz „Quietude & Thought“

Der Screendesign-Entwurf ist Referenz für Atmosphäre, Hierarchie und Materialität, nicht pixelgenaue Vorlage.

Übernommen werden:

- warmer, heller und weitgehend freier Denkraum,
- Gespräch als ungefähr 75 Prozent der Aufmerksamkeit,
- Pinnwand als zurückgesetzte Tiefenebene rechts,
- Papierflächen mit weichen Ambient Shadows,
- dunkles Petrol für Text und zentrale Aktionen,
- Salbeigrün für Fokus und Herkunftsbezüge,
- Source Serif 4 für Überschriften und Reflexionstexte,
- hochlesbare Sans-Serif für kompakte UI-Metadaten,
- flacher Composer mit Kontext-Anker,
- diskrete Navigation und einzeilige Statusbar.

Nicht übernommen werden:

- englische Werkzeuglabels wie `TABLE`, `PIN`, `MAP`, `WORK`,
- dauerhaft geöffnete Werkzeugleiste,
- ein Header ohne aktuellen Planungsraum,
- eine kaum noch erkennbare Pinnwand,
- übergroße gleichförmige Nachrichtenkarten.

## 3. Grundlayout

```text
┌───────────────────────────────────────────────────────────┐
│ Planungsräume                                             │
│ KI-Nutzung bei den Hausaufgaben                   ···     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Gespräch und gemeinsamer Denkraum       Pinnwand         │
│  ca. 75 % der Aufmerksamkeit             zurückgesetzt    │
│                                                           │
│  [dauerhaft erreichbarer Composer mit Kontext-Anker]      │
│                                                           │
│  Windrose · Sanduhr · Bücher             Im Hintergrund   │
└───────────────────────────────────────────────────────────┘
```

Visuelle Priorität:

1. Gespräch und Eingabe,
2. genau ein Gegenstand unter „Jetzt wichtig“,
3. laufende Hintergrundarbeit,
4. räumliche und lineare Zugänge,
5. vollständige Detailansichten.

Die Hauptansicht darf eine abstrahierte gemeinsame Arbeitsszene zeigen. Detaillierte Avatare, simulierte Emotionalität und dauernde Gesten sind ausgeschlossen.

## 4. Header

Der Header zeigt:

1. `Planungsräume` als kleine Produkt- oder Bereichsmarke,
2. den aktuellen Planungsraum als primäre Überschrift,
3. diskrete Aktionen für Beteiligte, Einstellungen und Mehr-Menü.

Der aktuelle Raumtitel darf nie hinter dem Produktnamen zurücktreten.

## 5. Gespräch

Das Gespräch ist die primäre Interaktionsform. Es dient der Reflexion, Klärung, Entscheidungsfindung, Fokussierung und fachlichen Prüfung.

Teacher-facing Sprache:

```text
„Sollen wir diesen Gedanken festhalten?“
„Ich kann daraus einen ersten Entwurf vorbereiten.“
„Der Entwurf wird im Hintergrund vorbereitet.“
„Das Ergebnis ist da. Passt es für deinen Unterricht?“
```

Nicht teacher-facing:

```text
queued
worker started
permission ask
service request invalid
```

### 5.1 Nachrichten als Papiernotizen

Nachrichten dürfen wie abgelegte Papiernotizen erscheinen, bleiben aber Teil eines fließenden Gesprächs:

- keine klassische Messenger-Sprechblasenästhetik,
- keine übergroßen gleichförmigen Karten,
- konsistente Rollen- und Zeitmetadaten,
- großzügige, aber nicht leere Innenabstände,
- gute Lesbarkeit bei hohem Zoom.

### 5.2 Composer und Fokus

Das Eingabefeld bleibt dauerhaft erreichbar. Ein Fokus-Chip zeigt den aktuellen Bezug, verändert aber keine kanonischen Daten.

Bevorzugte Labels:

```text
Aus der Pinnwand
Bezug: Notiz #04
Im Gespräch aufgegriffen
Weiterreden über: Lernmoment 2
```

`In den Chat übernommen` ist nicht die Standardformulierung, weil sie den Systemvorgang statt der fachlichen Herkunft beschreibt.

Ein Plus-Symbol wird nur verwendet, wenn seine Funktion sichtbar beschriftet oder per Tooltip eindeutig ist. Bezug, Datei und Material sind unterscheidbare Aktionen.

## 6. Gesprächsmarker und Filter

```ts
type ConversationMarkerKind =
  | 'captured_note'
  | 'open_decision'
  | 'work_started'
  | 'result_returned'
  | 'ready_for_class';
```

| Marker | Bedeutung | Ziel |
|---|---|---|
| Zettel | festgehaltener Gedanke | Pinnwand / Denkstand |
| Fragezeichen | offene Entscheidung | Entscheidungsdetail |
| Arbeitszeichen | Vorbereitung gestartet | Werkstatt / Board |
| Ergebniszeichen | Ergebnis zurück | Prüfung |
| Häkchen | für Unterricht bereit | Material |

Marker sind bidirektional: Chat → Ziel und Ziel → auslösende Nachricht. Sie verweisen nur auf validierte Ziele desselben Planungsraums.

Filter:

```text
Alle
Festgehaltenes
Offene Entscheidungen
Vorbereitungen & Ergebnisse
```

Gefilterte Ansichten zeigen genügend Gesprächskontext.

## 7. Pinnwand und „Jetzt wichtig“

Die Pinnwand ist im Ruhezustand eine sichtbare, atmosphärisch zurückgesetzte Tiefenebene.

- Überschrift und aktiver Zettel bleiben erkennbar,
- Hover und Tastaturfokus erhöhen Schärfe und Kontrast,
- beim Öffnen schiebt sie sich als seitliches Papierblatt über den Denkraum,
- der Gesprächsraum bleibt im Hintergrund sichtbar,
- inaktive Zettel dürfen wie Wasserzeichen zurücktreten.

Im Normalzustand zeigt die Pinnwand nur:

- den zuletzt relevanten Zettel,
- genau eine offene Entscheidung oder Ergebnisprüfung,
- einen Hinweis auf weitere Einträge.

`Jetzt wichtig` ist eine serverseitige Projektion und liefert höchstens eine `AttentionCard`.

Priorität:

1. Sicherheits- oder Blockierungsproblem,
2. Ergebnis zur Prüfung,
3. fehlgeschlagener Start,
4. Gesprächsvorschlag,
5. offene pädagogische Entscheidung,
6. offenes Arbeitsvorhaben,
7. Gespräch fortsetzen.

Eine entscheidbare Karte besitzt höchstens:

```text
✓ Passt / ✓ Passt für den Unterricht
✎ Weiterreden
```

Kein Bestätigungsmodal und kein zusätzlicher Pflichtschritt.

## 8. Raumzugänge und Navigation

Die globale Navigation ist standardmäßig eingeklappt und erscheint als schmaler Handle am linken Rand. Aufgeklappt verwendet sie teacher-facing Begriffe:

```text
Gespräch
Pinnwand
Lernlandschaft
Zeit & Dramaturgie
Vorbereitungen
Knowledge & Quellen
Materialien
```

Räumliche Metaphern:

- Windrose → Lernlandschaft,
- Sanduhr → Zeit & Dramaturgie,
- Werkbank → Vorbereitungen und Planungsboard,
- Bücher → Knowledge und Quellen,
- Materialmappe → Materialien.

Alle Bereiche sind zusätzlich linear und per Tastatur erreichbar. Keine Funktion ist ausschließlich über Hover, Position, Farbe oder Illustration zugänglich.

## 9. Lernlandschaft

Die Lernlandschaft unterstützt lineare, stationäre und hybride Lernreisen, Wahlwege, parallele Momente, didaktisch bezeichnete Übergänge sowie Canvas- und lineare Ansicht.

Strukturelle KI-Vorschläge benötigen Vorschau, sichtbaren Diff, Übernehmen, im Gespräch ändern und Verwerfen. Ohne Zustimmung keine kanonische Änderung.

## 10. Zeit & Dramaturgie

Die Zeitansicht zeigt Unterrichtsfenster, Platzierungen, mehrfach verwendete Lernmomente, Wahl- und Stationsmomente, Konflikte, unzugeordnete Momente und dramaturgische Hinweise.

Sie platziert Lernmomente zeitlich, verändert aber nicht deren semantische Bedeutung.

## 11. Statusbar, Werkstatt und Planungsboard

Im geschlossenen Zustand beansprucht die Statusbar am unteren Rand höchstens eine ruhige Zeile:

```text
Im Hintergrund · Lehrplanbezug wird geprüft
```

Erst ein Klick öffnet die kompakte Werkstatt- und Planungsboard-Ansicht.

Die geöffnete Ansicht darf zeigen:

```text
Noch klären | Vorbereiten | Zur Prüfung | Bereit
```

Board-Verschiebungen ordnen ausschließlich den Planungsstand und starten niemals Worker.

Ein angenommenes Gesprächsproposal erzeugt atomar genau eine Board-Karte, einen Service Request und einen Queue-Eintrag. Die Lehrkraft muss das Board dafür nicht öffnen.

Statusverhalten:

- GET-Zustand bleibt autoritativ,
- SSE für Ereignisse,
- begrenztes Polling bei Abbruch,
- kein Fokus- oder Perspektivwechsel,
- `aria-live="polite"` bei Fertigstellung,
- subtile Aktivität nur bei real laufender Arbeit.

## 12. Materialien und Knowledge

Ein fertiges Material erscheint zuerst direkt in „Jetzt wichtig“ mit Titel, Entstehungsgrund, Lernmomentbezug, lesbarer Vorschau, AutomaticCheck, Critical-Friend-Prüfung sowie Häkchen und Stift.

Der Materialbereich bleibt Sammlung und Nachweis, kein zusätzlicher Workflow-Schritt.

Knowledge zeigt Quelle, Titel, Relevanz, Abrufdatum, Prüfstatus, Unsicherheit, Projektbezug und Proposal-Status. Das Bücherregal ist Zugang, die geöffnete Ansicht eine klare durchsuchbare Übersicht.

## 13. Motion und Sound

Zulässige kurze Übergänge:

- Zettel vom Gespräch zur Pinnwand,
- Fragezeichen zur offenen Entscheidung,
- Arbeitsvorhaben zur Werkstatt,
- Ergebnis zurück zur Prüfung.

Anforderungen:

- einmalig pro Ereignis,
- kurz und nicht blockierend,
- kein Fokus- oder Scrollwechsel,
- nach Reload nicht erneut,
- Reduced-Motion-Alternative,
- Status auch ohne Animation sichtbar.

Sound ist optional, separat abschaltbar und nie einziger Bedeutungsträger. Keine Erfolgs-Jingles oder Belohnungssounds.

## 14. Mehr-Menü

Das Drei-Punkte-Menü enthält teacher-facing Aktionen:

```text
Planungsraum umbenennen
Beteiligte verwalten
Verlauf und Versionen
Exportieren und teilen
Darstellung
Einstellungen
Hilfe zum Denkraum
Planungsraum archivieren
```

Unter `Darstellung`:

```text
Bewegung reduzieren
Töne aus
Lineare Navigation anzeigen
Raumillustration ausblenden
```

Keine Provider-, Harness- oder Dateisystemeinstellungen im Lehrkräftemodus.

## 15. Responsive und Barrierefreiheit

Desktop kann die räumliche Komposition zeigen. Tablet reduziert die Pinnwand auf ein Panel. Mobil priorisiert:

1. Gespräch,
2. Eingabe,
3. „Jetzt wichtig“,
4. Hintergrundarbeit,
5. lineare Navigation.

Verbindlich:

- vollständige Tastaturbedienung,
- sichtbare Fokuszustände,
- logische Fokusreihenfolge,
- Accessible Names,
- ausreichender Kontrast,
- keine Bedeutung nur durch Farbe, Position, Bewegung oder Ton,
- `prefers-reduced-motion`,
- funktionsgleiche Darstellung ohne Illustration,
- sinnvolle Screenreader-Landmarks.

## 16. Nicht zulässige UX-Muster

- konkurrierende Hauptkarten,
- dominante gleichgewichtige Haupttabs,
- automatische Perspektivwechsel,
- Worker- oder Provider-Cockpit,
- dauerbewegte Figuren,
- Punkte, Level und Erfolgsbelohnungen,
- Hover-only-Navigation,
- Board-Drop als Worker-Start,
- Bestätigungsmodal nach dem Häkchen,
- technische Statuscodes im Lehrkräftemodus.

## 17. Abnahme

Der Hauptbildschirm ist abgenommen, wenn:

- der Gesprächscharakter unmittelbar erkennbar ist,
- der aktuelle Planungsraum im Header primär orientiert,
- das Gespräch ungefähr 75 Prozent der Aufmerksamkeit erhält,
- höchstens eine Karte als „Jetzt wichtig“ konkurriert,
- Pinnwand und Marker die Herkunft nachvollziehbar machen,
- die Pinnwand zurückgesetzt, aber interaktiv erkennbar ist,
- Navigation und Statusbar diskret bleiben,
- Papiernotizen keine neue Kartenwand bilden,
- alle Bereiche per Tastatur erreichbar sind,
- die Anwendung ohne Illustration, Animation und Ton funktioniert,
- keine technischen Interna sichtbar werden,
- kein zusätzlicher Pflichtklick im Zwei-Häkchen-Workflow entsteht.
