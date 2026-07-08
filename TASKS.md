# TASKS.md

# ptspace-app Umsetzungsliste

Stand: 2026-07-06

Diese Liste ist das operative Arbeitsdokument fuer die erste Umsetzung von `ptspace-app`. Die fachliche Quelle bleiben `PRODUCT_SPEC.md`, `UI_SPEC.md`, `TECH_STACK.md`, `HARNESS_ADAPTERS.md`, `HARNESS_FIRST_ARCHITECTURE.md` und `AUDIO_WORKER_SCENARIO.md`.

## 0. Aktueller Repo-Stand

- [x] Produktidee, MVP-Ziel und Nicht-Ziele dokumentiert.
- [x] UI-Sprache und Grundlayout dokumentiert.
- [x] Harness-first-Architektur dokumentiert.
- [x] Adapter- und Host-Bridge-Regeln dokumentiert.
- [x] Audio Worker Capability fachlich beschrieben.
- [x] Lauffaehige Frontend-App vorhanden.
- [x] Lauffaehiges Backend vorhanden.
- [x] Domain-Modelle als Code vorhanden.
- [x] Tests vorhanden.
- [x] Docker-Compose-Setup vorhanden.
- [x] Entwicklungs-README mit konkretem Startbefehl vorhanden.

## 1. Startentscheidungen vor dem ersten Code

Diese Punkte sollten vor oder direkt mit dem Scaffolding entschieden werden, weil sie die Projektstruktur festlegen.

- [x] Frontend-Stack verbindlich festlegen.
  - Vorschlag: SvelteKit, TypeScript, Tailwind CSS, Lucide Icons.
  - Grund: entspricht `TECH_STACK.md` und passt zur ruhigen, reaktiven Planungsraum-UI.
- [x] Backend-Stack verbindlich festlegen.
  - Vorschlag: Node.js, TypeScript, Fastify, Zod, PostgreSQL spaeter, lokale In-Memory- oder SQLite-Entwicklung zuerst nur wenn klar als Dev-Modus markiert.
  - Grund: gemeinsames TypeScript-Typmodell mit Frontend und klare Backend-Schutzschicht.
- [x] Paketmanager festlegen.
  - Vorschlag: `pnpm` Workspace mit `frontend/`, `backend/`, optional `packages/shared/`.
- [ ] Kernel-Einbindung fuer MVP festlegen.
  - Minimaler Start: Template-Kopie pro Planungsraum aus `kernel/templates/`.
  - Spaeter pruefen: Git-Submodule oder Paket.
- [ ] Persistenzstrategie fuer v0.1 festlegen.
  - Minimaler Start: Backend speichert Metadaten in Datei oder SQLite, Inhalte im isolierten Workspace.
  - Produktziel: PostgreSQL.
- [x] Harness-Modus fuer lokale Entwicklung festlegen.
  - Minimaler Start: `MockHarnessAdapter` plus unveraenderte Adapter-Grenze.
  - Naechster Schritt: `OpenCodeDockerAdapter` oder Host-Bridge-Prototyp.

## 1.5 Verbindliche Reihenfolge fuer echte Harness-Ausfuehrung

Echte `opencode`- oder andere Harness-Ausfuehrung wird erst aktiviert, wenn die Schutzgrenzen technisch erzwungen und getestet sind.

1. [x] Domain-Schemas definieren.
   - `PlanningSpace`
   - `LearningDesign`
   - `Decision`
   - `NextStep`
   - `ServiceRequest`
2. [x] WorkspaceManager implementieren.
   - isolierter Workspace pro Planungsraum
   - kein Zugriff auf Repo-Root, Home-Verzeichnis oder globale Configs
   - sichere Pfadnormalisierung und Pfadpruefung
3. [x] PermissionPolicy implementieren.
   - `allow`
   - `deny`
   - `requires_admin_approval`
   - `ask_critical_friend`
