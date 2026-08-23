# DeepSeek Harness – Adaptive Runtime (L5b Evaluation)

Status: **Spike / Evaluation.** Der DeepSeek Harness wird als Kandidat für die
**adaptive Runtime** der Ausführungsarchitektur evaluiert (siehe
`EXECUTION_ARCHITECTURE.md`). Er ist keine neue Baseline und ersetzt weder
`DirectLlmAdapter` (Baseline für begrenzte semantische Aufgaben) noch
`OpenCodeDockerAdapter` (Coding-/Kernel-Stufe).

## 1. Zweck

Die adaptive Runtime soll offene Aufgaben ermöglichen, deren Ablauf nicht im
Voraus vollständig festgelegt werden kann:

- Skills
- offene Recherche und Perspektivenerschließung
- persistente Runtime-Sessions
- selbstorganisierte bounded Workflows
- Workflow Memory
- Hintergrundarbeit
- Context Injection
- selektive Subagents
- Runtime Learning

Ein reiner „send message → receive answer“-Pfad gilt **nicht** als Erfolg –
das kann `DirectLlmAdapter` einfacher.

## 2. Architektur und Adaptergrenze

DeepSeek-spezifische Konzepte leben ausschließlich innerhalb von
`backend/src/services/harness/DeepSeekHarnessAdapter.ts`. Es dürfen keine
DeepSeek-Typen in die PTS-Domain (`@ptspace/shared`) oder das Frontend gelangen.

```text
PTS Domain / Orchestration
        │
        ▼
HarnessAdapter (PTS-neutral)
        │
        ▼
DeepSeekHarnessAdapter
        │  (kapselt DeepSeek vollständig)
        ▼
DeepSeekRuntimeTransport (injizierbare, schmale Grenze)
```

Der reale Transport wird über `DeepSeekRuntimeTransport` injiziert. Ohne
verbundenen Transport meldet der Adapter `requires_setup`, statt instabile
Upstream-API-Details zu erraten. Dadurch bleibt die Adaptergrenze mit Fake/Stub
testbar (`backend/test/DeepSeekHarnessAdapter.test.ts`).

## 3. Installation / Konfiguration

### Bevorzugter Transport: `DshOpenAiRuntimeTransport` (Headless-Adapter)

**Empfohlener Pfad (seit 2026-08-23).** Der frühere `dsh web`-Polling-Transport
erwies sich in der Praxis als unzuverlässig (hängende Turns, mehrminütige
Timeouts ohne Antwort). Der OpenAI-kompatible Headless-Adapter ist dagegen
zustandslos pro Request: Ein Aufruf blockiert, bis der fertige Headless-Turn
vorliegt – kein History-Polling, keine Session-Korrelation.

Der Adapter liegt im Repo unter `services/dsh-openai-adapter/`
(zero-dependency, Node >= 18):

```bash
cd services/dsh-openai-adapter
npm start                # → http://127.0.0.1:3110/v1
npm test                 # Mock-Smoke-Test ohne Tokenverbrauch
```

Im Docker-Stack startet der Service `dsh-adapter` aus `docker-compose.yml`.

Konfiguration ptspace-app:

```text
PTSPACE_HARNESS=deepseek
PTSPACE_REAL_HARNESS_ENABLED=true
PTSPACE_DEEPSEEK_OPENAI_URL=http://127.0.0.1:3110
PTSPACE_DEEPSEEK_MODEL=dsh-headless          # Default
PTSPACE_DEEPSEEK_ADAPTER_API_KEY=<key>       # nur falls der Adapter einen erzwingt
PTSPACE_DEEPSEEK_TIMEOUT_MS=600000           # Default; Headless-Turns mit Tools können dauern
```

Die Modell-Credential liegt im installierten `@deepseek-ai/dsh` (Settings →
Models), nicht auf PTS-Seite. Eine konfigurierte `PTSPACE_DEEPSEEK_OPENAI_URL`
erfüllt daher die Admin-Credential-Voraussetzung dieser Stufe.

Session-Semantik: Der Headless-Adapter kennt keine Server-Sessions.
`createSession()` minted eine rein PTS-lokale ID; der Konversationskontext wird
als Präfix in den User-Prompt eingebettet. Der Harness-Gedächtnis-Loop
*innerhalb* eines Turns (Tools, Skills, Workspace) bleibt voll erhalten.

