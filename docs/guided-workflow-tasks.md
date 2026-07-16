# Geführter Arbeitsfluss – Implementierungsaufgaben

Stand: 2026-07-16  
Status: bereit zur Umsetzung durch mehrere Codex-Agenten

Dieses Dokument konkretisiert die offenen Punkte aus `TASKS.md` zu „Nächster Schritt“, Critical-Friend-Vorschlägen, Hintergrundarbeit, Planungsboard, Materialien und dem UX-Refactor des gemeinsamen Denkraums.

Es führt kein neues pädagogisches Modell ein. Kanonisch bleiben die Kernel-Artefakte. Vorschläge, Aufmerksamkeitskarten, Gesprächsmarker und Statusanzeigen sind App-Workflow beziehungsweise Read Models.

Das verbindliche UX-Zielbild steht in `REFACTOR-UX.md`.

## 1. Verbindliches Zielbild

Die Lehrkraft arbeitet im gemeinsamen Denkraum mit dem Critical Friend. Das Gespräch ist das visuelle und funktionale Zentrum. Die Oberfläche zeigt genau eine Entscheidung unter **„Jetzt wichtig“**.

```text
Gespräch
→ Critical Friend macht einen konkreten Vorschlag
→ ✓ Passt
→ Board-Karte, Service Request und Hintergrundarbeit entstehen automatisch
→ Arbeitsvorhaben bleibt klein und sichtbar im Hintergrund
→ Ergebnis wird direkt in „Jetzt wichtig“ sichtbar
→ ✓ Passt für den Unterricht oder ✎ Weiterreden
```

### 1.1 Minimale Interaktion

Für einen Materialentwurf sind höchstens zwei bewusste Zustimmungen erlaubt:

1. `✓ Passt` startet die im Gespräch vorgeschlagene Vorbereitung.
2. `✓ Passt für den Unterricht` gibt das bereits sichtbare Ergebnis fachlich frei.

Nicht zulässig sind zusätzliche Pflichtschritte wie:

- „ins Planungsboard aufnehmen“,
- „Entwurf beauftragen“,
- „Auftrag bestätigen“,
- „Prüfung starten“,
- „Freigabe bestätigen“.

`✎ Weiterreden` setzt den Vorschlag oder das Ergebnis als Fokus in den bestehenden Chat. Es entsteht kein zweiter Chat und keine kanonische Änderung.

### 1.2 Räumliches UX-Zielbild

Der Hauptbildschirm wird als gemeinsamer pädagogischer Denkraum gestaltet, nicht als Dashboard mit gleichgewichtigen Modulen.

Das Gespräch bildet das Zentrum. Denkstand, offene Entscheidungen, Hintergrundarbeit, Lernlandschaft, Zeitplanung, Knowledge und Materialien werden als aus dem Gespräch hervorgehende beziehungsweise räumlich zugeordnete Bereiche dargestellt.

Funktionale Metaphern:

- Pinnwand = festgehaltene Gedanken und offene Entscheidungen
- Windrose beziehungsweise Karte = Lernlandschaft
- Sanduhr = Zeit und Dramaturgie
- Werkbank = laufende Vorbereitungen
- Bücherregal = Knowledge, Quellen und geprüfte Bezüge
- Materialmappe = Unterrichtsmaterialien

Die Metaphern dürfen den Zugang nicht erschweren. Jeder Bereich besitzt zusätzlich eine klar beschriftete, per Tastatur erreichbare Navigation.

Animationen dienen ausschließlich dazu, Zustandsübergänge verständlich zu machen. Sie dürfen keine Belohnungsmechanik, keinen Fokusraub und kein Agenten-Theater erzeugen.

### 1.3 Fachliche Grenzen

- Ein Vorschlag aus dem Gespräch ist noch keine kanonische Änderung.
- Das erste Häkchen ist die ausdrückliche Lehrkraft-Zustimmung zum Worker-Auftrag.
- Ein Worker-Ergebnis bleibt bis zum zweiten Häkchen `review_needed`.
- Das Ergebnis muss vor der Freigabe direkt in der Entscheidungskarte sichtbar sein.
- Automatische Strukturprüfung und Critical-Friend-Prüfung ersetzen nicht die Lehrkraftfreigabe.
- Board-Verschiebungen starten niemals Worker.
- Technische Begriffe wie Service Request, Queue, Harness, Worker-ID oder Provider erscheinen nicht im Lehrkräftemodus.
- Gesprächsmarker sind Verweise auf bestehende Ziele und keine neuen kanonischen Artefakte.
- Animation, Ton oder räumliche Position sind nie alleinige Bedeutungsträger.

