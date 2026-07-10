# ptspace-app – Umsetzungsliste

Stand: 2026-07-10

Diese Liste ist das operative Arbeitsdokument für Agenten. Pädagogische Semantik kommt aus dem Kernel:

- `pedagogical-thinking-space/specs/LEARNING_LANDSCAPE_SCHEMA.md`
- `pedagogical-thinking-space/specs/PLANNING_BOARD_SCHEMA.md`

Die App-spezifische Arbeitsfläche ist in `docs/learning-landscape-and-board.md` beschrieben.

## Aktueller Stand

- [x] SvelteKit-Frontend, Fastify-Backend und gemeinsame Domain-Schemas.
- [x] Planungsräume verwenden den Kernel-Workspace als inhaltliche Quelle.
- [x] Gespräch, Denkstand, offene Entscheidungen und Markdown/OKF-Export.
- [x] geschützte Harness-Grenze und Mock-/OpenCode-Adapter.
- [x] erster Worker-Auftrag für einen Arbeitsauftrag als Entwurf.
- [x] automatische strukturelle Vorprüfung von Worker-Ergebnissen.
- [ ] modellgestützte Critical-Friend-Review von Worker-Ergebnissen.
- [ ] echter Knowledge-Adapter mit Quellen, Abrufdatum und Unsicherheit.
- [ ] Lernlandschaft, zeitliche Dramaturgie und Planungsboard.

## L0 — Voraussetzung: Kernel-Verträge

- [ ] Kernel-PR für Lernlandschaft und Planungsboard einbinden.
- [ ] Zod-Schemas aus den Kernel-Verträgen ableiten.
- [ ] Parser und Serializer für `learning-landscape.md` und `planning-board.yml` implementieren.
- [ ] Bestehende `service-requests/` verlustfrei als Planungsboard-Karten abbilden; „Nächste Schritte“ wird daraus abgeleitet.
- [ ] Bestehende Planungsräume ohne Lernlandschaft verlustfrei migrieren.
- [ ] Ungültige Node-IDs, Kanten und Referenzen mit lehrkräfteverständlichen Fehlern ablehnen.

**Done when:** App und Kernel lesen denselben kanonischen Inhalt ohne parallele Datenmodelle.

## L1 — Domain und API

- [ ] Domain-Typen implementieren:
  - `LearningLandscape`
  - `LearningMoment`
  - `LandscapeTransition`
  - `TeachingWindow`
  - `TimePlacement`
  - `PlanningBoardItem`
  - `LandscapeChangeProposal`
- [ ] API: Lernlandschaft lesen und speichern.
- [ ] API: Unterrichtsfenster und Platzierungen lesen und speichern.
- [ ] API: Planungsboard lesen, Vorschlag anlegen, bestätigen, verschieben und schließen.
- [ ] API: Material einem Lernmoment oder Board-Item zuordnen.
- [ ] Jede semantische Änderung als verständliche Git-Version speichern.
- [ ] Layoutdaten getrennt von semantischen Daten speichern.

**Done when:** alle UI-Operationen serverseitig validiert und versioniert sind.

## L2 — Lernlandschaft-Modal

- [ ] großes Modal „Unterrichtsplanung“ implementieren.
- [ ] Tab „Lernlandschaft“ implementieren.
- [ ] `@xyflow/svelte` integrieren.
- [ ] Custom Nodes für die vereinbarten Lernmoment-Typen bauen.
- [ ] Knoten-Detailkarte implementieren.
- [ ] Verbindung nur über Auswahl einer didaktischen Bedeutung erzeugen.
- [ ] Gruppenflächen für Phasen, Räume und Stationen implementieren.
- [ ] Zoom, MiniMap, Tastaturbedienung und Rücksetzen des Layouts implementieren.
- [ ] Canvas- und lineare Lesansicht aus derselben Landschaft anbieten.

**Done when:** eine Lehrkraft eine lineare, stationäre und hybride Lernlandschaft ohne technische Begriffe anlegen kann.

## L3 — Zeit & Dramaturgie

- [ ] Tab „Zeit & Dramaturgie“ implementieren.
- [ ] Unterrichtsfenster anlegen und benennen.
- [ ] Lernmomente zeitlich zuordnen, auch mehrfach.
- [ ] Wahl- und Stationsmomente als nicht-lineare Platzierung darstellen.
- [ ] zeitliche Konflikte und unzugeordnete Lernmomente sichtbar machen.
- [ ] Wechsel zwischen Canvas und Zeitansicht ohne Informationsverlust testen.

**Done when:** die Lehrkraft erkennen kann, was wann stattfindet, ohne die didaktische Offenheit zu verlieren.

## L4 — Planungsboard und Materialien

- [ ] Tab „Planungsboard“ implementieren.
- [ ] Spalten: Noch klären, Vorbereiten, Zur Prüfung, Bereit.
- [ ] Board-Karten mit Lernmomenten, Unterrichtsfenstern und Materialien verknüpfen.
- [ ] „Nächste Schritte“ in der Seitenleiste auf exakt ein priorisiertes Board-Arbeitsvorhaben umstellen; Klick öffnet die zugehörige Karte im Modal.
- [ ] keine parallele „Nächste-Schritte“-Liste neben dem Board führen.
- [ ] Materialtab mit Zuordnung zu Lernmomenten und Status implementieren.
- [ ] Worker-Ausgabe aus einer Board-Karte heraus starten, nicht über einen pauschalen Materialbutton.

**Done when:** eine Unterrichtsstunde nicht mehr als „Nächster Schritt“ erscheint, „Nächste Schritte“ immer auf eine Board-Karte verweist und jedes Material einen didaktischen Bezug hat.

## L5 — AI-Vorschläge und Review

- [ ] `LandscapeChangeProposal` als eigenes Artefakt implementieren.
- [ ] Canvas-Diff für neue, geänderte und entfernte Knoten/Kanten implementieren.
- [ ] Lehreraktionen: Vorschau, Übernehmen, Gespräch, Verwerfen.
- [ ] KI darf ohne Zustimmung keine kanonische Lernlandschaft oder Zeitplanung ändern.
- [ ] Board-Proposal erzeugt erst nach Zustimmung einen Service Request.
- [ ] modellgestützte Critical-Friend-Review nach Worker-Ausführung implementieren.
- [ ] Review-Ergebnis sichtbar von automatischer Vorprüfung unterscheiden.

**Done when:** KI-Entwürfe nachvollziehbar, reversibel und lehrkraftgesteuert sind.

## L6 — Knowledge und Qualität

- [ ] Knowledge-Adapter mit freigegebenen Quellen integrieren.
- [ ] Quellen, Abrufdatum, Prüfstatus und Unsicherheit speichern und anzeigen.
- [ ] Lehrplanbezug als Board-Aufgabe und Knowledge-Ergebnis modellieren.
- [ ] E2E-Test: Chat → Proposal → Canvas-Vorschau → Zustimmung → Workspace → UI.
- [ ] E2E-Test: Worker-Material → Review → Lernmoment-Zuordnung → Freigabe.
- [ ] Barrierefreiheit: Tastatur, Fokus, Kontrast, nicht allein farbcodierte Kanten.
- [ ] Responsive Verhalten: Canvas-Modal auf kleineren Displays.

## Noch nicht beginnen

- freie Whiteboard-Zeichnung als kanonische Quelle,
- automatische KI-Umbauten ohne Vorschau und Zustimmung,
- Produktivbetrieb mit Schüler:innendaten,
- Nextcloud- oder PDF/DOCX-Export vor stabiler Landschafts- und Materialzuordnung,
- Host Bridge ohne eigenes Sicherheitsreview.