Verifiziert (2026-08-23): Echter Companion-Turn über das PTS-Backend lieferte
eine Antwort in ~12,6 s inkl. korrekt gemappter Usage.

### Legacy-Transport: `DshWebRuntimeTransport` (dsh web, Polling)

Lokale `dsh web`-Instanz starten (DeepSeek Harness):

```bash
npx @deepseek-ai/dsh web    # Web UI + Server auf http://127.0.0.1:3080
```

In der laufenden dsh-Instanz unter *Settings → Models* eine DeepSeek-kompatible
Credential hinterlegen. Danach ptspace-app konfigurieren:

```text
PTSPACE_HARNESS=deepseek
PTSPACE_REAL_HARNESS_ENABLED=true
PTSPACE_DEEPSEEK_WEB_URL=http://localhost:3080
PTSPACE_DEEPSEEK_API_PREFIX=/api        # Default; bei abweichender dsh-Version anpassen
PTSPACE_DEEPSEEK_TIMEOUT_MS=120000
PTSPACE_DEEPSEEK_VERSION=<gepinnte Version/Commit>
```

Die Modell-Credential liegt in dsh selbst, nicht auf PTS-Seite. Eine
konfigurierte `PTSPACE_DEEPSEEK_WEB_URL` erfüllt daher die
Admin-Credential-Voraussetzung dieser Stufe (`apiKeyAvailable`).

Ohne `PTSPACE_DEEPSEEK_WEB_URL` erzeugt `createHarness()` in `app.ts` den Adapter
weiterhin ohne `runtime`, sodass er `requires_setup` meldet.

### Realer Transport: `DshWebRuntimeTransport`

`backend/src/services/harness/DshWebRuntimeTransport.ts` spricht das **Unary-API-
Protokoll der dsh-web-Instanz** (live gegen dsh web rev `8b2404a806ca`
verifiziert). Er ist die einzige Stelle mit DSH-spezifischem Transportwissen und
bleibt hinter der `DeepSeekRuntimeTransport`-Grenze.

Wire-Format:

```text
POST /api/<method>   Body: { type:"client-request", rpcId:<uuid>, method, payload }
Antwort:             { type:"server-response", rpcId, result:{ ok, value } | { ok:false, error } }
```

- `isAvailable()` prüft per HTTP-GET auf die Basis-URL, ob dsh-web läuft.
- `createSession()` ruft `session.create` mit `{ cwd: <workspaceRoot> }` auf und
  übernimmt die vom Host gemintete `sessionId`; ein Resume nutzt dieselbe ID.
- `sendTurn()` sendet `session.prompt` (`{ sessionId, mode:"queue",
  content:[{type:"text",text}], clientTimeZone }`) und pollt dann
  `session.history`, bis ein `turn/end`-Event erscheint. Die Antwort wird aus
  dem letzten `assistant/message`-Event gelesen (Textblöcke), die Usage aus
  `assistant/chunk` mit `chunk.type === "usage"`.
- Antwort- und Usage-Auswertung ist tolerant (mehrere plausible Feldnamen).

**Developer-Preview-Risiko:** DSH kündigt kompatibilitätsbrechende Änderungen an.
API-Pfadpräfix und Methodennamen sind deshalb konfigurierbar (Defaults `/api`,
`session.create`/`session.prompt`/`session.history`/`session.cancel`), damit der
Betrieb sie ohne Codeänderung an die laufende Version angleichen kann.

**Status:** Legacy. Nur verwenden, wenn `PTSPACE_DEEPSEEK_OPENAI_URL` nicht
gesetzt ist; `openAiUrl` hat in `createHarness()` Vorrang vor `webUrl`.

## 4. Session Mapping

- `createSession()` bildet auf eine **persistente** DeepSeek-Session pro
  Planungsraum ab und versucht zuerst ein `resumeSession()` (kein doppelter
  Session-Aufbau nach Backend-Neustart).
- Runtime-Sessions sind **operativer** Zustand. Der Planungsraum bleibt ohne
  DeepSeek-Session rekonstruierbar; kanonische Entscheidungen werden immer aus
  dem Workspace gelesen, nicht aus Session History.