4. [x] MockHarnessAdapter implementieren.
   - nutzt dieselbe Backend-Schnittstelle wie spaeter `opencode`
   - aktualisiert testweise Denkstand-Dateien
   - reicht keine technischen Prompts an die UI durch
5. [x] Schutzgrenzen testen.
   - Schreiben ausserhalb des Workspaces wird abgelehnt.
   - Lesen sensibler oder externer Pfade wird abgelehnt.
   - technische Permission-Prompts werden nicht teacher-facing.
   - API-Keys oder Secrets werden nicht in Chat, Workspace, Git oder Export gespeichert.
6. [ ] OpenCodeAdapter erst danach implementieren oder aktivieren.
   - nur hinter `HarnessAdapter`
   - nur mit isoliertem Workspace
   - nur mit vorgeschalteter PermissionPolicy
   - keine direkte Browser-Harness-Kommunikation

## 2. Repo-Grundstruktur

- [x] `frontend/` scaffolden.
- [x] `backend/` scaffolden.
- [x] `packages/shared/` fuer gemeinsame Typen und Schemas anlegen.
- [x] `docs/` anlegen und Architekturentscheidungen aus den Specs verdichten.
- [x] `examples/planning-spaces/` fuer Beispiel-Planungsraeume anlegen.
- [x] `.env.example` mit nicht-sensiblen Platzhaltern anlegen.
- [x] `docker-compose.yml` fuer lokale Entwicklung vorbereiten.
- [x] `README.md` um konkrete Entwicklungsbefehle ergaenzen.

## 3. Gemeinsame Domain-Modelle

- [x] `PlanningSpace` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `LearningDesign` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `Decision` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `OpenQuestion` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `NextStep` als teacher-facing Oberflaeche eines internen Service Requests modellieren.
- [x] `ServiceRequest` intern nach Kernel-Schema modellieren.
- [x] `Material` und `ExportPackage` modellieren.
- [x] Statuswerte zwischen intern und UI-sichtbar sauber trennen.
- [x] Tests fuer Schemas und Statusuebersetzungen schreiben.

## 4. Backend-MVP

- [x] Fastify-App mit Health-Route anlegen.
- [x] API fuer Planungsraum-Liste und Planungsraum-Erstellung implementieren.
- [x] WorkspaceManager implementieren.
  - [x] Planungsraum-Workspace isoliert anlegen.
  - [x] Grunddateien erzeugen: `learning-design.md`, `decisions.md`, `open-questions.md`, `next-steps.md`.
  - [x] Keine personenbezogenen Beispielinhalte erzeugen.
- [x] GitManager implementieren.
  - [x] Repo pro Workspace initialisieren.
  - [x] Backend-generierte Versionen speichern.
  - [x] Teacher-facing Versionslabel erzeugen.
- [x] Conversation-Route implementieren.
  - [x] Nachricht der Lehrkraft an Backend senden.
  - [x] Backend gibt Antwort des Harness-Adapters zurueck.
  - [x] Keine direkte Browser-Harness-Kommunikation.
- [x] ThinkingState-Route implementieren.
  - [x] Denkstand aus Workspace-Dateien lesen.
  - [x] Offene Entscheidungen und naechste Schritte teacher-facing zurueckgeben.
- [x] Export-Route fuer Markdown implementieren.
- [x] Fehler- und Statusantworten in Lehrkraefte-Sprache uebersetzen.

## 5. Harness-Adapter

- [x] Gemeinsames `HarnessAdapter` Interface implementieren.
- [x] `MockHarnessAdapter` implementieren.
  - [x] Ruhige Antworten erzeugen.
  - [x] Beispielhaft Denkstand-Dateien aktualisieren.
  - [x] Keine technischen Permissions an UI durchreichen.
- [x] Policy-Entscheidungstypen implementieren.
  - [x] `allow`
  - [x] `deny`
  - [x] `requires_admin_approval`
  - [x] `ask_critical_friend`
