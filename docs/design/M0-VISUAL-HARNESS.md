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
| DR-03 Festgehaltener Gedanke, Desktop | dr-03-captured-thought-desktop.png |
| DR-04 Offene Entscheidung, Desktop | dr-04-open-decision-desktop.png |
| DR-05 Hintergrundarbeit, Desktop, Normalmodus | dr-05-background-work-desktop.png |
| DR-05 Hintergrundarbeit, geöffnete Detailansicht | dr-05-background-work-open-desktop.png |
| DR-06 Ergebnis zur Prüfung, Desktop | dr-06-result-review-desktop.png |
| DR-07 Lernlandschaft, Desktop | dr-07-learning-landscape-desktop.png |
| DR-08 Fokuslage im Gespräch, schmal | dr-08-conversation-narrow.png |
| DR-09 Laufendes Gespräch, Reduced Motion | dr-09-reduced-motion.png |
| DR-02c Companion Strip im Nebenfokus | dr-10-companion-strip-desktop.png |

Die Zustände entstehen über die vorhandenen Planungsraum-, Gesprächs-, Guided-Proposal- und Service-Request-APIs. Der Mock-Harness liefert die bekannten Antwort- und Entwurfsdaten. Zeit-Elemente werden im Screenshot maskiert, die Viewports, Sprache, Zeitzone und Farbpräferenz sind festgelegt, Animationen werden beim Screenshot deaktiviert. DR-02c prüft zusätzlich die reduzierte Begleitdarstellung, die direkte Aktion „Gespräch groß öffnen“ und die Rückkehr per Doppelklick.

Der kurze Hintergrundarbeitszustand ist in der echten Mock-Ausführung absichtlich sehr schnell. Nach dem vollständigen Mock-Durchlauf setzt der Harness deshalb nur den isolierten Service-Request auf einen festen in_progress-Projektionsstand und entfernt den dazu nicht passenden Rückkehrmarker. Dadurch bleibt DR-05 reproduzierbar, ohne Produktionscode oder Runtimearchitektur zu verändern.

Der Harness prüft zusätzlich sichtbare Kerntexte, den expandierbaren Hintergrundbereich und den Reduced-Motion-Kontext. Er ersetzt nicht die qualitative Prüfung gegen DENKRAUM-DESIGN-CONTRACT.md: Erfolgreiche Screenshot-Erzeugung schließt M0 nicht ab und ändert keine Roadmap-Checkbox.

Die geschlossene Statuszeile und die geöffnete Hintergrundebene werden für DR-05 gegen denselben teacher-facing Arbeitsauftrag geprüft. Im Normalmodus darf keine breite Hintergrundübersicht zusätzlich zum Gespräch erscheinen; nach Aktivierung tritt das Gespräch zurück und die Fokuslage wird nicht wiederholt. Damit wird eine veraltete Mehrfachprojektion nicht mehr als stabiler Referenzzustand akzeptiert.

## Dramaturgische Fokusprüfung

Der Harness prüft nicht nur, ob Jetzt wichtig sichtbar ist:

- DR-02 enthält im Normalzustand keine aktive Fokuslage und nur den schmalen Denkstand-Zugang;
- DR-04 und DR-06 enthalten jeweils genau eine conversation-focus-layer unmittelbar vor dem Gesprächsverlauf;
- während dieser Fokuslage ist die Sidebar als sekundäre Ebene zurückgenommen und semantisch nicht der Handlungsort;
- die Fokuslage bietet Passt beziehungsweise die fachliche Freigabe, Weiterreden und Später zurückstellen;
- nach Später zurückstellen verschwindet die Fokuslage, und erst dann ist der Gegenstand als Später zurückgestellt in der Pinnwand wieder erreichbar;
- DR-08 prüft dieselbe Fokuslage bei 640 px, statt alle Bereiche nur untereinander zu stapeln;

Erfolgreiche Screenshots bleiben ein technischer Nachweis. Die qualitative Frage ist, ob der Blick dramaturgisch zwischen ruhigem Gespräch, genau einem temporären Fokus und bewusster Ablage wechselt.

## Nachweis der Pinnwand-Gedächtnisschicht

DR-03 legt im isolierten Harness einen Gesprächsmarker an. Der Normalzustand prüft den kompakten Zugang ohne permanente Pinnwandkarte. Nach bewusstem Öffnen werden Herkunft, Typ und die kuratierten Spuren geprüft; anschließend führt „Im Gespräch aufgreifen“ beziehungsweise „Zur Herkunft“ zur passenden Gesprächsstelle. Die Darstellung zeigt höchstens fünf aktuelle Spuren; eine vollständige Historie ist kein Bestandteil dieses Fokusmodus.

## Nachweis der geöffneten Lernlandschaft

DR-07 verwendet ein deterministisches Fixture mit drei Lernmomenten und zwei Übergängen. Der Referenzzustand prüft den Planungsraum-Kontext, die sichtbare Herkunft „aus dem Denkraum“, die eindeutige Rückkehr, die Raumansicht als Canvas sowie die gleichwertige lineare Lesansicht. Node-, Graph-, Schema- und Runtimebegriffe sind kein Bestandteil der teacher-facing Referenztexte.

Die Zustände sind technisch erfasst, aber nicht qualitativ im Browser abgenommen. Die Screenshots ersetzen diese Sichtprüfung nicht.

## Fokusmodus-Abdeckung

Der Harness prüft nun explizit, dass ein Bereich den Hauptarbeitsraum übernimmt und nicht nur ein weiteres Panel einblendet:

- `conversation` bleibt nach dem Perspektivwechsel als klar benannte Rückkehr erreichbar;
- `pinboard` wird als Hauptfokus geöffnet, eine Spur kann ausgewählt werden und ihre Beschriftung erscheint im Companion;
- `landscape` wird als Hauptfokus mit Canvas und gleichwertiger linearer Darstellung geöffnet;
- `timeline`, `preparation` und `materials` werden über „Auf den Tisch“ aktiviert und als Fokusmodi verifiziert;
- Composer- und Fokusbeschriftungen beziehen sich auf den aktiven Gegenstand;
- der technische Test prüft die Rückkehr, ersetzt aber keine qualitative Beurteilung von Rhythmus, Materialität und visueller Dominanz.

Der Lauf vom 2026-08-07 erzeugte erfolgreich die neun vorgesehenen Zustände, die geöffnete DR-05-Detailansicht sowie DR-02c. Die Dateien liegen unter `tests/visual/screenshots/`.
