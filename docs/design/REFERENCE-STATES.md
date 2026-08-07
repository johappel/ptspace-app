# Denkraum-Referenzzustände

Stand: 2026-08-07

Diese Datei dient als Index für die visuellen Referenzzustände des Denkraums. Die tatsächlichen Screenshots oder visuellen Testartefakte werden im Rahmen von M0 und M5 ergänzt.

## Verbindliche Zustände

| ID | Zustand | Zentrale Designfrage | Status |
|---|---|---|---|
| DR-01 | Neuer Planungsraum | Wirkt der Einstieg wie ein gemeinsamer Denkraum statt wie eine leere Verwaltungsoberfläche? | offen |
| DR-02 | Laufendes Gespräch | Bleiben Gespräch und gemeinsamer Gegenstand visuell dominant? | technisch erfasst, qualitativ offen |
| DR-03 | Pinnwand als Hauptfokus | Übernimmt die kuratierte Gedächtnisschicht den Tisch, ohne zur Historien- oder Kartenwand zu werden? | technisch erfasst, qualitativ offen |
| DR-04 | Offene Entscheidung | Zeigt „Jetzt wichtig“ genau einen klaren Fokus? | technisch erfasst, qualitativ offen |
| DR-05 | Hintergrundarbeit | Bleibt laufende Arbeit als ruhige Statusspur sichtbar statt als Job-Dashboard? | technisch erfasst, qualitativ offen |
| DR-06 | Ergebnis zur Prüfung | Kehrt das Ergebnis verständlich und prüfbar in denselben Denkraum zurück? | technisch erfasst, qualitativ offen |
| DR-07 | Lernlandschaft geöffnet | Bleibt die vertiefte Ansicht Teil desselben Produktraums? | technisch erfasst, qualitativ offen |
| DR-08 | Schmale Darstellung | Bleiben Gespräch, Fokus und lineare Navigation priorisiert? | offen |
| DR-09 | Reduced Motion / ohne Illustration | Bleibt die semantische und atmosphärische Qualität ohne Bewegung und Raumillustration erhalten? | offen |

## Fokusmodus-Unterzustände

Die Referenzzustände beschreiben denselben Denkraum in unterschiedlichen Hauptperspektiven. Der aktive Gegenstand, der Gesprächskontext und der Rückkehrweg müssen jeweils sichtbar bleiben.

| Unterzustand | Erwarteter Fokus |
|---|---|
| DR-03a Pinnwand geschlossen | Gespräch als alleiniger Hauptfokus; nur der kompakte Denkstand-Zugang ist sichtbar. |
| DR-03b Pinnwand geöffnet | Pinnwand als Hauptarbeitsraum mit wenigen kuratierten Spuren, Typ, Herkunft und Rückkehraktion. |
| DR-05a Gespräch mit Statuszeile | Vorbereitung nur als flache teacher-facing Statusspur, ohne doppelte Arbeitsprojektion. |
| DR-05b bewusst geöffnete Vorbereitung | Vorbereitungen übernehmen den Hauptarbeitsraum; technische Ausführungsbegriffe bleiben verborgen. |
| DR-07a Lernlandschaft ohne Auswahl | Lernlandschaft als Hauptarbeitsraum; der Planungsraum und die Gesprächsbegleitung bleiben erkennbar. |
| DR-07b Lernmoment ausgewählt | Auswahl benennt den Lernmoment und aktualisiert den Gesprächskontext nachvollziehbar. |

Die Fokusmodusbilder liegen unter `tests/visual/screenshots/`:

- DR-02: `dr-02-conversation-desktop.png`
- DR-03a: ruhiger Gesprächszustand wie DR-02 (Pinnwand geschlossen)
- DR-03b: `dr-03-pinboard-unselected-desktop.png` und `dr-03-captured-thought-desktop.png` (Spur ausgewählt)
- Denkstand-Unterzustand: `dr-03-thinking-state-desktop.png`
- DR-04: `dr-04-open-decision-desktop.png`
- DR-05: `dr-05-background-work-desktop.png` und `dr-05-background-work-open-desktop.png`
- DR-06: `dr-06-result-review-desktop.png`
- DR-07: `dr-07-learning-landscape-desktop.png`
- DR-08: `dr-08-conversation-narrow.png`
- DR-09: `dr-09-reduced-motion.png`

Für alle sechs Fokusmodi gilt: Der vorherige Fokus bleibt als Rückkehrpunkt erhalten, der neue Hauptbereich erhält den Tastaturfokus, und bei schmaler Darstellung steht der aktive Gegenstand vor Navigation und Statusinformationen.

## Nachweis pro Zustand

Für jeden Zustand werden dokumentiert:

- Ausgangsdaten beziehungsweise Fixture;
- Desktop-Screenshot;
- schmale Darstellung, sofern relevant;
- Reduced-Motion-Variante, sofern relevant;
- automatischer visueller Regressionstest oder begründete Alternative;
- qualitative Prüfung gegen `DENKRAUM-DESIGN-CONTRACT.md`;
- bekannte Abweichungen und Folge-Issue.

