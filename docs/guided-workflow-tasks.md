# Geführter Arbeitsfluss – Implementierungsaufgaben

Stand: 2026-07-16  
Status: bereit zur Umsetzung durch mehrere Codex-Agenten

Dieses Dokument konkretisiert die noch offenen Punkte aus `TASKS.md` zu „Nächster Schritt“, Critical-Friend-Vorschlägen, Hintergrundarbeit, Planungsboard und Materialien.

Es führt kein neues pädagogisches Modell ein. Kanonisch bleiben die Kernel-Artefakte. Die hier beschriebenen Vorschläge, Aufmerksamkeitskarten und Statusanzeigen sind App-Workflow beziehungsweise Read Models.

## 1. Verbindliches Zielbild

Die Lehrkraft arbeitet weiter im gemeinsamen Denkraum mit dem Critical Friend. Die Oberfläche zeigt genau eine Entscheidung unter **„Jetzt wichtig“**.

```text
Gespräch
→ Critical Friend macht einen konkreten Vorschlag
→ ✓ Passt
→ Board-Karte, Service Request und Hintergrundarbeit entstehen automatisch
→ Ergebnis wird direkt in „Jetzt wichtig“ sichtbar
→ ✓ Passt für den Unterricht oder ✎ Weiterreden
```

### Minimale Interaktion

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

### Fachliche Grenzen

- Ein Vorschlag aus dem Gespräch ist noch keine kanonische Änderung.
- Das erste Häkchen ist die ausdrückliche Lehrkraft-Zustimmung zum Worker-Auftrag.
- Ein Worker-Ergebnis bleibt bis zum zweiten Häkchen `review_needed`.
- Das Ergebnis muss vor der Freigabe direkt in der Entscheidungskarte sichtbar sein.
- Automatische Strukturprüfung und Critical-Friend-Prüfung ersetzen nicht die Lehrkraftfreigabe.
- Board-Verschiebungen starten niemals Worker.
- Technische Begriffe wie Service Request, Queue, Harness, Worker-ID oder Provider erscheinen nicht im Lehrkräftemodus.

## 2. Arbeitsregeln für die Agenten

1. Aufgaben werden in der unten angegebenen Reihenfolge bearbeitet.
2. Parallel ausgeführt werden dürfen nur Aufgaben derselben Welle, deren Dateibereiche sich nicht überschneiden.
3. Vor Beginn liest jeder Agent `AGENTS.md`, `PRODUCT_SPEC.md`, `UI_SPEC.md`, `TASKS.md` und dieses Dokument vollständig.
4. Bestehende, nicht zum Auftrag gehörende Änderungen im Working Tree bleiben unangetastet.
5. `.env` und Secrets werden niemals committed oder in Testausgaben kopiert.
6. Nach jeder Aufgabe werden die angegebenen Tests ausgeführt.
7. Nur der koordinierende Agent ändert Checkboxen in `TASKS.md` und diesem Dokument.
8. Jeder Handoff enthält: geänderte Dateien, ausgeführte Tests, bekannte Einschränkungen und den nächsten freigegebenen Task.

## 3. Zielverträge

### 3.1 Nicht-kanonischer Gesprächsvorschlag

Der bestehende Vorschlagsvertrag wird um einen ausführbaren, aber noch nicht angenommenen Vorschlag erweitert:

