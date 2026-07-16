# ARCHITECTURE-SESSION-MODEL.md

# Session-, Kontext- und Memory-Architektur

**Projekt:** Pedagogical Thinking Space / ptspace-app  
**Status:** Draft  
**Zweck:** Technische Zielarchitektur für schnelle, persistente und rekonstruierbare Chat-Gespräche

---

## 1. Zielbild

Der Chat im Pedagogical Thinking Space soll sich für Lehrkräfte wie ein fortlaufendes Gespräch anfühlen, technisch aber robust, rekonstruierbar und providerunabhängig bleiben.

Die Architektur trennt deshalb klar zwischen:

- dauerhafter fachlicher Wahrheit,
- komprimiertem Gesprächsgedächtnis,
- kurzfristigem Gesprächskontext,
- flüchtigen Runtime-Sessions,
- statischem Kernel-Kontext.

Die zentrale Regel lautet:

> Runtime-Sessions beschleunigen das Gespräch, dürfen aber niemals die einzige Quelle relevanter Informationen sein.

---

## 2. Architekturprinzipien

### 2.1 Workspace bleibt Single Source of Truth

Der Workspace enthält den dauerhaft gültigen pädagogischen Denkstand.

Dazu gehören insbesondere:

- `learning-design.md`
- `decisions.md`
- `open-questions.md`
- `next-steps.md`
- freigegebene Entwürfe
- Service Requests
- Knowledge Proposals

Eine Runtime-Session darf Informationen zwischenspeichern, aber nicht dauerhaft exklusiv besitzen.

### 2.2 Conversation Summary ist komprimiertes Gedächtnis

Die Conversation Summary enthält nicht den vollständigen Wortlaut des Chats, sondern die pädagogisch relevanten Ergebnisse des bisherigen Gesprächs.

Sie speichert insbesondere:

- pädagogische Intention
- Zielgruppe und Kontext
- bereits getroffene Entscheidungen
- Begründungen
- Dissens und Spannungen
- offene Fragen
- aktuelle Denkbewegung
- vereinbarte nächste Schritte

### 2.3 Recent Messages bilden das Kurzzeitgedächtnis

Nur die letzten relevanten Nachrichten werden wörtlich in den aktuellen Prompt übernommen.

Standard:

- letzte 4 bis 8 Nachrichten
- zusätzlich die aktuelle Nachricht
- optional eine thematisch relevante ältere Nachricht

### 2.4 Runtime-Sessions sind Cache

Eine Runtime-Session dient dazu:

- Provider-Kontext wiederzuverwenden
- Kernel-Präfixe nicht erneut zu senden
- Antwortlatenz zu senken
- Streaming zu ermöglichen

Sie ist nicht die dauerhafte Datenhaltung.

### 2.5 Der Kernel ist weitgehend statisch

Der pädagogische Kernel wird versioniert und über einen Hash identifiziert.

Beispiel:

```text
kernelVersion: 2026-07-16
kernelHash: sha256:...
```

Wenn sich der Kernel nicht geändert hat, soll ein Provider- oder Runtime-Cache genutzt werden.

---

## 3. Logische Architektur

```text
┌──────────────────────────────────────────────┐
│ Frontend                                     │
│ Chat, Fokus, Streaming, Status               │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Conversation API                             │
│ Request Validation, Auth, Streaming Endpoint │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Conversation Orchestrator                    │
│ Session, Context, Budget, Recovery            │
└──────────────┬───────────────┬───────────────┘
               │               │
               ▼               ▼
┌──────────────────────┐ ┌─────────────────────┐
│ Session Manager      │ │ Context Builder     │
│ Runtime Sessions     │ │ Prompt Composition  │
└──────────┬───────────┘ └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌──────────────────────┐ ┌─────────────────────┐
│ Provider Adapter     │ │ Memory Store        │
│ OpenCode / API / LLM │ │ Summary / Messages  │
└──────────┬───────────┘ └──────────┬──────────┘
           │                        │
           └────────────┬───────────┘
                        ▼
             ┌──────────────────────┐
             │ Workspace Manager    │
             │ Pädagogischer Stand  │
             └──────────────────────┘
```

---

## 4. Datenmodell

### 4.1 Persistente Conversation

```ts
export type ConversationRecord = {
  planningSpaceId: string;
  createdAt: string;
  updatedAt: string;
  summaryVersion: number;
  lastSummarizedMessageId?: string;
  activeRuntimeSessionId?: string;
};
```

### 4.2 Conversation Message

```ts
export type ConversationMessage = {
  id: string;
  planningSpaceId: string;
  author: "teacher" | "critical_friend" | "system";
  text: string;
  createdAt: string;
  tokenEstimate?: number;
  significance?: "normal" | "decision" | "dissent" | "question" | "state_change";
};
```

### 4.3 Conversation Summary

