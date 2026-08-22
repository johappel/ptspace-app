# ptspace-app – Umsetzungsliste

Stand: 2026-07-20

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
- [x] vollständige Materialmetadaten und Ergebnisbereich als Projektion von Lernmoment und Board-Karte.
- [x] Hauptansicht vom Dashboard-Layout zu einem fokussierten gemeinsamen Denkraum weiterentwickeln.
- [x] Gesprächsereignisse bidirektional mit Denkstand, offenen Entscheidungen, Vorbereitungen und Ergebnissen verknüpfen.
- [x] Ruhige Hintergrundarbeitsanzeige als kompakte Werkstattleiste umsetzen.

## L0 — Voraussetzung: Kernel-Verträge

- [x] Kernel-Verträge synchronisieren und den noch unversionierten Board-Material-Worker-Vertrag prüfen.
- [x] Zod-Schemas mit den Kernel-Verträgen abgleichen; insbesondere Materialmetadaten und Fokus-Typen sind vollständig synchronisiert.
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
- [x] API: Material einem Lernmoment oder Board-Item zuordnen; Materialmetadaten und atomare Backend-Rückführung sind umgesetzt.
- [x] Jede semantische Änderung als verständliche Git-Version speichern.
- [x] Layoutdaten getrennt von semantischen Daten speichern.
- [x] Gesprächsmarker als App-Read-Model mit `sourceMessageId`, Art und Zielreferenz implementieren.
- [x] Zielreferenzen serverseitig auf denselben Planungsraum begrenzen.
- [x] Marker bei verworfenen, ersetzten oder gelöschten Zielen konsistent behandeln.

**Done when:** alle UI-Operationen serverseitig validiert und versioniert sind und Herkunftsbezüge keine parallele pädagogische Semantik erzeugen.

## L2 — Lernlandschaft-Modal

- [x] großes Modal „Unterrichtsplanung“ implementieren.
- [x] Tab „Lernlandschaft“ implementieren.
- [x] `@xyflow/svelte` integrieren.
- [x] Custom Nodes für die vereinbarten Lernmoment-Typen bauen.
- [x] Knoten-Detailkarte implementieren.
- [x] Verbindung nur über Auswahl einer didaktischen Bedeutung erzeugen.
- [x] Gruppenflächen für Phasen, Räume und Stationen implementieren.
- [x] Zoom und MiniMap implementieren; Tastaturbedienung und Rücksetzen des Layouts ergänzen.
- [x] Canvas- und lineare Lesansicht aus derselben Landschaft anbieten.

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
- [x] Materialtab mit vollständigen Metadaten und atomarer Zuordnung zu Lernmomenten und Board-Items implementieren.

Der frühere Mehrschritt „Nächste Schritte → Board-Karte → Auftrag“ entfällt. Die geführte Entscheidung läuft ausschließlich über „Jetzt wichtig“ und ist in L5a/GW-140 bis GW-230 beschrieben. Das Board bleibt Übersicht, der Materialbereich Ergebnis- und Nachweisbereich.

**Done when:** Board und Materialien verlässlich auf denselben kanonischen Bezügen beruhen; kein Bereich wird zur Pflichtstation des geführten Arbeitsflusses.

## L4a — Denkraum und räumliche Informationsarchitektur

Das verbindliche UX-Zielbild steht in `REFACTOR-UX.md`.  
Die konkrete Umsetzung ist in `docs/guided-workflow-tasks.md`, GW-200 bis GW-230, beschrieben.

- [x] Gespräch als visuelles und funktionales Zentrum gestalten.
- [x] Gleichgewichtige Dashboard-Spalten und Haupttabs zugunsten einer fokussierten Raumstruktur reduzieren.
- [x] Ruhige gemeinsame Arbeitsszene umsetzen; keine detaillierten Avatare oder simulierte Emotionalität.
- [x] Pinnwand als kompakte Projektion von Denkstand, offener Entscheidung und aktuellem Ergebnis umsetzen.
- [x] Lernlandschaft, Zeitplanung, Vorbereitungen, Knowledge und Materialien über verständliche Raumzugänge und eine lineare Navigation erreichbar machen.
- [x] Gesprächsmarker für festgehaltene Gedanken, Entscheidungen, Arbeitsvorhaben und Ergebnisse implementieren.
- [x] Bidirektionale Navigation zwischen Gesprächsstelle und Zielartefakt.
- [x] Chatfilter für markierte Ereignistypen.
- [x] Kurze Zustandsübergänge mit Reduced-Motion-Alternative.
- [x] Optionale, abschaltbare akustische Rückmeldung.
- [x] Hintergrundarbeit in einer kleinen, nicht technischen Werkstattleiste anzeigen.
- [ ] Visuelle Regression, Tastaturbedienung und Screenreader-Zugänge testen.
- [x] Funktionsgleiche Darstellung ohne Illustration, Animation und Ton sicherstellen.

**Implementierungsstand 2026-07-18:** L4 und die L4a-Implementierungspunkte sind umgesetzt. Die sichtbare Browser-, Tastatur- und Screenreader-Abnahme bleibt offen, weil in der Arbeitsumgebung keine Browser-Instanz verfügbar war. L5/L5a wird dadurch nicht vorgezogen.

**Done when:** Der Planungsraum wirkt als gemeinsamer pädagogischer Denkraum und nicht als Verwaltungsdashboard; alle räumlichen Funktionen bleiben auch ohne Animation, Illustration oder Maus vollständig zugänglich.

## L5 — AI-Vorschläge und Review

- [x] Fokus aus einer Platzierung an den bestehenden Planungsraum-Chat übergeben; die übrigen Fokustypen funktionieren bereits.
- [ ] `LandscapeChangeProposal` als eigenes Artefakt implementieren.
- [ ] Canvas-Diff für neue, geänderte und entfernte Knoten/Kanten implementieren.
- [ ] Für strukturelle Landschaftsänderungen Vorschau, Übernehmen, im Gespräch ändern und Verwerfen anbieten.
- [x] KI darf ohne Zustimmung keine kanonische Lernlandschaft oder Zeitplanung ändern.
- [x] modellgestützte Critical-Friend-Review nach Worker-Ausführung implementieren (siehe L5a/GW-100).
- [x] Review-Ergebnis sichtbar von automatischer Vorprüfung unterscheiden (siehe L5a/GW-100/GW-140).

Die Übernahme von Worker-Vorschlägen erfolgt atomar nach L5a/GW-120; der alte separate Board-Proposal-Schritt entfällt.

**Done when:** KI-Entwürfe nachvollziehbar, reversibel und lehrkraftgesteuert sind.

## L5a — Geführter Arbeitsfluss und Hintergrundarbeit

Die detaillierte Reihenfolge und Agenten-Zuordnung steht in `docs/guided-workflow-tasks.md`.

