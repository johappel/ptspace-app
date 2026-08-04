# M0 – Denkraum Design Gate

Stand: 2026-08-04  
Teil des Meilensteins `REAL-RUNTIME-MVP`

## Ziel

Bevor Runtime-, Session- und Harness-Arbeiten die sichtbare Oberfläche weiter verändern, wird der Denkraum als verbindliche Produktqualität abgesichert.

Das Ziel ist nicht ein späteres Redesign. Das Design-Gate begleitet alle folgenden Phasen und verhindert, dass technische Status-, Diagnose- oder Workflowfunktionen die App in ein Dashboard verwandeln.

## Normative Grundlagen

- `REFACTOR-UX.md`
- `docs/design/DENKRAUM-DESIGN-CONTRACT.md`
- `AGENTS.md`

## Aufgaben

1. Aktuellen Frontendstand gegen die Dashboard-Ausschlusskriterien prüfen.
2. Abweichungen zwischen Umsetzung und `REFACTOR-UX.md` dokumentieren.
3. Design-Tokens für Farbe, Typografie, Abstände, Oberflächen, Tiefe und Bewegung konsolidieren.
4. Hauptansicht auf eine eindeutige Hierarchie prüfen:
   - Gespräch und gemeinsamer Gegenstand,
   - genau ein „Jetzt wichtig“-Fokus,
   - zurückgenommene Pinnwand,
   - flache Hintergrundarbeitsanzeige,
   - sekundäre Raumzugänge.
5. Verbindliche Referenzzustände als Screenshots oder visuelle Tests erfassen.
6. Eine PR-Checkliste für Denkraumqualität etablieren.
7. Sicherstellen, dass neue Runtimezustände nur in teacher-facing Form und ohne technische Dominanz erscheinen.

## Referenzzustände

- neuer, noch leerer Planungsraum;
- laufendes Gespräch;
- festgehaltener Gedanke;
- offene Entscheidung unter „Jetzt wichtig“;
- laufende Hintergrundarbeit;
- zurückgekehrtes Ergebnis;
- geöffnete Lernlandschaft;
- schmale/mobile Darstellung;
- Reduced-Motion-/illustrationsarme Darstellung.

## Abnahme

- Der erste Eindruck ist eindeutig ein gemeinsamer pädagogischer Denkraum.
- Das Gespräch erhält die klare visuelle Priorität.
- Es gibt kein gleichgewichtiges Karten- oder Spaltenraster.
- „Jetzt wichtig“ zeigt höchstens einen Gegenstand.
- technische Runtimezustände bleiben in der Hauptansicht zurückgenommen und lehrkräfteverständlich.
- Design-Tokens und Referenzzustände sind dokumentiert.
- visuelle Regressionen oder äquivalente überprüfbare Nachweise sind vorbereitet.
- der Handoff enthält eine qualitative Prüfung gegen `DENKRAUM-DESIGN-CONTRACT.md`.

## Wirkung auf M1–M6

M0 ist kein einmalig abgeschlossenes Redesign. Seine Kriterien bleiben für jeden folgenden Frontend-PR verbindlich. M5 übernimmt die visuellen Regressionen in CI; M6 führt die abschließende qualitative Design- und Zugänglichkeitsabnahme durch.
