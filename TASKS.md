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

## 1. Startentscheidungen

- [x] Frontend-Stack festgelegt: SvelteKit, TypeScript, Tailwind CSS, Lucide Icons.
- [x] Backend-Stack festgelegt: Node.js, TypeScript, Fastify, Zod.
- [x] Monorepo-Struktur mit `frontend`, `backend` und `packages/shared` angelegt.
- [x] Teacher-facing Begriffe festgelegt: Planungsräume, Gemeinsam nachdenken, Denkstand, Offene Entscheidungen, Nächste Schritte, Materialien, Export.
- [x] Lokaler Git-Store als interne Versionierung gewählt.
- [x] Nextcloud als externe Zielablage zurückgestellt.
- [x] `opencode` als Referenz-Harness hinter Adaptergrenze vorbereitet.

## 2. Domain und Backend

- [x] Gemeinsame Zod-Schemas und TypeScript-Typen für Kernobjekte implementiert.
- [x] Planungsraum-Erstellung implementiert.
- [x] Isolierten Workspace pro Planungsraum implementiert.
- [x] Grunddateien erzeugen: `learning-design.md`, `decisions.md`, `open-questions.md`, `next-steps.md`.
- [x] Lokale Git-Versionen durch das Backend erzeugen.
- [x] Conversation-Route implementiert.
- [x] Thinking-State-Route implementiert.
- [x] Export-Route für Markdown und OKF-Markdown implementiert.
- [x] Fehler- und Statusantworten in Lehrkräfte-Sprache übersetzt.
- [x] Direkte Browser-Kommunikation mit Harness oder Shell ausgeschlossen.

## 3. Frontend-MVP

- [x] SvelteKit-App scaffolden.
- [x] Grundlayout mit Planungsräumen, Gespräch, Denkstand, nächsten Schritten, Materialien und Export umsetzen.
- [x] Hauptbereich als "Gemeinsam nachdenken" formulieren.
- [x] Navigation oben links bewusst mit "Planungsräume" formulieren.
- [x] Chat-UI implementieren.
- [x] Nachricht mit `Ctrl + Return` abschicken.
- [x] Denkstand-Karten kompakt anzeigen.
- [x] Material- und Exportbereich vorbereiten.
- [x] Keine technischen Begriffe im Lehrer:innen-Modus anzeigen.
- [x] Keine Ersatzumlaute in UI-Texten verwenden.

## 4. Datenschutz, Sicherheit und Reputation

- [x] Eingabehinweis für pseudonymisierte Lerngruppenangaben implementieren.
- [x] Sensible Inhalte regelbasiert markieren.
- [x] Umformulierungen für sensible Lerngruppenangaben anbieten.
- [x] Exportfilter implementieren.
- [x] Roher Chat, interne Service Requests, Secrets und technische Logs vom Standardexport ausschließen.
- [x] Exportfreigabe durch Lehrkraft modellieren.
- [x] API-Keys nicht in Chatnachrichten speichern.
- [x] OpenRouter-Key nur temporär als Docker-Secret-Mount außerhalb von Chat, Workspace und Git bereitstellen.
- [ ] Integration-Status nur als Status anzeigen, nie als Secret oder Provider-Konfiguration im Lehrkräfte-Dialog.
- [ ] Reputationstest für UI-Texte durchführen.
- [ ] Keine unrealistischen Wirksamkeitsversprechen in UI und Dokumentation stehen lassen.
- [ ] Keine wissenschaftlich unbelegten Behauptungen in UI und Dokumentation stehen lassen.
- [ ] Transparenzhinweise für KI-generierte Materialien vorbereiten.

## 5. Harness-Adapter

- [x] Gemeinsames `HarnessAdapter`-Interface implementieren.
- [x] `MockHarnessAdapter` implementieren.
- [x] Policy-Entscheidungstypen implementieren: `allow`, `deny`, `requires_admin_approval`, `ask_critical_friend`.
- [x] PermissionPolicy für Workspace-Grenzen implementieren.
- [x] Schutzgrenzen testen.
- [x] `OpenCodeDockerAdapter` als Feature-Flag-Testadapter vorbereiten.
- [x] Echte `opencode`-Ausführung standardmäßig blockieren.
- [x] Nicht-produktive Ende-zu-Ende-Probe im Test-Workspace vorbereiten.
- [x] Produktionsnahen Docker-Test mit gebautem Image ohne Provider ausführen.
- [x] opencode-Testimage `ptspace/opencode-test:1.17.13` bauen und Version prüfen.
- [x] OpenRouter-Modell- und Providerkonfiguration vorbereiten.
- [x] OpenRouter-Secret-Übergabe ohne Chat-, Workspace- oder Git-Leak vorbereiten.
- [x] PTSPACE-Kernel als pädagogische Engine in den Harness-Kontext einbinden.
- [x] Externen Vollkernel-Kontext ohne Admin-Freigabe blockieren.
- [x] Beschreibbare Kernel-Arbeitsbereiche für kontrollierte Evolution modellieren.
- [x] OpenRouter-Dialogtest mit erfolgreicher Modellantwort ausführen.
- [ ] Host-Bridge nur nach separater Sicherheitsentscheidung prototypisieren.