- [x] Frontend-Typecheck reparieren: `WorkerMaterial.review` wird in `frontend/src/routes/+page.svelte` verwendet, fehlt aber in `frontend/src/lib/api.ts`.
- [x] Genau eine Entscheidung unter „Jetzt wichtig“ anzeigen.
- [x] Gesprächsvorschlag als nicht-kanonisches, strukturiertes Proposal speichern.
- [x] Ein Häkchen erzeugt atomar Board-Karte, Service Request und Hintergrundauftrag.
- [x] Keine zusätzlichen Pflichtklicks für Board-Aufnahme, Beauftragung oder Startbestätigung.
- [x] Laufende Arbeit persistent und nicht unterbrechend anzeigen.
- [x] Fertiges Material direkt in „Jetzt wichtig“ zur Prüfung anzeigen.
- [x] Ein zweites Häkchen gibt das sichtbare Ergebnis fachlich frei.
- [x] Der Stift führt immer in den bestehenden fokussierten Chat und speichert nichts kanonisch.
- [x] AutomaticCheck und Lehrkraftfreigabe getrennt speichern und anzeigen.
- [x] Gesprächsvorschlag, gestartete Vorbereitung und zurückgekehrtes Ergebnis im Chat mit dem zugehörigen Ziel verknüpfen.
- [x] Laufende Arbeit als kompakte, persistent sichtbare Hintergrundaktivität darstellen.
- [x] Abschluss einer Arbeit sichtbar, aber ohne automatischen Fokuswechsel melden.
- [ ] Lokalen Real-Harness-Fluss mit einem synthetischen Planungsraum verifizieren.

**Done when:** Vom Gespräch bis zur laufenden Vorbereitung und vom sichtbaren Ergebnis bis `ready_for_class` ist jeweils genau ein bewusster Klick nötig; Planungsboard und Materialbereich sind keine Pflichtstationen; die Herkunft im Gespräch bleibt nachvollziehbar.

**Implementierungsstand 2026-07-20:** Der geführte Zwei-Häkchen-Workflow ist serverseitig und in der primären Gesprächsansicht umgesetzt. Proposal, atomarer Start, persistente Hintergrundarbeit, getrennte Prüfstatus, Ergebnisfreigabe und Herkunftsmarker sind verifiziert. Der lokale Real-Harness-Smoke-Test mit echtem Runtime-Prozess sowie Browser-, Tastatur- und Screenreader-Abnahme bleiben offen.

## L5b — Adaptive Runtime, Skills und lernende Arbeitsprozesse

Der Pedagogical Thinking Space soll nicht nur ein LLM mit fest programmierten Workflows verwenden.

Die Runtime soll schrittweise in die Lage versetzt werden,

* geeignete Fähigkeiten für offene Aufgaben zu finden und anzuwenden;
* neue Recherchewege und bisher nicht berücksichtigte Perspektiven zu erschließen;
* aus konkreten Anforderungen passende Ausgabeformen zu entwickeln;
* erfolgreiche Arbeitsweisen als wiederverwendbare Skills oder Workflow-Muster festzuhalten;
* Gesprächs- und Moderationsmethoden situationsbezogen auszuwählen;
* Hintergrundarbeit selbst zu organisieren;
* den Planungsraum kontinuierlich auf Inkonsistenzen, veraltete Zustände und offene Pflegebedarfe zu prüfen;
* und dabei mit zunehmender Erfahrung **zielgerichteter, sparsamer und verlässlicher** zu arbeiten.

Die fachliche Verantwortung bleibt bei PTS:

```text
PTS Domain
├── Planning Space
├── Learning Design
├── Decisions
├── Learning Landscape
├── Materials
├── Permissions
└── pedagogical policy
        │
        ▼
Adaptive Runtime
├── Skills
├── Tools
├── Workflow Memory
├── Background Jobs
├── Agent/Subagent Runtime
└── Runtime Learning
```

Die Runtime darf kanonische pädagogische Entscheidungen nicht selbstständig ersetzen.

`DirectLlmAdapter` bleibt als einfache, kontrollierte Ausführungsstufe erhalten. DeepSeek Harness wird als Kandidat für die adaptive Runtime integriert.

### L5b.0 — Direct-LLM-Baseline abschließen

* [ ] Gültigen `PTSPACE_LLM_API_KEY` konfigurieren; `OPENROUTER_API_KEY` nur als Fallback unterstützen.

  Status: `PTSPACE_LLM_API_KEY` wird bereits bevorzugt vor `OPENROUTER_API_KEY` (DirectLlmAdapter, config). Die reale Key-Konfiguration selbst ist umgebungsabhängig und hier nicht setzbar.
* [ ] Realen Gesprächs-Turn mit `PTSPACE_HARNESS=direct-llm` verifizieren.

  BLOCKED: kein freigegebener Live-Provider in dieser Arbeitsumgebung. Der Turn-Pfad ist über Fake-Client-Tests abgesichert.
* [ ] Worker-Auftrag und Review mit realem Modell durchlaufen.

  BLOCKED: dito. Worker-/Review-Pfad über Fake-Client-Tests abgesichert.
* [x] Fehler-, Timeout- und Provider-Ausfälle prüfen. (DirectLlmAdapter-Tests: teacher-facing Fehler, Timeout-Übersetzung, Update-Aufruf-Ausfall.)
* [x] Sicherstellen, dass Secrets nicht in Logs, UI oder Antworten gelangen. (replyTranslation/guardUnsupportedClaims; teacherFacingError ohne Provider-Details.)
* [ ] Einen reproduzierbaren synthetischen Referenz-Planungsraum festlegen.

  Status: ConversationBenchmark-Referenzszenarien existieren (Mock). Ein realer Referenzlauf ist ohne Live-Provider offen.
* [x] Für diesen Referenzfall Baseline-Werte erfassen (Struktur):

  Umgesetzt als providerunabhängige `RuntimeUsage` (shared) mit `inputTokens`,
  `outputTokens`, `cachedTokens`, `modelCalls`, `toolCalls`, `retrievalItems`,
  `runtimeMs`, `estimatedCost`. DirectLlmAdapter befüllt sie aus realen
  Provider-Usage-Daten; fehlende Werte bleiben `undefined` statt geschätzt. Der
  Orchestrator übernimmt sie in die Turn-Metriken. Reale Baseline-Zahlen setzen
  einen Live-Provider voraus.

**Done when:** Ein vollständiger bestehender PTS-Workflow läuft zuverlässig über
`DirectLlmAdapter` und bildet eine messbare Baseline für spätere adaptive
Runtime-Funktionen.

---

### L5b.1 — DeepSeek Harness als adaptive Runtime anbinden

* [x] `DeepSeekHarnessAdapter` als zusätzliche Implementierung von `HarnessAdapter` anlegen.
* [x] DeepSeek-spezifische APIs vollständig innerhalb des Adapters kapseln (`DeepSeekRuntimeTransport`).
* [x] `checkAvailability()` implementieren.
* [x] `createSession()` auf persistente Harness-Sessions abbilden (inkl. Resume).
* [x] `sendMessage()` implementieren.
* [x] `getEvents()` auf runtime-neutrale PTS-Ereignisse abbilden.
* [x] `stopSession()` implementieren.
* [x] Konfiguration `PTSPACE_HARNESS=deepseek` ergänzen.
* [x] `direct-llm` zunächst als Default belassen (Default bleibt `mock`; `direct-llm`/`deepseek` opt-in).
* [x] OpenCode weiterhin als optionale Coding-/Kernel-Evolution-Stufe erhalten.
* [x] Verwendete DeepSeek-Harness-Version explizit dokumentieren und pinnen (`PTSPACE_DEEPSEEK_VERSION`, `pinnedVersion()`, docs/harness-deepseek.md).

  BLOCKED (Teilaspekt): Der reale DeepSeek-Transport ist noch nicht angebunden.
  Der Adapter meldet ohne Transport bewusst `requires_setup`, statt instabile
  Upstream-Details zu erraten. Adaptergrenze und Vertrag sind über Fake/Stub-Tests
  vollständig abgesichert (`test/DeepSeekHarnessAdapter.test.ts`).

