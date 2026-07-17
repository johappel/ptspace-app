# REFACTOR-UX.md

Stand: 2026-07-16  
Status: verbindliches UX-Zielbild für den nächsten Refactor

## 1. Anlass

Die aktuelle Hauptansicht bildet Gespräch, Denkstand, Entscheidungen, Planung und Materialien funktional ab. In ihrer gleichgewichtigen Spalten-, Karten- und Tabstruktur wirkt sie jedoch wie ein Verwaltungsdashboard.

Das widerspricht der zentralen Produktidee:

> Lehrkräfte arbeiten in einem gemeinsamen pädagogischen Denkraum mit einem Critical Friend.  
> Alles Weitere entsteht aus diesem Gespräch, wird daraus festgehalten oder im Hintergrund vorbereitet.

Der UX-Refactor verändert nicht den pädagogischen Kernel und führt kein neues Workflowmodell ein. Er übersetzt die bestehenden Zustände und Verträge konsequenter in ein fokussiertes, räumlich verständliches Nutzungserlebnis.

## 2. UX-Leitbild

Der Planungsraum ist ein ruhiger Ort gemeinsamen pädagogischen Denkens.

Im Zentrum stehen zwei Perspektiven, die auf einen gemeinsamen Gegenstand gerichtet sind:

- die Lehrkraft beziehungsweise das Planungsteam,
- der Critical Friend,
- dazwischen die Unterrichtsidee, Frage, Skizze oder Planung.

Der Chat ist die primäre Interaktionsform. Denkstand, Entscheidungen, Arbeitsvorhaben, Knowledge und Materialien werden als Spuren sichtbar, die aus dem Gespräch hervorgehen.

Die Oberfläche soll nicht wie ein Online-Spiel funktionieren. Sie darf aber räumliche und sinnliche Mittel nutzen, wenn diese fachliche Zusammenhänge verständlicher machen.

## 3. Verbindliche Gestaltungsprinzipien

1. **Gespräch vor Verwaltung**  
   Der Dialog ist der größte und dauerhaft erreichbare Arbeitsbereich.

2. **Bedeutung vor Dekoration**  
   Jedes räumliche Element steht für eine fachlich stabile Funktion.

3. **Herkunft vor bloßem Status**  
   Es soll nachvollziehbar sein, aus welcher Gesprächsstelle ein Denkstand, eine Entscheidung oder ein Arbeitsvorhaben entstand.

4. **Ein Fokus statt konkurrierender Karten**  
   Im Hauptblick erscheint höchstens ein Gegenstand unter „Jetzt wichtig“.

5. **Ereignis vor Daueranimation**  
   Bewegung zeigt einen tatsächlichen Zustandsübergang und endet danach.

6. **Raum als Orientierung, nicht als Suchspiel**  
   Alle Bereiche bleiben klar beschriftet und zusätzlich linear erreichbar.

7. **Poetischer Einstieg, professionelle Vertiefung**  
   Der Denkraum darf atmosphärisch sein. Detailarbeit geschieht in ruhigen, präzisen Arbeitsansichten.

8. **Technik bleibt im Hintergrund**  
   Worker, Harness, Queue, Provider, Dateien und Git bestimmen nicht die mentale Oberfläche.

## 4. Nicht-Ziele

Der Refactor ist ausdrücklich:

- kein Computerspiel,
- keine Gamification,
- keine Punkte-, Level- oder Belohnungslogik,
- keine begehbare 3D-Welt,
- kein Agenten-Cockpit,
- keine Sammlung vermenschlichter Worker-Figuren,
- keine Simulation von Freundschaft oder Emotionen,
- keine Navigation, bei der Objekte gesucht werden müssen,
- kein Ersatz professioneller Detailansichten durch Dekoration,
- keine automatische Änderung kanonischer Planung ohne Zustimmung.

## 5. Räumliche Semantik

| Raumelement | Pädagogische Bedeutung |
|---|---|
| gemeinsamer Tisch / gemeinsame Arbeitsfläche | Gegenstand des Gesprächs |
| Pinnwand | gemeinsamer Denkstand und aktuell relevante Festhaltungen |
| Zettel | festgehaltener Gedanke oder Aha-Moment |
| großes Fragezeichen | offene pädagogische Entscheidung |
| Werkbank / ruhige Aktivitätsleiste | Vorbereitung im Hintergrund |
| Windrose / Karte | Lernlandschaft und Lernmomente |
| Sanduhr | Zeit und Dramaturgie |
| Bücherregal | Knowledge, Quellen und geprüfte Bezüge |
| Materialmappe | Entwürfe und für Unterricht freigegebene Materialien |

