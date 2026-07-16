# REFACTOR-GOAL.md

# Ziel des Refactorings

Dieses Refactoring bringt den pädagogischen Kernel `pedagogical-thinking-space` und die optionale GUI `ptspace-app` in eine eindeutige, verlustfreie und testbare Beziehung.

Der Kernel ist die alleinige fachliche Quelle.

Die App darf keine eigenständige pädagogische Semantik erfinden. Sie liest, visualisiert und bearbeitet ausschließlich Artefakte und Regeln, die aus dem Kernel abgeleitet sind.

---

## 1. Grundarchitektur

```text
pedagogical-thinking-space
= pädagogischer Kernel
= fachliche Verträge, Schemas, Regeln und kanonische Artefakte

ptspace-app
= optionale GUI
= lehrkräftefreundliche Projektion des Kernels
```

Die App muss optional bleiben.

Alle Planungsräume müssen auch ohne App als dateibasierter Kernel-Workspace verständlich, bearbeitbar und ausführbar sein.

---

## 2. Gemeinsames pädagogisches Modell

Ein Planungsraum besteht aus klar getrennten Ebenen:

```text
Gespräch
→ exploratives gemeinsames Denken mit dem Critical Friend

Learning Design / gemeinsamer Denkstand
→ verdichtetes pädagogisches Verständnis

Lernlandschaft
→ didaktische Struktur aus Sicht der Lernenden

Zeit & Dramaturgie
→ zeitliche Realisierung der Lernlandschaft

Planungsboard
→ noch zu klärende oder auszuführende Arbeit

Materialien
→ geprüfte Ergebnisse dieser Arbeit
```

Diese Ebenen dürfen nicht stillschweigend miteinander vermischt werden.

---

## 3. Fachliche Begriffe

### 3.1 Learning Design

Das Learning Design ist das übergeordnete pädagogische Verständnis.

Es enthält unter anderem:

- Kontext
- Zielgruppe
- pädagogische Intention
- Lernreise
- begründete Entscheidungen
- offene Fragen
- Reflexion

Das Learning Design ist kein Stundenverlaufsplan und kein Material.

### 3.2 Lernmoment

Ein Lernmoment ist ein pädagogisch bedeutsamer Abschnitt der Lernreise.

Ein Lernmoment beantwortet:

- Welche didaktische Funktion hat dieser Moment?
- Was tun die Lernenden?
- Was sollen sie dabei erfahren, verstehen oder bemerken?
- Welche offenen Fragen bestehen?
- Welcher Materialbedarf ist erkennbar?

Ein Lernmoment ist nicht automatisch eine Unterrichtsstunde.

### 3.3 Lernaktivität

Eine Lernaktivität beschreibt, was Lernende innerhalb eines Lernmoments konkret tun.

Beispiel:

```text
Lernmoment:
Eigene Position sichtbar machen

Lernaktivität:
Die Lernenden positionieren sich auf einer Raumlinie und begründen ihre Wahl.
```

Für die erste Version ist die bevorzugte Lernaktivität Bestandteil des Lernmoments.

Es wird zunächst kein eigenständiger globaler Aktivitäten-Pool eingeführt.

### 3.4 Übergang

Ein Übergang verbindet zwei Lernmomente.

Ein Übergang beschreibt:

- gemeinsamer Weg
- Wahl
- paralleler Weg
- Rückkehr
- Treffpunkt
- Voraussetzung

Ein Übergang ist kein Lernmoment.

Ein Übergang besitzt keine vollständige eigenständige Lernaktivität und kein eigenes Materialset.

Wenn zwischen zwei Lernmomenten pädagogisch etwas fehlt, kann aus der Prüfung eines Übergangs ein neuer Lernmoment vorgeschlagen werden.

### 3.5 Materialbedarf

Ein Materialbedarf kann innerhalb eines Lernmoments beschrieben werden.

Beispiele:

- Thesenkarten
- Bildimpuls
- Arbeitsauftrag
- Quellenübersicht
- Reflexionsbogen

Ein Materialbedarf ist noch kein fertiges Material.

### 3.6 Planungsboard-Karte

Eine Planungsboard-Karte beschreibt ein Arbeitsvorhaben.

Beispiele:

- Lernanliegen klären
- Lehrplanbezug recherchieren
- Arbeitsauftrag entwerfen
- Quellen prüfen
- Material fachlich freigeben

Eine Planungsboard-Karte ist keine Lernaktivität und kein Material.

### 3.7 Material

Ein Material ist ein fachlich überprüfbares Ergebnis eines Arbeitsvorhabens.