Keine DeepSeek-Typen dürfen Bestandteil der öffentlichen PTS-Domain werden.

**Done when:** Ein normaler Companion-Turn kann über eine persistente DeepSeek-
Session laufen, ohne dass PlanningSpace, ConversationOrchestrator oder Frontend
DeepSeek-spezifische Fachlogik enthalten.

---

### L5b.2 — Runtime-Sessions und Kontextökonomie

Die Agent-Runtime darf nicht dazu führen, dass mit wachsender Gesprächsdauer
immer mehr Kontext unkontrolliert an das Modell übertragen wird.

Implementieren beziehungsweise evaluieren:

* [ ] persistente Runtime-Session pro Planungsraum;
* [ ] Resume nach Backend-Neustart;
* [ ] explizites Kontextbudget pro Turn;
* [ ] Trennung von:

  * stabilem Kernel-/Companion-Kontext,
  * aktuellem Denkstand,
  * lokalem Fokus,
  * Gesprächshistorie,
  * optionalem Knowledge;
* [ ] ältere Gesprächsteile verdichten;
* [ ] kanonische Entscheidungen nicht aus Summaries rekonstruieren, sondern aus dem Workspace lesen;
* [ ] Kontext nur bei relevanten Änderungen erneut übertragen;
* [ ] prüfen, welche stabilen Promptanteile durch Provider-/Runtime-Caching wiederverwendbar sind;
* [ ] keine vollständigen Workspace-Dateien übertragen, wenn ein fokussierter Ausschnitt ausreicht;
* [ ] pro Turn erfassen:

  * Input-Tokens,
  * Output-Tokens,
  * Cache-Hits soweit verfügbar,
  * Kontextquellen,
  * Anzahl Retrieval-Ergebnisse.

Ziel ist nicht minimale Tokenzahl um jeden Preis, sondern:

> möglichst wenig Kontext bei gleichbleibender oder steigender fachlicher Qualität.

**Done when:** Ein längeres Gespräch bleibt hinsichtlich Relevanz, Antwortlänge,
Latenz und Tokenverbrauch stabil und der Kontext kann nachvollziehbar erklärt
werden.

---

### L5b.3 — Skill Registry

Ein Skill beschreibt eine wiederverwendbare Fähigkeit der Runtime.

Beispiele:

```text
contrastive-research
curriculum-check
perspective-gap-analysis
learning-landscape-review
material-assumption-analysis
critical-incident-conversation
decision-clarification
artifact-design
workspace-consistency-check
```

Implementieren:

* [x] providerunabhängiges Skill-Modell definieren (shared `Skill`/`SkillSchema`).
* [x] Skill-Metadaten mindestens mit:

  * `id`
  * `purpose`
  * `status`
  * `inputs`
  * `outputs`
  * `constraints`
  * `applicable_when`
  * `cost_profile`
  * `quality_history`
  * `provenance`;
* [x] Statusmodell:

  * `experimental`
  * `reviewed`
  * `approved`
  * `deprecated`;
* [x] nur `reviewed` oder `approved` automatisch produktiv einsetzen (`SkillRegistry.listProductive`/`requireSelectable`).
* [x] Skills dürfen Tools, Prompts, Ablaufregeln und Prüfregeln kombinieren (Metadatenmodell offen dafür).
* [x] Skills dürfen keine kanonischen pädagogischen Entscheidungen treffen (Registry rein deskriptiv; Ausführung PTS-kontrolliert).
* [ ] Skill-Ausführung im Runtime-Eventlog nachvollziehbar machen.

  Status: offen; Eventlog-Anbindung folgt mit dem realen adaptiven Ausführungspfad.

**Done when:** Mindestens zwei heute fest programmierte oder manuell promptbasierte
Abläufe als austauschbare Skills ausgeführt werden können.

---

### L5b.4 — Offene Recherche und Perspektivenerschließung

Die Runtime soll nicht nur bekannte Quellen zu einem Suchbegriff abrufen,
sondern offene Recherchefragen bearbeiten können.

Implementieren beziehungsweise erproben:

* [ ] Skill `contrastive-research`;
* [ ] Skill `perspective-gap-analysis`;
* [ ] Recherche ausgehend vom aktuellen Denkstand statt nur von Keywords;
* [ ] dominante Annahmen des bisherigen Entwurfs bestimmen;
* [ ] gezielt nach fehlenden oder kontrastierenden Perspektiven suchen;
* [ ] Near-Fit und bewussten Kontrast unterscheiden;
* [ ] Quellenqualität, Kontext, Datum und Unsicherheit erhalten;
* [ ] Rechercheergebnisse vor der Präsentation durch Companion oder Review-Schritt kuratieren;
* [ ] Ergebniszahl begrenzen;
* [ ] keine unstrukturierte Trefferliste in den Gesprächsraum zurückgeben;
* [ ] Suchbreite dynamisch begrenzen, wenn zusätzlicher Rechercheaufwand voraussichtlich keinen Erkenntnisgewinn bringt.

**Done when:** Die Runtime mindestens einmal eine fachlich relevante Perspektive
erschließt, die nicht bereits im PTS-Kontext oder in einer vorgegebenen
Quellenliste vorhanden war.

---

### L5b.5 — Situativ erzeugte Artefakte und Ausgabeformen

Nicht jedes sinnvolle Ergebnis lässt sich im Voraus als eigener Backend-
Generator programmieren.

Die Runtime soll aus einer konkreten pädagogischen Anforderung eine geeignete
Ausgabeform entwickeln können.

Beispiele:

* Gesprächskarten;
* Raumanordnung;
* Beobachtungsbogen;
* kleine Intervention;
* Schüler:innen-Impuls;
* Materialset;
* Ablaufskizze;
* Visualisierung;
* Vergleichsmatrix;
* Reflexionsformat.

Implementieren:

* [ ] generischen Artefaktauftrag mit klaren Sicherheits- und Dateigrenzen;
* [ ] Ausgabeformat aus Zweck und Nutzungssituation ableiten;
* [ ] Ergebnis zunächst als nicht-kanonischen Entwurf erzeugen;
* [ ] strukturelle und fachliche Review vor Freigabe;
* [ ] erfolgreiche neue Ausgabeformen als Skill-Kandidaten markieren können;
* [ ] keine automatische Skill-Promotion ohne Review;
* [ ] wiederholte identische Artefaktanforderungen erkennen und vorhandene Skills bevorzugen.

**Done when:** Ein vorher nicht fest kodiertes Ausgabeformat aus einer realen
Anforderung entstehen und kontrolliert in den Planungsraum zurückgeführt werden
kann.

---

### L5b.6 — Workflow Memory

Neben Projektgedächtnis benötigt der PTS ein Gedächtnis darüber, **wie Aufgaben
erfolgreich bearbeitet wurden**.

Workflow Memory speichert keine bloßen Gesprächstranskripte, sondern
abstrahierte Arbeitsmuster.

Beispiel:

```yaml
workflow_pattern:
  task: "kontrastierende Materialien recherchieren"

  learned:
    - "breite Recherche erzeugte zu viele irrelevante Treffer"
    - "ein Near-Fit plus ein deutlicher Kontrast war hilfreicher"
    - "pädagogische Annahmen vor Materialdetails prüfen"

  use_when:
    - "bestehendes Design wirkt geschlossen"
    - "alternative Lernlogik wird gesucht"
```

