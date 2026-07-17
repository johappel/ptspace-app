# Geführter Arbeitsfluss – Implementierungsaufgaben

Stand: 2026-07-17  
Status: bereit zur Umsetzung durch mehrere Codex-Agenten

Dieses Dokument konkretisiert `TASKS.md` für Gesprächsvorschläge, Hintergrundarbeit, „Jetzt wichtig“, Gesprächsmarker, Planungsboard, Materialien und den UX-Refactor des gemeinsamen Denkraums.

Kanonisch bleiben die Kernel-Artefakte. Vorschläge, AttentionCards, Gesprächsmarker und Statusanzeigen sind App-Workflow beziehungsweise Read Models.

Verbindlich sind außerdem `AGENTS.md`, `REFACTOR-UX.md`, `PRODUCT_SPEC.md` und `UI_SPEC.md`.

## 1. Zielbild

```text
Gespräch
→ Critical Friend macht einen konkreten Vorschlag
→ ✓ Passt
→ Board-Karte + Service Request + Hintergrundarbeit entstehen atomar
→ Arbeit bleibt klein und sichtbar im Hintergrund
→ Ergebnis erscheint direkt in „Jetzt wichtig“
→ ✓ Passt für den Unterricht oder ✎ Weiterreden
```

Für einen Materialentwurf sind höchstens zwei bewusste Zustimmungen erlaubt:

1. `✓ Passt` startet die Vorbereitung.
2. `✓ Passt für den Unterricht` gibt das sichtbare Ergebnis fachlich frei.

Nicht zulässig:

- separate Board-Aufnahme,
- zusätzliche Beauftragung,
- Startbestätigung,
- gesonderte Prüfungsbestätigung,
- Freigabebestätigung.

Der Stift setzt nur den Fokus im bestehenden Chat und verändert keine kanonischen Daten.

## 2. UX-Referenz „Quietude & Thought“

Der Screendesign-Entwurf gilt als Referenz für Atmosphäre, Hierarchie und Materialität.

Verbindliche Folgerungen:

- der aktuelle Planungsraum ist die primäre Überschrift; `Planungsräume` bleibt sekundär,
- das Gespräch erhält ungefähr 75 Prozent der Aufmerksamkeit,
- die Pinnwand liegt rechts als zurückgesetzte, aber erkennbare Tiefenebene,
- die globale Navigation ist standardmäßig eingeklappt,
- `TABLE`, `PIN`, `MAP`, `WORK` werden nicht als Lehrkräftebegriffe verwendet,
- Papiernotizen besitzen weiche Schatten, bilden aber keine neue Kartenwand,
- der Composer zeigt Kontext-Anker wie `Aus der Pinnwand` oder `Bezug: Notiz #04`,
- die Statusbar beansprucht geschlossen höchstens eine ruhige Zeile,
- erst ein Klick auf die Statusbar öffnet Werkstatt und Planungsboard,
- Pinnwand, Navigation und Statusbar bleiben vollständig per Tastatur erreichbar.

Der Referenzscreen ist keine pixelgenaue Vorgabe.

## 3. Fachliche und technische Grenzen

- Gesprächsvorschläge sind vor Zustimmung nicht kanonisch.
- Das erste Häkchen ist die ausdrückliche Zustimmung zum Hintergrundauftrag.
- Ergebnisse bleiben bis zur Lehrkraftfreigabe `review_needed` beziehungsweise `returned`.
- AutomaticCheck und Critical-Friend-Prüfung ersetzen nicht die Lehrkraftentscheidung.
- Board-Verschiebungen starten niemals Worker.
- technische Begriffe und IDs erscheinen nicht im Lehrkräftemodus.
- Gesprächsmarker verweisen auf bestehende Ziele und erzeugen keine parallele pädagogische Semantik.
- Animation, Farbe, Position oder Ton sind nie alleinige Bedeutungsträger.
- alle Accept- und Review-Pfade sind idempotent.

## 4. Arbeitsregeln für Agenten

1. Aufgaben in der angegebenen Reihenfolge bearbeiten.
2. Nur Tasks derselben Welle mit getrennten Dateibereichen parallelisieren.
3. Vor Beginn alle verbindlichen Dokumente vollständig lesen.
4. Bestehende Fremdänderungen nicht anfassen.
5. Keine Secrets, `.env`-Werte, vollständigen Prompts oder personenbezogenen Daten committen.
6. Backend-Verträge statt eigener Frontend-Prioritätslogik verwenden.
7. Jede räumliche oder animierte Funktion braucht eine funktionsgleiche barrierefreie Alternative.
8. Nach jedem Task die angegebenen Tests ausführen.
9. Handoff: geänderte Dateien, Tests, Einschränkungen, nächster freigegebener Task.
10. Nur der koordinierende Agent ändert zentrale Checkboxen.

