# TASKS.md

# ptspace-app Umsetzungsliste

Stand: 2026-07-08

Diese Liste ist das operative Arbeitsdokument für die erste Umsetzung von `ptspace-app`. Die fachliche Quelle bleiben `PRODUCT_SPEC.md`, `UI_SPEC.md`, `TECH_STACK.md`, `HARNESS_ADAPTERS.md`, `HARNESS_FIRST_ARCHITECTURE.md` und `AUDIO_WORKER_SCENARIO.md`.

## 0. Aktueller Repo-Stand

- [x] Produktidee, MVP-Ziel und Nicht-Ziele dokumentiert.
- [x] UI-Sprache und Grundlayout dokumentiert.
- [x] Harness-first-Architektur dokumentiert.
- [x] Adapter- und Host-Bridge-Regeln dokumentiert.
- [x] Audio Worker Capability fachlich beschrieben.
- [x] Lauffähige Frontend-App vorhanden.
- [x] Lauffähiges Backend vorhanden.
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
  - Vorschlag: Node.js, TypeScript, Fastify, Zod, PostgreSQL später, lokale In-Memory- oder SQLite-Entwicklung zuerst nur wenn klar als Dev-Modus markiert.
  - Grund: gemeinsames TypeScript-Typmodell mit Frontend und klare Backend-Schutzschicht.
- [x] Paketmanager festlegen.
  - Vorschlag: `pnpm` Workspace mit `frontend/`, `backend/`, optional `packages/shared/`.
- [ ] Kernel-Einbindung für MVP festlegen.
  - Minimaler Start: Template-Kopie pro Planungsraum aus `kernel/templates/`.
  - Später prüfen: Git-Submodule oder Paket.
- [ ] Persistenzstrategie für v0.1 festlegen.
  - Minimaler Start: Backend speichert Metadaten in Datei oder SQLite, Inhalte im isolierten Workspace.
  - Produktziel: PostgreSQL.
- [x] Harness-Modus für lokale Entwicklung festlegen.
  - Minimaler Start: `MockHarnessAdapter` plus unveränderte Adapter-Grenze.
  - Nächster Schritt: nicht-produktive Ende-zu-Ende-Probe mit deaktiviertem `OpenCodeDockerAdapter`; Host-Bridge bleibt zurückgestellt.

## 1.5 Verbindliche Reihenfolge für echte Harness-Ausführung

Echte `opencode`- oder andere Harness-Ausführung wird erst aktiviert, wenn die Schutzgrenzen technisch erzwungen und getestet sind.

1. [x] Domain-Schemas definieren.
   - `PlanningSpace`
   - `LearningDesign`
   - `Decision`
   - `NextStep`
   - `ServiceRequest`
2. [x] WorkspaceManager implementieren.
   - isolierter Workspace pro Planungsraum
   - kein Zugriff auf Repo-Root, Home-Verzeichnis oder globale Configs
   - sichere Pfadnormalisierung und Pfadprüfung
3. [x] PermissionPolicy implementieren.
   - `allow`
   - `deny`
   - `requires_admin_approval`
   - `ask_critical_friend`
4. [x] MockHarnessAdapter implementieren.
   - nutzt dieselbe Backend-Schnittstelle wie später `opencode`
   - aktualisiert testweise Denkstand-Dateien
   - reicht keine technischen Prompts an die UI durch
5. [x] Schutzgrenzen testen.
   - Schreiben außerhalb des Workspaces wird abgelehnt.
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
- [x] `packages/shared/` für gemeinsame Typen und Schemas anlegen.
- [x] `docs/` anlegen und Architekturentscheidungen aus den Specs verdichten.
- [x] `examples/planning-spaces/` für Beispiel-Planungsräume anlegen.
- [x] `.env.example` mit nicht-sensiblen Platzhaltern anlegen.
- [x] `docker-compose.yml` für lokale Entwicklung vorbereiten.
- [x] `README.md` um konkrete Entwicklungsbefehle ergaenzen.

## 3. Gemeinsame Domain-Modelle