Implementieren:

* [x] `WorkflowMemory` als eigene Kategorie definieren (shared `WorkflowMemory`/Collection + `WorkflowMemoryStore`).
* [x] Projektmemory, persönliche Memory und Workflow Memory strikt unterscheiden (eigene Datei `workflow-memory.json`, getrennt von Denkstand/Markern).
* [ ] erfolgreiche Abläufe nach Abschluss auswerten;
* [x] nur abstrahierte, nicht-personenbezogene Muster automatisch als Kandidaten erzeugen (Schema erzwingt abstrahierte Felder; keine Rohdialoge).
* [ ] Promotion in dauerhaftes Workflow Memory nur bei ausreichender Evidenz oder Review;
* [x] Herkunft und Version behalten (`provenance`, versionierte `upsert`).
* [x] veraltete oder schlechter gewordene Workflows abwerten oder deaktivieren können (`deprecate`, `remove`, `status`).
* [ ] Memory-Retrieval an Relevanz **und erwarteten Nutzen** koppeln.

**Done when:** Ein späterer ähnlicher Auftrag einen früher bewährten Ablauf
wiederverwenden kann, ohne den kompletten früheren Gesprächsverlauf zu laden.

---

### L5b.7 — Gesprächs- und Moderationsskills

Der Companion soll Gesprächsmethoden nicht nur als immer länger werdenden
Systemprompt besitzen.

Geeignete Methoden sollen als auswählbare Skills modelliert werden.

Mögliche Beispiele:

* Spiegeln;
* Reframing;
* Hypothesenbildung;
* Ausnahmefrage;
* Perspektivwechsel;
* Critical Incident;
* Ladder of Inference;
* Entscheidungsklärung;
* Zukunft rückwärts denken;
* Externalisierung;
* Verdichtung;
* bewusster Widerspruch.

Implementieren:

* [ ] Gesprächssituation klassifizieren, ohne diagnostische Zuschreibungen zu erzeugen;
* [ ] passende Gesprächsmethode als Skill auswählen;
* [ ] maximal eine dominante Methode gleichzeitig einsetzen;
* [ ] Methodeneinsatz im internen Runtime-Trace nachvollziehbar machen;
* [ ] Lehrkraft nicht mit Methodennamen oder Agententechnik belasten;
* [ ] Wirkung anhand des weiteren Gesprächsverlaufs evaluieren;
* [ ] wiederholt wirkungslose Methoden für vergleichbare Situationen geringer gewichten;
* [ ] kein manipulatives Optimieren auf Gesprächslänge oder Zustimmung.

**Done when:** Der Companion situativ unterschiedliche Gesprächsmethoden
verwenden kann, ohne dass alle Methoden dauerhaft im Systemprompt stehen müssen.

---

### L5b.8 — Selbstorganisation von Hintergrundarbeit

Die Runtime soll begrenzte Arbeitsprozesse selbst organisieren können.

Beispiele:

```text
offene Frage
→ Recherche
→ Quellenprüfung
→ Perspektivenvergleich
→ Companion-Review
→ Rückkehr ins Gespräch
```

oder:

```text
Materialbedarf
→ geeigneten Skill wählen
→ Entwurf
→ automatische Prüfung
→ fachliche Review
→ Lehrkraftfreigabe
```

Implementieren:

* [ ] bounded workflow execution;
* [ ] explizite Start- und Stopkriterien;
* [ ] maximales Laufzeit-, Token- und Toolbudget pro Auftrag;
* [ ] Unteraufgaben nur erzeugen, wenn sie für das Ergebnis erforderlich sind;
* [ ] Schleifen erkennen und abbrechen;
* [ ] redundante Recherche und doppelte Modellaufrufe vermeiden;
* [ ] Hintergrundjobs persistent verwalten;
* [ ] laufende Arbeit jederzeit abbrechbar machen;
* [ ] Ergebnisse immer über bestehende PTS-Freigabeverträge zurückführen.

**Done when:** Mindestens ein mehrstufiger Hintergrundauftrag ohne hart
kodierten Ablauf selbst organisiert wird und trotzdem innerhalb eines definierten
Budgets und der PTS-Policies bleibt.

---

### L5b.9 — Kontinuierliche kuratorische Pflege

Die adaptive Runtime darf nicht nur auf Nachrichten reagieren.

Sie soll den Planungsraum bei geeigneten Ereignissen auf Pflegebedarf prüfen.

Beispiele:

* akzeptierte Entscheidung schließt eine offene Frage;
* Material verweist auf entfernten Lernmoment;
* Board-Karte ist durch eine andere Entscheidung überholt;
* Denkstand enthält widersprüchliche Aussagen;
* Workflow-Ergebnis wurde freigegeben, aber Provenance fehlt;
* ein Skill wird wiederholt ohne Nutzen aufgerufen.

Implementieren:

* [ ] ereignisbasierte Maintenance Checks;

  Status: der deterministische Prüfkern existiert (`checkWorkspaceConsistency`);
  die Ereignis-Trigger-Verdrahtung (decision accepted, landscape changed …) ist
  noch offen.
* [x] keine permanente hochfrequente LLM-Schleife (Prüfung ist rein deterministisch, kein LLM).
* [x] deterministische Prüfungen bevorzugen, wo möglich (`workspace-consistency-check` erkennt verwaiste Referenzen, obsolete Board-Bezüge, fehlende Provenance, erledigte offene Fragen ohne LLM).
* [ ] LLM nur für semantisch offene Pflegefragen einsetzen;
* [x] Pflegeergebnisse als Vorschläge behandeln (`WorkspaceConsistencyFinding`, severity info/suggestion; keine Mutation).
* [ ] triviale technische Konsistenzfehler automatisch beheben, sofern reversibel;
* [x] fachliche Änderungen weiterhin zustimmungspflichtig (Prüfung ändert nichts, liefert nur Befunde).
* [ ] Maintenance-Aufwand messen.

**Done when:** Der Planungsraum über längere Nutzung konsistent gehalten werden
kann, ohne bei jedem Turn alle Artefakte vollständig neu prüfen zu müssen.

---

### L5b.10 — Runtime-Lernschleife

Die Runtime soll aus ausgeführten Aufgaben lernen, ohne unkontrolliert sich
selbst umzuprogrammieren.

Verbindlicher Zyklus:

```text
DO
Aufgabe bearbeiten
    ↓
OBSERVE
Ablauf und Ergebnis erfassen
    ↓
EVALUATE
Qualität, Aufwand und Fehler bewerten
    ↓
PROPOSE LEARNING
Skill-/Workflow-Anpassung vorschlagen
    ↓
VALIDATE
gegen Referenzfälle prüfen
    ↓
PROMOTE
bei nachweisbarer Verbesserung freigeben
```

Implementieren:

* [ ] jede relevante Skill-/Workflow-Ausführung mit Version protokollieren;
* [ ] Ergebnisqualität und Ressourcenverbrauch gemeinsam bewerten;
* [x] Änderungen zunächst als `learning_proposal` speichern (Vertrag: shared `LearningProposal`, Status `proposed`).
* [x] keine direkte Selbstmodifikation produktiver Skills (kein Promotionspfad ohne Review; nur Vorschlagsvertrag).
* [ ] Kandidat gegen definierte Referenzfälle testen;
* [ ] nur Verbesserung oder mindestens gleichbleibende Qualität bei geringerem Aufwand promoten;
* [ ] Regression führt automatisch zur vorherigen freigegebenen Version zurück;
* [ ] menschliche Freigabe für grundlegende pädagogische oder Policy-Änderungen erzwingen.