## 5. Zielverträge

### 5.1 Gesprächsvorschlag

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

Modellwerte für Pfade, Provider, Runtimebefehle oder unbekannte Capabilities werden verworfen. Erlaubte IDs und Outputpositionen werden serverseitig bestimmt.

### 5.2 Arbeitsstatus

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

### 5.3 „Jetzt wichtig“

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

Die API liefert höchstens eine Karte. Priorität: Sicherheitsproblem, Ergebnisprüfung, fehlgeschlagener Start, neuer Vorschlag, offene Entscheidung, offenes Arbeitsvorhaben, Gespräch fortsetzen.

### 5.4 Gesprächsmarker

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

Marker sind nach Reload verfügbar, zeigen nur auf Ziele desselben Planungsraums und unterstützen Zielnavigation sowie Rücksprung.

### 5.5 API

```text
POST /api/planning-spaces/:spaceId/guided-proposals/:proposalId/accept
GET  /api/planning-spaces/:spaceId/service-requests/:requestId
GET  /api/planning-spaces/:spaceId/work-events
POST /api/planning-spaces/:spaceId/service-requests/:requestId/review
GET  /api/planning-spaces/:spaceId/room-overview
```

`room-overview` liefert genau eine `attentionCard`, `backgroundWork` und `conversationMarkers`.

## 6. Welle 0 – Bestand und Vertragsfreeze

### GW-000 – Ausgangszustand

**Owner:** Koordinator  
**Abhängigkeiten:** keine

- [ ] Working Tree und bestehende Fremdänderungen dokumentieren.
- [ ] vorhandene Mock-Harness-Tests ausführen.
- [ ] bisherigen Mehrschritt-Workflow dokumentieren.
- [ ] API-Antworten als Testfixpunkte erfassen.
- [ ] aktuelle Hauptansicht bei 1280 px und 980 px sichern.
- [ ] Referenzscreen und verbindliche Abweichungen als UX-Testgrundlage dokumentieren.
- [ ] `PTSPACE_KERNEL_WRITE_ENABLED=false` prüfen.
- [ ] synthetischen Planungsraum für Real-Harness festlegen.

**Abnahme:** Kein Produktcode geändert; Ausgangslage ist reproduzierbar.

## 7. Welle 1 – Backend-Verträge

### GW-100 – Statusmodell und Runner

**Owner:** Luna  
**Abhängigkeiten:** GW-000

- [ ] Statusmodell vereinheitlichen.
- [ ] AutomaticCheck, CriticalFriendCheck und TeacherReview trennen.
- [ ] bestehende Requests verlustfrei migrieren.
- [ ] persistente Queue implementieren.
- [ ] pro Planungsraum höchstens einen Harness-Auftrag gleichzeitig ausführen.
- [ ] Queue-Recovery, unterbrochene Requests und Shutdown sicher behandeln.
- [ ] Status vor und nach externen Aufrufen persistieren.
- [ ] technische Fehler in teacher-facing Meldungen übersetzen.

**Tests:** Migration, Recovery, Idempotenz, Parallelitätsgrenze, Fehler, Shutdown.

### GW-110 – Strukturierter Vorschlag

**Owner:** Nova  
**Abhängigkeiten:** GW-000

- [ ] `worker_draft` und `GuidedProposalStore` implementieren.
- [ ] pro Antwort höchstens einen Vorschlag akzeptieren.
- [ ] optionales `suggestedAction` im Harness-Vertrag ergänzen.
- [ ] JSON-Sidecar vollständig aus sichtbarem Text entfernen.
- [ ] Sidecar strikt validieren.
- [ ] `sourceMessageId` speichern.
- [ ] deterministischen Mock-Vorschlag bereitstellen.
- [ ] spätere Vorschläge markieren alte als `superseded`, löschen sie nicht.

**Tests:** gültiger und ungültiger Sidecar, unbekannte Capability, unbekannte Moment-ID, Leak, Reload.

### GW-115 – Marker-Read-Model

**Owner:** Nova  
**Abhängigkeiten:** GW-000