## 5. Event Mapping

Native DeepSeek-Agent-Loop-Events werden **nicht** nach außen gereicht. Der
Adapter liefert nur PTS-neutrale `HarnessEvent`s (`status`,
`waiting_for_backend_policy`, `workspace_update`).

## 6. Skill Mapping

Die Skill Registry (`backend/src/services/runtime/SkillRegistry.ts`) bleibt
PTS-owned. DeepSeek darf einen Skill ausführen, aber nicht definieren, was ein
gültiger produktiver PTS-Skill ist. Nur `reviewed`/`approved` Skills sind
produktiv auswählbar; automatisch erzeugte Kandidaten starten als
`experimental` und werden nicht ohne Prüfung promotet.

## 7. Policy Boundary

- Der Browser spricht nie direkt mit der Runtime.
- Backend-Policy ist autoritativ (`simulatePolicy()` zeigt die Grenzen).
- Secrets gelangen nicht in Modellkontext, Workspace, Git oder teacher-facing
  Fehlermeldungen.
- Worker-/Review-Ausführung läuft im Spike bewusst **nicht** über DeepSeek
  (`requestTask()` wirft `deepseek_adapter_task_not_supported`); Direct LLM
  bleibt dafür Baseline.

## 8. Runtime Usage / Telemetrie

`sendMessage()` liefert eine providerunabhängige `RuntimeUsage`
(`modelCalls`, `inputTokens`, `outputTokens`, `cachedTokens`, `toolCalls`,
`runtimeMs`). Fehlende Providerdaten bleiben `undefined`; es wird nichts
geschätzt. Die Struktur ist für L6 (Qualität/Ökonomie) vorbereitet und enthält
keine Gesprächsinhalte, Secrets oder personenbezogenen Daten.

## 9. Bekannte Einschränkungen / Upstream-Risiken

- DeepSeek Harness befindet sich in aktiver Entwicklung; die verwendete Version
  ist über `PTSPACE_DEEPSEEK_VERSION` zu pinnen.
- Der reale Transport (`DshWebRuntimeTransport`) ist gegen eine lokale
  `dsh web`-Instanz angebunden. API-Pfadpräfix und Methodennamen sind developer-
  preview-bedingt konfigurierbar; weichen sie in der laufenden dsh-Version ab,
  sind sie über `PTSPACE_DEEPSEEK_API_PREFIX` bzw. die `methods`-Optionen
  anzugleichen.
- Skills, Workflow Memory und Runtime-Lernen sind als PTS-owned Verträge
  vorbereitet, aber noch nicht über DeepSeek ausgeführt.

## 10. Smoke-Test

```bash
# Adaptergrenze und realer Transport (Fake/Stub, ohne laufende dsh-Instanz):
pnpm --filter @ptspace/backend test -- DeepSeekHarnessAdapter
pnpm --filter @ptspace/backend test -- DshWebRuntimeTransport
```

Live gegen eine laufende Instanz: `npx @deepseek-ai/dsh web` starten, in dsh eine
Modell-Credential hinterlegen, `PTSPACE_HARNESS=deepseek`,
`PTSPACE_REAL_HARNESS_ENABLED=true` und `PTSPACE_DEEPSEEK_WEB_URL=http://localhost:3080`
setzen und einen Companion-Turn in einem nicht-sensiblen Test-Planungsraum senden.

## 11. Vergleich mit Direct LLM

| Aufgabe                        | Direct LLM              | Adaptive Runtime (DeepSeek) |
| ------------------------------ | ----------------------- | --------------------------- |
| normaler Companion-Turn        | einfacher, günstiger    | Overkill                    |
| offene Perspektivenrecherche   | nur mit hartem Workflow | vermuteter Mehrwert         |
| bekannter Worker-Entwurf       | ausreichend             | nicht nötig                 |
| Workspace-Maintenance          | deterministisch + Check | nur bei semantischen Fällen |

Diese Tabelle bleibt bis zur Anbindung des realen Transports eine Hypothese; die
Usage-Struktur liefert die Datenbasis für die spätere reale Bewertung.