## 2. Arbeitsregeln für die Agenten

1. Aufgaben werden in der angegebenen Reihenfolge bearbeitet.
2. Parallel ausgeführt werden dürfen nur Aufgaben derselben Welle, deren Dateibereiche sich nicht überschneiden.
3. Vor Beginn liest jeder Agent `AGENTS.md`, `REFACTOR-UX.md`, `PRODUCT_SPEC.md`, `UI_SPEC.md`, `TASKS.md` und dieses Dokument vollständig.
4. Bestehende, nicht zum Auftrag gehörende Änderungen im Working Tree bleiben unangetastet.
5. `.env` und Secrets werden niemals committed oder in Testausgaben kopiert.
6. Nach jeder Aufgabe werden die angegebenen Tests ausgeführt.
7. Nur der koordinierende Agent ändert Checkboxen in `TASKS.md` und diesem Dokument.
8. Jeder Handoff enthält: geänderte Dateien, ausgeführte Tests, bekannte Einschränkungen und den nächsten freigegebenen Task.
9. Räumliche oder animierte Funktionen benötigen eine funktionsgleiche barrierefreie Alternative.
10. Frontend-Agenten implementieren keine eigene pädagogische Prioritätslogik.

## 3. Zielverträge

### 3.1 Nicht-kanonischer Gesprächsvorschlag

```ts
type GuidedProposalStatus =
  | 'pending'
  | 'accepting'
  | 'accepted'
  | 'superseded'
  | 'discarded';

type GuidedWorkerProposal = {
  id: string;
  planningSpaceId: string;
  kind: 'worker_draft';
  status: GuidedProposalStatus;
  sourceMessageId: string;
  title: string;
  rationale: string;
  expectedResult: string;
  capability: 'create_board_material' | 'create_student_instruction';
  relatedMomentIds: string[];
  materialNeed?: string;
  acceptance?: {
    boardItemId: string;
    serviceRequestId: string;
  };
  createdAt: string;
  updatedAt: string;
};
```

Der Vorschlag darf keine freie Dateiposition, Shell-Anweisung, Providerwahl oder Runtime-Konfiguration enthalten. IDs und Capability werden serverseitig gegen Planungsraum, Kernel-Verträge und Allowlist validiert.

### 3.2 Persistenter Arbeitsstatus

```ts
type ServiceRequestStatus =
  | 'proposed'
  | 'queued'
  | 'in_progress'
  | 'returned'
  | 'reviewed'
  | 'failed'
  | 'discarded';

type AutomaticCheck = {
  status: 'pending' | 'passed' | 'failed';
  note: string;
  checkedAt?: string;
};

type CriticalFriendCheck = {
  status: 'pending' | 'passed' | 'concerns' | 'blocked';
  note: string;
  checkedAt?: string;
};

type TeacherReview = {
  status: 'accepted';
  reviewedBy: string;
  reviewedAt: string;
  note?: string;
};
```

`returned` bedeutet: Entwurf vorhanden, automatische Prüfungen abgeschlossen, Lehrkraftprüfung offen. `reviewed` darf erst nach dem zweiten Häkchen gesetzt werden.

### 3.3 Read Model „Jetzt wichtig“

```ts
type AttentionCard = {
  id: string;
  kind:
    | 'safety_block'
    | 'result_review'
    | 'worker_proposal'
    | 'pedagogical_proposal'
    | 'open_decision'
    | 'planning_item'
    | 'continue_conversation';
  title: string;
  rationale: string;
  sourceMessageId?: string;
  preview?: {
    format: 'text' | 'markdown';
    content: string;
    truncated: boolean;
  };
  primaryAction?: {
    kind: 'accept_proposal' | 'accept_result';
    label: string;
    targetId: string;
  };
  discussAction: {
    label: 'Weiterreden';
    focus: PedagogicalFocus;
  };
};
```

Die API liefert höchstens eine Karte. Priorität:

1. Sicherheits- oder Blockierungsproblem,
2. fertiges Ergebnis zur Lehrkraftprüfung,
3. angenommener Vorschlag, dessen Start fehlgeschlagen ist,
4. neuer Gesprächsvorschlag,
5. konkrete offene pädagogische Entscheidung,
6. erstes offenes Board-Arbeitsvorhaben,
7. Gespräch fortsetzen.