- [ ] persistenten oder deterministisch rekonstruierbaren Marker-Store implementieren.
- [ ] Marker für Denkstand, Entscheidung, Start, Ergebnis und Freigabe ableiten.
- [ ] Quelle und Ziel serverseitig validieren.
- [ ] fremde Planungsräume ablehnen.
- [ ] Lifecycle für `superseded`, `discarded` und gelöscht definieren.
- [ ] Marker in `room-overview` liefern.
- [ ] Deduplizierung und Reihenfolge festlegen.

**Tests:** Reload, ungültige Quelle/Ziel, fremder Raum, Deduplizierung, verworfenes Ziel.

## 8. Welle 2 – Atomarer Zwei-Häkchen-Workflow

### GW-120 – Vorschlag annehmen und starten

**Owner:** Luna  
**Abhängigkeiten:** GW-100, GW-110, GW-115

- [ ] Accept-Route implementieren.
- [ ] atomar und idempotent Proposal, Board-Karte und Request erzeugen.
- [ ] Proposal über `accepting` journalisieren.
- [ ] Request auf `queued` und Board-Karte auf Vorbereitung setzen.
- [ ] Marker `work_started` erzeugen.
- [ ] unvollständige Accepts nach Neustart sicher fortsetzen oder zurückführen.
- [ ] wiederholtes Accept liefert bestehenden Auftrag.
- [ ] Runner-Rückführung erzeugt Material, Referenzen, `returned` und Marker `result_returned`.
- [ ] Fehler hinterlassen keine halbfertigen Artefakte.

**Abnahme:** Ein Häkchen führt vom Gesprächsvorschlag zur laufenden Arbeit.

### GW-130 – Fachliche Freigabe

**Owner:** Luna  
**Abhängigkeiten:** GW-120

- [ ] Review-Route implementieren.
- [ ] Freigabe nur bei sichtbarem Ergebnis, bestandenem AutomaticCheck und keinem blockierenden Critical-Friend-Befund.
- [ ] atomar Request `reviewed`, TeacherReview, Material `ready_for_class`, Board `ready` und Marker erzeugen.
- [ ] Stift verändert keinen Status.
- [ ] keine zusätzliche Bestätigung.
- [ ] wiederholtes Accept bleibt idempotent.

**Abnahme:** Ein weiteres Häkchen führt vom sichtbaren Ergebnis zu `ready_for_class`.

### GW-140 – Room Overview und Events

**Owner:** Luna  
**Abhängigkeiten:** GW-120, GW-130

- [ ] `room-overview` um eine AttentionCard, Hintergrundarbeit und Marker erweitern.
- [ ] Priorität ausschließlich serverseitig berechnen.
- [ ] sichere Markdown-Vorschau liefern.
- [ ] `sourceMessageId` bereitstellen.
- [ ] Einzelstatus-GET und SSE implementieren.
- [ ] GET bleibt autoritativ.
- [ ] teacher-facing Texte zentral testen.
- [ ] keine ungültigen oder planungsraumfremden Marker ausliefern.

**Abnahme:** Frontend benötigt keine eigene Prioritäts- oder Herkunftslogik.

## 9. Welle 3 – Denkraum-Oberfläche

Terra beginnt erst nach dem API-Handoff aus GW-140.

### GW-200 – Hauptansicht und visuelles System

**Owner:** Terra  
**Abhängigkeiten:** GW-140

- [ ] Dashboard-Layout durch ruhigen Denkraum ersetzen.
- [ ] Gespräch als ungefähr 75 Prozent der Aufmerksamkeit gestalten.
- [ ] Header: Produktname klein, Planungsraum groß und primär.
- [ ] `Source Serif 4` und Sans-Serif-Rollen verbindlich umsetzen.
- [ ] Off-White-, Petrol- und Salbei-Tokens sowie Ambient Shadows anwenden.
- [ ] reduzierte Shared-Table-Atmosphäre ohne detaillierte Avatare.
- [ ] Haupttabs aus dem Kopf entfernen.
- [ ] Navigation standardmäßig einklappen und teacher-facing beschriften.
- [ ] Pinnwand zurückgesetzt darstellen; bei Fokus und Öffnung lesbarer machen.
- [ ] genau eine „Jetzt wichtig“-Karte.
- [ ] Nachrichten als Papiernotizen ohne neue Kartenwand.
- [ ] Rollen- und Zeitmetadaten konsistent.
- [ ] flacher Composer mit eindeutigem Kontext-Anker.
- [ ] lineare Tastaturnavigation bereitstellen.
- [ ] Responsive Priorität umsetzen.
- [ ] Oberfläche funktioniert ohne Illustration.