Status: Nur das Daten-/Vertragsmodell ist umgesetzt (L5b.10-Anforderung „zunächst
das Daten-/Vertragsmodell“). Die Auswerte-, Validierungs- und Promotionslogik
bleibt für L6 offen, da sie die dortige Benchmark-Infrastruktur voraussetzt.

**Done when:** Mindestens ein Skill oder Workflow nachweisbar anhand von
Ausführungserfahrung verbessert und versioniert werden kann.

---

### L5b.11 — Runtime-Entscheidung

Nach den vorherigen Schritten wird nicht nur gefragt:

> Ist DeepSeek besser als Direct LLM?

Sondern:

> Welche Aufgaben benötigen eine adaptive Agent-Runtime und welche werden
> einfacher, günstiger und zuverlässiger direkt ausgeführt?

Für jeden Aufgabentyp mindestens bewerten:

* fachliche Qualität;
* Kontexttreue;
* Latenz;
* Input-Tokens;
* Output-Tokens;
* Tool-Aufrufe;
* Anzahl Modellaufrufe;
* Fehlerquote;
* Recovery-Aufwand;
* Wartungskomplexität;
* Mehrwert durch Skills;
* Mehrwert durch Workflow Memory;
* Mehrwert durch Hintergrundorganisation.

Mögliche Zielarchitektur:

```text
einfache Gesprächs-Turns
        ↓
Direct LLM

offene Recherche / Skills / Background Work
        ↓
Adaptive Runtime

Kernel- oder Code-Evolution
        ↓
OpenCode
```

* [ ] Entscheidung dokumentieren.
* [ ] `HARNESS_ADAPTERS.md`, `TECH_STACK.md`, `ROADMAP.md` und `.env.example` aktualisieren.
* [ ] Erst danach entscheiden, ob generische Runtime-Komponenten extrahiert werden.
* [ ] Theological Thinking Space bis dahin nicht auf dieselbe Runtime-Architektur festlegen.

**Done when:** Die Arbeitsteilung zwischen Direct LLM, adaptiver Runtime und
OpenCode fachlich und ökonomisch begründet ist.

---

## L6 — Knowledge, Qualität und ökonomischer Lernfortschritt

L6 baut auf der adaptiven Runtime auf.

Knowledge, Qualitätssicherung und Runtime-Lernen dürfen nicht als drei getrennte
Subsysteme behandelt werden.

Der PTS soll mit wachsender Nutzung:

1. besser relevante Informationen finden;
2. weniger irrelevanten Kontext laden;
3. bessere Skills und Workflows auswählen;
4. bekannte Aufgaben mit weniger Modellarbeit lösen;
5. Qualitätsprobleme früher erkennen;
6. und dabei nachvollziehbar und reversibel bleiben.

Qualitätsfortschritt bedeutet daher nicht:

> immer mehr Modelle, Reviews und Tokens einsetzen.

Sondern:

> für eine vergleichbare Aufgabe mit möglichst wenig Aufwand mindestens dieselbe,
> idealerweise eine bessere fachliche Qualität erreichen.

### L6.1 — Knowledge-Adapter und Provenance

* [ ] Knowledge-Adapter mit freigegebenen Quellen integrieren.
* [ ] Quellen, Abrufdatum, Prüfstatus und Unsicherheit speichern.
* [ ] Lehrplanbezug als Knowledge-Aufgabe modellieren.
* [ ] Quellenklassen und Vertrauensniveaus definieren.
* [ ] Retrieval auf aktuellen Fokus begrenzen.
* [ ] vorhandenes lokales Wissen vor neuer Web-Recherche prüfen.
* [ ] bereits geprüfte Quellen nicht unnötig erneut verarbeiten.
* [ ] Content-Hashes und Versionen zur Wiederverwendung einsetzen.
* [ ] Knowledge-Ergebnisse mit Provenance in den Planungsraum zurückführen.
* [ ] kanonisches Knowledge unabhängig von Runtime-/Memory-Backends halten.

---

### L6.2 — Qualitätsmodell

Definiere ein explizites Qualitätsmodell mindestens für:

* fachliche Passung;
* pädagogische Kohärenz;
* Evidenz/Quellenqualität;
* Übereinstimmung mit bestätigten Entscheidungen;
* Offenheit gegenüber Alternativen;
* Nutzbarkeit für die konkrete Lehrkraft;
* Verständlichkeit;
* Sicherheits- und Datenschutzkonformität;
* Kosten-/Nutzen-Verhältnis.

Qualität darf nicht über eine einzige Modellbewertung definiert werden.

Nutze soweit möglich:

```text
deterministische Checks
        ↓
strukturierte Heuristiken
        ↓
kleines/günstiges Modell
        ↓
stärkeres Review-Modell
```

nur in der jeweils notwendigen Eskalationsstufe.

* [ ] Qualitätsdimensionen definieren.
* [ ] je Artefakttyp relevante Dimensionen auswählen.
* [ ] nicht jede Ausgabe durch dieselbe vollständige Review-Pipeline schicken.
* [ ] Review-Tiefe nach Risiko und Bedeutung staffeln.
* [ ] Unsicherheit ausdrücklich erfassen.

---

### L6.3 — Quality Gates mit Eskalationslogik

Beispiel:

```text
Artefakt
   ↓
Schema / Pfad / Referenzen
   ↓
heuristische Konsistenzprüfung
   ↓
ausreichend?
   ├─ ja → weiter
   └─ nein / unsicher
          ↓
     günstiges Review
          ↓
     weiterhin unsicher?
          ↓
     starkes Review
```

* [ ] deterministische Prüfungen vor LLM-Review.
* [ ] einfache Fehler ohne Modell beheben.
* [ ] Modellreview nur auslösen, wenn es einen möglichen Erkenntnisgewinn gibt.
* [ ] Review-Ergebnisse cachen, solange Eingabestand unverändert ist.
* [ ] identische Artefaktversionen nicht erneut reviewen.
* [ ] Review-Aufwand im Runtime-Monitoring erfassen.

---

### L6.4 — Qualitätslernen aus Rückmeldungen

Der PTS soll aus tatsächlicher Nutzung lernen.

Mögliche Signale:

* Lehrkraft übernimmt Vorschlag;
* Lehrkraft verändert Vorschlag stark;
* Vorschlag wird verworfen;
* Worker-Ergebnis besteht Review;
* wiederholte Rückfragen sind nötig;
* Material wird später ersetzt;
* Skill führt regelmäßig zu erfolgreichen Ergebnissen.

Diese Signale dürfen nicht unkritisch als absolute Qualitätsurteile behandelt
werden.

Implementieren:

* [ ] Feedback-Signale typisieren;
* [ ] explizites und implizites Feedback unterscheiden;
* [ ] keine Nutzerpräferenz aus Einzelereignissen verfestigen;
* [ ] Skill-/Workflow-Qualität über mehrere Läufe aggregieren;
* [ ] Qualitätsverlauf versioniert halten;
* [ ] schlechte Regressionen erkennen;
* [ ] erfolgreiche Muster als Lernvorschläge erzeugen.

---

### L6.5 — Token- und Kostenökonomie als Qualitätsdimension

