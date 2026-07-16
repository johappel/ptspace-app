# ptspace-app – Umsetzungsliste

Stand: 2026-07-16

Diese Liste ist das operative Arbeitsdokument für Agenten. Pädagogische Semantik kommt aus dem Kernel:

- `pedagogical-thinking-space/specs/LEARNING_LANDSCAPE_SCHEMA.md`
- `pedagogical-thinking-space/specs/PLANNING_BOARD_SCHEMA.md`

Die App-spezifische Arbeitsfläche ist in `docs/learning-landscape-and-board.md` beschrieben.

Der verbindliche UX-Refactor steht in:

- `REFACTOR-UX.md`

Der verbindliche, agentenübergreifende Umsetzungsplan für den geführten Arbeitsfluss, „Jetzt wichtig“, Hintergrundarbeit und die Denkraum-Oberfläche steht in:

- `docs/guided-workflow-tasks.md`

## Aktueller Stand

- [x] SvelteKit-Frontend, Fastify-Backend und gemeinsame Domain-Schemas.
- [x] Planungsräume verwenden den Kernel-Workspace als inhaltliche Quelle.
- [x] Gespräch, Denkstand, offene Entscheidungen und Markdown/OKF-Export.
- [x] geschützte Harness-Grenze und Mock-/OpenCode-Adapter.
- [x] erster Worker-Auftrag für einen Arbeitsauftrag als Entwurf.
- [x] automatische strukturelle Vorprüfung von Worker-Ergebnissen.
- [ ] modellgestützte Critical-Friend-Review von Worker-Ergebnissen (siehe L5a/GW-100).
- [ ] echter Knowledge-Adapter mit Quellen, Abrufdatum und Unsicherheit.
- [x] Lernlandschaft und Planungsboard: lesen, validieren, speichern und im Modal zeigen.
- [ ] Fokusübergabe für Platzierungen vervollständigen; Lernmoment, Übergang, Unterrichtsfenster, Board-Karte und Material funktionieren bereits kontextbezogen.
- [x] Zeit & Dramaturgie mit bearbeitbaren Unterrichtsfenstern und Lernlandschaft-Platzierungen.
- [ ] vollständige Materialmetadaten und Ergebnisbereich als Projektion von Lernmoment und Board-Karte.
- [ ] Hauptansicht vom Dashboard-Layout zu einem fokussierten gemeinsamen Denkraum weiterentwickeln.
- [ ] Gesprächsereignisse bidirektional mit Denkstand, offenen Entscheidungen, Vorbereitungen und Ergebnissen verknüpfen.
- [ ] Ruhige Hintergrundarbeitsanzeige als kompakte Werkstattleiste umsetzen.

## L0 — Voraussetzung: Kernel-Verträge

- [ ] Kernel-Verträge synchronisieren und den noch unversionierten Board-Material-Worker-Vertrag prüfen.
- [ ] Zod-Schemas mit den Kernel-Verträgen abgleichen; insbesondere Materialmetadaten und Fokus-Typen sind noch unvollständig.
- [x] Parser und Serializer für `learning-landscape.md` und `planning-board.yml` implementieren.
- [ ] Bestehende `service-requests/` verlustfrei als Planungsboard-Karten abbilden; „Jetzt wichtig“ wird daraus nur als eine priorisierte Projektion abgeleitet.
- [x] Bestehende Planungsräume ohne Lernlandschaft verlustfrei migrieren.
- [ ] Ungültige Node-IDs, Kanten und Referenzen ablehnen und technische Fehlercodes aus Lehrkräftemeldungen entfernen.

**Done when:** App und Kernel lesen denselben kanonischen Inhalt ohne parallele Datenmodelle.

## L1 — Domain und API

- [x] Domain-Typen implementieren:
  - `LearningLandscape`
  - `LearningMoment`
  - `LandscapeTransition`
  - `TeachingWindow`
  - `TimePlacement`
  - `PlanningBoardItem`
  - `LandscapeChangeProposal`
- [x] API: Lernlandschaft lesen und speichern.
- [x] API: Unterrichtsfenster und Platzierungen lesen und speichern.
- [x] API: Planungsboard lesen und Board-Karten verschieben.
- [ ] API: Material einem Lernmoment oder Board-Item zuordnen; offen bis Kernel-Materialmetadaten und atomare Backend-Rückführung vollständig vorliegen.
- [x] Jede semantische Änderung als verständliche Git-Version speichern.
- [x] Layoutdaten getrennt von semantischen Daten speichern.
- [ ] Gesprächsmarker als App-Read-Model mit `sourceMessageId`, Art und Zielreferenz implementieren.
- [ ] Zielreferenzen serverseitig auf denselben Planungsraum begrenzen.
- [ ] Marker bei verworfenen, ersetzten oder gelöschten Zielen konsistent behandeln.

**Done when:** alle UI-Operationen serverseitig validiert und versioniert sind und Herkunftsbezüge keine parallele pädagogische Semantik erzeugen.