### 3.4 Gesprächsmarker und Herkunftsbezüge

```ts
type ConversationMarkerKind =
  | 'captured_note'
  | 'open_decision'
  | 'work_started'
  | 'result_returned'
  | 'ready_for_class';

type ConversationMarker = {
  id: string;
  planningSpaceId: string;
  sourceMessageId: string;
  kind: ConversationMarkerKind;
  targetType:
    | 'thinking_state'
    | 'decision'
    | 'board_item'
    | 'service_request'
    | 'material';
  targetId: string;
  label: string;
  createdAt: string;
};
```

Regeln:

- Ein Marker verweist auf ein bereits bestehendes Artefakt oder einen Arbeitsstatus.
- Ein Klick im Chat öffnet das Ziel.
- Vom Ziel kann zur auslösenden Gesprächsstelle zurückgesprungen werden.
- Marker dürfen nach Reload nicht verloren gehen.
- Marker dürfen nur auf Ziele desselben Planungsraums zeigen.
- Beim Verwerfen, Ersetzen oder Löschen eines Ziels wird der Marker entfernt oder nachvollziehbar als nicht mehr aktuell markiert.
- Symbole erhalten sichtbare Kurzlabels oder eindeutige Accessible Names.

### 3.5 Öffentliche API-Änderungen

```text
POST /api/planning-spaces/:spaceId/guided-proposals/:proposalId/accept
  → 202 für Worker-Vorschlag
  → erzeugt atomar Board-Karte + Service Request + Queue-Eintrag

GET /api/planning-spaces/:spaceId/service-requests/:requestId
  → persistenter Einzelstatus

GET /api/planning-spaces/:spaceId/work-events
  → SSE: queued | in_progress | returned | failed | reviewed

POST /api/planning-spaces/:spaceId/service-requests/:requestId/review
  → akzeptiert das bereits sichtbare Ergebnis fachlich

GET /api/planning-spaces/:spaceId/room-overview
  → attentionCard + backgroundWork + conversationMarkers
```

`accept` muss idempotent sein. Wiederholte Klicks oder Netzwerk-Retries dürfen weder doppelte Board-Karten noch doppelte Worker-Aufträge erzeugen.

## 4. Ausführungsreihenfolge und Zuständigkeiten

## Welle 0 – Bestand und Vertragsfreeze

### GW-000 – Ausgangszustand und Handoff-Protokoll

**Owner:** Koordinator  
**Abhängigkeiten:** keine  
**Parallelisierung:** keine

- [ ] Aktuellen Working Tree dokumentieren, ohne bestehende Änderungen zu verändern.
- [ ] Relevante bestehende Tests einmal mit Mock-Harness ausführen.
- [ ] Aktuelle Klickfolge für Board-Vorschlag → Auftrag → Material → Freigabe dokumentieren.
- [ ] Aktuelle API-Antworten für Proposal, Approve und Materialabruf als Test-Fixpunkt erfassen.
- [ ] Aktuelle Hauptansicht als visuelle Referenz bei 1280px und 980px sichern.
- [ ] Prüfen, dass `PTSPACE_KERNEL_WRITE_ENABLED=false` bleibt.
- [ ] Für spätere Real-Harness-Tests einen synthetischen Planungsraum ohne personenbezogene Daten festlegen.

**Tests:** `pnpm check`, Backend-Service-Request- und Refactor-E2E-Tests.  
**Abnahme:** Ausgangsfehler und bestehende Fremdänderungen sind im Handoff benannt; kein Produktcode wurde geändert.

## Welle 1 – Verträge und unabhängige Backend-Bausteine

GW-100 und GW-110 dürfen nach Abschluss von GW-000 parallel laufen.

### GW-100 – Statusmodell, Migration und persistenter Runner

**Owner:** Luna  
**Abhängigkeiten:** GW-000

- [ ] Backend- und Shared-Statusmodell auf Abschnitt 3.2 vereinheitlichen.
- [ ] Automatische Vorprüfung aus dem missverständlichen Status `reviewed` lösen und als `automaticCheck` speichern.
- [ ] Modellgestützte Critical-Friend-Prüfung separat als `criticalFriendCheck` speichern.
- [ ] Bestehende Requests verlustfrei lesen.
- [ ] `ServiceRequestRunner` mit persistenter Queue implementieren.
- [ ] Pro Planungsraum höchstens einen Harness-Auftrag gleichzeitig ausführen.
- [ ] `queued` nach Backend-Neustart wieder aufnehmen.
- [ ] Vorgefundene `in_progress`-Requests sicher erneut ausführbar markieren.
- [ ] Statusänderungen vor und nach jedem externen Harness-Aufruf persistieren.
- [ ] Fehler in stabile interne Codes und lehrkräftefreundliche Meldungen übersetzen.
- [ ] Runner-Shutdown sauber abwarten.

