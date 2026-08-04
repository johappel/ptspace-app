# ptspace-app Roadmap

Stand: 2026-08-04

Diese Datei ist die knappe operative Übersicht. Details stehen im jeweils verlinkten Meilenstein und in den GitHub-Issues.

## Produktstand

`ptspace-app` ist ein umfangreicher lokaler Prototyp mit SvelteKit-Frontend, Fastify-Backend, gemeinsamem Domainmodell, Planungsräumen, Lernlandschaft, Zeitplanung, Planungsboard, Materialien, geführtem Vorschlags- und Reviewfluss sowie Mock-/Hybrid-Harness.

Der nächste Schritt ist keine breite Funktionserweiterung, sondern die Stabilisierung eines realen, durchgängigen Kernablaufs.

## Aktueller Meilenstein: Real Runtime MVP

Verbindlicher Plan: [`docs/milestones/REAL-RUNTIME-MVP.md`](docs/milestones/REAL-RUNTIME-MVP.md)

### Reihenfolge und Status

- [ ] **M1 – Kernel/App Alignment**  
  Aktuelle Companion-Rolle, systemisch-reflexive Haltung, Kernelversion und Verträge in der App synchronisieren.

- [ ] **M2 – Persistente Runtime-Sessions**  
  Pro Planungsraum eine gespeicherte, wiederaufnehmbare und isolierte Harness-Session einführen.

- [ ] **M3 – Kontextbudget und Kompression**  
  Gestuften Kontext und ein nicht-kanonisches Runtime-Read-Model für lange Gespräche implementieren.

- [ ] **M4 – Real-Harness-Referenzablauf**  
  Den vorhandenen Kernprozess ohne manuelle Workspace-Korrekturen mit einem echten Harness ausführen.

- [ ] **M5 – Browser-E2E und CI-Gates**  
  Den zentralen Ablauf, Recovery-Fälle und Datenintegrität automatisiert absichern.

- [ ] **M6 – Zugänglichkeitsabnahme**  
  Tastatur, Screenreader, Reduced Motion, lineare Canvas-Alternative und Responsive Verhalten prüfen.

## Referenzablauf

```text
Planungsraum anlegen
→ Anliegen besprechen
→ Denkstand aktualisieren
→ Lernlandschaft lesen oder verändern
→ Vorbereitung vorschlagen
→ Lehrkraft bestätigt
→ realer Hintergrundauftrag läuft
→ Ergebnis wird validiert und geprüft
→ Lehrkraft gibt das Ergebnis frei
```

## Bis zur MVP-Abnahme zurückgestellt

- zusätzliche Worker-Arten
- neue Exportformate
- weitere Räume oder Dashboard-Bereiche
- Forgejo- und produktive Nextcloud-Integration
- breiter Knowledge-Ausbau
- produktiver Betrieb mit Schüler:innendaten
- automatische kanonische Änderungen ohne Vorschau und Zustimmung

## Dokumentationsstruktur

```text
AGENTS.md
  dauerhafte Produkt- und Agentenregeln

REFACTOR-AGENTS.md
  aktueller Einstieg und Arbeitsvertrag für Agenten

ROADMAP.md
  knapper, belegter Gesamtstatus

docs/milestones/REAL-RUNTIME-MVP.md
  Umfang, Reihenfolge und Definition of Done

GitHub-Issues
  konkret ausführbare Arbeitspakete und Fortschritt

TASKS.md
  detaillierter Komponentenstand und Implementierungshistorie
```

## Pflege

Ein Status wird erst auf `[x]` gesetzt, wenn die zugehörigen Abnahmekriterien erfüllt und die relevanten Tests dokumentiert sind. Teilfortschritte gehören in das jeweilige GitHub-Issue beziehungsweise den PR, nicht als voreilige Erledigung in diese Übersicht.