Für relevante Runtime-Aktivitäten erfassen:

```yaml
usage:
  input_tokens:
  output_tokens:
  cached_tokens:
  model_calls:
  tool_calls:
  retrieval_items:
  runtime_ms:
  estimated_cost:
```

Zusätzlich:

```yaml
outcome:
  review_status:
  accepted:
  edited:
  rejected:
  followup_needed:
```

Damit kann später bewertet werden:

```text
Qualität
────────────
Kosten
```

statt ausschließlich:

```text
niedrigste Kosten
```

* [ ] Verbrauch pro Turn, Skill, Worker und Workflow erfassen.
* [ ] Kosten nicht lehrkraftzentriert dramatisieren, aber administrativ transparent machen.
* [ ] Qualitäts- und Kostenmetriken gemeinsam auswerten.
* [ ] teure Workflows identifizieren.
* [ ] bei gleicher Qualität günstigere Alternativen bevorzugen.
* [ ] keine Qualitätsverschlechterung nur zur Tokenreduktion akzeptieren.

---

### L6.6 — Adaptive Modellwahl

Nicht jede Aufgabe benötigt dasselbe Modell.

Implementieren beziehungsweise evaluieren:

```text
deterministisch lösbar
    ↓
kein LLM

einfache Extraktion / Klassifikation
    ↓
kleines günstiges Modell

Companion-Gespräch
    ↓
dialogstarkes Modell

komplexe Synthese / schwierige Review
    ↓
stärkeres Modell

offene agentische Aufgabe
    ↓
Harness + geeignete Modelle
```

* [ ] Task-Klassen definieren.
* [ ] Modellrouting konfigurierbar machen.
* [ ] Eskalation bei Unsicherheit ermöglichen.
* [ ] Deeskalation bei stabil bekannten Abläufen ermöglichen.
* [ ] Modellwechsel im Trace nachvollziehbar halten.
* [ ] keine Modellanbieterlogik in die PTS-Domain einbauen.

---

### L6.7 — Skill-Optimierung

Ein Skill darf verbessert werden, wenn:

* Ergebnisqualität steigt; oder
* Qualität gleich bleibt und Aufwand sinkt.

Mögliche Optimierungen:

* kürzerer Prompt;

* kleineres Modell;

* weniger Retrieval;

* Wiederverwendung geprüfter Zwischenergebnisse;

* deterministische Vorverarbeitung;

* bessere Stop-Bedingung;

* gezieltere Toolwahl.

* [ ] Skill-Versionen gegeneinander benchmarken.

* [ ] Referenzfälle beibehalten.

* [ ] Qualitäts- und Kostenregression getrennt melden.

* [ ] automatische Promotion nur innerhalb definierter Grenzen.

* [ ] pädagogische Grundregeln nie aufgrund einer Kostenmetrik abschwächen.

---

### L6.8 — Retrieval-Ökonomie

Knowledge und Memory sollen nicht bei jedem Turn vollständig durchsucht werden.

Implementieren:

* [ ] Retrieval nur bei begründetem Informationsbedarf;
* [ ] Query aus aktuellem Fokus erzeugen;
* [ ] Suchraum nach Knowledge-Klasse und Scope einschränken;
* [ ] relevante bereits bekannte Quellen bevorzugen;
* [ ] Ergebniszahl dynamisch begrenzen;
* [ ] Retrieval stoppen, wenn zusätzlicher Erkenntnisgewinn gering wird;
* [ ] Source- und Embedding-Caches nutzen, sofern verfügbar;
* [ ] doppelte Web-Recherche innerhalb eines definierten Aktualitätsfensters vermeiden.

---

### L6.9 — Workflow-Ökonomie

Die Runtime soll mit Erfahrung erkennen, wann ein komplexer Workflow unnötig ist.

Beispiel:

```text
erste Ausführung:
Recherche
→ Perspektivenanalyse
→ Materialvergleich
→ Review
→ Ergebnis

spätere ähnliche Ausführung:
bekannter Skill
→ gezieltes Retrieval
→ Ergebnis
→ leichter Check
```

* [ ] erfolgreiche Workflow-Vereinfachungen als Kandidaten speichern.
* [ ] überflüssige Schritte identifizieren.
* [ ] parallele Schritte nur dort einsetzen, wo sie tatsächlich Laufzeit sparen.
* [ ] Hintergrundagenten nicht prophylaktisch starten.
* [ ] maximal zulässige Agent-/Subagent-Anzahl pro Workflow definieren.
* [ ] Tokenbudgets pro Workflowklasse festlegen.
* [ ] Budgetüberschreitung kontrolliert stoppen oder eskalieren.

---

### L6.10 — Qualitätsregression und Benchmarking

Ein wachsender PTS braucht stabile Referenzfälle.

Mindestens:

* [ ] Referenzfälle für Companion-Gespräch;
* [ ] offene Recherche;
* [ ] Materialerstellung;
* [ ] Learning-Landscape-Änderung;
* [ ] Worker + Review;
* [ ] Knowledge-Anfrage;
* [ ] Gesprächsmethoden;
* [ ] Maintenance-Aufgabe.

Für jeden Referenzfall erfassen:

* Qualitätsbewertung;
* erwartete Kernmerkmale;
* Fehlergrenzen;
* Tokenverbrauch;
* Modellaufrufe;
* Runtime;
* Kosten.

Neue Skill-, Workflow-, Prompt- oder Modellversionen müssen gegen relevante
Referenzfälle getestet werden.

**Done when:** Qualitätsfortschritt und ökonomischer Fortschritt über Versionen
messbar sind.

---

### L6.11 — kontinuierlicher Verbesserungszyklus

Der PTS soll langfristig folgenden Zyklus unterstützen:

```text
Nutzung
  ↓
Messung
  ↓
Muster erkennen
  ↓
Verbesserung vorschlagen
  ↓
gegen Referenzfälle testen
  ↓
fachliche + ökonomische Bewertung
  ↓
promoten oder verwerfen
```

Eine Verbesserung wird nur akzeptiert, wenn mindestens eine der Bedingungen gilt:

```text
Qualität ↑ bei Kosten ≤
Qualität = bei Kosten ↓
Qualität deutlich ↑ bei vertretbarem Mehrverbrauch
```

Nicht akzeptabel:

```text
Kosten ↓ und fachliche Qualität ↓
```

* [ ] Verbesserungsproposals versionieren.
* [ ] Testergebnis und Begründung speichern.
* [ ] Rollback ermöglichen.
* [ ] grundlegende Companion-/Policy-Änderungen menschlich freigeben.
* [ ] selbstständige Runtime-Optimierung auf technische Parameter begrenzen, solange keine breitere Evaluation vorliegt.

---

### L6.12 — bestehende Produktqualitätsaufgaben

Die bisherigen L6-Aufgaben bleiben bestehen:

* [ ] E2E-Test: Landschaftsänderung → Canvas-Vorschau → Zustimmung → Workspace → UI.
* [ ] E2E-Test: Gesprächsvorschlag → ein Häkchen → Hintergrundarbeit → Ergebnis in „Jetzt wichtig“ → zweites Häkchen → `ready_for_class`.
* [ ] E2E-Test: Gesprächsmarker → Ziel öffnen → zur Gesprächsstelle zurückspringen.
* [ ] Browser-E2E für Canvas-/Zeitansicht-Wechsel und Informationsverlust.
* [ ] Barrierefreiheit: Tastatur, Fokus, Kontrast, nicht allein farbcodierte Kanten.
* [ ] Reduced Motion, abschaltbare Töne und funktionsgleiche Darstellung ohne Raumillustration sicherstellen.
* [ ] Räumliche Navigation nie ausschließlich über Position, Farbe, Animation oder Symbol vermitteln.
* [ ] Responsive Verhalten: Denkraum und Canvas-Modal auf kleineren Displays.
* [ ] Visuelle Regression für Hauptzustände des Denkraums.