**Tests:** Statusmigration, Queue-Recovery, Idempotenz, Parallelitätsgrenze, Fehlerpersistenz, Shutdown.  
**Abnahme:** Kein Status behauptet eine Lehrkraftprüfung, die nicht stattgefunden hat.

### GW-110 – Strukturierter Vorschlag aus dem Gespräch

**Owner:** Nova  
**Abhängigkeiten:** GW-000

- [ ] Proposal-Vertrag um `worker_draft` erweitern.
- [ ] Persistenten `GuidedProposalStore` implementieren.
- [ ] Pro Critical-Friend-Antwort höchstens einen strukturierten Vorschlag akzeptieren.
- [ ] Harness-Vertrag um optionales typisiertes `suggestedAction` erweitern.
- [ ] JSON-Sidecar vollständig aus dem sichtbaren Lehrkräftetext entfernen.
- [ ] Sidecar strikt validieren.
- [ ] unbekannte Capabilities, Pfade, Providerangaben, Runtimebefehle und unbekannte Lernmoment-IDs verwerfen.
- [ ] `sourceMessageId` zuverlässig speichern.
- [ ] MockHarnessAdapter liefert einen deterministischen Worker-Vorschlag.
- [ ] Conversation-SSE meldet nach `complete` optional die Proposal-ID.
- [ ] Späterer Vorschlag markiert alten offenen Vorschlag nur als `superseded`.

**Tests:** gültiger Sidecar, ungültiges JSON, unbekannte Capability, unbekannte Moment-ID, Sidecar-Leak, Reload.  
**Abnahme:** Ein sichtbarer persistenter Vorschlag entsteht, aber keine kanonische Änderung.

### GW-115 – Gesprächsmarker-Read-Model

**Owner:** Nova  
**Abhängigkeiten:** GW-000  
**Parallelisierung:** parallel zu GW-100/GW-110, sofern getrennte Dateien

- [ ] Persistenten oder deterministisch rekonstruierbaren Marker-Store implementieren.
- [ ] Marker aus Denkstand-Festhaltung, offener Entscheidung, angenommener Vorbereitung, Ergebnisrückkehr und Freigabe ableiten.
- [ ] `sourceMessageId` und Zielreferenz serverseitig validieren.
- [ ] Ziele anderer Planungsräume ablehnen.
- [ ] Ziel-Lifecycle für `superseded`, `discarded` und gelöscht definieren.
- [ ] `room-overview` um Marker ergänzen.
- [ ] Markerreihenfolge und Deduplizierung festlegen.

**Tests:** Reload, ungültige Quelle, ungültiges Ziel, fremder Planungsraum, Deduplizierung, verworfenes Ziel.  
**Abnahme:** Terra kann Marker ohne eigene Herkunftslogik anzeigen.

## Welle 2 – Atomarer Ein-Klick-Workflow

### GW-120 – Vorschlag mit einem Häkchen annehmen und starten

**Owner:** Luna  
**Abhängigkeiten:** GW-100, GW-110 und GW-115

- [ ] `POST .../guided-proposals/:proposalId/accept` implementieren.
- [ ] Innerhalb eines atomaren, idempotenten Vorgangs:
  1. Proposal erneut laden und `pending` prüfen,
  2. stabile Board- und Request-IDs erzeugen,
  3. Proposal auf `accepting` setzen,
  4. pädagogische Referenzen validieren,
  5. genau eine Board-Karte erzeugen,
  6. genau einen Service Request erzeugen,
  7. Board-Karte auf `in_progress`/`prepare` setzen,
  8. Request auf `queued` setzen,
  9. Marker `work_started` erzeugen,
  10. Proposal auf `accepted` setzen,
  11. verständliche Git-Version erzeugen,
  12. HTTP 202 zurückgeben.