- [x] PermissionPolicy fuer Workspace-Grenzen implementieren.
- [x] Tests fuer erlaubte und verbotene Dateioperationen schreiben.
- [x] Nächste Harness-Stufe planen; `OpenCodeDockerAdapter` noch nicht aktivieren.
- [ ] Host-Bridge nur nach separater Sicherheitsentscheidung prototypisieren.

## 6. Frontend-MVP

- [x] SvelteKit-App scaffolden.
- [x] Grundlayout umsetzen.
  - [x] Hauptbereich: Gemeinsam nachdenken.
  - [x] Rechte Spalte: Denkstand-Karten.
  - [x] Bereiche: Denkstand, Offene Entscheidungen, Nächste Schritte, Entwürfe, Für den Unterricht bereit.
- [x] Planungsraum anlegen.
  - [x] Titel.
  - [x] Fach/Lernbereich optional.
  - [x] Zielgruppe optional.
  - [x] kurze Idee.
- [x] Chat-UI implementieren.
  - [x] Lehrkraft-Nachricht.
  - [x] Antwort des Gegenübers.
  - [x] Lade-/Arbeitsstatus in Lehrkräftesprache.
- [x] Denkstand-Karten kompakt und aufklappbar umsetzen.
- [x] Naechste Schritte als paedagogische Vorschlaege anzeigen.
- [x] Materialbereich für Entwürfe und freigegebene Materialien vorbereiten.
- [x] Exportbereich fuer Markdown vorbereiten.
- [x] Keine technischen Begriffe im Lehrer:innen-Modus anzeigen.

## 7. Datenschutz, Sicherheit und Reputation

- [x] Eingabehinweis zu Datenminimierung im Planungsraum anzeigen.
- [x] Sensible Inhalte mindestens regelbasiert markieren.
  - Namen einzelner Schueler:innen.
  - Noten.
  - Diagnosen.
  - familiaere Details.
  - personenbezogene Konflikte.
- [x] Umformulierungen für sensible Lerngruppenangaben anbieten.
- [x] Exportfilter implementieren.
  - [x] Kein roher Chat im Standardexport.
  - [x] Keine Service Requests im teacher-facing Export.
  - [x] Keine Secrets oder technischen Logs.
- [ ] Secret-Policy technisch absichern.
  - [x] API-Keys nicht in Chatnachrichten speichern.
  - [ ] Integration-Status nur als Status anzeigen.
- [ ] Reputationstest fuer UI-Texte durchfuehren.
  - [ ] Keine unrealistischen Wirksamkeitsversprechen.
  - [ ] Keine wissenschaftlich unbelegten Behauptungen.
  - [ ] Transparenzhinweise fuer KI-generierte Materialien vorbereiten.

## 8. Material- und Export-MVP

- [x] MarkdownExporter implementieren.
- [x] Learning-Design-Export als Markdown erzeugen.
- [x] Materialentwurf als Markdown erzeugen.
- [x] Exportfreigabe durch Lehrkraft modellieren.
- [x] OKF-Markdown als nächster Schritt vorbereiten.
- [ ] PDF/DOCX-Export erst nach stabilem Markdown-Export starten.
- [ ] Nextcloud-Export zurueckstellen, bis Exportfilter und Freigabelogik stabil sind.

## 9. Audio Worker Capability

- [ ] Audio im MVP nicht als direkte TTS-Funktion starten.
- [ ] Zuerst Capability-Modell anlegen.
- [ ] Script-only-Fallback als sichere erste Umsetzung modellieren.
- [ ] Transcript-Pflicht abbilden.
- [ ] Review-Vermerk abbilden.
- [ ] Transparenzhinweis fuer Unterrichtseinsatz abbilden.
- [ ] Voice Cloning realer oder identifizierbarer Personen im Default ausschliessen.
- [ ] Providerwahl nicht als Lehrkraft-Entscheidung in die UI legen.