- [x] `PlanningSpace` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `LearningDesign` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `Decision` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `OpenQuestion` als TypeScript-Typ und Zod-Schema modellieren.
- [x] `NextStep` als teacher-facing Oberfläche eines internen Service Requests modellieren.
- [x] `ServiceRequest` intern nach Kernel-Schema modellieren.
- [x] `Material` und `ExportPackage` modellieren.
- [x] Statuswerte zwischen intern und UI-sichtbar sauber trennen.
- [x] Tests für Schemas und Statusübersetzungen schreiben.

## 4. Backend-MVP

- [x] Fastify-App mit Health-Route anlegen.
- [x] API für Planungsraum-Liste und Planungsraum-Erstellung implementieren.
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
  - [x] Backend gibt Antwort des Harness-Adapters zurück.
  - [x] Keine direkte Browser-Harness-Kommunikation.
- [x] ThinkingState-Route implementieren.
  - [x] Denkstand aus Workspace-Dateien lesen.
  - [x] Offene Entscheidungen und nächste Schritte teacher-facing zurückgeben.
- [x] Export-Route für Markdown implementieren.
- [x] Fehler- und Statusantworten in Lehrkräfte-Sprache übersetzen.

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
- [x] PermissionPolicy für Workspace-Grenzen implementieren.
- [x] Tests für erlaubte und verbotene Dateioperationen schreiben.
- [x] Nächste Harness-Stufe planen.
- [x] `HarnessAdapter` um Verfügbarkeit, Ereignisse und Policy-Simulation erweitern.
- [x] `OpenCodeDockerAdapter` als deaktivierten Prototyp implementieren.
- [x] Policy-Simulation für `allow`, `deny`, `requires_admin_approval`, `ask_critical_friend` testen.
- [x] Echte `opencode`-Ausführung weiterhin blockieren.
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
- [x] Nächste Schritte als pädagogische Vorschlaege anzeigen.
- [x] Materialbereich für Entwürfe und freigegebene Materialien vorbereiten.
- [x] Exportbereich für Markdown vorbereiten.
- [x] Keine technischen Begriffe im Lehrer:innen-Modus anzeigen.

## 7. Datenschutz, Sicherheit und Reputation

- [x] Eingabehinweis zu Datenminimierung im Planungsraum anzeigen.
- [x] Sensible Inhalte mindestens regelbasiert markieren.
  - Namen einzelner Schüler:innen.
  - Noten.
  - Diagnosen.
  - familiäre Details.
  - personenbezogene Konflikte.
- [x] Umformulierungen für sensible Lerngruppenangaben anbieten.
- [x] Exportfilter implementieren.
  - [x] Kein roher Chat im Standardexport.
  - [x] Keine Service Requests im teacher-facing Export.
  - [x] Keine Secrets oder technischen Logs.
- [ ] Secret-Policy technisch absichern.
  - [x] API-Keys nicht in Chatnachrichten speichern.
  - [ ] Integration-Status nur als Status anzeigen.
- [ ] Reputationstest für UI-Texte durchfuehren.
  - [ ] Keine unrealistischen Wirksamkeitsversprechen.
  - [ ] Keine wissenschaftlich unbelegten Behauptungen.
  - [ ] Transparenzhinweise für KI-generierte Materialien vorbereiten.

## 8. Material- und Export-MVP

- [x] MarkdownExporter implementieren.
- [x] Learning-Design-Export als Markdown erzeugen.
- [x] Materialentwurf als Markdown erzeugen.
- [x] Exportfreigabe durch Lehrkraft modellieren.
- [x] OKF-Markdown als nächster Schritt vorbereiten.
- [ ] PDF/DOCX-Export erst nach stabilem Markdown-Export starten.
- [ ] Nextcloud-Export zurückstellen, bis Exportfilter und Freigabelogik stabil sind.

## 9. Audio Worker Capability

- [ ] Audio im MVP nicht als direkte TTS-Funktion starten.
- [ ] Zuerst Capability-Modell anlegen.
- [ ] Script-only-Fallback als sichere erste Umsetzung modellieren.
- [ ] Transcript-Pflicht abbilden.
- [ ] Review-Vermerk abbilden.
- [ ] Transparenzhinweis für Unterrichtseinsatz abbilden.
- [ ] Voice Cloning realer oder identifizierbarer Personen im Default ausschliessen.
- [ ] Providerwahl nicht als Lehrkraft-Entscheidung in die UI legen.