- [ ] Acceptance-Workflow pro Planungsraum serialisieren.
- [ ] Unvollständige `accepting`-Vorgänge nach Backend-Start idempotent abschließen oder zurückführen.
- [ ] Keine halbfertigen kanonischen Artefakte bei Fehlern.
- [ ] Wiederholtes Accept liefert bestehenden Auftrag zurück.
- [ ] Alten UI-Pfad API-seitig kompatibel halten, aber nicht mehr als Hauptfluss verwenden.
- [ ] Runner-Abschluss atomar zurückführen:
  - Materialdatei und Metadaten,
  - Board-Karte nach `review`,
  - Materialreferenz am Lernmoment,
  - Service Request nach `returned`,
  - Marker `result_returned`,
  - verständliche Git-Version.
- [ ] Fehler halten Board-Karte nachvollziehbar bei `prepare/blocked`.

**Tests:** genau ein Proposal/Board/Request-Tripel, Marker, Retry, Rollback, veraltete Referenz, Runner-Rückführung.  
**Abnahme:** Zwischen Gesprächsvorschlag und laufender Hintergrundarbeit existiert genau ein Lehrkraftklick.

### GW-130 – Fachliche Freigabe mit einem zweiten Häkchen

**Owner:** Luna  
**Abhängigkeiten:** GW-120

- [ ] `POST .../service-requests/:requestId/review` implementieren.
- [ ] Review nur bei `returned`, bestandenem AutomaticCheck, keinem blockierenden Critical-Friend-Befund und lesbarem Material erlauben.
- [ ] Bei Accept atomar setzen:
  - Service Request `reviewed`,
  - `teacherReview`,
  - Material `ready_for_class`,
  - Board-Karte `ready`,
  - Marker `ready_for_class`,
  - verständliche Git-Version.
- [ ] Der Stift ruft diese Route nicht auf.
- [ ] Keine zusätzliche Bestätigungsroute.
- [ ] Wiederholtes Accept ist idempotent.

**Tests:** Freigabe vor Ergebnis, Checks, Accept, Marker, Pencil, Doppelklick.  
**Abnahme:** Zwischen sichtbarem Ergebnis und `ready_for_class` existiert genau ein Lehrkraftklick.

### GW-140 – Projektion „Jetzt wichtig“, Marker und Arbeitsereignisse

**Owner:** Luna  
**Abhängigkeiten:** GW-120 und GW-130

- [ ] `room-overview` um genau eine `attentionCard`, `backgroundWork` und `conversationMarkers` erweitern.
- [ ] Prioritätsregeln serverseitig als reine Projektion implementieren.
- [ ] Nie mehr als eine Hauptkarte zurückgeben.
- [ ] Sichere Markdown-Vorschau für `result_review` liefern.
- [ ] `sourceMessageId` für AttentionCards und Hintergrundarbeit liefern, sofern vorhanden.
- [ ] `GET .../service-requests/:requestId` implementieren.
- [ ] `GET .../work-events` als SSE implementieren.
- [ ] Ereignisse enthalten nur teacher-facing Status und sichere IDs.
- [ ] GET-Zustand bleibt autoritativ.
- [ ] Teacher-facing Texte zentral testen.
- [ ] Keine funktionslosen oder planungsraumfremden Marker ausliefern.

**Tests:** Prioritätsmatrix, eine Karte, sichere Vorschau, Marker-Reload, Rücksprungdaten, SSE-Reconnect, kein Leak.  
**Abnahme:** Terra kann die UI ausschließlich aus API-Verträgen bauen.

## Welle 3 – Geführte Denkraum-Oberfläche

Terra beginnt erst nach einem dokumentierten API-Handoff aus GW-140.

### GW-200 – Gemeinsamen Denkraum als primäre Oberfläche gestalten

**Owner:** Terra  
**Abhängigkeiten:** GW-140  
**Primäre Dateien:** Svelte-Hauptansicht, UI-Komponenten, Styles

- [ ] Hauptbildschirm als ruhigen gemeinsamen Denkraum gestalten, nicht als nebeneinanderliegendes Chat- und Dashboard-Layout.
- [ ] Gespräch als größten und dauerhaft bedienbaren Bereich erhalten.
- [ ] Reduzierte gemeinsame Arbeitsszene umsetzen; keine detaillierten Avatare.
- [ ] Fünf gleichgewichtige Perspektivbuttons aus dem Hauptkopf entfernen.
- [ ] Pinnwand zeigt nur wenige aktuelle Gegenstände.
- [ ] Genau eine Karte „Jetzt wichtig“ anzeigen.
- [ ] Lernlandschaft, Zeit, Vorbereitungen, Knowledge und Materialien über räumlich verständliche und beschriftete Zugänge erreichbar machen.
- [ ] Alternative lineare Navigation implementieren.
- [ ] Materialien als Ergebnisbereich und nicht als gleichgewichtige Planungsperspektive darstellen.
- [ ] Mehrfache Statusleisten und Fortschrittszähler reduzieren.
- [ ] Leerer Zustand lädt zum Gespräch ein.
- [ ] Responsive Priorität: Gespräch → Jetzt wichtig → Hintergrundarbeit → Navigation.
- [ ] Szene bleibt ohne Illustration vollständig bedienbar.

