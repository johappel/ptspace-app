# M0 Ist-Analyse und Umsetzungspaket

Stand: 2026-08-04
Issue: [#17 – M0: Denkraum-Design absichern – ausdrücklich kein Dashboard](https://github.com/johappel/ptspace-app/issues/17)

## Prüfgrundlage und Einschränkung

Die Analyse wurde gegen `AGENTS.md`, `REFACTOR-AGENTS.md`, `ROADMAP.md`, `REFACTOR-UX.md`, den `DENKRAUM-DESIGN-CONTRACT`, die Referenzzustände, die Frontend-Checkliste und den Real-Runtime-MVP-Gate durchgeführt. Quellcodebasis ist vor allem `frontend/src/routes/+page.svelte` und `frontend/src/routes/styles.css`.

Der lokale Frontend-Build und die lokalen HTTP-Endpunkte waren erreichbar. Eine interaktive Browserverbindung war in dieser Sitzung nicht verfügbar (`agent.browsers.list()` lieferte keine verfügbaren Browser). Deshalb sind keine visuellen Screenshots und keine qualitative Browserabnahme als erledigt behauptet. Die Zustände DR-01 bis DR-09 sind nach Quellcodebeleg und Prüfbarkeit bewertet.

## Ist-Analyse vor der M0-Änderung

### Bereits ruhiger pädagogischer Denkraum

- Der Gesprächsverlauf ist funktional der größte Bereich; `primaryWidth` stand zunächst auf 74 Prozent.
- Der Einstieg nutzt pädagogische Sprache wie „Neuer Denkraum“, „Woran möchtest du weiterdenken?“ und „Gespräch“.
- Raumzugänge sind hinter „Bereiche“ gebündelt; die Pinnwand ist nicht als globale Werkzeugleiste ausgeklappt.
- Gesprächsmarker verknüpfen festgehaltene Gedanken, Entscheidungen und Ergebnisse mit ihrer Ausgangsstelle.
- „Jetzt wichtig“ wird aus einer einzelnen `attentionCard` projiziert und besitzt maximal die vorgesehenen zwei Handlungen.
- Hintergrundarbeit ist als schmale Statusleiste und erst nach Öffnen als Detailbereich angelegt.
- Lernlandschaft besitzt eine lineare Lesansicht als Alternative zur Canvas-Ansicht; Reduced Motion und sichtbare Fokuszustände sind im CSS vorhanden.
- Farben, Serifentypografie, großzügige Nachrichtenbreiten und weiche Schatten greifen das Quietude-&-Thought-Zielbild bereits erkennbar auf.

### Noch dashboardartige oder technische Muster

- Die Hauptansicht setzt Gespräch und rechte Perspektive weiterhin als dauerhaft sichtbares, gerahmtes Zwei-Bereich-Layout nebeneinander. Die rechte Seite enthält mehrere visuell ähnliche Flächen: Pinnwand, gemeinsamer Denkstand, „Jetzt wichtig“, sensible Hinweise, offene Entscheidungen und nächste Schritte.
- „Jetzt wichtig“ ist zwar auf einen Gegenstand begrenzt, konkurriert aber im selben Blick mit den zusätzlich sichtbaren Listen „Offene Entscheidungen“ und „Nächste Schritte“. Dadurch entsteht weiterhin eine Projektmanagement-Lesart.
- Der gemeinsame Denkstand ist im Ausgangszustand vollständig geöffnet, obwohl Vertrag und UX-Zielbild ihn als nachgeordnete Spur aus dem Gespräch behandeln.
- Die Pinnwand ist als Karte gestaltet und wird im Normalzustand neben weiteren Karten gezeigt; sie ist funktional zurückgenommen, visuell aber noch nicht eindeutig eine Hintergrundebene.
- Der globale Header enthält mehrere gleichrangige Aktionen („Bereiche“, „Unterrichtsplanung“, „Einstellungen“). Das ist vertretbar als diskrete Navigation, bleibt aber auf kleinen Breiten prüfbedürftig.
- Board, Zeitplanung, Materialien und Lernlandschaft verwenden in ihren vertieften Ansichten weiterhin Listen, Karten und Canvas-Steuerungen. Das ist für Detailarbeit zulässig, muss aber im Browser gegen denselben Denkraum-Rhythmus geprüft werden.
- Der Simulationshinweis erklärte vor der Änderung `.env`, Harness und eine technische Dokumentationsdatei direkt im Gespräch. Das belastete den ersten Eindruck unnötig mit Runtime-Interna.
- Die CSS-Datei enthielt mehrere historische Regelblöcke mit wiederholten Farben, Abständen und Oberflächen. Die gestalterische Richtung war erkennbar, aber nicht als konsistentes Token-System auffindbar.

### Gemeinsamer Gegenstand und Hierarchie

Der aktuelle Planungsraum erscheint klar im Header, der konkrete gemeinsame pädagogische Gegenstand jedoch vor allem in den Nachrichten und nicht als eigene, ruhige Mitte. Die Gesprächsspur trägt den Gegenstand; die rechte Seite verteilt die Aufmerksamkeit noch auf mehrere Zustandskarten. Pinnwand und Hintergrundarbeit sind funktional sekundär, ihre sichtbaren Container waren vor der Änderung aber noch zu stark als eigenständige Module gerahmt.

Haupt- und Detailansichten teilen Farben, Serifentypografie, Fokusoutline und weiche Oberflächen. Die Detailansichten sind professionell genug für Formulare, Listen und Lernlandschaft, wirken wegen der wiederholten Karten-/Toolbar-Muster aber noch nicht durchgehend wie vertiefte Ansichten desselben Gesprächs.

## Referenzzustände DR-01 bis DR-09

| Zustand | Stand der Prüfung | Begründung |
|---|---|---|
| DR-01 Neuer Planungsraum | teilweise überzeugend, nicht visuell abgenommen | Modal und Empty-State sind pädagogisch formuliert; tatsächlicher erster Eindruck ohne Browser-Screenshot nicht belegbar. |
| DR-02 Laufendes Gespräch | verbessert, nicht visuell abgenommen | Gespräch erhält nach dem Paket mehr Breite; rechter Bereich bleibt sekundär, aber Browserprüfung fehlt. |
| DR-03 Festgehaltener Gedanke | teilweise überzeugend | Marker und Rücksprung sind im Code vorhanden; Pinnwandwirkung und Ursprungskontext sind nicht visuell geprüft. |
| DR-04 Offene Entscheidung | verbessert, nicht visuell abgenommen | Eine `attentionCard` bleibt sichtbar; weitere Entscheidungslisten liegen nun hinter „Weitere Gesprächsspuren“. |
| DR-05 Hintergrundarbeit | teilweise überzeugend | Flache Statusleiste und teacher-facing Statusmapping sind vorhanden; Detailbereich und Board-Rücksprung sind nur statisch geprüft. |
| DR-06 Ergebnis zur Prüfung | teilweise überzeugend | Ergebnisvorschau, Prüfung und Rücksprunglogik sind vorhanden; kein Browsernachweis für denselben Denkraum. |
| DR-07 Lernlandschaft geöffnet | teilweise überzeugend | Canvas und lineare Ansicht existieren und haben Rückkehrlogik; Canvas- und Detailmaterialität sind nicht visuell abgenommen. |
| DR-08 Schmale Darstellung | code-seitig vorbereitet, nicht prüfbar | Responsive Breakpoints, lineare Ansicht und Fokusregeln sind vorhanden; keine Browserverbindung für schmale Breite. |
| DR-09 Reduced Motion / ohne Illustration | code-seitig vorbereitet, nicht prüfbar | `prefers-reduced-motion`, App-Schalter und lineare Navigation existieren; semantische Gleichwertigkeit wurde nicht im Browser gesmokt. |

## Priorisiertes kleines Umsetzungspaket

1. Gesprächsdominanz erhöhen und rechte Perspektive als zurückgenommene Spur gestalten, ohne die bestehende Workflowlogik zu ersetzen.
2. Gemeinsamen Denkstand und zusätzliche Entscheidungs-/Nächste-Schritte-Projektionen standardmäßig hinter klar benannten, tastaturbedienbaren `details`-Zugängen halten.
3. „Jetzt wichtig“ als einzigen sichtbaren aktuellen Fokus belassen.
4. Simulations- und Prüfsprache auf lehrkräftebezogene Zustände reduzieren; Runtime-/Harnessbegriffe bleiben aus der Hauptansicht.
5. Design-Tokens für Hintergrund, Oberfläche, Text, Fokus, Linien, Tiefe, Abstand und Bewegung ergänzen und auf die Hauptansicht anwenden.
6. Danach Browser-Screenshots und Tastatur-/Reduced-Motion-Smoke-Tests für DR-01, DR-02, DR-04, DR-05, DR-06, DR-08 und DR-09 nachholen. Erst dann kann M0 qualitativ abgenommen werden.

## Umgesetzt in diesem Paket

- Die Gesprächsfläche erhält 78 Prozent Ausgangsbreite; die sekundäre Perspektive wird als randlose, weichere Spur behandelt.
- Der gemeinsame Denkstand ist standardmäßig geschlossen und bleibt über einen verständlichen, fokussierbaren Zugang erreichbar.
- Offene Entscheidungen und nächste Schritte sind unter „Weitere Gesprächsspuren“ zusammengefasst und nicht mehr als konkurrierende Ausgangskarten sichtbar.
- Die Pinnwand verliert im Gesprächsmodus Kartenraster- und Schattengewicht.
- Die Hintergrundstatusleiste ist flach und rahmenlos.
- Sichtbare Simulations- und Prüftexte verwenden keine `.env`-, Harness- oder technische Dateisprache.
- Die Seitentitel- und Gesprächsbezeichnungen orientieren sich am aktuellen Planungsraum und nicht am technischen Produktnamen.
- `styles.css` besitzt ein dokumentiertes M0-Token-Set für Oberfläche, Farbe, Fokus, Tiefe, Abstand und Bewegung.

## Abnahmegrenze

`ROADMAP.md` bleibt unverändert. Der Playwright-Nachweis für sieben Zustände ist vorhanden; M0 bleibt offen, weil die qualitative Designprüfung sowie DR-03 und DR-07 noch nicht vollständig abgearbeitet sind. Issue #17 bleibt offen.

### Historischer nächster Schritt vor dem Harness

Dieser historische nächste Schritt wurde durch den repository-eigenen Playwright-Nachweis umgesetzt. Die verbleibende manuelle qualitative Prüfung ist in der Aktualisierung unten ausdrücklich getrennt dokumentiert.
## Aktualisierung nach dem Playwright-Nachweis

Der repository-eigene Playwright-Design-Harness ist inzwischen lokal ausführbar und erzeugt sieben stabile Screenshots. Er prüft außerdem die zentralen teacher-facing Texte, DR-05 als laufende Hintergrundarbeit sowie den Reduced-Motion-Kontext. Die frühere Einschränkung zur fehlenden interaktiven Browserverbindung bleibt für eine manuelle qualitative Sichtprüfung bestehen; sie ist kein Grund, den technischen Nachweis zu verwerfen.

Die geschlossene DR-05-Statuszeile verwendet jetzt denselben geladenen Arbeitsauftrag wie die geöffnete Hintergrundebene. Dadurch werden Statuszeile und Detailprojektion nicht mehr auseinanderlaufen, wenn die Projektion aus dem Service-Request geladen wird.

Die sieben Harness-Zustände sind damit technisch reproduzierbar erfasst. M0 bleibt offen, bis die qualitative Prüfung gegen den Design Contract und die noch nicht im Harness enthaltenen Referenzzustände DR-03 und DR-07 abgearbeitet sind.

## Aktualisierung nach dem qualitativen Review vom 2026-08-04

Der neueste qualitative Review zu PR #18 hat die bisherige Interpretation als unzureichend bewertet: reduzierte Kartenbreiten und zurückgenommene Oberflächen reichen nicht. Der aktuelle Gegenstand muss eine temporäre Fokuslage im Gespräch bilden.

Die Umsetzung folgt deshalb nun dieser verbindlichen Folge: Gespräch im Normalzustand → genau ein entscheidungsreifer Gegenstand unmittelbar im Gespräch → Passt | Weiterreden | Später zurückstellen → Übernahme, Gesprächsbezug oder bewusste Ablage → ruhiger Gesprächszustand. Die Sidebar/Pinnwand ist Ablage und Wiederzugang, nicht der primäre Ort einer anstehenden Entscheidung.

Damit werden DR-02, DR-04, DR-06 und DR-08 nicht mehr als Varianten einer Kartenanordnung verstanden:

- DR-02 zeigt den ruhigen Gesprächszustand ohne aktive Fokusprojektion.
- DR-04 und DR-06 zeigen jeweils genau eine temporäre Fokuslage und zurückgenommene sekundäre Ebenen.
- DR-08 bewahrt diese Priorität bei schmaler Breite.
- Der Harness weist die bewusste Ablage mit Später zurückstellen und den anschließenden Pinnwand-Wiederzugang nach.

Issue #17 und PR #18 bleiben entsprechend offen beziehungsweise Draft; eine erfolgreiche Screenshot-Erzeugung wird nicht als qualitative Abnahme behauptet.

## Aktualisierung nach der Nacharbeit vom 2026-08-06

Die qualitative Nacharbeit konzentrierte sich auf drei eng begrenzte Punkte aus dem Review zu PR #18:

- Sekundäre Bedienmöglichkeiten sind im Normalzustand hinter „Bereiche“ beziehungsweise „Ansicht“ gebündelt. Die Gesprächsansicht zeigt keine dauerhafte Pinnwand-, Denkstand-, Entscheidungs- oder Nächste-Schritte-Fläche mehr.
- Hintergrundarbeit wird nur noch als eine flache Statuszeile projiziert. Die Detailansicht wird bewusst geöffnet und enthält keine parallele rechte Arbeitskarte. Technische Worker-, Queue-, Harness- und Runtime-Begriffe bleiben unsichtbar.
- Die Pinnwand ist eine temporär geöffnete Gedächtnisschicht. Im Ruhezustand bleibt nur „Denkstand · N Spuren festgehalten“ sichtbar. Beim Festhalten wird genau ein neuer Eintrag kurz angekündigt; die geöffnete Ansicht zeigt maximal fünf kuratierte Spuren, Herkunft und Rücksprung. Erst „Später zurückstellen“ legt eine Fokuslage wiederaufrufbar ab.

Der Harness deckt jetzt auch DR-03 ab und prüft die Rückkehr vom Pinnwand-Eintrag zur hervorgehobenen Gesprächsstelle. Die technische Erfassung ist damit für DR-01 bis DR-06, DR-08 und DR-09 vorhanden. DR-07 sowie die qualitative Sichtprüfung gegen den Design Contract bleiben offen. ROADMAP.md wird nicht geändert; Issue #17 bleibt offen.