```ts
type GuidedProposalStatus = 'pending' | 'accepting' | 'accepted' | 'superseded' | 'discarded';

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

Die API liefert höchstens eine Karte. Die Priorität ist rein workflowbezogen und wird nicht als neue pädagogische Semantik gespeichert:

1. Sicherheits- oder Blockierungsproblem,
2. fertiges Ergebnis zur Lehrkraftprüfung,
3. angenommener Vorschlag, dessen Start fehlgeschlagen ist,
4. neuer Gesprächsvorschlag,
5. konkrete offene pädagogische Entscheidung,
6. erstes offenes Board-Arbeitsvorhaben,
7. Gespräch fortsetzen.

### 3.4 Öffentliche API-Änderungen

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
  → ergänzt attentionCard und backgroundWork
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
- [ ] Prüfen, dass `PTSPACE_KERNEL_WRITE_ENABLED=false` bleibt.
- [ ] Für spätere Real-Harness-Tests einen synthetischen Planungsraum ohne personenbezogene Daten festlegen.

**Tests:** `pnpm check`, Backend-Service-Request- und Refactor-E2E-Tests.  
**Abnahme:** Ausgangsfehler und bestehende Fremdänderungen sind im Handoff benannt; kein Produktcode wurde geändert.

## Welle 1 – Verträge und unabhängige Backend-Bausteine

GW-100 und GW-110 dürfen nach Abschluss von GW-000 parallel laufen. Luna und Nova dürfen dabei nicht dieselben Dateien bearbeiten.

### GW-100 – Statusmodell, Migration und persistenter Runner

**Owner:** Luna  
**Abhängigkeiten:** GW-000  
**Primäre Dateien:** Shared Schemas, `ServiceRequestWorkflow`, neuer Runner, Backend-Tests

- [ ] Backend- und Shared-Statusmodell auf den Vertrag aus Abschnitt 3.2 vereinheitlichen.
- [ ] Automatische Vorprüfung aus dem bisherigen missverständlichen Status `reviewed` lösen und als `automaticCheck` speichern.
- [ ] Die modellgestützte Critical-Friend-Prüfung als Teil derselben Hintergrundarbeit ausführen und separat als `criticalFriendCheck` speichern; sie erzeugt keinen zusätzlichen Lehrkraftklick.
- [ ] Bestehende Requests verlustfrei lesen:
  - altes `reviewed` ohne dokumentierte Lehrkraftfreigabe → `returned`,
  - vorhandene Review-Notiz → `automaticCheck`,
  - vorhandene Board-Freigabe → `reviewed` mit abgeleitetem `teacherReview`.
- [ ] Einen `ServiceRequestRunner` mit persistenter Queue implementieren.
- [ ] Pro Planungsraum höchstens einen Harness-Auftrag gleichzeitig ausführen.
- [ ] `queued` nach Backend-Neustart wieder aufnehmen.
- [ ] Beim Start vorgefundene `in_progress`-Requests als unterbrochen und erneut ausführbar markieren; niemals automatisch doppelt starten.
- [ ] Statusänderungen vor und nach jedem externen Harness-Aufruf persistieren.
- [ ] Fehlerkategorien in stabile interne Codes und lehrkräftefreundliche Meldungen übersetzen.
- [ ] Runner-Shutdown in `app.onClose` sauber abwarten, ohne neue Aufträge anzunehmen.

**Nicht Teil dieses Tasks:** UI, Gesprächsvorschläge, Real-Harness-Netzwerktest.  
**Tests:** Statusmigration, Queue-Recovery, Idempotenz, Parallelitätsgrenze, Fehlerpersistenz, sauberer Shutdown.  
**Abnahme:** Ein Approve-Pfad muss nicht mehr auf den Harness warten; kein Status behauptet eine Lehrkraftprüfung, die nicht stattgefunden hat.

### GW-110 – Strukturierter Vorschlag aus dem Gespräch

**Owner:** Nova  
**Abhängigkeiten:** GW-000  
**Primäre Dateien:** Harness-Vertrag, OpenCode-/Mock-Adapter, ConversationOrchestrator, ProposalService/Store

- [ ] Bestehenden Proposal-Vertrag um `worker_draft` erweitern.
- [ ] Einen persistenten `GuidedProposalStore` für nicht-kanonische Vorschläge implementieren.
- [ ] Pro Critical-Friend-Antwort höchstens einen strukturierten Vorschlag akzeptieren.
- [ ] Den Harness-Vertrag um ein optionales, typisiertes `suggestedAction` erweitern.
- [ ] OpenCode-Prompt so ergänzen, dass ein konkreter Arbeitsvorschlag als klar abgegrenzter JSON-Sidecar zurückgegeben werden kann.
- [ ] Sidecar vor Anzeige vollständig aus dem Lehrkräftetext entfernen.
- [ ] Sidecar strikt mit Zod validieren; unbekannte Capabilities, Pfade, Providerangaben, Runtimebefehle oder unbekannte Lernmoment-IDs verwerfen.
- [ ] Titel, Grund und erwartetes Ergebnis auf sinnvolle Längen begrenzen.
- [ ] ProposalService füllt Board-ID, Status, Capability und erlaubte Output-Position serverseitig; Modellwerte werden nicht blind übernommen.
- [ ] MockHarnessAdapter liefert mindestens einen deterministischen Worker-Vorschlag für Tests.
- [ ] Conversation-SSE meldet nach `complete` optional die ID des gespeicherten Vorschlags.
- [ ] Ein späterer Vorschlag darf einen alten offenen Vorschlag nur als `superseded` markieren, nicht löschen.

**Nicht Teil dieses Tasks:** Annahme des Vorschlags oder Worker-Ausführung.  
**Tests:** gültiger Sidecar, ungültiges JSON, unbekannte Capability, unbekannte Moment-ID, mehr als ein Vorschlag, Sidecar-Leak im sichtbaren Text, Reload des ProposalStore.  
**Abnahme:** Aus dem Gespräch entsteht ein sichtbarer, persistenter Vorschlag, aber weder Board-Karte noch Service Request noch Workspace-Änderung.

## Welle 2 – Atomarer Ein-Klick-Workflow

### GW-120 – Vorschlag mit einem Häkchen annehmen und starten

**Owner:** Luna  
**Abhängigkeiten:** GW-100 und GW-110  
**Primäre Dateien:** Proposal-/Service-Request-Routen, Workflow-Orchestrierung, Board- und Materialpersistenz

- [ ] `POST .../guided-proposals/:proposalId/accept` implementieren.
- [ ] Innerhalb eines atomaren, idempotenten Vorgangs:
  1. Proposal erneut laden und `pending` prüfen,
  2. stabile Board- und Request-IDs vorab erzeugen,
  3. Proposal mit diesen IDs auf `accepting` setzen,
  4. pädagogische Referenzen gegen die aktuelle Lernlandschaft validieren,
  5. genau eine Board-Karte erzeugen,
  6. genau einen daran gebundenen Service Request erzeugen,
  7. Board-Karte auf `in_progress`/`prepare` setzen,
  8. Request auf `queued` setzen,
  9. Proposal auf `accepted` setzen,
  10. verständliche Git-Version erzeugen,
  11. HTTP 202 zurückgeben.
- [ ] Einen pro Planungsraum serialisierten Acceptance-Workflow verwenden; `accepting` ist das Wiederaufnahme-Journal für Absturz und Teilschreibfehler.
- [ ] Beim Backend-Start unvollständige `accepting`-Vorgänge anhand der gespeicherten IDs idempotent vervollständigen oder sicher auf `pending` zurückführen.
- [ ] Bei Fehlern vor Queue-Übergabe keine halbfertigen kanonischen Artefakte hinterlassen.
- [ ] Wiederholtes Accept mit derselben Proposal-ID liefert den bestehenden Auftrag zurück.
- [ ] Den alten UI-Pfad „Board-Vorschlag aufnehmen → Entwurf beauftragen“ API-seitig kompatibel halten, aber nicht mehr als Hauptfluss verwenden.
- [ ] Runner-Abschluss atomar zurückführen:
  - Materialdatei und Metadaten,
  - Board-Karte nach `review`,
  - Materialreferenz am Lernmoment,
  - Service Request nach `returned`,
  - verständliche Git-Version.
- [ ] Fehler halten die Board-Karte nachvollziehbar bei `prepare/blocked` und bieten einen idempotenten Retry; kein stiller Neustart.

**Tests:** ein Accept erzeugt genau ein Tripel aus Proposal/Board/Request; Retry erzeugt kein Duplikat; Fehlerrollbacks; unbekannte oder veraltete Referenz; Runner-Rückführung.  
**Abnahme:** Zwischen Gesprächsvorschlag und laufender Hintergrundarbeit existiert genau ein Lehrkraftklick.

### GW-130 – Fachliche Freigabe mit einem zweiten Häkchen

**Owner:** Luna  
**Abhängigkeiten:** GW-120  

- [ ] `POST .../service-requests/:requestId/review` implementieren.
- [ ] Review nur erlauben, wenn Request `returned`, AutomaticCheck bestanden, kein blockierender Critical-Friend-Befund vorhanden und Material lesbar ist.
- [ ] Bei Accept atomar setzen:
  - Service Request `reviewed`,
  - `teacherReview` mit Rolle und Zeitpunkt,
  - Material `ready_for_class`,
  - Board-Karte `ready`,
  - `reviewedAt` und `reviewedBy`,
  - verständliche Git-Version.
- [ ] Der Stift ruft diese Route nicht auf: Weiterreden setzt nur den Materialfokus im bestehenden Chat; Request und Material bleiben `returned` beziehungsweise `review_needed`.
- [ ] Keine zusätzliche Bestätigungsroute und kein „Freigabe bestätigen“-Zwischenstatus.
- [ ] Wiederholtes Accept ist idempotent.

**Tests:** Freigabe vor Ergebnis abgelehnt; fehlgeschlagener AutomaticCheck oder blockierender Critical-Friend-Befund abgelehnt; Accept aktualisiert alle Referenzen; Pencil verändert keinen Status; doppelter Klick bleibt idempotent.  
**Abnahme:** Zwischen sichtbarem Ergebnis und `ready_for_class` existiert genau ein Lehrkraftklick.

### GW-140 – Projektion „Jetzt wichtig“ und Arbeitsereignisse

**Owner:** Luna  
**Abhängigkeiten:** GW-120 und GW-130  

- [ ] `room-overview` um genau eine `attentionCard` und `backgroundWork` erweitern.
- [ ] Prioritätsregeln aus Abschnitt 3.3 serverseitig als reine Projektion implementieren.
- [ ] Nie mehr als eine Hauptkarte zurückgeben.
- [ ] Für `result_review` Materialinhalt oder eine sichere Markdown-Vorschau liefern; kein rohes HTML.
- [ ] `GET .../service-requests/:requestId` implementieren.
- [ ] `GET .../work-events` als SSE implementieren.
- [ ] Ereignisse enthalten nur Planungsraum-ID, Request-ID, teacher-facing Status und Zeitstempel; keine Prompts, Secrets, Providerantworten oder Dateisystempfade.
- [ ] Der GET-Zustand bleibt autoritativ; SSE darf nach Reconnect Ereignisse verlieren, aber keinen Zustand.
- [ ] Teacher-facing Texte zentral testen und technische Begriffe ausschließen.

**Tests:** Prioritätsmatrix, eine Karte maximal, sichere Vorschau, SSE-Reconnect, Reload ohne Eventverlust, kein Secret-/Pfad-Leak.  
**Abnahme:** Terra kann die UI ausschließlich aus API-Verträgen bauen, ohne eigene Prioritätslogik oder parallele Next-Step-Liste.

## Welle 3 – Geführte Oberfläche

Terra beginnt erst nach einem dokumentierten API-Handoff aus GW-140.

### GW-200 – Informationsarchitektur vereinfachen

**Owner:** Terra  
**Abhängigkeiten:** GW-140  
**Primäre Dateien:** Svelte-Hauptansicht, UI-Komponenten, Styles

- [ ] Critical Friend und Gespräch dauerhaft als primären Arbeitsbereich erhalten.
- [ ] Die fünf gleichgewichtigen Perspektivbuttons aus dem Hauptkopf entfernen.
- [ ] Rechts oben beziehungsweise neben dem Gespräch genau eine Karte „Jetzt wichtig“ anzeigen.
- [ ] Lernlandschaft, Zeit & Dramaturgie und Planungsboard unter einer sekundären Aktion „Planung ansehen“ erreichbar machen.
- [ ] Materialien nicht als weitere Perspektive des didaktischen Designs darstellen, sondern als Ergebnisbereich, erreichbar vom Ergebnis, Lernmoment und sekundären Menü.
- [ ] Mehrfach vorhandene Statusleisten und Fortschrittszähler reduzieren; laufende Arbeit erhält einen einzigen ruhigen Statuszugang.
- [ ] Leerer Zustand: konkrete Einladung zum Gespräch statt leerer Boards oder Menüs.
- [ ] Responsive Verhalten so gestalten, dass „Jetzt wichtig“ vor sekundären Übersichten erscheint.

**Tests/Prüfung:** Svelte-Check, Produktionsbuild, Tastaturreihenfolge, 1280px/980px/kleine Mobilbreite.  
**Abnahme:** Ohne Navigation kann die Lehrkraft erkennen, was jetzt entschieden werden soll.

### GW-210 – Häkchen und Stift als vollständiger Bedienvertrag

**Owner:** Terra  
**Abhängigkeiten:** GW-200  

- [ ] Jede entscheidbare Karte zeigt maximal zwei Aktionen:
  - `✓ Passt` beziehungsweise `✓ Passt für den Unterricht`,
  - `✎ Weiterreden`.
- [ ] Icons erhalten sichtbare Kurzlabels oder mindestens eindeutige Accessible Names und Tooltips; Bedeutung darf nicht nur über das Symbol vermittelt werden.
- [ ] `✓ Passt` ruft direkt Proposal-Accept auf; kein Modal und keine zweite Bestätigung.
- [ ] `✎ Weiterreden` setzt den Focus Chip im bestehenden Composer, verschiebt den Tastaturfokus ins Eingabefeld und verändert keine kanonischen Daten.
- [ ] Doppelklick während laufendem Request clientseitig sperren; Backend-Idempotenz bleibt maßgeblich.
- [ ] Erfolgreiches Accept ersetzt die Vorschlagskarte unmittelbar durch den teacher-facing Laufstatus oder die nächste AttentionCard.
- [ ] Alte Buttons „Arbeitsvorhaben aufnehmen“, „Entwurf beauftragen“, „Gemeinsam prüfen“ und „Freigabe bestätigen“ aus dem Hauptfluss entfernen.
- [ ] Planungsboard-Detail darf administrative Übersicht bieten, aber keinen zweiten konkurrierenden Startfluss.

**Tests:** genau ein Accept-Request pro Klick, Pencil ohne Mutation, Tastaturbedienung mit Enter/Space, Screenreader-Namen, kein Bestätigungsmodal.  
**Abnahme:** Vorschlag → Hintergrundarbeit benötigt genau ein Häkchen; kein Pflichtbesuch im Planungsboard.

### GW-220 – Hintergrundarbeit ohne Überraschung

**Owner:** Terra  
**Abhängigkeiten:** GW-210  

- [ ] Nach Start sofort anzeigen: „Der Entwurf wird vorbereitet. Du kannst im Gespräch weiterarbeiten.“
- [ ] Einen kleinen persistenten Status wie „1 Entwurf wird vorbereitet“ anzeigen, solange Arbeit läuft.
- [ ] SSE abonnieren; bei Verbindungsabbruch mit begrenztem Polling auf den autoritativen GET-Zustand zurückfallen.
- [ ] Polling pausieren, wenn kein Planungsraum offen ist; beim Wiederöffnen Status sofort neu laden.
- [ ] Fertigstellung mit ruhigem `aria-live='polite'`-Hinweis melden.
- [ ] Nie automatisch die Perspektive, Scrollposition oder den Chatfokus wechseln.
- [ ] Fertiges Ergebnis wird zur neuen AttentionCard und bleibt bis zur Entscheidung auffindbar.
- [ ] Fehlerkarte bietet `✎ Weiterreden`; Retry darf nur erscheinen, wenn Backend ihn als sicher und idempotent meldet.
- [ ] Mehrere wartende Ergebnisse werden nicht als Kartenstapel gezeigt; `Jetzt wichtig` zeigt eines, der sekundäre Statuszugang nennt die Anzahl.

**Tests:** Abschluss während anderer Ansicht, Reload während Lauf, SSE-Ausfall, mehrere Jobs, Fehlerstatus, kein Fokusraub.  
**Abnahme:** Hintergrundarbeit kann nicht „überraschend“ verschwinden oder fertig werden; sie unterbricht den Denkraum dennoch nicht.

### GW-230 – Ergebnis direkt prüfen und freigeben

**Owner:** Terra  
**Abhängigkeiten:** GW-220  

- [ ] Materialtitel, Entstehungsgrund, Bezug zum Lernmoment und Markdown-Inhalt direkt in der AttentionCard anzeigen.
- [ ] Lange Inhalte innerhalb derselben Karte aufklappbar machen; kein Pflichtwechsel zum Materialbereich.
- [ ] Ergebnis von automatischer Vorprüfung und Critical-Friend-Prüfung knapp unterscheiden; beide Prüfungen sind vor der Lehrkraftentscheidung bereits abgeschlossen.
- [ ] `✓ Passt für den Unterricht` ruft direkt Review-Accept auf; kein Checkbox- oder Bestätigungsdialog.
- [ ] `✎ Weiterreden` übernimmt Material-ID und Board-Bezug als Chatfokus.
- [ ] Nach Freigabe zeigt die Karte kurz „Für den Unterricht bereit“ und wechselt danach zur nächsten AttentionCard.
- [ ] Materialbereich bleibt Sammlung und Nachweis, nicht zusätzlicher Workflow-Schritt.

**Tests:** Inhalt vor Freigabe sichtbar, Accept genau einmal, Pencil ohne Ready-Status, Material nach Freigabe in Sammlung und Lernmoment auffindbar.  
**Abnahme:** Ergebnis → `ready_for_class` benötigt genau ein Häkchen nach sichtbarer Prüfung.

## Welle 4 – Real-Harness-Verifikation und Qualität

### GW-300 – Automatisierte Gesamtregression

**Owner:** Orion  
**Abhängigkeiten:** GW-130 und GW-230  

- [ ] Bestehende Unit-, API- und Refactor-E2E-Tests an den asynchronen Vertrag anpassen.
- [ ] Browser-E2E für folgende Flüsse ergänzen:
  1. Chat → strukturierter Vorschlag → ein Häkchen → queued,
  2. währenddessen weiterchatten oder Perspektive öffnen,
  3. Ergebnis erscheint ohne Navigation,
  4. Inhalt ansehen → ein Häkchen → ready,
  5. Reload in queued, in_progress und returned,
  6. Pencil setzt Fokus und verändert keine kanonischen Daten,
  7. Board-Drop startet weiterhin nichts.
- [ ] Klickbudget als Regression festhalten:
  - Start eines Gesprächsvorschlags: genau ein bewusster Klick,
  - Freigabe eines sichtbaren Ergebnisses: genau ein bewusster Klick,
  - keine dazwischenliegenden Bestätigungsdialoge.
- [ ] Accessibility-Prüfung für Focus, Accessible Names, `aria-live`, Kontrast und reine Icon-Aktionen.
- [ ] Sicherstellen, dass technische Statuscodes und Sidecar-JSON nie im DOM erscheinen.

**Tests:** `pnpm test`, `pnpm check`, `pnpm build`, Browser-E2E.  
**Abnahme:** Alle Kernflüsse sind deterministisch im Mock-Modus grün und das Klickbudget ist testgesichert.

### GW-310 – Lokaler Real-Harness-Smoke-Test

**Owner:** Orion  
**Abhängigkeiten:** GW-300  
**Startmodus:** lokales `pnpm`, nicht Docker Compose

- [ ] Lokal prüfen, dass `.env` `PTSPACE_HARNESS=opencode-docker` und `PTSPACE_REAL_HARNESS_ENABLED=true` setzt, ohne Werte zu committen.
- [ ] `/health` muss `harnessId=opencode-docker`, Modus `docker` und Availability `ready` melden.
- [ ] Ausschließlich den synthetischen Test-Planungsraum verwenden.
- [ ] Einen echten Gesprächsvorschlag erzeugen und prüfen, dass Sidecar/JSON nicht sichtbar wird.
- [ ] Vorschlag mit einem Häkchen annehmen und prüfen, dass HTTP sofort zurückkehrt, während der Harness im Hintergrund läuft.
- [ ] Während der Laufzeit weiterchatten und einen anderen Planungsbereich öffnen.
- [ ] Ergebnisrückkehr, AttentionCard, Materialbezug und Freigabe prüfen.
- [ ] Timeout, Harness-Fehler und Backend-Neustart mindestens einmal kontrolliert testen.
- [ ] Keine API-Keys, Providerantworten, vollständigen Prompts oder personenbezogenen Inhalte in Bericht und Logs übernehmen.

**Abnahme:** Der reale Harness verhält sich im sichtbaren Produktfluss wie der Mock-Vertrag; Abweichungen werden als konkrete Bugs dokumentiert.

### GW-320 – Dokumentation und Abschluss

**Owner:** Koordinator  
**Abhängigkeiten:** GW-310

- [ ] `UI_SPEC.md` auf den Vertrag „eine Karte, Häkchen oder Stift“ aktualisieren.
- [ ] `docs/service-workflow.md` auf Queue, AutomaticCheck und TeacherReview aktualisieren.
- [ ] `docs/harness-opencode.md` um den unterstützten lokalen Real-Harness-Testpfad ergänzen.
- [ ] `TASKS.md` erst nach vollständiger Abnahme aktualisieren.
- [ ] Veraltete Beschreibungen entfernen, nach denen Board-Aufnahme, Beauftragung, Prüfung und Freigabebestätigung einzelne UI-Schritte sind.
- [ ] Abschlussbericht mit geänderten Dateien, Migration, Testergebnissen, Real-Harness-Ergebnis und bekannten Einschränkungen erstellen.

**Abnahme:** Dokumentation, Produktverhalten und Tests beschreiben denselben Zwei-Häkchen-Maximalfluss.

## 5. Globale Definition of Done

- [ ] `Jetzt wichtig` zeigt höchstens eine Entscheidung.
- [ ] Ein Gesprächsvorschlag startet mit genau einem Häkchen die erlaubte Hintergrundarbeit.
- [ ] Board-Karte und Service Request entstehen dabei automatisch und atomar.
- [ ] Es gibt keinen zusätzlichen Beauftragungs- oder Bestätigungsdialog.
- [ ] Laufende Arbeit bleibt sichtbar, ohne den aktuellen Denkraum zu unterbrechen.
- [ ] Ein fertiges Ergebnis erscheint direkt und dauerhaft zur Prüfung.
- [ ] Ein sichtbares Ergebnis wird mit genau einem weiteren Häkchen fachlich freigegeben.
- [ ] Der Stift führt immer in den bestehenden fokussierten Chat und verändert nichts kanonisch.
- [ ] Planungsboard ist Arbeitsübersicht; Materialien sind Ergebnisse, keine konkurrierenden Planungsperspektiven.
- [ ] Automatische Prüfung und Lehrkraftfreigabe sind fachlich und technisch getrennt.
- [ ] Reload, Backend-Neustart und Netzwerk-Retry erzeugen keine Doppelaufträge und keinen Statusverlust.
- [ ] Mock-Tests, Real-Harness-Smoke-Test, Typecheck, Build und E2E sind erfolgreich.
- [ ] Keine technischen Interna, Secrets oder personenbezogenen Testdaten gelangen in die Lehrkräfteoberfläche oder Testberichte.

## 6. Kopierbare Startaufträge für die Agenten

### Luna – erster Auftrag

```text
Lies AGENTS.md, PRODUCT_SPEC.md, UI_SPEC.md, TASKS.md und
docs/guided-workflow-tasks.md vollständig. Bearbeite ausschließlich GW-100.
Erhalte bestehende Daten, ändere keine UI und starte keinen Real-Harness-Test.
Führe die in GW-100 genannten Tests aus und liefere danach einen Handoff mit
geänderten Dateien, Testergebnissen, offenen Problemen und der Aussage, ob
GW-120 freigegeben werden kann. Ändere keine Task-Checkboxen selbst.
```

### Nova – paralleler erster Auftrag

```text
Lies AGENTS.md, PRODUCT_SPEC.md, UI_SPEC.md, TASKS.md und
docs/guided-workflow-tasks.md vollständig. Bearbeite ausschließlich GW-110.
Der Vorschlag muss nicht-kanonisch bleiben; kein Board-Eintrag, Service Request
oder Workspace-Write vor Lehrkraftzustimmung. Verhindere Sidecar-, Secret- und
Pfad-Leaks. Führe alle GW-110-Tests aus und liefere einen API-/Typ-Handoff für
Luna. Ändere keine Task-Checkboxen selbst.
```

### Terra – Auftrag nach Backend-Handoff

```text
Beginne erst, wenn GW-140 als abgenommen übergeben wurde. Lies AGENTS.md,
PRODUCT_SPEC.md, UI_SPEC.md, TASKS.md und docs/guided-workflow-tasks.md
vollständig. Bearbeite GW-200 bis GW-230 in dieser Reihenfolge. Implementiere
keine eigene Prioritätslogik und keinen zweiten kanonischen Next-Step-Pfad.
Halte das Klickbudget verbindlich ein: ein Häkchen startet, ein späteres
Häkchen gibt das sichtbare Ergebnis frei; der Stift führt nur ins Gespräch.
Führe nach jedem Task Svelte-Check und Build aus und liefere einen Handoff.
```

### Orion – Qualitäts- und Real-Harness-Auftrag

```text
Beginne erst nach dem Frontend-Handoff aus GW-230. Bearbeite GW-300 und danach
GW-310. Nutze für den Real-Harness-Test ausschließlich den synthetischen
Planungsraum und den lokalen pnpm-Startmodus. Gib niemals Secrets, vollständige
Prompts oder Providerantworten aus. Belege das Klickbudget, Reload-Verhalten,
Idempotenz, Hintergrundfeedback und die fachliche Freigabe mit Tests. Liefere
einen Abschluss-Handoff an den Koordinator; ändere keine Checkboxen selbst.
```
