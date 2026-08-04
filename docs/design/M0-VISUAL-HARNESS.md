# M0 Playwright-Design-Harness

Der Harness erzeugt einen begrenzten, reproduzierbaren visuellen Nachweis für Issue #17. Er ist kein M5-E2E-Test und kein verpflichtendes CI-Gate.

## Lokal ausführen

    pnpm visual:design

Das Skript startet Backend und Frontend auf den lokalen Ports 4174 und 4173, verwendet ausschließlich den Mock-Harness und legt für jeden Lauf ein isoliertes Runtime-Verzeichnis unter tests/visual/runtime/ an. Die Referenzbilder werden mit stabilen Namen unter tests/visual/screenshots/ überschrieben.

## Zustände und Nachweis

| Zustand | Screenshot |
|---|---|
| DR-01 Neuer Planungsraum, Desktop | dr-01-new-space-desktop.png |
| DR-02 Laufendes Gespräch, Desktop | dr-02-conversation-desktop.png |
| DR-04 Offene Entscheidung, Desktop | dr-04-open-decision-desktop.png |
| DR-05 Hintergrundarbeit, Desktop | dr-05-background-work-desktop.png |
| DR-06 Ergebnis zur Prüfung, Desktop | dr-06-result-review-desktop.png |
| DR-08 Laufendes Gespräch, schmal | dr-08-conversation-narrow.png |
| DR-09 Laufendes Gespräch, Reduced Motion | dr-09-reduced-motion.png |

Die Zustände entstehen über die vorhandenen Planungsraum-, Gesprächs-, Guided-Proposal- und Service-Request-APIs. Der Mock-Harness liefert die bekannten Antwort- und Entwurfsdaten. Zeit-Elemente werden im Screenshot maskiert, die Viewports, Sprache, Zeitzone und Farbpräferenz sind festgelegt, Animationen werden beim Screenshot deaktiviert.

Der kurze Hintergrundarbeitszustand ist in der echten Mock-Ausführung absichtlich sehr schnell. Nach dem vollständigen Mock-Durchlauf setzt der Harness deshalb nur den isolierten Service-Request auf einen festen in_progress-Projektionsstand und entfernt den dazu nicht passenden Rückkehrmarker. Dadurch bleibt DR-05 reproduzierbar, ohne Produktionscode oder Runtimearchitektur zu verändern.

Der Harness prüft zusätzlich sichtbare Kerntexte, den expandierbaren Hintergrundbereich und den Reduced-Motion-Kontext. Er ersetzt nicht die qualitative Prüfung gegen DENKRAUM-DESIGN-CONTRACT.md: Erfolgreiche Screenshot-Erzeugung schließt M0 nicht ab und ändert keine Roadmap-Checkbox.