## L2 — Lernlandschaft-Modal

- [x] großes Modal „Unterrichtsplanung“ implementieren.
- [x] Tab „Lernlandschaft“ implementieren.
- [x] `@xyflow/svelte` integrieren.
- [ ] Custom Nodes für die vereinbarten Lernmoment-Typen bauen.
- [x] Knoten-Detailkarte implementieren.
- [ ] Verbindung nur über Auswahl einer didaktischen Bedeutung erzeugen.
- [ ] Gruppenflächen für Phasen, Räume und Stationen implementieren.
- [x] Zoom und MiniMap implementieren; Tastaturbedienung und Rücksetzen des Layouts ergänzen.
- [ ] Canvas- und lineare Lesansicht aus derselben Landschaft anbieten.

**Done when:** eine Lehrkraft eine lineare, stationäre und hybride Lernlandschaft ohne technische Begriffe anlegen kann.

## L3 — Zeit & Dramaturgie

- [x] Tab „Zeit & Dramaturgie“ implementieren.
- [x] Unterrichtsfenster anlegen und benennen.
- [x] Lernmomente zeitlich zuordnen, auch mehrfach.
- [x] Wahl- und Stationsmomente als nicht-lineare Platzierung darstellen.
- [x] zeitliche Konflikte und unzugeordnete Lernmomente sichtbar machen.
- [ ] Browser-E2E für den Wechsel zwischen Canvas und Zeitansicht ohne Informationsverlust.

**Done when:** die Lehrkraft erkennen kann, was wann stattfindet, ohne die didaktische Offenheit zu verlieren.

## L4 — Planungsboard und Materialien

- [x] Tab „Planungsboard“ implementieren.
- [x] Spalten: Noch klären, Vorbereiten, Zur Prüfung, Bereit.
- [x] Board-Karten mit Lernmomenten verknüpfen; Unterrichtsfenster und Materialien ergänzen.
- [ ] Materialtab mit vollständigen Metadaten und atomarer Zuordnung zu Lernmomenten und Board-Items implementieren.

Der frühere Mehrschritt „Nächste Schritte → Board-Karte → Auftrag“ entfällt. Die geführte Entscheidung läuft ausschließlich über „Jetzt wichtig“ und ist in L5a/GW-140 bis GW-230 beschrieben. Das Board bleibt Übersicht, der Materialbereich Ergebnis- und Nachweisbereich.

**Done when:** Board und Materialien verlässlich auf denselben kanonischen Bezügen beruhen; kein Bereich wird zur Pflichtstation des geführten Arbeitsflusses.

## L4a — Denkraum und räumliche Informationsarchitektur

Das verbindliche UX-Zielbild steht in `REFACTOR-UX.md`.  
Die konkrete Umsetzung ist in `docs/guided-workflow-tasks.md`, GW-200 bis GW-230, beschrieben.

- [ ] Gespräch als visuelles und funktionales Zentrum gestalten.
- [ ] Gleichgewichtige Dashboard-Spalten und Haupttabs zugunsten einer fokussierten Raumstruktur reduzieren.
- [ ] Ruhige gemeinsame Arbeitsszene umsetzen; keine detaillierten Avatare oder simulierte Emotionalität.
- [ ] Pinnwand als kompakte Projektion von Denkstand, offener Entscheidung und aktuellem Ergebnis umsetzen.
- [ ] Lernlandschaft, Zeitplanung, Vorbereitungen, Knowledge und Materialien über verständliche Raumzugänge und eine lineare Navigation erreichbar machen.
- [ ] Gesprächsmarker für festgehaltene Gedanken, Entscheidungen, Arbeitsvorhaben und Ergebnisse implementieren.
- [ ] Bidirektionale Navigation zwischen Gesprächsstelle und Zielartefakt.
- [ ] Chatfilter für markierte Ereignistypen.
- [ ] Kurze Zustandsübergänge mit Reduced-Motion-Alternative.
- [ ] Optionale, abschaltbare akustische Rückmeldung.
- [ ] Hintergrundarbeit in einer kleinen, nicht technischen Werkstattleiste anzeigen.
- [ ] Visuelle Regression, Tastaturbedienung und Screenreader-Zugänge testen.
- [ ] Funktionsgleiche Darstellung ohne Illustration, Animation und Ton sicherstellen.

**Done when:** Der Planungsraum wirkt als gemeinsamer pädagogischer Denkraum und nicht als Verwaltungsdashboard; alle räumlichen Funktionen bleiben auch ohne Animation, Illustration oder Maus vollständig zugänglich.

## L5 — AI-Vorschläge und Review