**Tests:** Svelte-Check, Build, Tastaturreihenfolge, 1280px, 980px, Mobil, Illustration aus.  
**Abnahme:** Beim Öffnen ist unmittelbar ein gemeinsamer pädagogischer Denkraum erkennbar.

### GW-205 – Gesprächsmarker und sichtbare Zustandsübergänge

**Owner:** Terra  
**Abhängigkeiten:** GW-200 und GW-140

- [ ] Marker für festgehaltene Gedanken, offene Entscheidungen, gestartete Vorbereitungen, Ergebnisse und Freigaben anzeigen.
- [ ] Klick auf Marker öffnet das verknüpfte Ziel.
- [ ] Vom Ziel Rücksprung zur auslösenden Gesprächsstelle anbieten.
- [ ] Chatfilter umsetzen: Alle, Festgehaltenes, offene Entscheidungen, Vorbereitungen und Ergebnisse.
- [ ] Filter zeigen genügend Gesprächskontext.
- [ ] Neues fachliches Ereignis einmalig durch kurze Übergangsanimation sichtbar machen.
- [ ] Animation verändert weder DOM-Reihenfolge, Fokus noch Scrollposition.
- [ ] Bei `prefers-reduced-motion` ruhige Hervorhebung verwenden.
- [ ] Optionalen, separat abschaltbaren Ton vorsehen.
- [ ] Keine Erfolgs-Jingles, Punkte, Belohnungsanimationen oder vermenschlichten Worker.
- [ ] Animation nach Reload nicht erneut abspielen.

**Tests:** Marker-Zielnavigation, Rücksprung, Reload, Filter, Tastatur, Screenreader, Reduced Motion, Ton aus, Fokusstabilität.  
**Abnahme:** Die Lehrkraft kann nachvollziehen, aus welcher Gesprächsstelle ein Zustand hervorgegangen ist.

### GW-210 – Häkchen und Stift als vollständiger Bedienvertrag

**Owner:** Terra  
**Abhängigkeiten:** GW-205

- [ ] Jede entscheidbare Karte zeigt maximal zwei Aktionen.
- [ ] Icons erhalten sichtbare Kurzlabels oder eindeutige Accessible Names.
- [ ] `✓ Passt` ruft direkt Proposal-Accept auf.
- [ ] `✎ Weiterreden` setzt den Focus Chip und verschiebt den Tastaturfokus ins Eingabefeld.
- [ ] Doppelklick während laufendem Request clientseitig sperren.
- [ ] Accept ersetzt Vorschlagskarte durch Laufstatus oder nächste AttentionCard.
- [ ] Alte Mehrschritt-Buttons aus dem Hauptfluss entfernen.
- [ ] Planungsboard-Detail bietet keinen zweiten Startfluss.

**Tests:** ein Accept pro Klick, Pencil ohne Mutation, Tastatur, Screenreader, kein Modal.  
**Abnahme:** Vorschlag → Hintergrundarbeit benötigt genau ein Häkchen.

### GW-220 – Hintergrundarbeit ohne Überraschung

**Owner:** Terra  
**Abhängigkeiten:** GW-210

- [ ] Nach Start sofort anzeigen: „Der Entwurf wird vorbereitet. Du kannst im Gespräch weiterarbeiten.“
- [ ] Kleine persistente Werkstattleiste anzeigen.
- [ ] Leiste zeigt maximal Titel, teacher-facing Status und Anzahl.
- [ ] Subtile Aktivitätsanimation nur während real laufender Arbeit.
- [ ] Klick öffnet kompakte Übersicht laufender und zuletzt zurückgekehrter Arbeiten.
- [ ] Keine Worker-Namen, Provider, Harness-Begriffe oder technische Warteschlangen.
- [ ] SSE abonnieren; bei Abbruch begrenzt pollen.
- [ ] Polling pausieren, wenn kein Planungsraum offen ist.
- [ ] Fertigstellung mit `aria-live="polite"` melden.
- [ ] Nie Perspektive, Scrollposition oder Chatfokus automatisch wechseln.
- [ ] Fertiges Ergebnis wird neue AttentionCard.
- [ ] Fehlerkarte bietet `✎ Weiterreden`; Retry nur bei sicherem Backend-Vertrag.
- [ ] Mehrere Ergebnisse nicht als Kartenstapel darstellen.

