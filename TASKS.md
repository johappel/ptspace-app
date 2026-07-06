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
- [ ] Docker-Compose-Setup vorhanden.
- [ ] Entwicklungs-README mit konkretem Startbefehl vorhanden.

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
- [ ] `docker-compose.yml` fuer lokale Entwicklung vorbereiten.
- [ ] `README.md` um konkrete Entwicklungsbefehle ergaenzen.

## 3. Gemeinsame Domain-Modelle

- [x] `PlanningSpace` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `LearningDesign` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `Decision` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `OpenQuestion` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `NextStep` als teacher-facing Oberflaeche eines internen Service Requests modellieren.
- [x] `ServiceRequest` intern nach Kernel-Schema modellieren.
- [x] `Material` und `ExportPackage` modellieren.
- [ ] Statuswerte zwischen intern und UI-sichtbar sauber trennen.
- [ ] Tests fuer Schemas und Statusuebersetzungen schreiben.

## 4. Backend-MVP

- [x] Fastify-App mit Health-Route anlegen.
- [x] API fuer Planungsraum-Liste und Planungsraum-Erstellung implementieren.
- [x] WorkspaceManager implementieren.
  - [x] Planungsraum-Workspace isoliert anlegen.
  - [x] Grunddateien erzeugen: `learning-design.md`, `decisions.md`, `open-questions.md`, `next-steps.md`.
  - [ ] Keine personenbezogenen Beispielinhalte erzeugen.
- [ ] GitManager implementieren.
  - [ ] Repo pro Workspace initialisieren.
  - [ ] Backend-generierte Versionen speichern.
  - [ ] Teacher-facing Versionslabel erzeugen.
- [x] Conversation-Route implementieren.
  - [ ] Nachricht der Lehrkraft an Backend senden.
  - [ ] Backend gibt Antwort des Harness-Adapters zurueck.
  - [ ] Keine direkte Browser-Harness-Kommunikation.
- [x] ThinkingState-Route implementieren.
  - [ ] Denkstand aus Workspace-Dateien lesen.
  - [ ] Offene Entscheidungen und naechste Schritte teacher-facing zurueckgeben.
- [x] Export-Route fuer Markdown implementieren.
- [ ] Fehler- und Statusantworten in Lehrkraefte-Sprache uebersetzen.

## 5. Harness-Adapter

- [x] Gemeinsames `HarnessAdapter` Interface implementieren.
- [x] `MockHarnessAdapter` implementieren.
  - [ ] Ruhige Critical-Friend-Antworten erzeugen.
  - [ ] Beispielhaft Denkstand-Dateien aktualisieren.
  - [ ] Keine technischen Permissions an UI durchreichen.
- [x] Policy-Entscheidungstypen implementieren.
  - [ ] `allow`
  - [ ] `deny`
  - [ ] `requires_admin_approval`
  - [ ] `ask_critical_friend`
- [x] PermissionPolicy fuer Workspace-Grenzen implementieren.
- [x] Tests fuer erlaubte und verbotene Dateioperationen schreiben.
- [ ] `OpenCodeDockerAdapter` erst nach Abschluss von Abschnitt 1.5 planen oder implementieren.
- [ ] Host-Bridge nur nach separater Sicherheitsentscheidung prototypisieren.

## 6. Frontend-MVP

- [x] SvelteKit-App scaffolden.
- [x] Grundlayout umsetzen.
  - [ ] Hauptbereich: Gespraech mit Critical Friend.
  - [ ] Rechte Spalte: Denkstand-Karten.
  - [ ] Bereiche: Denkstand, Offene Entscheidungen, Naechste Schritte, Entwuerfe, Fuer den Unterricht bereit.
- [x] Planungsraum anlegen.
  - [ ] Titel.
  - [ ] Fach/Lernbereich optional.
  - [ ] Zielgruppe optional.
  - [ ] kurze Idee.
- [x] Chat-UI implementieren.
  - [ ] Lehrkraft-Nachricht.
  - [ ] Critical-Friend-Antwort.
  - [ ] Lade-/Arbeitsstatus in Lehrkraefte-Sprache.
- [x] Denkstand-Karten kompakt und aufklappbar umsetzen.
- [x] Naechste Schritte als paedagogische Vorschlaege anzeigen.
- [ ] Materialbereich fuer Entwuerfe und freigegebene Materialien vorbereiten.
- [x] Exportbereich fuer Markdown vorbereiten.
- [ ] Keine technischen Begriffe im Lehrer:innen-Modus anzeigen.

## 7. Datenschutz, Sicherheit und Reputation

- [x] Eingabehinweis zu Datenminimierung im Planungsraum anzeigen.
- [ ] Sensible Inhalte mindestens regelbasiert markieren.
  - Namen einzelner Schueler:innen.
  - Noten.
  - Diagnosen.
  - familiaere Details.
  - personenbezogene Konflikte.
- [ ] Umformulierungen fuer sensible Lerngruppenangaben anbieten.
- [ ] Exportfilter implementieren.
  - [ ] Kein roher Chat im Standardexport.
  - [ ] Keine Service Requests im teacher-facing Export.
  - [ ] Keine Secrets oder technischen Logs.
- [ ] Secret-Policy technisch absichern.
  - [ ] API-Keys nicht in Chatnachrichten speichern.
  - [ ] Integration-Status nur als Status anzeigen.
- [ ] Reputationstest fuer UI-Texte durchfuehren.
  - [ ] Keine unrealistischen Wirksamkeitsversprechen.
  - [ ] Keine wissenschaftlich unbelegten Behauptungen.
  - [ ] Transparenzhinweise fuer KI-generierte Materialien vorbereiten.

## 8. Material- und Export-MVP

- [x] MarkdownExporter implementieren.
- [x] Learning-Design-Export als Markdown erzeugen.
- [ ] Materialentwurf als Markdown erzeugen.
- [ ] Exportfreigabe durch Lehrkraft modellieren.
- [ ] OKF-Markdown als naechster Schritt vorbereiten.
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

- [ ] Unit-Tests fuer Domain-Schemas.
- [ ] Unit-Tests fuer Statusuebersetzungen.
- [x] Unit-Tests fuer PermissionPolicy.
- [ ] Unit-Tests fuer Exportfilter.
- [ ] Integrationstest: Planungsraum erstellen erzeugt isolierten Workspace.
- [ ] Integrationstest: Chat-Nachricht laeuft ueber Backend und MockHarnessAdapter.
- [ ] Integrationstest: Denkstand wird aus Workspace-Dateien gelesen.
- [ ] UI-Test: Lehrer:innen-Modus zeigt keine Git-, Shell-, YAML- oder Harness-Prompts.
- [x] UI-Test: Mobile und Desktop Layout ohne Textueberlagerung.

## 11. Dokumentation

- [x] `docs/architecture.md` aus den bestehenden Specs extrahieren.
- [x] `docs/data-protection.md` konkretisieren.
- [ ] `docs/ui-language.md` mit erlaubten und verbotenen Begriffen pflegen.
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