```ts
export type ConversationSummary = {
  planningSpaceId: string;
  version: number;
  generatedAt: string;
  basedOnMessageIds: string[];
  pedagogicalIntent?: string;
  learnerContext?: string;
  decisions: string[];
  rationales: string[];
  tensions: string[];
  openQuestions: string[];
  currentFocus?: string;
  nextStep?: string;
  compactNarrative: string;
};
```

### 4.4 Runtime Session

```ts
export type RuntimeSession = {
  id: string;
  planningSpaceId: string;
  provider: string;
  providerSessionId?: string;
  processId?: number;
  containerId?: string;
  kernelHash: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  status: "starting" | "ready" | "busy" | "expired" | "failed";
};
```

### 4.5 Context Package

```ts
export type ContextPackage = {
  kernelReference: {
    version: string;
    hash: string;
  };
  conversationSummary: ConversationSummary;
  recentMessages: ConversationMessage[];
  workspaceContext: WorkspaceContextItem[];
  currentFocus?: {
    kind: string;
    id: string;
    label: string;
  };
  currentMessage: string;
  estimatedTokens: number;
};
```

---

## 5. Kontextschichten

Der Context Builder erzeugt den Modellkontext in dieser Reihenfolge:

```text
1. Kernel / System Instructions
2. Rollen- und Sicherheitsregeln
3. Conversation Summary
4. Relevanter Workspace-Kontext
5. Recent Messages
6. Aktueller Fokus
7. Aktuelle Nachricht
```

### 5.1 Kernel-Kontext

Der Kernel wird nicht vollständig in jede User-Nachricht kopiert.

Mögliche Strategien:

- Provider Prompt Cache
- langlebige Runtime-Session
- gemountete Kernel-Dateien mit einmaliger Initialisierung
- versioniertes statisches System-Prompt-Präfix

### 5.2 Workspace-Kontext

Nicht automatisch alle Projektdateien einfügen.

Stattdessen:

- `learning-design.md`: nur relevante Abschnitte
- `decisions.md`: aktuelle Entscheidungen
- `open-questions.md`: offene Fragen
- `next-steps.md`: letzter nächster Schritt

Materialien und Entwürfe werden nur bei konkretem Bezug geladen.

### 5.3 Conversation Summary

Die Summary darf nicht den Wortlaut des Gesprächs duplizieren.

Sie soll kompakt, strukturiert und entscheidungsorientiert sein.

### 5.4 Recent Messages

Standardbudget:

```text
maxRecentMessages: 8
maxRecentMessageTokens: 2500
```

Bei Überschreitung werden ältere Nachrichten aus dem Kurzzeitkontext entfernt, nachdem sie in die Summary eingeflossen sind.

---

## 6. Context Budget

Jeder Modellaufruf erhält ein explizites Tokenbudget.

Beispiel:

```ts
export type ContextBudget = {
  totalTokens: number;
  kernelTokens: number;
  summaryTokens: number;
  workspaceTokens: number;
  recentMessagesTokens: number;
  responseReserveTokens: number;
};
```

Empfohlene Verteilung:

| Bereich | Anteil |
|---|---:|
| Kernel und Rollenregeln | 20 % |
| Conversation Summary | 15 % |
| Workspace-Kontext | 25 % |
| Recent Messages | 20 % |
| aktuelle Nachricht | 5 % |
| Antwortreserve | 15 % |

Priorität bei Kürzung:

1. redundante Workspace-Auszüge entfernen
2. ältere Recent Messages entfernen
3. Summary verdichten
4. niemals aktuelle Nachricht oder Sicherheitsregeln kürzen

---

## 7. Ablauf eines normalen Chat-Turns

```text
Lehrkraft sendet Nachricht
        │
        ▼
Nachricht validieren und speichern
        │
        ▼
aktive Runtime-Session suchen
        │
        ├── vorhanden und gültig ──► wiederverwenden
        │
        └── fehlt/abgelaufen ──────► neue Session aufbauen
        │
        ▼
Context Builder erzeugt Kontextpaket
        │
        ▼
Tokenbudget prüfen
        │
        ├── innerhalb Budget ──────► fortfahren
        │
        └── zu groß ───────────────► komprimieren
        │
        ▼
Provider-Aufruf mit Streaming
        │
        ▼
Tokens an Frontend weiterreichen
        │
        ▼
Antwort speichern
        │
        ▼
Workspace-Änderungen prüfen
        │
        ▼
Summary bei Bedarf aktualisieren
        │
        ▼
Session lastUsedAt aktualisieren
```

---

## 8. Session Manager

Der Session Manager verwaltet flüchtige Runtime-Sessions.

### Verantwortlichkeiten

- Session pro Planungsraum finden
- Session erstellen
- Session wiederverwenden
- Session-Zustand prüfen
- Timeout verwalten
- verlorene Sessions erkennen
- Recovery auslösen
- Sessions sauber schließen