**Tests:** Abschluss in anderer Ansicht, Reload, SSE-Ausfall, mehrere Jobs, Fehler, kein Fokusraub.  
**Abnahme:** Hintergrundarbeit bleibt nachvollziehbar, ohne den Denkraum zu unterbrechen.

### GW-230 – Ergebnis direkt prüfen und freigeben

**Owner:** Terra  
**Abhängigkeiten:** GW-220

- [ ] Materialtitel, Entstehungsgrund, Lernmomentbezug und Inhalt direkt in der AttentionCard anzeigen.
- [ ] Lange Inhalte innerhalb derselben Karte aufklappbar machen.
- [ ] AutomaticCheck und Critical-Friend-Prüfung knapp unterscheiden.
- [ ] `✓ Passt für den Unterricht` ruft direkt Review-Accept auf.
- [ ] `✎ Weiterreden` übernimmt Material-ID und Board-Bezug als Chatfokus.
- [ ] Nach Freigabe kurz „Für den Unterricht bereit“ zeigen.
- [ ] Materialbereich bleibt Sammlung und Nachweis.
- [ ] Ergebnis-Marker und Rücksprung funktionieren.

**Tests:** Inhalt sichtbar, Accept einmal, Pencil ohne Ready, Marker, Material auffindbar.  
**Abnahme:** Ergebnis → `ready_for_class` benötigt genau ein Häkchen.

## Welle 4 – Qualität und Real-Harness

### GW-300 – Automatisierte Gesamtregression

**Owner:** Orion  
**Abhängigkeiten:** GW-130 und GW-230

- [ ] Unit-, API- und Refactor-E2E-Tests anpassen.
- [ ] Browser-E2E:
  1. Chat → Vorschlag → ein Häkchen → queued,
  2. weiterchatten oder Bereich öffnen,
  3. Ergebnis erscheint ohne Navigation,
  4. Inhalt ansehen → ein Häkchen → ready,
  5. Reload in queued, in_progress und returned,
  6. Pencil setzt Fokus ohne Mutation,
  7. Board-Drop startet nichts,
  8. Marker → Ziel → Rücksprung,
  9. Chatfilter,
  10. Reduced Motion und Ton aus.
- [ ] Klickbudget als Regression festhalten.
- [ ] Accessibility für Fokus, Names, `aria-live`, Kontrast und Icons prüfen.
- [ ] Technische Statuscodes und Sidecar-JSON nie im DOM.
- [ ] Visuelle Regression für Denkraum, Pinnwand, Werkstattleiste, Marker und Ergebnisprüfung.
- [ ] Hauptbildschirm ohne Hintergrundgrafik prüfen.

**Tests:** `pnpm test`, `pnpm check`, `pnpm build`, Browser-E2E.  
**Abnahme:** Kernflüsse sind deterministisch grün; UX bleibt ohne Motion und Illustration funktionsgleich.

### GW-310 – Lokaler Real-Harness-Smoke-Test

**Owner:** Orion  
**Abhängigkeiten:** GW-300

- [ ] Lokal `PTSPACE_HARNESS=opencode-docker` und `PTSPACE_REAL_HARNESS_ENABLED=true` setzen, ohne Werte zu committen.
- [ ] `/health` prüfen.
- [ ] Ausschließlich synthetischen Test-Planungsraum verwenden.
- [ ] Echten Gesprächsvorschlag erzeugen; kein Sidecar sichtbar.
- [ ] Mit einem Häkchen annehmen; HTTP kehrt sofort zurück.
- [ ] Während Laufzeit weiterchatten und Bereich öffnen.
- [ ] Ergebnisrückkehr, AttentionCard, Marker, Materialbezug und Freigabe prüfen.
- [ ] Timeout, Harness-Fehler und Backend-Neustart kontrolliert testen.
- [ ] Keine Secrets, vollständigen Prompts oder personenbezogenen Inhalte in Bericht und Logs.

**Abnahme:** Reales Harness verhält sich im sichtbaren Produktfluss wie der Mock-Vertrag.

### GW-320 – Dokumentation und Abschluss