## 10. Tests und Qualitaet

- [x] Unit-Tests fuer Domain-Schemas.
- [x] Unit-Tests fuer Statusuebersetzungen.
- [x] Unit-Tests fuer PermissionPolicy.
- [x] Unit-Tests fuer Exportfilter.
- [x] Integrationstest: Planungsraum erstellen erzeugt isolierten Workspace.
- [x] Integrationstest: Chat-Nachricht läuft über Backend und MockHarnessAdapter.
- [x] Integrationstest: Denkstand wird aus Workspace-Dateien gelesen.
- [x] UI-Test: Lehrer:innen-Modus zeigt keine Git-, Shell-, YAML- oder Harness-Prompts.
- [x] UI-Test: Mobile und Desktop Layout ohne Textueberlagerung.

## 11. Dokumentation

- [x] `docs/architecture.md` aus den bestehenden Specs extrahieren.
- [x] `docs/data-protection.md` konkretisieren.
- [x] `docs/ui-language.md` mit erlaubten und verbotenen Begriffen pflegen.
- [ ] `docs/harness-opencode.md` fuer Adapter-Implementierung schreiben.
- [ ] `docs/okf-export.md` fuer Exportregeln schreiben.
- [ ] `docs/nextcloud-integration.md` als spaeteres Integrationskonzept vorbereiten.

## 12. Fehlendes vor produktiver Umsetzung

Diese Punkte blockieren nicht den Mock-MVP, sollten aber vor ernsthafter Harness- oder Schulserver-Nutzung geklaert werden.

- [ ] Konkrete Authentifizierungsstrategie.
- [ ] Rollen- und Rechtekonzept fuer mehrere Lehrkraefte.
- [ ] Secret-Store fuer produktive Deployments.
- [ ] Datenaufbewahrung und Loeschkonzept.
- [ ] Mandanten-/Schultrennung.
- [ ] Admin-Oberflaeche fuer Integrationen und Runtimes.
- [ ] Sicherheitsmodell fuer echten opencode- oder Host-Bridge-Betrieb.
- [ ] Wissenschaftlich belastbare Quellenstrategie fuer fachliche Aussagen.
- [ ] Lizenz- und OER-Metadaten fuer Exporte.

## 13. Empfohlener erster Umsetzungsschnitt

Wir koennen mit der Umsetzung starten, wenn der erste Schnitt bewusst klein bleibt:

1. `pnpm` Monorepo mit `frontend`, `backend`, `packages/shared`.
2. Shared Domain-Schemas fuer `PlanningSpace`, `LearningDesign`, `Decision`, `NextStep`, `ServiceRequest`.
3. Backend mit Planungsraum-Erstellung, WorkspaceManager, GitManager und `MockHarnessAdapter`.
4. Frontend mit Planungsraum-Erstellung, Chat und rechter Denkstand-Spalte.
5. Markdown-Export mit Exportfilter.

Noch nicht starten sollten wir mit:

- echter opencode-Ausfuehrung ohne Policy-Tests,
- Host-Bridge ohne eigenes Sicherheitsreview,
- Nextcloud-Export ohne Exportfilter,
- Audio-TTS ohne Transcript-, Review- und Transparenzworkflow,
- produktiver Provider-/Secret-Konfiguration.

## 14. Startklar-Einschaetzung

Startklar fuer Umsetzung: ja, fuer einen lokalen Mock-Harness-MVP.

Noch nicht startklar fuer produktionsnahen Harness-Betrieb: Sicherheits-, Secret-, Auth- und Runtime-Policies sind fachlich beschrieben, aber noch nicht technisch umgesetzt oder getestet.

Die naechste konkrete Aufgabe sollte deshalb sein:

> Projekt scaffolden und zuerst die geschuetzte Backend-Grenze mit MockHarnessAdapter bauen, bevor echte Harness-, Provider- oder Export-Integrationen aktiviert werden.


