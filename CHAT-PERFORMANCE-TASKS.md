# CHAT-PERFORMANCE-TASKS.md

# Chat Performance Roadmap

**Projekt:** ptspace-app
**Status:** Draft
**Priorität:** Hoch

---

# Ziel

Die Antwortzeiten des Pedagogical Thinking Space sollen deutlich reduziert werden, ohne die Qualität der pädagogischen Begleitung zu verschlechtern.

Dabei gilt:

* kein Verlust des pädagogischen Denkstandes
* kein Verlust der Nachvollziehbarkeit
* keine Abhängigkeit von einer bestimmten LLM-API
* Kernel bleibt die fachliche Wahrheit
* Workspace bleibt die persistente Wahrheit

---

# Performance-Ziele

## Zielwerte

Erste sichtbare Reaktion

* < 500 ms

Erstes Token

* < 2 s

Normale Antwort

* 3–8 s

Große Denkoperation

* 10–20 s

---

# TASK 1 – Instrumentierung

## Ziel

Messbar machen, wo Zeit verloren geht.

## Implementieren

Backend-Timer für

* Request angekommen
* Conversation geladen
* Summary geladen
* Workspace gelesen
* Harness gestartet
* Docker gestartet
* Modell antwortet
* erstes Token
* letztes Token
* Workspace gespeichert
* Git gespeichert
* Response beendet

## Ergebnis

Performance-Log z.B.

```text
Conversation Summary      14 ms
Workspace Read            21 ms
Docker Startup          1800 ms
Model First Token       2200 ms
Generation              3400 ms
Git Save                 120 ms
Total                   7600 ms
```

---

# TASK 2 – Streaming

## Problem

Momentan wartet das Backend auf die komplette Antwort.

## Ziel

Streaming über

* Server Sent Events

oder

* WebSockets

Frontend soll

* Thinking anzeigen
* erstes Token sofort darstellen
* Antwort live erweitern

Erwartete Verbesserung

Subjektive Wartezeit halbiert.

---

# TASK 3 – Conversation Compression

## Problem

Momentan wird der komplette Chat erneut übertragen.

## Ziel

Conversation in zwei Ebenen trennen.

### Kurzzeitgedächtnis

letzte

* 4–8 Nachrichten

werden vollständig übertragen.

### Langzeitgedächtnis

conversation-summary.md

enthält

* Ziele
* Entscheidungen
* Dissens
* offene Fragen
* wichtige Erkenntnisse
* aktueller Fokus

Der Summary wird regelmäßig aktualisiert.

Nicht jede Nachricht.

---

# TASK 4 – Incremental Summary

Der Summary darf nicht nach jeder Nachricht komplett neu entstehen.

Strategie

z.B. alle

* 10 Nachrichten

oder

* wenn > 3000 Tokens

oder

* wenn wichtige Entscheidung getroffen wurde.

---

# TASK 5 – Workspace Context reduzieren

Momentan wird learning-design.md komplett in den Prompt eingefügt.

Stattdessen

LLM liest Dateien selbst.

Prompt enthält nur

* relevante Dateinamen
* aktuelle Arbeitsfrage
* Zusammenfassung

Nur wenn notwendig:

Dateiinhalte inline einfügen.

---

# TASK 6 – Kernel Prompt Cache

Der Kernel ist nahezu statisch.

Einführung eines Kernel Hash.

Wenn Kernel unverändert

kein erneutes Zusammenbauen des Prompts.

Optional

Prompt Prefix Cache.

---

# TASK 7 – Persistente Harness Sessions

Momentan

jede Nachricht

```
docker run ...
```

Neu

SessionManager

```
Planning Space
      │
      ▼
Harness Session
      │
      ▼
LLM Session
```

Session enthält

* Session ID
* letzter Zugriff
* Provider Session
* Workspace

Automatisches Timeout

z.B.

30 Minuten Inaktivität.

---

# TASK 8 – Docker Pool

Falls Docker weiter genutzt wird.

Nicht

```
docker run
docker rm
```