**Owner:** Koordinator  
**Abhängigkeiten:** GW-310

- [ ] `UI_SPEC.md` und `REFACTOR-UX.md` gegen die Implementierung prüfen.
- [ ] `docs/service-workflow.md` aktualisieren.
- [ ] `docs/harness-opencode.md` aktualisieren.
- [ ] `TASKS.md` erst nach vollständiger Abnahme aktualisieren.
- [ ] Veraltete Dashboard-, Mehrschritt- und Tab-Beschreibungen entfernen.
- [ ] Abschlussbericht mit Migration, Tests, UX-Abnahme und bekannten Einschränkungen erstellen.

**Abnahme:** Dokumentation, Produktverhalten und Tests beschreiben denselben Denkraum und Zwei-Häkchen-Maximalfluss.

## 5. Globale Definition of Done

- [ ] Das Gespräch ist visuell und funktional Mittelpunkt des Planungsraums.
- [ ] „Jetzt wichtig“ zeigt höchstens eine Entscheidung.
- [ ] Ein Gesprächsvorschlag startet mit genau einem Häkchen die erlaubte Hintergrundarbeit.
- [ ] Board-Karte und Service Request entstehen automatisch und atomar.
- [ ] Es gibt keinen zusätzlichen Beauftragungs- oder Bestätigungsdialog.
- [ ] Laufende Arbeit bleibt sichtbar, ohne den Denkraum zu unterbrechen.
- [ ] Ein fertiges Ergebnis erscheint direkt und dauerhaft zur Prüfung.
- [ ] Ein sichtbares Ergebnis wird mit genau einem weiteren Häkchen freigegeben.
- [ ] Der Stift führt in den bestehenden fokussierten Chat.
- [ ] Denkstand, Entscheidungen und Arbeitsvorhaben sind mit ihrer Gesprächsherkunft verknüpft.
- [ ] Marker funktionieren bidirektional und nach Reload.
- [ ] Räumliche Metaphern ergänzen eine beschriftete lineare Navigation.
- [ ] Animationen erklären Zustandsübergänge, verändern aber weder Fokus noch Arbeitsfluss.
- [ ] Reduced Motion, Ton aus und Tastaturbedienung sind unterstützt.
- [ ] Hintergrundarbeit legt keine technische Agentenarchitektur offen.
- [ ] Planungsboard ist Übersicht; Materialien sind Ergebnisse.
- [ ] Automatische Prüfung und Lehrkraftfreigabe sind getrennt.
- [ ] Reload, Backend-Neustart und Retry erzeugen keine Doppelaufträge.
- [ ] Mock-Tests, Real-Harness-Smoke-Test, Typecheck, Build, E2E und visuelle Regression sind erfolgreich.
- [ ] Keine technischen Interna, Secrets oder personenbezogenen Testdaten gelangen in UI oder Berichte.

## 6. Kopierbare Startaufträge

### Luna

```text
Lies AGENTS.md, REFACTOR-UX.md, PRODUCT_SPEC.md, UI_SPEC.md, TASKS.md und
docs/guided-workflow-tasks.md vollständig. Bearbeite zunächst ausschließlich
GW-100. Ändere keine UI und führe keinen Real-Harness-Test aus. Liefere einen
Handoff mit Dateien, Tests, offenen Problemen und Freigabeaussage für GW-120.
```

### Nova

```text
Lies alle verbindlichen Dokumente. Bearbeite GW-110 und – sofern die
Dateibereiche getrennt bleiben – GW-115. Vorschlag und Marker bleiben
nicht-kanonische App-Verträge. Verhindere Sidecar-, Secret-, Pfad- und
planungsraumfremde Referenzen. Liefere einen API-/Typ-Handoff.
```

### Terra

```text
Beginne erst nach dem API-Handoff aus GW-140. Bearbeite GW-200, GW-205,
GW-210, GW-220 und GW-230 in dieser Reihenfolge. Implementiere keine eigene
Prioritätslogik und keinen zweiten Workflow. Halte das Klickbudget ein.
Jede räumliche oder animierte Funktion benötigt eine funktionsgleiche
barrierefreie Alternative.
```

### Orion

```text
Beginne nach GW-230. Bearbeite GW-300 und GW-310. Belege Klickbudget,
Marker-Herkunft, Reload, Idempotenz, Hintergrundfeedback, Reduced Motion,
Tastaturbedienung und fachliche Freigabe mit Tests. Nutze im Real-Harness-Test
nur den synthetischen Planungsraum.
```