Die konkrete Illustration darf sich ändern. Die fachliche Zuordnung bleibt stabil.

## 6. Hauptansicht des Denkraums

### 6.0 Referenzentwurf „Quietude & Thought“

Der vorliegende Screendesign-Entwurf dient als visuelle Referenz für die weitere Umsetzung. Er zeigt eine helle, weitgehend freie Arbeitsfläche mit einer zentralen Gesprächsspur und einer deutlich zurückgenommenen Pinnwand im rechten Hintergrund.

Verbindlich übernommen werden:

- warmes Off-White als Grundfläche, dunkles Petrol für Text und zentrale Aktionen, Salbeigrün für Fokus und Herkunftsbezüge,
- Source Serif 4 für Überschriften und längere Reflexionstexte; eine hochlesbare Sans-Serif darf für kompakte UI-Metadaten verwendet werden,
- großzügige Ränder und ein zentraler Gesprächsbereich von ungefähr 75 Prozent der Aufmerksamkeit,
- Notizen als ruhige Papierflächen mit sehr weichen, breiten Schatten,
- die Pinnwand als atmosphärisch zurückgesetzte Tiefenebene, die bei Fokus oder Öffnung an Schärfe und Kontrast gewinnt,
- Kontext-Anker im Gespräch, über die ein Zettel oder eine Entscheidung aus der Pinnwand im Chat aufgegriffen wird,
- ein flacher Composer mit sichtbarem Fokus-Chip und klarer Sendeaktion,
- eine schmale, unaufdringliche Statusleiste für Hintergrundarbeit.

Nicht verbindlich übernommen werden:

- englische Werkzeugbegriffe wie `TABLE`, `PIN`, `MAP` oder `WORK`,
- eine dauerhaft voll ausgeklappte linke Werkzeugleiste,
- ein Header, der nur den Produktnamen und nicht den aktuellen Planungsraum zeigt,
- eine Pinnwand, die so stark verblasst, dass ihre Interaktivität nicht mehr erkennbar ist,
- übergroße Papierkarten, die den Gesprächsfluss in einzelne starre Blöcke zerlegen.

Der Entwurf ist damit Referenz für Atmosphäre, Hierarchie und Materialität, nicht pixelgenaue Vorlage.

### 6.1 Zentrum

Der Header zeigt den aktuellen Planungsraum als primäre Orientierung. `Planungsräume` bleibt eine kleine Produkt- oder Bereichsmarke. Beispiel:

```text
Planungsräume
KI-Nutzung bei den Hausaufgaben
```

Das Gespräch erhält den größten visuellen Raum.

Die Szene kann reduziert darstellen, dass zwei Perspektiven gemeinsam auf einen Gegenstand schauen. Geeignet sind beispielsweise:

- zwei abstrahierte Silhouetten,
- zwei ruhige Licht- oder Präsenzpunkte,
- ein gemeinsamer Tisch,
- ein Blatt, eine Skizze oder ein Plan als dritter Mittelpunkt.

Nicht geeignet sind detaillierte Avatare mit dauernden Gesten, Mimik oder Spielanimationen.

Der Chat liegt als gut lesbare, ruhige Ebene über oder neben dieser Szene. Transparenz darf die Lesbarkeit nicht beeinträchtigen. Nachrichten dürfen wie abgelegte Notizen wirken, sollen aber nicht als übergroße, gleichförmige Karten den Gesprächsrhythmus unterbrechen. Rollen- und Zeitangaben werden konsistent dargestellt.

### 6.2 Pinnwand

Im Ruhezustand darf die Pinnwand atmosphärisch unscharf und kontrastarm sein. Überschrift, aktiver Zettel und Fokuszustand müssen dennoch als interaktive Elemente erkennbar bleiben. Bei Tastaturfokus, Hover oder Öffnung gewinnt die Pinnwand an Schärfe und Kontrast; rein dekorative Hintergrundzettel bleiben zurückgenommen.

Die Pinnwand ist keine vollständige Dokumentansicht. Sie zeigt im Normalzustand nur wenige aktuelle Gegenstände:

