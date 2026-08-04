# Denkraum Design Contract

Stand: 2026-08-04  
Status: verbindliches, meilensteinübergreifendes Design-Gate

## 1. Zweck

Dieser Vertrag verhindert, dass `ptspace-app` technisch korrekt, aber gestalterisch als Dashboard, Verwaltungsoberfläche oder Agenten-Cockpit endet.

Das Erscheinungsbild ist keine spätere Dekoration. Es ist Teil des pädagogischen Produktmodells: Lehrkräfte sollen einen ruhigen, hochwertigen und atmosphärisch angemessenen Denkraum erleben, in dem das Gespräch und der gemeinsame Gegenstand im Zentrum stehen.

Normative Grundlage bleibt `REFACTOR-UX.md`. Dieses Dokument übersetzt dessen Leitbild in prüfbare Design-Gates für alle Arbeiten am Real Runtime MVP.

## 2. Unverhandelbare Produktwirkung

Beim Öffnen eines Planungsraums muss unmittelbar erkennbar sein:

- Hier findet ein gemeinsames pädagogisches Denken statt.
- Das Gespräch ist der visuelle und funktionale Mittelpunkt.
- Es gibt genau einen gegenwärtigen Fokus statt konkurrierender Karten.
- Denkstand, offene Entscheidungen, Hintergrundarbeit und Materialien erscheinen als Spuren aus dem Gespräch.
- Technik, Harness, Worker, Queue, Git und Dateien bleiben mental im Hintergrund.
- Die Oberfläche wirkt ruhig, sorgfältig, vertrauenswürdig und professionell – nicht verspielt, technisch oder verwaltungsförmig.

## 3. Ausschlusskriterium: Dashboard

Ein Zustand gilt als Dashboard und darf nicht abgenommen werden, wenn mehrere der folgenden Merkmale auftreten:

- gleichgewichtige Spalten oder Karten konkurrieren um Aufmerksamkeit;
- Kennzahlen, Statusboxen oder Funktionsmodule dominieren den ersten Blick;
- Chat, Denkstand, Board und Materialien erscheinen als gleichrangige Panels;
- die Oberfläche wird primär über Tabs, Kacheln oder Verwaltungslisten verstanden;
- technische Zustände werden prominenter gezeigt als pädagogische Bedeutung;
- der aktuelle Gesprächsgegenstand ist nicht ohne Suche erkennbar;
- der Planungsraum könnte ohne wesentliche Änderung auch ein Projektmanagement-Dashboard sein.

Technische Vollständigkeit kann dieses Ausschlusskriterium nicht aufheben.

## 4. Verbindliche visuelle Hierarchie

1. **Gespräch und gemeinsamer Gegenstand**  
   erhalten ungefähr drei Viertel der visuellen Aufmerksamkeit des Ausgangszustands.

2. **Jetzt wichtig**  
   zeigt höchstens einen entscheidbaren Gegenstand und konkurriert nicht mit dem Gespräch.

3. **Pinnwand / Denkstand**  
   bleibt als zurückgenommene zweite Ebene erkennbar, zeigt aber nur wenige aktuelle Spuren.

4. **Hintergrundarbeit**  
   erscheint als flache, ruhige Statuszeile und nicht als Arbeitsmanagement-Panel.

5. **Lernlandschaft, Zeit, Vorbereitungen, Knowledge und Materialien**  
   sind klar erreichbar, aber im Ausgangszustand nicht gleichrangig ausgeklappt.

## 5. Atmosphäre und Materialität

Die Umsetzung orientiert sich an der Referenz „Quietude & Thought“ aus `REFACTOR-UX.md`:

- warme, helle und weitgehend freie Grundfläche;
- dunkles Petrol für Text und zentrale Aktionen;
- Salbeigrün für Fokus, Herkunft und ruhige Hervorhebung;
- Source Serif 4 oder eine vergleichbar ruhige Serifenschrift für Überschriften und Reflexionstexte;
- gut lesbare Sans-Serif für kompakte Metadaten und Steuerung;
- großzügige Abstände und klare Leerflächen;
- Papier- und Pinnwandmetaphern zurückhaltend und hochwertig, nicht skeuomorph verspielt;
- weiche Tiefe statt harter Kartenraster;
- Animation nur für kurze, fachlich bedeutende Zustandsübergänge;
- keine dauerhafte Aktivität, Gamification oder simulierte Emotionalität.