---

## Gate nach L6

Vor einer Übertragung der Runtime-Architektur auf andere Thinking Spaces muss
geklärt sein:

1. Welche Skills und Runtime-Fähigkeiten sind tatsächlich generisch?
2. Welche Memories sind PTS-spezifisch?
3. Welche Qualitätsmetriken lassen sich sinnvoll übertragen?
4. Welche Workflow-Lernmechanismen haben sich bewährt?
5. Welche Token-/Kostenoptimierungen sind runtimegenerisch?
6. Wo würde eine gemeinsame Runtime fachliche Eigenheiten nivellieren?

Erst danach wird für den Theological Thinking Space entschieden, ob:

* dieselbe adaptive Runtime verwendet wird;
* nur einzelne Runtime-Pakete übernommen werden;
* ein eigenes Harness-Profil sinnvoller ist;
* oder der TTS bewusst eine andere Agenten- und Memory-Dramaturgie benötigt.


## L6 — Knowledge, Qualität und lernender Betrieb

L6 verbindet drei bisher teilweise getrennte Aufgaben:

1. **verlässliches Knowledge** mit Quellen und Provenance,
2. **Produkt- und Ergebnisqualität** durch Tests, Review und Accessibility,
3. **kontinuierlichen Qualitätsfortschritt der adaptiven Runtime**.

Der PTS soll mit wachsender Nutzung nicht einfach mehr Wissen, längere Prompts und mehr Agentenschritte ansammeln. Er soll lernen, **welche Informationen, Skills, Workflows und Modelle für eine Aufgabe tatsächlich erforderlich sind**.

Qualitätsfortschritt bedeutet deshalb:

> Eine vergleichbare Aufgabe wird im Laufe der Zeit mindestens gleich gut, möglichst besser, nachvollziehbarer und mit geringerem unnötigem Ressourcenverbrauch bearbeitet.

Tokenreduktion ist kein Selbstzweck. Eine billigere Ausführung ist nur dann eine Verbesserung, wenn die fachliche Qualität mindestens erhalten bleibt.

### L6.1 — Knowledge mit Herkunft und Unsicherheit

* [ ] Knowledge-Adapter mit freigegebenen Quellen integrieren.
* [ ] Quellen, Abrufdatum, Prüfstatus und Unsicherheit speichern und anzeigen.
* [ ] Lehrplanbezug als Board-Aufgabe und Knowledge-Ergebnis modellieren.
* [ ] Knowledge-Ergebnisse nach Quelle, Geltungsbereich und epistemischem Status unterscheiden.
* [ ] vorhandenes freigegebenes Knowledge vor neuer externer Recherche prüfen.
* [ ] bereits geprüfte Quellen bei unverändertem Stand wiederverwenden.
* [ ] externe Recherche nur auslösen, wenn der vorhandene Wissensstand für die aktuelle Frage nicht ausreicht.
* [ ] Retrieval auf den aktuellen Fokus begrenzen statt grundsätzlich den gesamten Knowledge-Bestand bereitzustellen.
* [ ] Knowledge-Ergebnisse mit Provenance in den Denkprozess zurückführen, ohne sie automatisch zu pädagogischen Entscheidungen zu machen.

**Done when:** Der Companion kann verlässliches Wissen gezielt hinzuziehen und Herkunft, Unsicherheit und Relevanz transparent erhalten, ohne bei jedem Turn unnötig den gesamten Wissensbestand zu laden.

### L6.2 — Gestufte Qualitätsprüfung

Nicht jede Ausgabe benötigt dieselbe aufwendige Review-Pipeline.

Qualitätsprüfung soll nach Risiko und Bedeutung eskalieren:

```text
deterministische Prüfung
        ↓
strukturierte Heuristik
        ↓
kleines / günstiges Modell
        ↓
starkes Review-Modell
```

* [ ] deterministische Prüfungen für Schema, Pfade, IDs, Referenzen und Vollständigkeit bevorzugen.
* [ ] bereits deterministisch erkennbare Fehler nicht zusätzlich durch ein LLM prüfen lassen.
* [ ] Review-Tiefe an Artefakttyp und Risiko koppeln.
* [ ] unveränderte Artefaktversionen nicht erneut vollständig reviewen.
* [ ] Review-Ergebnisse an die konkrete Artefaktversion binden.
* [ ] Unsicherheit eines Reviews explizit erfassen.
* [ ] bei unklarer Bewertung gezielt eskalieren statt standardmäßig das stärkste Modell einzusetzen.

**Done when:** Qualitätsprüfung verlässlich ist, aber nur so viel Modellarbeit auslöst, wie für die jeweilige Aufgabe notwendig ist.

### L6.3 — Nutzung und Kosten messbar machen

Für relevante Runtime-Ausführungen mindestens erfassen:

```yaml
usage:
  input_tokens:
  output_tokens:
  cached_tokens:
  model_calls:
  tool_calls:
  retrieval_items:
  runtime_ms:
  estimated_cost:
```

Zusätzlich soweit sinnvoll:

```yaml
outcome:
  review_status:
  accepted:
  edited:
  rejected:
  followup_needed:
```

* [ ] Tokenverbrauch pro Companion-Turn erfassen.
* [ ] Tokenverbrauch pro Skill und Workflow erfassen.
* [ ] Modell- und Toolaufrufe erfassen.
* [ ] Retrieval-Aufwand erfassen.
* [ ] Laufzeit erfassen.
* [ ] soweit Providerdaten verfügbar sind, Cache-Nutzung erfassen.
* [ ] geschätzte Kosten administrativ auswertbar machen.
* [ ] keine Gesprächsinhalte oder personenbezogenen Daten unnötig in Telemetrie speichern.

Die Metriken dienen nicht dazu, Lehrkräfte zur sparsamen Nutzung zu bewegen. Sie dienen der Weiterentwicklung der Runtime.

### L6.4 — Qualitätsfortschritt messen

Ein Skill oder Workflow gilt als verbessert, wenn mindestens eine der folgenden Bedingungen erfüllt ist:

```text
Qualität ↑   bei Aufwand ≤
Qualität =   bei Aufwand ↓
Qualität deutlich ↑ bei vertretbarem Mehraufwand
```

Nicht als Verbesserung gilt:

```text
Aufwand ↓
aber
fachliche Qualität ↓
```

* [ ] Referenzfälle für wiederkehrende Aufgaben definieren.
* [ ] Qualität und Ressourcenverbrauch gemeinsam auswerten.
* [ ] Skill- und Workflow-Versionen miteinander vergleichen.
* [ ] Regressionen erkennen.
* [ ] vorherige freigegebene Versionen wiederherstellen können.
* [ ] Verbesserungen erst nach Evaluation promoten.

### L6.5 — Adaptive Modell- und Skillwahl

Die Runtime soll mit wachsender Erfahrung nicht automatisch komplexer werden, sondern bessere Entscheidungen darüber treffen, **wann welche Ausführungsform genügt**.