- [ ] Fokus aus einer Platzierung an den bestehenden Planungsraum-Chat übergeben; die übrigen Fokustypen funktionieren bereits.
- [ ] `LandscapeChangeProposal` als eigenes Artefakt implementieren.
- [ ] Canvas-Diff für neue, geänderte und entfernte Knoten/Kanten implementieren.
- [ ] Für strukturelle Landschaftsänderungen Vorschau, Übernehmen, im Gespräch ändern und Verwerfen anbieten.
- [x] KI darf ohne Zustimmung keine kanonische Lernlandschaft oder Zeitplanung ändern.
- [ ] modellgestützte Critical-Friend-Review nach Worker-Ausführung implementieren (siehe L5a/GW-100).
- [ ] Review-Ergebnis sichtbar von automatischer Vorprüfung unterscheiden (siehe L5a/GW-100/GW-140).

Die Übernahme von Worker-Vorschlägen erfolgt atomar nach L5a/GW-120; der alte separate Board-Proposal-Schritt entfällt.

**Done when:** KI-Entwürfe nachvollziehbar, reversibel und lehrkraftgesteuert sind.

## L5a — Geführter Arbeitsfluss und Hintergrundarbeit

Die detaillierte Reihenfolge und Agenten-Zuordnung steht in `docs/guided-workflow-tasks.md`.

- [ ] Frontend-Typecheck reparieren: `WorkerMaterial.review` wird in `frontend/src/routes/+page.svelte` verwendet, fehlt aber in `frontend/src/lib/api.ts`.
- [ ] Genau eine Entscheidung unter „Jetzt wichtig“ anzeigen.
- [ ] Gesprächsvorschlag als nicht-kanonisches, strukturiertes Proposal speichern.
- [ ] Ein Häkchen erzeugt atomar Board-Karte, Service Request und Hintergrundauftrag.
- [ ] Keine zusätzlichen Pflichtklicks für Board-Aufnahme, Beauftragung oder Startbestätigung.
- [ ] Laufende Arbeit persistent und nicht unterbrechend anzeigen.
- [ ] Fertiges Material direkt in „Jetzt wichtig“ zur Prüfung anzeigen.
- [ ] Ein zweites Häkchen gibt das sichtbare Ergebnis fachlich frei.
- [ ] Der Stift führt immer in den bestehenden fokussierten Chat und speichert nichts kanonisch.
- [ ] AutomaticCheck und Lehrkraftfreigabe getrennt speichern und anzeigen.
- [ ] Gesprächsvorschlag, gestartete Vorbereitung und zurückgekehrtes Ergebnis im Chat mit dem zugehörigen Ziel verknüpfen.
- [ ] Laufende Arbeit als kompakte, persistent sichtbare Hintergrundaktivität darstellen.
- [ ] Abschluss einer Arbeit sichtbar, aber ohne automatischen Fokuswechsel melden.
- [ ] Lokalen Real-Harness-Fluss mit einem synthetischen Planungsraum verifizieren.

**Done when:** Vom Gespräch bis zur laufenden Vorbereitung und vom sichtbaren Ergebnis bis `ready_for_class` ist jeweils genau ein bewusster Klick nötig; Planungsboard und Materialbereich sind keine Pflichtstationen; die Herkunft im Gespräch bleibt nachvollziehbar.

## L6 — Knowledge und Qualität

- [ ] Knowledge-Adapter mit freigegebenen Quellen integrieren.
- [ ] Quellen, Abrufdatum, Prüfstatus und Unsicherheit speichern und anzeigen.
- [ ] Lehrplanbezug als Board-Aufgabe und Knowledge-Ergebnis modellieren.
- [ ] E2E-Test: Landschaftsänderung → Canvas-Vorschau → Zustimmung → Workspace → UI.
- [ ] E2E-Test: Gesprächsvorschlag → ein Häkchen → Hintergrundarbeit → Ergebnis in „Jetzt wichtig“ → zweites Häkchen → `ready_for_class`.
- [ ] E2E-Test: Gesprächsmarker → Ziel öffnen → zur Gesprächsstelle zurückspringen.
- [ ] Browser-E2E für Canvas-/Zeitansicht-Wechsel und Informationsverlust.
- [ ] Barrierefreiheit: Tastatur, Fokus, Kontrast, nicht allein farbcodierte Kanten.
- [ ] Reduced Motion, abschaltbare Töne und funktionsgleiche Darstellung ohne Raumillustration sicherstellen.
- [ ] Räumliche Navigation nie ausschließlich über Position, Farbe, Animation oder Symbol vermitteln.
- [ ] Responsive Verhalten: Denkraum und Canvas-Modal auf kleineren Displays.
- [ ] Visuelle Regression für Hauptzustände des Denkraums.

## Noch nicht beginnen

- freie Whiteboard-Zeichnung als kanonische Quelle,
- automatische KI-Umbauten ohne Vorschau und Zustimmung,
- Produktivbetrieb mit Schüler:innendaten,
- Nextcloud- oder PDF/DOCX-Export vor stabiler Landschafts- und Materialzuordnung,
- Host Bridge ohne eigenes Sicherheitsreview,
- begehbare 3D-Welt,
- vermenschlichte Worker-Figuren,
- Belohnungs-, Punkte- oder Levelsysteme.