## 6. Material- und Export-MVP

- [x] MarkdownExporter implementieren.
- [x] Learning-Design-Export als Markdown erzeugen.
- [x] Materialentwurf als Markdown erzeugen.
- [x] OKF-Markdown vorbereiten.
- [x] OKF exportiert kuratierte Ergebnisse, nicht den rohen Denkprozess.
- [ ] PDF/DOCX-Export erst nach stabilem Markdown-Export starten.
- [ ] Nextcloud-Export zurückstellen, bis Exportfilter und Freigabelogik stabil sind.

## 7. Audio Worker Capability

- [ ] Audio im MVP nicht als direkte TTS-Funktion starten.
- [ ] Zuerst Capability-Modell anlegen.
- [ ] Script-only-Fallback als sichere erste Umsetzung modellieren.
- [ ] Transcript-Pflicht abbilden.
- [ ] Review-Vermerk abbilden.
- [ ] Transparenzhinweis für Unterrichtseinsatz abbilden.
- [ ] Voice Cloning realer oder identifizierbarer Personen im Default ausschließen.
- [ ] Providerwahl nicht als Lehrkraft-Entscheidung in die UI legen.

## 8. Tests und Qualität

- [x] Unit-Tests für Domain-Schemas.
- [x] Unit-Tests für Statusübersetzungen.
- [x] Unit-Tests für PermissionPolicy.
- [x] Unit-Tests für Exportfilter.
- [x] Integrationstest: Planungsraum erstellen erzeugt isolierten Workspace.
- [x] Integrationstest: Chat-Nachricht läuft über Backend und MockHarnessAdapter.
- [x] Integrationstest: Denkstand wird aus Workspace-Dateien gelesen.
- [x] UI-Test: Lehrer:innen-Modus zeigt keine Git-, Shell-, YAML- oder Harness-Prompts.
- [x] UI-Test: Mobile und Desktop Layout ohne Textüberlagerung.
- [ ] Repo-weite UTF-8-/Mojibake-Prüfung regelmäßig ausführen.
- [ ] `git diff --check` vor Abschluss sauber halten.
- [ ] Backend-Checks und Tests vor Abschluss ausführen.
- [ ] Frontend-/Gesamtbuild vor Abschluss ausführen.

## 9. Dokumentation

- [x] `docs/architecture.md` aus den bestehenden Specs extrahieren.
- [x] `docs/data-protection.md` konkretisieren.
- [x] `docs/ui-language.md` konkretisieren.
- [x] `docs/harness-opencode.md` ergänzen.
- [x] `docs/next-harness-stage.md` ergänzen.
- [x] `docs/okf-export.md` ergänzen.
- [x] `docs/nextcloud-integration.md` ergänzen.
- [x] `docs/operations-security.md` ergänzen.
- [x] Dokumentation nach erfolgreichem OpenRouter-Dialogtest aktualisieren.

## 10. Vor produktiver Schulnutzung klären

- [ ] Konkrete Authentifizierungsstrategie.
- [ ] Rollen- und Rechtekonzept für mehrere Lehrkräfte.
- [ ] Secret-Store für produktive Deployments.
- [ ] Datenaufbewahrung und Löschkonzept.
- [ ] Mandanten-/Schultrennung.
- [ ] Admin-Oberfläche für Integrationen und Runtimes.
- [ ] Sicherheitsmodell für echten `opencode`- oder Host-Bridge-Betrieb.
- [ ] Wissenschaftlich belastbare Quellenstrategie für fachliche Aussagen.
- [ ] Lizenz- und OER-Metadaten für Exporte.

## 11. Aktueller nächster Umsetzungsschnitt

1. Abschlusschecks sauber halten: Encoding-Scan, Backend-Checks, Backend-Tests, Build und `git diff --check`.
2. Kernel-Evolutionsläufe für Knowledge, Capabilities, Services und Worker als eigene Freigabe-Workflows modellieren.
3. Host-Bridge nur nach separater Sicherheitsentscheidung planen.
4. Vor Schulnutzung Authentifizierung, Rollen, Secret-Store, Datenaufbewahrung und Admin-Oberfläche klären.

Startklar für lokale Mock-Harness-Nutzung: ja.

Startklar für einen kontrollierten produktnahen Harness-Test: ja. Für produktiven Schulbetrieb fehlen weiterhin Authentifizierung, Rollen, Secret-Store, Datenaufbewahrung, Admin-Oberfläche und Sicherheitsreview der Host-Bridge.