Ein Snapshot gilt nicht allein als gestalterische Abnahme. Er macht Veränderungen prüfbar; die qualitative Beurteilung bleibt zusätzlich erforderlich.

## M0-Nachweis

Der lokale Playwright-Design-Harness erfasst reproduzierbar:

- DR-01, DR-02, DR-03, DR-04, DR-05, DR-06 und DR-07 als Desktop-Screenshots;
- DR-08 als schmale Darstellung mit 640 px Breite;
- DR-09 mit Reduced Motion und gesetztem App-Schalter;
- DR-05 zusätzlich als geöffnete vertiefte Hintergrundansicht.

Alle neun Referenzzustände sind damit technisch reproduzierbar erfasst, DR-05 besitzt zusätzlich einen getrennten Detailzustand. Kein Snapshot gilt automatisch als qualitative Abnahme; die Sichtprüfung gegen den Design Contract bleibt offen.

Der lokale Befehl ist pnpm visual:design; stabile Dateien und die Fixture-Strategie stehen in docs/design/M0-VISUAL-HARNESS.md.

## Dramaturgischer Nachweis für DR-02, DR-04, DR-06 und DR-08

Die vier Zustände werden gegen dieselbe Fokuslogik geprüft:

- DR-02: ruhiger Normalzustand; kein entscheidungsreifer Gegenstand konkurriert mit dem Gespräch.
- DR-04: genau eine offene Entscheidung liegt als temporäre Fokuslage unmittelbar im Gespräch. Die Seitenebene ist zurückgenommen. Passt, Weiterreden und Später zurückstellen sind sichtbar.
- DR-06: genau eine Ergebnisprüfung liegt als temporäre Fokuslage unmittelbar im Gespräch; Vorschau und fachliche Handlungen gehören zu diesem einen Gegenstand.
- DR-08: dieselbe Priorität bleibt bei schmaler Breite erhalten. Die Fokuslage bleibt im Gespräch; sekundäre Bereiche werden nicht einfach als konkurrierender Blockstapel darunter angeordnet.

Ein zusätzlicher Interaktionstest muss Später zurückstellen aus DR-04 oder DR-06 ausführen, die Fokuslage schließen und den Gegenstand erst danach als wiederaufrufbaren Eintrag in der Pinnwand nachweisen.

## Nacharbeit am Design-Gate vom 2026-08-07

Die ruhige Gesprächsansicht zeigt dauerhaft nur Titel, Gespräch, Eingabe, einen kleinen Zugang zum Denkstand und gegebenenfalls die eine aktuelle Fokuslage. Filter, vollständiger Denkstand, offene Entscheidungen und weitere Bereiche werden erst über einen diskreten Zugang oder eine vertiefte Ansicht geöffnet. Ein bewusster Zugang übernimmt anschließend den Hauptarbeitsraum als Fokusmodus.

Die Pinnwand ist im Ruhezustand keine Inhaltsfläche. „Denkstand · N Spuren festgehalten“ öffnet bewusst eine Gedächtnisschicht mit höchstens fünf aktuellen, kuratierten Spuren. Jede Spur benennt ihren fachlichen Typ und ihre Herkunft; „Im Gespräch aufgreifen“ beziehungsweise „Zur Herkunft“ schließt die Ansicht und führt zur markierten Gesprächsstelle zurück. Eine zurückgestellte Fokuslage erscheint erst nach „Später zurückstellen“ als wiederaufrufbare Spur. Eine vollständige Historie ist kein Bestandteil dieses Fokusmodus.

Hintergrundarbeit wird normal nur einmal als flache Statuszeile projiziert. Die geöffnete Detailansicht enthält die vertiefte teacher-facing Information; dieselbe Arbeit wird nicht zusätzlich als rechte Nebenkarte gerendert. DR-02, DR-03, DR-04, DR-05, DR-06, DR-08 und DR-09 müssen deshalb dieselbe Fokus- und Rückkehrlogik bewahren. Issue #17 bleibt offen, bis die qualitative Sichtprüfung abgeschlossen ist.

Der Harness deckt jetzt auch DR-03 und DR-07 ab und prüft die Rückkehr vom Pinnwand-Eintrag beziehungsweise aus der Lernlandschaft in den Denkraum. Zusätzlich werden Zeitplanung, Vorbereitungen, Materialien und die Wiederkehr zum Gespräch als Fokuswechsel geprüft. DR-05 wird im Normalmodus mit genau einer Statuszeile und nach bewusster Aktivierung als eigenständige Detailansicht erfasst. Die technische Erfassung ist damit für DR-01 bis DR-09 vorhanden. Die qualitative Sichtprüfung gegen den Design Contract bleibt offen; ROADMAP.md wird nicht geändert und Issue #17 bleibt offen.