Materialien entstehen durch:

```text
Materialbedarf
→ Planungsboard-Karte
→ ausdrückliche Freigabe
→ Worker-Auftrag
→ Entwurf
→ gemeinsame Prüfung
→ fachliche Freigabe
```

### 3.8 Unterrichtsfenster

Ein Unterrichtsfenster ist eine reale zeitliche Einheit.

Erlaubte Typen:

- Unterrichtsstunde
- Doppelstunde
- Projektblock
- offene Lernzeit

### 3.9 Zeitliche Platzierung

Eine zeitliche Platzierung ordnet einen bestehenden Lernmoment einem Unterrichtsfenster zu.

Dabei wird der Lernmoment weder kopiert noch verändert.

Ein Lernmoment kann:

- keinem Unterrichtsfenster,
- einem Unterrichtsfenster,
- mehreren Unterrichtsfenstern

zugeordnet sein.

---

## 4. Kanonische Kernel-Artefakte

Der Kernel definiert mindestens:

```text
workspace/<project-slug>/
  learning-design.md
  learning-landscape.md
  temporal-plan.yml
  planning-board.yml
  decisions.yml
  materials/
  drafts/
  service-requests/
```

### 4.1 `learning-design.md`

Übergeordnetes pädagogisches Verständnis.

### 4.2 `learning-landscape.md`

Kanonische didaktische Topologie.

Enthält:

- Lernmomente
- Lernaktivitäten innerhalb der Lernmomente
- erwartete Lernerfahrungen
- Materialbedarfe oder Materialreferenzen
- Übergänge

### 4.3 `temporal-plan.yml`

Kanonische zeitliche Realisierung der Lernlandschaft.

Enthält:

- Unterrichtsfenster
- Zeitdauer
- Platzierungen
- Reihenfolge
- dramaturgische Rolle
- Parallelität oder Wahl
- Puffer und Hinweise

Zeitdaten dürfen nicht ausschließlich in der App gespeichert werden.

### 4.4 `planning-board.yml`

Kanonische Arbeitsvorhaben.

### 4.5 `decisions.yml`

Begründete pädagogische Entscheidungen.

### 4.6 `materials/` und `drafts/`

Materialentwürfe und freigegebene Materialien mit Referenzen auf:

- Lernmomente
- Unterrichtsfenster
- Planungsboard-Karten
- Entscheidungen

---

## 5. Zielmodell für die Lernlandschaft

Ein Lernmoment besitzt mindestens:

```yaml
id: lm-positionierung
title: Eigene Position sichtbar machen
kind: positioning
didactic_purpose: Vorverständnisse und Spannungen sichtbar machen
learning_activity: Die Lernenden positionieren sich und begründen ihre Wahl.
expected_experience: Die Lernenden bemerken plausible Unterschiede und eigene Unsicherheit.
material_needs:
  - Thesenkarten
  - Begründungsimpulse
material_ids: []
open_questions: []
status: draft
```

Ein Übergang besitzt mindestens:

```yaml
id: tr-positionierung-vertiefung
from: lm-positionierung
to: lm-vertiefung
kind: choice
rationale: Die Lernenden wählen eine Perspektive zur Vertiefung.
```

---

## 6. Zielmodell für Zeit & Dramaturgie

`temporal-plan.yml` verwendet ein eigenes Schema.

Beispiel:

```yaml
schema: ptspace.temporal-plan/v1
title: Standardplanung
landscape: learning-landscape.md

windows:
  - id: tw-01
    title: Stunde 1 – Irritation und Positionierung
    kind: lesson
    duration_minutes: 45

placements:
  - id: tp-01
    moment_id: lm-impuls
    window_id: tw-01
    start_minute: 0
    duration_minutes: 8
    dramaturgical_role: opening
    mode: common
    note: Kein vorwegnehmendes Unterrichtsgespräch.

  - id: tp-02
    moment_id: lm-positionierung
    window_id: tw-01
    start_minute: 8
    duration_minutes: 20
    dramaturgical_role: exploration
    mode: common
```

Erlaubte dramaturgische Rollen:

- opening
- irritation
- exploration
- deepening
- practice
- decision
- consolidation
- reflection
- closing
- transition
- buffer
- other

Erlaubte Modi:

- common
- choice
- parallel
- individual
- group
- open

---

## 7. Zielverhalten der App

### 7.1 Gespräch

Der Critical Friend bleibt der einzige sichtbare Gesprächspartner.

Es gibt keinen zweiten Chat pro Lernmoment, Board-Karte oder Material.