**Tests:** Check, Build, Tastaturreihenfolge, 1280/980/Mobil, Navigation eingeklappt, Pinnwand-Fokus, Headerhierarchie, Illustration aus.

**Abnahme:** Der erste Blick vermittelt einen ruhigen gemeinsamen Denkraum.

### GW-205 – Marker, Filter und Papierübergänge

**Owner:** Terra  
**Abhängigkeiten:** GW-200, GW-140

- [ ] alle Markerarten anzeigen.
- [ ] Zielnavigation und Rücksprung umsetzen.
- [ ] Herkunftslabels bevorzugt als `Aus der Pinnwand`, `Im Gespräch aufgegriffen` oder `Bezug: …` formulieren.
- [ ] Filter `Alle`, `Festgehaltenes`, `Offene Entscheidungen`, `Vorbereitungen & Ergebnisse`.
- [ ] genügend Gesprächskontext im Filter.
- [ ] Zettelbewegung zur Pinnwand einmalig und nicht blockierend.
- [ ] DOM-Reihenfolge, Fokus und Scrollposition unverändert lassen.
- [ ] Reduced-Motion-Ersatz und abschaltbaren Ton.
- [ ] keine Belohnungsanimationen.
- [ ] Animation nach Reload nicht erneut abspielen.

**Tests:** Navigation, Rücksprung, Reload, Filter, Screenreader, Reduced Motion, Ton aus, Fokusstabilität.

### GW-210 – Häkchen und Stift

**Owner:** Terra  
**Abhängigkeiten:** GW-205

- [ ] maximal zwei Aktionen je entscheidbarer Karte.
- [ ] sichtbare Labels oder eindeutige Accessible Names.
- [ ] Häkchen ruft Accept unmittelbar auf.
- [ ] Stift setzt Focus Chip und fokussiert Eingabefeld.
- [ ] Doppelklick clientseitig sperren; Backend bleibt idempotent.
- [ ] keine alten Mehrschritt-Buttons und kein Bestätigungsmodal.
- [ ] Board bietet keinen zweiten Startfluss.

### GW-220 – Statusbar, Werkstatt und Board

**Owner:** Terra  
**Abhängigkeiten:** GW-210

- [ ] nach Start teacher-facing Bestätigung anzeigen.
- [ ] geschlossen nur eine flache einzeilige Statusbar.
- [ ] erst nach Klick Werkstatt und Planungsboard öffnen.
- [ ] geöffnete Ansicht zeigt Titel, Status, Anzahl und wenige Board-Karten.
- [ ] keine Worker-Namen, Provider oder technische Queue.
- [ ] subtile Aktivität nur bei realer Arbeit.
- [ ] SSE mit begrenztem Polling-Fallback.
- [ ] kein automatischer Fokus-, Scroll- oder Perspektivwechsel.
- [ ] Ergebnis wird neue AttentionCard.
- [ ] sichere Retry-Aktion nur nach Backend-Vertrag.
- [ ] mehrere Ergebnisse nicht als Kartenstapel.

**Abnahme:** Hintergrundarbeit bleibt sichtbar, ohne den Denkraum zu dominieren.

### GW-230 – Ergebnisprüfung

**Owner:** Terra  
**Abhängigkeiten:** GW-220

- [ ] Titel, Entstehungsgrund, Lernmomentbezug und Inhalt direkt in AttentionCard.
- [ ] lange Inhalte in derselben Karte aufklappbar.
- [ ] AutomaticCheck und Critical-Friend-Prüfung unterscheiden.
- [ ] Häkchen gibt direkt frei; Stift setzt Materialfokus.
- [ ] nach Freigabe kurz `Für den Unterricht bereit`.
- [ ] Materialbereich bleibt Sammlung und Nachweis.
- [ ] Ergebnis-Marker und Rücksprung funktionieren.

## 10. Welle 4 – Qualität und Real-Harness

### GW-300 – Gesamtregression

**Owner:** Orion  
**Abhängigkeiten:** GW-130, GW-230

Browser-E2E:

1. Chat → Vorschlag → ein Häkchen → queued,
2. währenddessen weiterchatten und Bereich öffnen,
3. Ergebnis erscheint ohne Navigation,
4. Inhalt prüfen → ein Häkchen → ready,
5. Reload in queued, in_progress und returned,
6. Stift setzt Fokus ohne Mutation,
7. Board-Drop startet nichts,
8. Marker → Ziel → Rücksprung,
9. Chatfilter,
10. Reduced Motion und Ton aus.

Zusätzlich:

- [ ] Klickbudget als Regression sichern.
- [ ] technische Codes und Sidecar nie im DOM.
- [ ] Accessibility für Fokus, Labels, `aria-live` und Kontrast.
- [ ] visuelle Regression für Header, Denkraum, eingeklappte Navigation, Pinnwand in Ruhe/Fokus, Statusbar, Marker und Ergebnisprüfung.
- [ ] Hauptbildschirm ohne Grafik testen.

**Tests:** `pnpm test`, `pnpm check`, `pnpm build`, Browser-E2E.

### GW-310 – Real-Harness-Smoke-Test

**Owner:** Orion  
**Abhängigkeiten:** GW-300

- [ ] lokalen Harness-Modus ohne Commit von `.env`-Werten starten.
- [ ] `/health` prüfen.
- [ ] ausschließlich synthetischen Planungsraum verwenden.
- [ ] echten Vorschlag erzeugen; kein Sidecar sichtbar.
- [ ] Accept kehrt sofort zurück, Harness arbeitet im Hintergrund.
- [ ] währenddessen weiterchatten und Bereiche öffnen.
- [ ] Ergebnis, AttentionCard, Marker, Materialbezug und Freigabe prüfen.
- [ ] Timeout, Fehler und Neustart kontrolliert testen.
- [ ] keine Secrets oder vollständigen Prompts dokumentieren.

### GW-320 – Dokumentation und Abschluss

**Owner:** Koordinator  
**Abhängigkeiten:** GW-310

- [ ] `REFACTOR-UX.md` und `UI_SPEC.md` gegen Implementierung prüfen.
- [ ] Workflow- und Harness-Dokumentation aktualisieren.
- [ ] veraltete Dashboard-, Tab- und Mehrschritt-Beschreibungen entfernen.
- [ ] `TASKS.md` erst nach vollständiger Abnahme aktualisieren.
- [ ] Abschlussbericht mit Migration, Tests, UX-Abnahme und Einschränkungen.

## 11. Globale Definition of Done

- [ ] aktueller Planungsraum ist im Header primär.
- [ ] Gespräch ist visueller und funktionaler Mittelpunkt.
- [ ] Navigation ist diskret, eingeklappt und teacher-facing.
- [ ] Pinnwand ist zurückgesetzt, aber interaktiv erkennbar.
- [ ] „Jetzt wichtig“ zeigt höchstens eine Karte.
- [ ] erstes Häkchen startet atomar die Hintergrundarbeit.
- [ ] Statusbar beansprucht geschlossen höchstens eine Zeile.
- [ ] Ergebnis erscheint direkt zur Prüfung.
- [ ] zweites Häkchen gibt fachlich frei.
- [ ] Stift führt in den bestehenden fokussierten Chat.
- [ ] Herkunft ist über Marker bidirektional nachvollziehbar.
- [ ] Papiernotizen bilden keine neue Kartenwand.
- [ ] Board ist Übersicht, kein konkurrierender Workflow.
- [ ] Animationen verändern weder Fokus noch Arbeitsfluss.
- [ ] Reduced Motion, Ton aus und Tastaturbedienung funktionieren.
- [ ] keine technischen Interna oder personenbezogenen Daten in UI und Tests.
- [ ] Reload, Neustart und Retry erzeugen keine Doppelaufträge.
- [ ] Mock-, E2E-, Build-, Accessibility-, visuelle und Real-Harness-Tests sind erfolgreich.

## 12. Startaufträge

### Luna

```text
Lies alle verbindlichen Dokumente. Bearbeite zuerst GW-100. Ändere keine UI.
Liefere einen Handoff mit Dateien, Tests, Einschränkungen und Freigabe für GW-120.
```

### Nova

```text
Bearbeite GW-110 und bei getrennten Dateien GW-115. Proposal und Marker bleiben
App-Verträge. Verhindere Sidecar-, Pfad-, Secret- und planungsraumfremde Leaks.
```

### Terra

```text
Beginne erst nach GW-140. Bearbeite GW-200, GW-205, GW-210, GW-220 und GW-230
in dieser Reihenfolge. Erzeuge keine eigene Prioritätslogik und keinen zweiten
Workflow. Halte die Referenz „Quietude & Thought“ und alle Accessibility-Regeln ein.
```

### Orion

```text
Beginne nach GW-230. Bearbeite GW-300 und GW-310. Belege Klickbudget, Marker,
Reload, Idempotenz, Hintergrundfeedback, Reduced Motion und Freigabe mit Tests.
```