## 10. Tests und Qualität

- [x] Unit-Tests für Domain-Schemas.
- [x] Unit-Tests für Statusübersetzungen.
- [x] Unit-Tests für PermissionPolicy.
- [x] Unit-Tests für Exportfilter.
- [x] Integrationstest: Planungsraum erstellen erzeugt isolierten Workspace.
- [x] Integrationstest: Chat-Nachricht läuft über Backend und MockHarnessAdapter.
- [x] Integrationstest: Denkstand wird aus Workspace-Dateien gelesen.
- [x] UI-Test: Lehrer:innen-Modus zeigt keine Git-, Shell-, YAML- oder Harness-Prompts.
- [x] UI-Test: Mobile und Desktop Layout ohne Textüberlagerung.

## 11. Dokumentation

- [x] `docs/architecture.md` aus den bestehenden Specs extrahieren.
- [x] `docs/data-protection.md` konkretisieren.
- [x] `docs/ui-language.md` mit erlaubten und verbotenen Begriffen pflegen.
- [x] `docs/harness-opencode.md` für Adapter-Implementierung schreiben.
- [ ] `docs/okf-export.md` für Exportregeln schreiben.
- [ ] `docs/nextcloud-integration.md` als späteres Integrationskonzept vorbereiten.

## 12. Fehlendes vor produktiver Umsetzung

Diese Punkte blockieren nicht den Mock-MVP, sollten aber vor ernsthafter Harness- oder Schulserver-Nutzung geklärt werden.

- [ ] Konkrete Authentifizierungsstrategie.
- [ ] Rollen- und Rechtekonzept für mehrere Lehrkräfte.
- [ ] Secret-Store für produktive Deployments.
- [ ] Datenaufbewahrung und Löschkonzept.
- [ ] Mandanten-/Schultrennung.
- [ ] Admin-Oberfläche für Integrationen und Runtimes.
- [ ] Sicherheitsmodell für echten opencode- oder Host-Bridge-Betrieb.
- [ ] Wissenschaftlich belastbare Quellenstrategie für fachliche Aussagen.
- [ ] Lizenz- und OER-Metadaten für Exporte.

## 13. Empfohlener erster Umsetzungsschnitt

Wir können mit der Umsetzung starten, wenn der erste Schnitt bewusst klein bleibt:

1. `pnpm` Monorepo mit `frontend`, `backend`, `packages/shared`.
2. Shared Domain-Schemas für `PlanningSpace`, `LearningDesign`, `Decision`, `NextStep`, `ServiceRequest`.
3. Backend mit Planungsraum-Erstellung, WorkspaceManager, GitManager und `MockHarnessAdapter`.
4. Frontend mit Planungsraum-Erstellung, Chat und rechter Denkstand-Spalte.
5. Markdown-Export mit Exportfilter.

Noch nicht starten sollten wir mit:

- echter opencode-Ausführung ohne Policy-Tests,
- Host-Bridge ohne eigenes Sicherheitsreview,
- Nextcloud-Export ohne Exportfilter,
- Audio-TTS ohne Transcript-, Review- und Transparenzworkflow,
- produktiver Provider-/Secret-Konfiguration.

## 14. Startklar-Einschätzung

Startklar für Umsetzung: ja, für einen lokalen Mock-Harness-MVP.

Noch nicht startklar für produktionsnahen Harness-Betrieb: Sicherheits-, Secret-, Auth- und Runtime-Policies sind fachlich beschrieben, aber noch nicht technisch umgesetzt oder getestet.

Die nächste konkrete Aufgabe sollte deshalb sein:

> Als nächstes eine nicht-produktive Ende-zu-Ende-Probe mit Test-Workspace vorbereiten, ohne Host-Bridge, Nextcloud, Provider-Secrets oder Audio-Runtime zu aktivieren.
## 15. Verifikation

Stand: 2026-07-08.

- [x] `pnpm --filter @ptspace/backend check`
- [x] `pnpm --filter @ptspace/shared test`
- [x] `pnpm --filter @ptspace/backend test`
- [x] `pnpm --filter @ptspace/frontend check`
- [x] `pnpm build`