Ein ausgewähltes Objekt setzt nur den Gesprächskontext.

### 7.2 Lernlandschaft

Die App bietet:

- Lernmoment hinzufügen
- Lernmoment öffnen
- Lernmoment bearbeiten
- mit Critical Friend weiterentwickeln
- Übergang hinzufügen
- Übergang pädagogisch typisieren
- Vorschläge prüfen und übernehmen

Ein Klick auf eine Node öffnet den Lernmoment.

Ein Klick auf eine Connection öffnet den Übergang.

### 7.3 Erzeugung neuer Lernmomente

Neue Lernmomente können entstehen durch:

1. einen bestätigten Vorschlag aus dem Gespräch,
2. die Aktion „Lernmoment hinzufügen“,
3. einen Vorschlag beim Prüfen eines Übergangs.

Keine KI darf einen Lernmoment ohne sichtbare Zustimmung kanonisch speichern.

### 7.4 Materialbedarf

In der Lernmoment-Detailansicht kann Materialbedarf erfasst werden.

Aus einem Materialbedarf kann eine Planungsboard-Karte vorgeschlagen werden.

Ein Materialbedarf startet keinen Worker.

### 7.5 Zeit & Dramaturgie

Die App zeigt:

- nicht platzierte Lernmomente
- Unterrichtsfenster
- darin platzierte Lernmomente
- Dauer
- Reihenfolge
- Parallelität oder Wahl
- Konflikte
- Puffer
- unvollständige Planung

Lernmomente werden per Drag-and-drop in Unterrichtsfenster gezogen.

Drag-and-drop erzeugt oder verändert ausschließlich eine `TimePlacement`.

Die Lernlandschaft bleibt dabei unverändert.

### 7.6 Stunden-Detailansicht

Für jedes Unterrichtsfenster gibt es zwei Darstellungen:

- visuelle Dramaturgie
- tabellarischer Verlaufsplan

Beide Darstellungen verwenden dieselben Daten.

Der tabellarische Verlaufsplan ist keine zweite Datenquelle.

### 7.7 Planungsboard und Worker

Das Verschieben einer Karte startet keinen Worker.

Erst eine ausdrücklich bestätigte Aktion wie:

```text
Entwurf beauftragen
```

erzeugt einen Service Request.

Ein Worker-Ergebnis kehrt auf die auslösende Board-Karte zurück.

---

## 8. Verbotene Parallelmodelle

Nach dem Refactoring darf die App keine unabhängig editierbaren Kopien folgender Inhalte führen:

- Learning-Journey-Phasen neben Lernmomenten
- Aktivitäten neben `learning_activity`
- Next-Steps neben Planungsboard-Karten
- Zeitdaten außerhalb von `temporal-plan.yml`
- Materialien ohne Kernel-Referenzen
- Entscheidungen nur in App-Datenbanken
- semantisches Canvas-Layout als pädagogische Quelle

App-interne View Models sind erlaubt, wenn sie eindeutig aus Kernel-Artefakten erzeugt werden und nicht unabhängig kanonisch gespeichert werden.

---

## 9. Versionierung und Sicherheit

Jede semantische Änderung wird versioniert.

Reine Layoutänderungen werden getrennt gespeichert.

KI-Vorschläge müssen:

- sichtbar,
- begründet,
- reversibel,
- prüfbar

sein.

Ohne Zustimmung darf die KI nicht:

- Lernmomente anlegen oder löschen,
- Übergänge verändern,
- Zeitplanung verändern,
- Board-Aufträge freigeben,
- Materialien auf „unterrichtsbereit“ setzen.

---

## 10. Definition of Done

Das Refactoring ist abgeschlossen, wenn:

1. alle fachlichen Schemas im Kernel liegen,
2. die App ihre Domain-Typen daraus ableitet,
3. `temporal-plan.yml` verlustfrei gelesen und geschrieben wird,
4. Lernmomente in der Lernlandschaft erzeugt und bearbeitet werden können,
5. Lernmomente per Drag-and-drop zeitlich platziert werden können,
6. Zeitdaten einen vollständigen Read-Write-Read-Roundtrip überstehen,
7. Materialbedarf zu Board-Karten und freigegebenen Worker-Aufträgen führt,
8. Board-Verschieben niemals automatisch Worker startet,
9. alle KI-Änderungen Vorschläge bleiben, bis eine Lehrkraft zustimmt,
10. App und Kernel keine konkurrierenden pädagogischen Quellen mehr besitzen,
11. bestehende Workspaces migriert werden können,
12. Unit-, Integrations- und E2E-Tests die Kernabläufe absichern.
