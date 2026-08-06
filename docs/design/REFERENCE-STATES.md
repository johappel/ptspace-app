# Denkraum-Referenzzustände

Stand: 2026-08-04

Diese Datei dient als Index für die visuellen Referenzzustände des Denkraums. Die tatsächlichen Screenshots oder visuellen Testartefakte werden im Rahmen von M0 und M5 ergänzt.

## Verbindliche Zustände

| ID | Zustand | Zentrale Designfrage | Status |
|---|---|---|---|
| DR-01 | Neuer Planungsraum | Wirkt der Einstieg wie ein gemeinsamer Denkraum statt wie eine leere Verwaltungsoberfläche? | offen |
| DR-02 | Laufendes Gespräch | Bleiben Gespräch und gemeinsamer Gegenstand visuell dominant? | technisch erfasst, qualitativ offen |
| DR-03 | Festgehaltener Gedanke | Wird die Herkunft aus dem Gespräch sichtbar, ohne eine weitere dominante Karte zu erzeugen? | technisch erfasst, qualitativ offen |
| DR-04 | Offene Entscheidung | Zeigt „Jetzt wichtig“ genau einen klaren Fokus? | technisch erfasst, qualitativ offen |
| DR-05 | Hintergrundarbeit | Bleibt laufende Arbeit als ruhige Statusspur sichtbar statt als Job-Dashboard? | technisch erfasst, qualitativ offen |
| DR-06 | Ergebnis zur Prüfung | Kehrt das Ergebnis verständlich und prüfbar in denselben Denkraum zurück? | technisch erfasst, qualitativ offen |
| DR-07 | Lernlandschaft geöffnet | Bleibt die vertiefte Ansicht Teil desselben Produktraums? | offen |
| DR-08 | Schmale Darstellung | Bleiben Gespräch, Fokus und lineare Navigation priorisiert? | offen |
| DR-09 | Reduced Motion / ohne Illustration | Bleibt die semantische und atmosphärische Qualität ohne Bewegung und Raumillustration erhalten? | offen |

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

- DR-01, DR-02, DR-03, DR-04, DR-05 und DR-06 als Desktop-Screenshots;
- DR-08 als schmale Darstellung mit 640 px Breite;
- DR-09 mit Reduced Motion und gesetztem App-Schalter.

Diese acht Zustände sind technisch reproduzierbar erfasst, aber nicht automatisch qualitativ abgenommen. DR-07 bleibt für M0 als separater visueller Prüfpunkt offen.

Der lokale Befehl ist pnpm visual:design; stabile Dateien und die Fixture-Strategie stehen in docs/design/M0-VISUAL-HARNESS.md.

## Dramaturgischer Nachweis für DR-02, DR-04, DR-06 und DR-08

Die vier Zustände werden gegen dieselbe Fokuslogik geprüft:

- DR-02: ruhiger Normalzustand; kein entscheidungsreifer Gegenstand konkurriert mit dem Gespräch.
- DR-04: genau eine offene Entscheidung liegt als temporäre Fokuslage unmittelbar im Gespräch. Die Seitenebene ist zurückgenommen. Passt, Weiterreden und Später zurückstellen sind sichtbar.
- DR-06: genau eine Ergebnisprüfung liegt als temporäre Fokuslage unmittelbar im Gespräch; Vorschau und fachliche Handlungen gehören zu diesem einen Gegenstand.
- DR-08: dieselbe Priorität bleibt bei schmaler Breite erhalten. Die Fokuslage bleibt im Gespräch; sekundäre Bereiche werden nicht einfach als konkurrierender Blockstapel darunter angeordnet.

Ein zusätzlicher Interaktionstest muss Später zurückstellen aus DR-04 oder DR-06 ausführen, die Fokuslage schließen und den Gegenstand erst danach als wiederaufrufbaren Eintrag in der Pinnwand nachweisen.

## Nacharbeit am Design-Gate vom 2026-08-06

Die ruhige Gesprächsansicht zeigt dauerhaft nur Titel, Gespräch, Eingabe, einen kleinen Zugang zum Denkstand und gegebenenfalls die eine aktuelle Fokuslage. Filter, vollständiger Denkstand, offene Entscheidungen und weitere Bereiche werden erst über einen diskreten Zugang oder eine vertiefte Ansicht geöffnet.

Die Pinnwand ist im Ruhezustand keine Inhaltsfläche. „Denkstand · N Spuren festgehalten“ öffnet bewusst eine Gedächtnisschicht mit höchstens fünf aktuellen Spuren. Jede Spur benennt ihren fachlichen Typ und ihre Herkunft; „Im Gespräch aufgreifen“ beziehungsweise „Zur Herkunft“ schließt die Ansicht und führt zur markierten Gesprächsstelle zurück. „Alle Spuren“ öffnet die vollständige Historie erst auf ausdrückliche Aktion. Eine zurückgestellte Fokuslage erscheint erst nach „Später zurückstellen“ als wiederaufrufbare Spur.

Hintergrundarbeit wird normal nur einmal als flache Statuszeile projiziert. Die geöffnete Detailansicht enthält die vertiefte teacher-facing Information; dieselbe Arbeit wird nicht zusätzlich als rechte Nebenkarte gerendert. DR-02, DR-03, DR-04, DR-05, DR-06, DR-08 und DR-09 müssen deshalb dieselbe Fokus- und Rückkehrlogik bewahren. Issue #17 bleibt offen, bis die qualitative Sichtprüfung abgeschlossen ist.