### Session-Key

```text
planningSpaceId + provider + model + kernelHash
```

Ändert sich einer dieser Werte, muss eine neue Runtime-Session erzeugt werden.

### Timeout

Empfehlung:

```text
idleTimeout: 30 Minuten
absoluteTimeout: 4 Stunden
```

### Parallelität

Pro Planungsraum darf standardmäßig nur ein schreibender Chat-Turn gleichzeitig laufen.

Weitere Nachrichten:

- werden kurz in eine Queue gestellt
- oder erhalten einen verständlichen Busy-Status

---

## 9. Provider- und Harness-Abstraktion

```ts
export interface ConversationBackend {
  createSession(input: CreateSessionInput): Promise<RuntimeSession>;
  sendMessage(
    input: SendConversationMessageInput
  ): AsyncIterable<ConversationEvent>;
  closeSession(session: RuntimeSession): Promise<void>;
  checkSession(session: RuntimeSession): Promise<SessionHealth>;
}
```

### Conversation Events

```ts
export type ConversationEvent =
  | { type: "status"; status: string }
  | { type: "token"; text: string }
  | { type: "message_complete"; text: string }
  | { type: "workspace_update"; relativePath: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "error"; message: string };
```

Adapter können implementiert werden für:

- langlebigen OpenCode-Prozess
- OpenAI Responses API
- OpenRouter
- lokale OpenAI-kompatible APIs
- andere Provider mit Conversation- oder Thread-Unterstützung

---

## 10. Streaming

Das Backend soll Server-Sent Events oder WebSockets verwenden.

Empfohlene SSE-Events:

```text
event: status
data: {"status":"preparing_context"}

event: status
data: {"status":"thinking"}

event: token
data: {"text":"Der"}

event: token
data: {"text":" entscheidende"}

event: complete
data: {"messageId":"..."}
```

Das Frontend zeigt:

- Kontext wird vorbereitet
- Critical Friend denkt
- laufende Antwort
- Denkstand wird gesichert
- Antwort abgeschlossen

Technische Detailereignisse wie Docker, Provider oder Dateipfade werden nicht lehrkraftseitig angezeigt.

---

## 11. Conversation Compression

### Auslöser

Eine Summary-Aktualisierung wird ausgelöst, wenn mindestens eine Bedingung erfüllt ist:

- mehr als 8 nicht zusammengefasste Nachrichten
- mehr als 3000 nicht zusammengefasste Tokens
- neue pädagogische Entscheidung
- expliziter Dissens
- Wechsel des Gesprächsfokus
- Runtime-Session wird beendet
- Planungsraum wird längere Zeit verlassen

### Summary-Update

Die Aktualisierung erfolgt inkrementell:

```text
bestehende Summary
+ neue, noch nicht verdichtete Nachrichten
= neue Summary-Version
```

Nicht jedes Mal wird der gesamte Chat erneut zusammengefasst.

### Qualitätsregel

Eine Summary darf keine neue pädagogische Entscheidung erfinden.

Sie darf nur festhalten:

- ausdrücklich Gesagtes
- nachvollziehbar Beschlossenes
- klar markierte offene Fragen

---

## 12. Session Recovery

Eine Runtime-Session kann verloren gehen durch:

- Serverneustart
- Containerende
- Provider-Timeout
- Netzwerkfehler
- Deployment
- Sessionablauf

Recovery verwendet:

```text
Kernel-Version
+ Conversation Summary
+ letzte Nachrichten
+ relevanter Workspace-Stand
```

Ablauf:

```text
Session nicht erreichbar
        │
        ▼
Session als expired markieren
        │
        ▼
neue Session erzeugen
        │
        ▼
kompakten Recovery-Kontext senden
        │
        ▼
Gespräch fortsetzen
```

Die Lehrkraft soll den technischen Sessionverlust normalerweise nicht bemerken.

---

## 13. Workspace-Änderungserkennung

Vollständige Dateisnapshots vor und nach jedem Turn sollen ersetzt werden.

Bevorzugte Reihenfolge:

1. explizite Tool-Events der Runtime
2. `git status --porcelain`
3. mtime- und Größenvergleich
4. Hash nur für tatsächlich verdächtige Dateien

Binärdateien dürfen nicht vollständig als UTF-8 eingelesen werden.

---

## 14. Git-Versionierung

Git-Sicherung darf die sichtbare Antwort nicht unnötig blockieren.

Zielablauf:

```text
Antwort vollständig erzeugt
        │
        ├── Antwort sofort an Frontend abschließen
        │
        └── Workspace-Versionierung anschließend ausführen
```

Wichtig:

- fachlich relevante Dateiänderungen müssen zuverlässig gespeichert sein
- der Git-Commit darf asynchron innerhalb desselben Backend-Prozesses erfolgen
- Fehler müssen protokolliert und erneut versuchbar sein
- die UI darf keinen erfolgreichen Commit behaupten, bevor er erfolgt ist

---

## 15. Caching

### Availability Cache

```text
TTL: 30 bis 60 Sekunden
```

### Kernel Cache

Schlüssel:

```text
kernelHash + provider + model
```

### Workspace Context Cache

Nur für unveränderte Dateien.

Schlüssel:

```text
planningSpaceId + filePath + fileHash
```

### Token Estimate Cache

Tokenabschätzungen für unveränderte Texte wiederverwenden.

---

## 16. Performance-Metriken

Pro Chat-Turn erfassen:

```ts
export type ConversationMetrics = {
  requestStartedAt: string;
  contextBuildMs: number;
  sessionLookupMs: number;
  sessionStartupMs: number;
  firstTokenMs?: number;
  generationMs: number;
  persistenceMs: number;
  gitMs?: number;
  totalMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheHits: string[];
  cacheMisses: string[];
};
```

Wichtige Kennzahlen:

- Time to First Status
- Time to First Token
- Time to Complete
- Session Reuse Rate
- Kernel Cache Hit Rate
- durchschnittliche Promptgröße
- Summary-Kompressionsrate
- Recovery Rate
- Fehlerquote

---

## 17. Zielwerte

### Entwicklungsumgebung

| Kennzahl | Ziel |
|---|---:|
| erste Statusreaktion | < 500 ms |
| erstes Token bei warmer Session | < 2 s |
| erstes Token bei kalter Session | < 5 s |
| normale Antwort vollständig | < 10 s |
| Session-Wiederverwendung | > 80 % |
| vollständige Chatübertragung | 0 % |

Die tatsächlichen Werte hängen von Modell, Provider, Hardware und Netzwerk ab.

---

## 18. Migrationspfad

### Phase 1 – Transparenz und Quick Wins

- Performance-Metriken ergänzen
- doppelte Availability-Prüfung entfernen
- Availability Cache einführen
- Recent Messages begrenzen
- echte Conversation Summary einführen
- Promptgröße protokollieren

### Phase 2 – Streaming und Context Builder

- SSE-Endpunkt ergänzen
- Event-basiertes Harness-Interface einführen
- zentralen Context Builder implementieren
- Tokenbudget implementieren
- Workspace-Kontext selektiv laden

### Phase 3 – Persistente Sessions

- Session Manager implementieren
- RuntimeSession persistierbar machen
- langlebigen lokalen OpenCode-Prozess oder Provider-Session anbinden
- Session Timeout und Recovery implementieren

### Phase 4 – Optimierung

- Kernel Prompt Cache
- Workspace Context Cache
- Git- und Snapshot-Optimierung
- Performance Dashboard
- automatisierte Regression-Benchmarks

---

## 19. Akzeptanzkriterien

Die Architektur gilt als umgesetzt, wenn:

- nicht mehr der vollständige Chat bei jedem Turn übertragen wird
- ältere Nachrichten zuverlässig in einer Summary verdichtet werden
- der letzte Gesprächskontext erhalten bleibt
- Runtime-Sessions wiederverwendet werden können
- ein Sessionverlust transparent rekonstruierbar ist
- Antworten gestreamt werden
- Workspace und Entscheidungen dauerhaft erhalten bleiben
- Provider gewechselt werden können
- Performance-Metriken automatisiert erfasst werden
- lange Gespräche nicht linear langsamer werden

---

## 20. Nicht-Ziele

Diese Architektur soll nicht:

- den Workspace durch eine reine Chat-Historie ersetzen
- pädagogische Entscheidungen automatisch erfinden
- alle Projektdateien in jeden Prompt laden
- dauerhaft an OpenCode oder einen einzelnen Provider binden
- technische Runtime-Details in der Lehrkraft-Oberfläche anzeigen

---

## 21. Empfohlene neue Module

```text
backend/src/services/conversation/
├── ConversationOrchestrator.ts
├── ContextBuilder.ts
├── ContextBudget.ts
├── ConversationCompressor.ts
├── SessionManager.ts
├── SessionRecovery.ts
├── ConversationMetrics.ts
└── ConversationBackend.ts
```

Ergänzend:

```text
backend/src/storage/
├── ConversationStore.ts
├── ConversationSummaryStore.ts
└── RuntimeSessionStore.ts
```

---

## 22. Leitentscheidung

Die Architektur verbindet zwei Anforderungen:

1. Das Gespräch muss schnell und kontinuierlich wirken.
2. Der pädagogische Denkstand muss unabhängig von jeder Runtime dauerhaft erhalten bleiben.

Daraus folgt:

> Der Workspace bewahrt die Wahrheit, die Summary bewahrt den Gesprächssinn, und die Session beschleunigt den nächsten Schritt.