## 6. Gesprächsrhythmus

Nachrichten dürfen nicht als endlose Folge gleichförmiger, großer Karten erscheinen.

Erforderlich sind:

- klar unterscheidbare, aber zurückhaltende Rollen;
- gut lesbare Textbreiten;
- ein ruhiger vertikaler Rhythmus;
- sichtbare Kontextanker für festgehaltene Gedanken, Entscheidungen, Vorbereitungen und Ergebnisse;
- ein flacher Composer, der den aktuellen Fokus zeigt, ohne selbst zum dominanten Panel zu werden;
- keine technische Statussprache im Gespräch.

## 7. Vertiefte Arbeitsansichten

Vertiefte Ansichten dürfen präzise Formulare, Listen, Canvas und Tabellen verwenden. Sie bleiben dennoch Teil desselben Denkraums.

Jede vertiefte Ansicht muss:

- den aktuellen Planungsraum und Fokus sichtbar halten;
- eine klare Rückkehr in dasselbe Gespräch anbieten;
- die Herkunft eines Gegenstands nachvollziehbar machen;
- technische Begriffe in Lehrkräftesprache übersetzen;
- visuell mit Typografie, Abständen und Interaktionsmustern des Denkraums verbunden bleiben;
- vermeiden, einen zweiten konkurrierenden Hauptworkflow zu erzeugen.

## 8. Design-Gates pro Pull Request

Jeder Frontend-PR beantwortet im Handoff:

1. Wie bleibt das Gespräch der visuelle Mittelpunkt?
2. Welche konkurrierenden Karten, Panels oder Statusflächen wurden vermieden?
3. Wie ist der aktuelle pädagogische Fokus erkennbar?
4. Wie bleibt die Herkunft neuer Zustände aus dem Gespräch nachvollziehbar?
5. Welche teacher-facing Sprache ersetzt technische Begriffe?
6. Wie fügt sich die Änderung in Typografie, Abstände, Materialität und Raumsemantik ein?
7. Wie funktioniert derselbe Ablauf mit Tastatur, Reduced Motion und ohne Illustration?

Ein Frontend-PR ohne nachvollziehbare Antwort auf diese Fragen ist nicht abnahmebereit.

## 9. Visuelle Referenzzustände

Für folgende Zustände werden verbindliche Screenshots oder visuelle Regressionen gepflegt:

- leerer neuer Planungsraum;
- laufendes pädagogisches Gespräch;
- festgehaltener Gedanke an der Pinnwand;
- genau eine offene Entscheidung unter „Jetzt wichtig“;
- laufende Hintergrundarbeit;
- zurückgekehrtes Ergebnis zur Prüfung;
- geöffnete Lernlandschaft;
- mobile beziehungsweise schmale Darstellung;
- Reduced-Motion-/illustrationsarme Darstellung.

Snapshots allein genügen nicht. Vor der MVP-Abnahme erfolgt zusätzlich eine qualitative Designprüfung gegen diesen Vertrag und `REFACTOR-UX.md`.

## 10. Abnahmekriterien

Das Design-Gate ist erfüllt, wenn:

- der erste Eindruck eindeutig Denkraum und nicht Dashboard ist;
- Gespräch, Fokus und gemeinsame Planung die visuelle Hierarchie bestimmen;
- alle Hauptzustände gestalterisch konsistent wirken;
- der Real-Harness-Status nicht zur technischen Dominante wird;
- vertiefte Ansichten erkennbar aus demselben Produkt stammen;
- Desktop und kleine Displays dieselbe semantische Priorität bewahren;
- visuelle Regressionen für die Referenzzustände vorhanden sind;
- eine dokumentierte qualitative Designabnahme keine Dashboard-Merkmale feststellt.

## 11. Verhältnis zu anderen Dokumenten

- `REFACTOR-UX.md` beschreibt das vollständige UX-Zielbild und die räumliche Semantik.
- Dieses Dokument definiert die prüfbaren Design-Gates.
- `docs/milestones/REAL-RUNTIME-MVP.md` bindet diese Gates in den aktuellen Meilenstein ein.
- `REFACTOR-AGENTS.md` verpflichtet Coding-Agenten zur Anwendung.
- GitHub-Issues dokumentieren Umsetzung, Screenshots, Tests und Abnahme.