Beispiel:

```text
deterministisch lösbar
        ↓
kein LLM

einfache Extraktion / Klassifikation
        ↓
kleines Modell

normaler Companion-Turn
        ↓
dialoggeeignetes Modell

schwierige Synthese / Review
        ↓
stärkeres Modell

offene Recherche / selbstorganisierter Workflow
        ↓
Harness
```

* [ ] Aufgabentypen für Modellrouting definieren.
* [ ] vorhandenen geeigneten Skill vor Generierung eines neuen Workflows prüfen.
* [ ] bekannte Aufgaben bevorzugt über bewährte Workflows ausführen.
* [ ] bei Unsicherheit kontrolliert auf stärkere Modelle oder zusätzliche Schritte eskalieren.
* [ ] bei stabil bekannten Abläufen auf einfachere Ausführung deeskalieren können.
* [ ] Routing-Entscheidung im Runtime-Trace nachvollziehbar halten.

### L6.6 — Retrieval- und Kontextökonomie

* [ ] nicht bei jedem Turn automatisch Knowledge oder Memory abrufen.
* [ ] Retrieval nur bei erkennbarem Informationsbedarf auslösen.
* [ ] Suchraum nach aktuellem Fokus, Scope und Knowledge-Klasse begrenzen.
* [ ] bereits vorhandene geprüfte Ergebnisse bevorzugen.
* [ ] doppelte Recherche innerhalb eines angemessenen Aktualitätsfensters vermeiden.
* [ ] Ergebniszahl dynamisch begrenzen.
* [ ] zusätzliche Recherche stoppen, wenn kein relevanter Erkenntnisgewinn mehr zu erwarten ist.
* [ ] stabile Kontextteile nicht unnötig bei jedem Turn neu übertragen.
* [ ] Gesprächshistorie verdichten, ohne kanonische Entscheidungen durch eine Summary zu ersetzen.

**Done when:** längere Planungsräume nicht automatisch immer höhere Kontext- und Retrievalkosten erzeugen.

### L6.7 — Lernen aus Workflow-Erfahrung

Die in L5b eingeführten Skills und Workflow Memories sollen durch reale Nutzung verbessert werden können.

* [ ] erfolgreiche und problematische Skill-Ausführungen erfassen.
* [ ] stark bearbeitete oder verworfene Ergebnisse als mögliches Qualitätssignal berücksichtigen.
* [ ] Einzelereignisse nicht automatisch als allgemeine Präferenz verfestigen.
* [ ] wiederkehrende Muster über mehrere Ausführungen erkennen.
* [ ] mögliche Verbesserungen als versionierte Learning Proposals erzeugen.
* [ ] neue Skill-/Workflow-Versionen gegen Referenzfälle testen.
* [ ] produktive Skills nicht direkt selbstmodifizieren.
* [ ] grundlegende pädagogische Regeln nur nach menschlicher Freigabe verändern.

Ziel ist ein kontrollierter Lernzyklus:

```text
ausführen
→ beobachten
→ bewerten
→ Verbesserung vorschlagen
→ testen
→ promoten oder verwerfen
```

### L6.8 — Kontinuierliche Qualität des Planungsraums

Die Runtime soll nicht nur einzelne Antworten prüfen, sondern auch erkennen können, wenn der Planungsraum mit der Zeit inkonsistent wird.

* [ ] veraltete Referenzen erkennen.
* [ ] offene Fragen erkennen, die durch bestätigte Entscheidungen erledigt wurden.
* [ ] Materialien erkennen, deren Bezugsobjekt nicht mehr existiert.
* [ ] widersprüchliche oder überholte Workspace-Zustände markieren.
* [ ] technische Konsistenz soweit sicher deterministisch prüfen.
* [ ] semantisch offene Pflegefragen nur bei Bedarf an das LLM geben.
* [ ] fachliche Änderungen weiterhin als Vorschlag behandeln.
* [ ] keine permanente LLM-Hintergrundschleife für Datenpflege betreiben.

### L6.9 — E2E und Datenintegrität

Die bereits vorgesehenen Produktqualitätstests bleiben verbindlich:

* [ ] E2E-Test: Landschaftsänderung → Canvas-Vorschau → Zustimmung → Workspace → UI.
* [ ] E2E-Test: Gesprächsvorschlag → ein Häkchen → Hintergrundarbeit → Ergebnis in „Jetzt wichtig“ → zweites Häkchen → `ready_for_class`.
* [ ] E2E-Test: Gesprächsmarker → Ziel öffnen → zur Gesprächsstelle zurückspringen.
* [ ] Browser-E2E für Canvas-/Zeitansicht-Wechsel und Informationsverlust.
* [ ] Fehlerfall während Worker-/Harness-Ausführung ohne inkonsistenten Workspace testen.
* [ ] Resume nach Backend- oder Runtime-Neustart testen.
* [ ] doppelte Ergebnisse nach Retry oder Resume verhindern.

### L6.10 — Accessibility und UI-Qualität

* [ ] Barrierefreiheit: Tastatur, Fokus, Kontrast, nicht allein farbcodierte Kanten.
* [ ] Reduced Motion, abschaltbare Töne und funktionsgleiche Darstellung ohne Raumillustration sicherstellen.
* [ ] Räumliche Navigation nie ausschließlich über Position, Farbe, Animation oder Symbol vermitteln.
* [ ] Responsive Verhalten: Denkraum und Canvas-Modal auf kleineren Displays.
* [ ] Visuelle Regression für Hauptzustände des Denkraums.

### L6.11 — Referenz-Benchmark

Einen kleinen stabilen Satz von Referenzaufgaben pflegen, mindestens für:

* Companion-Gespräch;
* offene Recherche;
* Knowledge-Anfrage;
* Worker-Artefakt;
* Review;
* Landschaftsänderung;
* Gesprächs-/Moderationsskill;
* kontinuierliche Workspace-Pflege.

Für relevante Änderungen an:

* Modell,
* Prompt,
* Skill,
* Workflow,
* Retrieval,
* Memory,
* Harness-Version

die betroffenen Referenzfälle erneut ausführen.

Dabei gemeinsam betrachten:

```text
fachliche Qualität
+
Tokenverbrauch
+
Modellaufrufe
+
Toolaufrufe
+
Latenz
+
Fehlerquote
```

**Done when:** Eine Runtime-Änderung nicht nur als „funktioniert“ bewertet werden kann, sondern nachvollziehbar gezeigt werden kann, ob sie den PTS qualitativ und/oder ökonomisch verbessert.

---

**Done when L6 insgesamt:** Knowledge ist nachvollziehbar und quellengebunden integriert; die zentralen Nutzerflüsse sind E2E und hinsichtlich Accessibility abgesichert; und der PTS besitzt erstmals einen messbaren, versionierten Verbesserungszyklus, der fachliche Qualität und Ressourcenverbrauch gemeinsam betrachtet.


## Noch nicht beginnen

- freie Whiteboard-Zeichnung als kanonische Quelle,
- automatische KI-Umbauten ohne Vorschau und Zustimmung,
- Produktivbetrieb mit Schüler:innendaten,
- Nextcloud- oder PDF/DOCX-Export vor stabiler Landschafts- und Materialzuordnung,
- Host Bridge ohne eigenes Sicherheitsreview,
- begehbare 3D-Welt,
- vermenschlichte Worker-Figuren,
- Belohnungs-, Punkte- oder Levelsysteme.