- den zuletzt festgehaltenen relevanten Gedanken,
- genau eine aktuell wichtige Entscheidung oder ein Ergebnis zur Prüfung,
- optional einen ruhigen Hinweis auf weitere Einträge.

Vollständige Listen und der vollständige gemeinsame Denkstand öffnen sich in einer vertieften Ansicht.

### 6.3 Raumzugänge

Die globale Navigation ist standardmäßig stark reduziert: ein schmaler Handle oder wenige klar beschriftete Zugänge statt einer dauerhaften Werkzeugleiste. Begriffe stammen aus dem Planungsalltag, nicht aus einer räumlichen Engine.

Bevorzugte teacher-facing Labels:

- Gespräch
- Pinnwand
- Lernlandschaft
- Zeit & Dramaturgie
- Vorbereitungen
- Knowledge & Quellen
- Materialien

Sekundäre Bereiche werden durch verständliche Raumobjekte und gleichzeitig durch eine lineare Navigation angeboten:

- Windrose: Lernlandschaft
- Sanduhr: Zeit & Dramaturgie
- Werkbank: Vorbereitungen
- Bücherregal: Knowledge
- Materialmappe: Materialien

Kein Bereich darf ausschließlich über Hover, Position, Farbe, Illustration oder Animation erreichbar sein.

## 7. Gespräch als Entstehungsspur

Relevante Gesprächsnachrichten können Marker tragen:

- **Zettel:** Gedanke wurde festgehalten.
- **Fragezeichen:** offene Entscheidung entstand.
- **Arbeitszeichen:** Vorbereitung wurde gestartet.
- **Ergebniszeichen:** Ergebnis ist zurückgekehrt.
- **Häkchen:** Ergebnis wurde für den Unterricht freigegeben.

Marker sind bidirektional:

- Vom Chat führt ein Klick zum zugehörigen Ziel.
- Vom Ziel führt ein Rücksprung zur auslösenden Gesprächsstelle.

Marker erzeugen kein neues pädagogisches Artefakt. Sie verweisen auf bestehende, serverseitig validierte Artefakte oder Arbeitszustände.

### 7.1 Chatfilter

Der Gesprächsverlauf kann gefiltert werden:

- Alle Beiträge
- Festgehaltenes
- Offene Entscheidungen
- Vorbereitungen und Ergebnisse

Gefilterte Ansichten zeigen genügend Umgebungskontext, damit eine markierte Nachricht verständlich bleibt.

## 8. Sichtbare Zustandsübergänge

Ein neuer fachlich relevanter Zustand darf einmalig räumlich sichtbar werden:

- Ein Zettel löst sich aus dem Gespräch und erscheint an der Pinnwand.
- Eine offene Frage wird als Fragezeichen an der Pinnwand markiert.
- Ein angenommenes Arbeitsvorhaben wandert in die Werkstatt.
- Ein fertiges Ergebnis kehrt als prüfbarer Gegenstand zurück.

Diese Übergänge:

- dauern kurz,
- verändern weder Fokus noch Scrollposition,
- blockieren keine Eingabe,
- werden nicht bei jedem Reload erneut abgespielt,
- sind bei `prefers-reduced-motion` durch eine ruhige Hervorhebung ersetzt,
- sind nie die einzige Trägerin einer Information.

## 9. Sound

Akustische Rückmeldungen sind optional und sehr zurückhaltend.

Geeignet:

- leises Papiergeräusch beim Festhalten,
- sanfter, kurzer Ton bei einem zurückgekehrten Ergebnis.

Nicht geeignet:

- Erfolgs-Jingles,
- Münz- oder Punktesounds,
- wiederholte Aktivitätsgeräusche,
- Sounds für jeden technischen Statuswechsel.

Töne sind separat abschaltbar. Die Anwendung bleibt ohne Ton vollständig verständlich.

## 10. Hintergrundarbeit

Die Statusanzeige liegt als flache Fußzeile oder schmale Leiste am unteren Rand des Denkraums. Im Normalzustand zeigt sie nur eine Zeile, zum Beispiel:

```text
Im Hintergrund · Lehrplanbezug wird geprüft
```

Erst ein Klick öffnet die Werkstatt- beziehungsweise Planungsboard-Übersicht.