für jede Nachricht.

Sondern

Container Pool

oder

ein langlebiger Container.

---

# TASK 9 – Workspace Snapshot Optimierung

Momentan

kompletter Snapshot

vorher

nachher

Neu

Hash

oder

Git Diff

oder

mtime

Nur geänderte Dateien prüfen.

---

# TASK 10 – Availability Cache

checkAvailability()

wird mehrfach ausgeführt.

Einführen

TTL Cache

30–60 Sekunden.

---

# TASK 11 – Lazy Loading

Nicht sofort laden

* Learning Design
* Decisions
* Open Questions
* Materialien

Nur wenn sie im Prompt benötigt werden.

---

# TASK 12 – Prompt Builder

Neuer Prompt Builder

Aufbau

```
Kernel

↓

Conversation Summary

↓

Recent Messages

↓

Current Focus

↓

Current Question
```

Nicht

```
Alles
```

---

# TASK 13 – Context Budget

Einführung eines Token Budgets.

Beispiel

Kernel

20 %

Summary

20 %

Recent Messages

20 %

Workspace

30 %

Reserve

10 %

Falls Budget überschritten

automatisch komprimieren.

---

# TASK 14 – Background Jobs

Nicht blockierend

* Git Commit
* Export
* Proposal Scan
* Knowledge Scan

Antwort zuerst.

Nebenarbeiten danach.

---

# TASK 15 – Prompt Profiling

Im Dev Mode anzeigen

* Promptgröße
* Kernelgröße
* Workspacegröße
* Summarygröße
* Chatgröße
* geschätzte Tokens

---

# TASK 16 – Response API Adapter

Falls Provider unterstützt

OpenAI Responses API

Claude Conversations

Gemini Sessions

OpenRouter Conversation

Adapter abstrahieren.

Nicht fest einkoppeln.

Interface

```ts
ConversationBackend
```

mit

* create()

* append()

* summarize()

* close()

---

# TASK 17 – Session Recovery

Wenn Session verloren geht

rekonstruiere sie aus

* Conversation Summary
* Recent Messages
* Workspace

Keine Information darf ausschließlich in einer Runtime Session existieren.

Workspace bleibt Single Source of Truth.

---

# TASK 18 – Performance Dashboard

Dev Dashboard

anzeigen

* Antwortzeit
* Dockerzeit
* Modellzeit
* Promptgröße
* Token
* Streaming
* Cache Hit
* Cache Miss

---

# TASK 19 – Benchmarks

Referenzszenarien

* neuer Chat
* 20 Nachrichten
* 100 Nachrichten
* großes Learning Design
* viele Materialien

Messwerte automatisch vergleichen.

Regressionen erkennen.

---

# TASK 20 – Architekturprinzipien

## Der Workspace ist Wahrheit.

Nicht die Runtime.

---

## Sessions sind Cache.

Nicht Datenhaltung.

---

## Conversation Summary ist komprimiertes Gedächtnis.

Nicht der komplette Chat.

---

## Kernel ist statisch.

Nicht pro Nachricht neu erzeugen.

---

## Nur relevante Informationen gelangen in den Prompt.

Nicht alle Informationen.

---

# Priorisierung

## Phase 1 (Quick Wins)

* Performance Instrumentierung
* Streaming
* Availability Cache
* Snapshot Optimierung
* Prompt Profiling

---

## Phase 2

* Conversation Compression
* Incremental Summary
* Prompt Builder
* Context Budget

---

## Phase 3

* Persistente Harness Sessions
* Docker Pool
* Provider Session Adapter

---

## Phase 4

* Performance Dashboard
* automatische Benchmarks
* Optimierungen anhand realer Nutzungsdaten

---

# Erfolgskriterien

Nach Umsetzung soll der Pedagogical Thinking Space

* schneller reagieren,
* weniger Kontext übertragen,
* Streaming unterstützen,
* beliebig lange Gespräche führen können,
* den pädagogischen Denkstand vollständig erhalten,
* und dabei framework- sowie providerunabhängig bleiben.