Laufende Hintergrundarbeit erscheint in einer kleinen, persistenten Werkstatt- beziehungsweise „Im Hintergrund“-Leiste.

Sie zeigt nur teacher-facing Informationen:

- Titel der Vorbereitung,
- verständlicher Status,
- Anzahl laufender oder wartender Arbeiten,
- gegebenenfalls ein zurückgekehrtes Ergebnis.

Nicht angezeigt werden:

- Worker-Namen,
- Service-Request-IDs,
- Harness,
- Provider,
- Queue,
- Prompts,
- Dateipfade,
- technische Logs.

Eine subtile Aktivitätsanimation ist nur sichtbar, solange tatsächlich Arbeit läuft.

## 11. „Jetzt wichtig“

„Jetzt wichtig“ ist eine priorisierte Projektion, keine zweite Aufgabenliste.

Es zeigt höchstens eine Karte:

1. Sicherheits- oder Blockierungsproblem,
2. fertiges Ergebnis zur Lehrkraftprüfung,
3. fehlgeschlagener Start eines angenommenen Vorhabens,
4. neuer Gesprächsvorschlag,
5. konkrete offene pädagogische Entscheidung,
6. erstes offenes Arbeitsvorhaben,
7. Einladung, das Gespräch fortzusetzen.

Eine entscheidbare Karte besitzt höchstens zwei Aktionen:

- `✓ Passt` beziehungsweise `✓ Passt für den Unterricht`
- `✎ Weiterreden`

## 12. Vertiefte Arbeitsansichten

Lernlandschaft, Zeitplanung, Planungsboard, Knowledge und Materialien dürfen weiterhin präzise Arbeitsoberflächen sein.

Für sie gilt:

- klare Überschriften,
- ruhige Formulare und Listen,
- keine künstliche Rauminszenierung in jeder Detailansicht,
- Rückkehr in denselben Denkraum,
- Fokusübergabe an das bestehende Gespräch,
- kein zweiter konkurrierender Workflow.

## 13. Barrierefreiheit und alternative Darstellung

Der Denkraum muss vollständig funktionieren:

- mit Tastatur,
- mit Screenreader,
- bei `prefers-reduced-motion`,
- ohne Ton,
- ohne Hintergrundillustration,
- auf kleinen Displays,
- bei hohem Zoom,
- mit ausreichendem Kontrast.

Für die räumliche Darstellung existiert eine funktionsgleiche lineare Navigation.

Symbole besitzen sichtbare Kurzlabels oder eindeutige Accessible Names. Position, Farbe, Bewegung und Ton werden nie als einzige Bedeutungsträger verwendet.

## 14. Responsive Verhalten

Auf kleineren Displays gilt folgende Priorität:

1. Gespräch und Eingabe,
2. „Jetzt wichtig“,
3. Hintergrundarbeit,
4. lineare Bereichsnavigation,
5. vertiefte Ansichten.

Die räumliche Illustration darf vereinfacht oder ausgeblendet werden. Die semantische Struktur bleibt erhalten.

## 15. Abnahmekriterien

Der UX-Refactor ist fachlich abgenommen, wenn:

- beim Öffnen unmittelbar ein gemeinsamer pädagogischer Denkraum erkennbar ist,
- das Gespräch visuell und funktional im Zentrum steht,
- höchstens ein Gegenstand als „Jetzt wichtig“ konkurriert,
- die Herkunft von Denkstand, Entscheidung und Arbeitsvorhaben nachvollziehbar ist,
- alle Marker bidirektional navigierbar sind,
- Hintergrundarbeit sichtbar bleibt, ohne technische Interna offenzulegen,
- Animationen weder Fokus noch Arbeitsfluss verändern,
- alle Funktionen ohne Animation, Ton oder Illustration verfügbar bleiben,
- keine zweite Pflichtstrecke über Planungsboard oder Materialien entsteht,
- die Oberfläche professionell und nicht kindlich oder spielerisch-belohnend wirkt,
- der aktuelle Planungsraum im Header klarer hervortritt als der Produktname,
- Navigation und Statusleiste diskret bleiben und teacher-facing beschriftet sind,
- die Pinnwand im Hintergrund liegt, aber als interaktiver Bereich erkennbar bleibt,
- Gesprächsnotizen haptisch wirken, ohne wieder eine dominante Kartenwand zu bilden.
