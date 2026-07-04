# TECH_STACK.md

# ptspace-app Technical Stack

> `ptspace-app` ist harness-first und UI-safe: Die Anwendung bietet eine pädagogische Browseroberfläche für einen im Hintergrund laufenden Pedagogical Thinking Space mit opencode/Harness, lokalem Workspace und kontrollierten Worker-/Renderer-Fähigkeiten.

---

## 1. Architekturüberblick

```text
Browser UI
  ↓
ptspace-backend
  ↓
opencode / Harness Container
  ↓
Pedagogical Thinking Space Kernel
  ↓
Projekt-Workspace + Git
  ↓
Worker / Renderer / Skills
  ↓
Exporte / OKF / externe Nextcloud
```

`ptspace-app` ist nicht das pädagogische Betriebssystem selbst. Das Betriebssystem besteht aus:

```text
pedagogical-thinking-space
+ opencode/Harness
+ Workspace
+ Skills/Worker
```

`ptspace-app` ist die sichere Oberfläche, Schutzschicht und Integrationsanwendung darum herum.

---

## 2. Frontend Stack

Empfohlener Frontend-Stack:

```text
SvelteKit
TypeScript
Tailwind CSS
shadcn-svelte oder Skeleton UI
Lucide Icons
```

### 2.1 Warum SvelteKit?

SvelteKit passt gut, weil die UI stark zustandsorientiert ist:

- Chat mit Streaming-Antworten,
- rechte Denkstand-Spalte,
- aufklappbare Karten,
- Live-Status für Worker und Harness,
- reaktive Aktualisierung von Denkstand, Entscheidungen und Materialien,
- ruhige, performante Oberfläche.

### 2.2 Warum Tailwind CSS?

Tailwind ermöglicht ein schnell iterierbares, konsistentes Interface ohne früh ein schweres Designsystem zu erzwingen.

Wichtig:

> Tailwind darf nicht zu einer technischen oder überladenen Oberfläche führen. Die UI soll ruhig, professionell, lesbar und schulalltagstauglich bleiben.

### 2.3 Komponentenbibliothek

Eine Komponentenbibliothek ist sinnvoll, aber optional.

Mögliche Optionen:

```text
shadcn-svelte
Skeleton UI
Melt UI / Bits UI
```

Komponenten sollen barrierearm, tastaturbedienbar und gut anpassbar sein.

### 2.4 Keine IDE-Ästhetik im Lehrer:innen-Modus

Im Lehrer:innen-Modus sollen nicht verwendet werden:

- sichtbare Code-Editoren,
- Dateibäume,
- Terminal-Ansichten,
- YAML-Editoren,
- Git-Graphen,
- technische Logs.

CodeMirror oder Monaco können in Admin-/Entwicklungsansichten genutzt werden, nicht im Standard-Planungsraum.

---

## 3. UI-Architektur

Empfohlene Frontend-Struktur:

```text
frontend/
  src/
    routes/
      +layout.svelte
      +page.svelte
      planning-rooms/
        +page.svelte
        [roomId]/
          +page.svelte
          materials/
          export/
          settings/
    lib/
      components/
        chat/
        thinking-state/
        cards/
        materials/
        export/
        status/
        layout/
      stores/
        planningRoom.ts
        conversation.ts
        thinkingState.ts
        tasks.ts
        materials.ts
        harnessStatus.ts
      api/
        client.ts
        streaming.ts
      types/
        planning.ts
        ui.ts
```

### 3.1 Zentrale UI-Komponenten

```text
PlanningRoomShell
CriticalFriendChat
ThinkingStatePanel
ThinkingStateCard
OpenDecisionsCard
NextStepsCard
DraftsCard
MaterialsCard
ExportPanel
IntegrationStatusBadge
TeacherFacingStatus
```

### 3.2 Rechte Denkstand-Spalte

Die rechte Denkstand-Spalte wird als Kartenmodell gebaut.

Technisch kann jede Karte denselben Grundtyp verwenden:

```ts
export type ThinkingCard = {
  id: string;
  title: string;
  summary?: string;
  count?: number;
  status?: 'empty' | 'open' | 'in_progress' | 'ready' | 'blocked';
  previewItems: Array<{
    id: string;
    title: string;
    subtitle?: string;
  }>;
  actions: Array<TeacherFacingAction>;
};
```

Die Karte ist im Normalzustand kompakt und kann aufgeklappt werden.

Klick auf eine pädagogische Aktion führt in der Regel zurück in den Chat mit dem Critical Friend.

Beispiel:

```ts
export type TeacherFacingAction = {
  id: string;
  label:
    | 'Im Gespräch klären'
    | 'Entwurf vorbereiten'
    | 'Prüfen lassen'
    | 'Für Unterricht freigeben'
    | 'Zum Teilen vorschlagen'
    | 'In Nextcloud exportieren';
  kind:
    | 'focus_conversation'
    | 'propose_service_request'
    | 'approve_decision'
    | 'request_review'
    | 'export';
  requiresTeacherDecision: boolean;
};
```

---

## 4. Backend Stack

Empfohlener Backend-Stack:

```text
Node.js
TypeScript
Fastify oder Hono
PostgreSQL
Redis + BullMQ für Jobs
Git CLI oder nodegit/isomorphic-git für Versionierung
Docker Compose
```

### 4.1 Warum eigenes Backend?

SvelteKit kann Server-Routen bereitstellen, aber `ptspace-app` sollte für produktive Nutzung ein eigenes Backend haben.

Das Backend ist die Schutz- und Orchestrierungsschicht für:

- Authentifizierung,
- Planungsräume,
- Rechte,
- Harness-Sessions,
- Workspace-Mounts,
- Permission Policy,
- Git-Versionierung,
- Secrets,
- Integrationen,
- Nextcloud-Export,
- OKF-Export,
- Worker-/Renderer-Jobs.

Das Frontend darf nicht direkt mit opencode, Git, Dateisystem, Nextcloud-Secrets oder TTS-Providern sprechen.

---

## 5. Backend-Module

Empfohlene Struktur:

```text
backend/
  src/
    app.ts
    routes/
      planningRooms.ts
      conversation.ts
      thinkingState.ts
      tasks.ts
      materials.ts
      exports.ts
      integrations.ts
      admin.ts
    domain/
      planningRoom.ts
      learningDesign.ts
      decision.ts
      task.ts
      serviceRequest.ts
      material.ts
      okf.ts
    services/
      harness/
        HarnessAdapter.ts
        OpenCodeAdapter.ts
        MockHarnessAdapter.ts
      workspace/
        WorkspaceManager.ts
        GitManager.ts
      policy/
        PermissionPolicy.ts
        TeacherDecisionPolicy.ts
      jobs/
        JobQueue.ts
      secrets/
        SecretStore.ts
      export/
        OkfExporter.ts
        NextcloudExporter.ts
        MarkdownExporter.ts
      parser/
        LearningDesignParser.ts
        ServiceRequestParser.ts
```

---

## 6. Harness Integration

### 6.1 Harness-first Grundsatz

Die ernsthafte Produktversion geht davon aus, dass ein Harness vorhanden ist.

Der MVP soll daher nicht als isolierter Chatbot gedacht werden, sondern als Browseroberfläche für einen echten Denkraum-Workspace.

```text
Frontend
  → Backend
    → HarnessAdapter
      → opencode serve / anderer Harness
        → Workspace
```

### 6.2 Austauschbarkeit

`opencode` ist die erste Zielruntime, aber nicht hart in die Produktlogik einzubauen.

Daher:

```ts
export interface HarnessAdapter {
  createSession(input: CreateHarnessSessionInput): Promise<HarnessSession>;
  sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult>;
  getSessionStatus(sessionId: string): Promise<HarnessStatus>;
  stopSession(sessionId: string): Promise<void>;
}
```

Die App spricht gegen ein eigenes Adapter-Interface, nicht direkt gegen opencode-spezifische API-Details.

### 6.3 opencode Container

Empfohlene Betriebsweise:

```text
opencode läuft containerisiert
opencode bekommt nur den aktuellen Projekt-Workspace gemountet
opencode läuft non-root
opencode erhält keine Nextcloud-Secrets
opencode erhält keine globalen SSH-Keys
opencode hat keinen Docker-Socket
opencode bekommt nur erlaubte Netzwerkzugriffe
```

---

## 7. Workspace und Git

Jeder Planungsraum erhält einen isolierten Workspace.

```text
workspaces/
  <room-id>/
    .git/
    kernel/
      AGENTS.md
      CRITICAL_FRIEND.md
      LEARNING_DESIGN.md
      ORCHESTRATION.md
      services/
      specs/
      capabilities/
      knowledge/
    project/
      learning-design.md
      decisions.md
      open-questions.md
      tasks/
      service-requests/
      drafts/
      materials/
      exports/
```

Die genaue Struktur kann sich ändern, aber die Isolation pro Planungsraum ist verbindlich.

### 7.1 Git intern

Git ist interne Versionierung.

Teacher-facing:

```text
„Gespeichert: Lernanliegen geklärt“
```

Nicht teacher-facing:

```text
git add .
git commit -m "..."
```

Forgejo ist nicht für Version 1 erforderlich. Es kann später ergänzt werden, falls institutionelle Repo-Verwaltung, Reviews oder Admin-Oberflächen nötig werden.

---

## 8. Datenbank

PostgreSQL speichert Metadaten und UI-Zustände.

Beispiele:

```text
users
planning_rooms
planning_room_members
conversations
messages
thinking_cards
tasks
materials
exports
integration_status
harness_sessions
```

Die inhaltliche Wahrheit des Learning Designs liegt zusätzlich im Workspace, damit Kernel, Harness und Exporte dateibasiert arbeiten können.

---

## 9. Queue und Hintergrundjobs

Redis + BullMQ oder eine vergleichbare Queue verwaltet Hintergrundarbeit:

```text
- Harness-Nachrichten
- Worker-Aufgaben
- Renderer-Aufgaben
- OKF-Export
- Nextcloud-Upload
- PDF/DOCX-Rendering
- Review-Jobs
```

Teacher-facing Status wird aus Jobstatus übersetzt.

```text
queued        → „wartet kurz“
in_progress  → „wird vorbereitet“
completed    → „liegt zur Prüfung bereit“
failed        → „konnte noch nicht erstellt werden“
```

---

## 10. Permission Policy

Technische Permissions werden nicht an Lehrkräfte durchgereicht.

```text
opencode/tool ask
  ↓
Backend Permission Policy
  ↓
allow / deny / admin required / pedagogical question
```

### 10.1 Lehrkraft entscheidet

Lehrkräfte entscheiden über:

- pädagogischen Zweck,
- fachliche Richtung,
- Freigabe von Entwürfen,
- Export in Schulablagen,
- Teilen als OKF,
- Nutzung externer Dienste, sofern institutionell erlaubt.

### 10.2 Backend entscheidet

Das Backend entscheidet über:

- technische Tool-Erlaubnisse,
- Workspace-Grenzen,
- Dateizugriffe,
- erlaubte Provider,
- Secret-Nutzung,
- Netzwerkzugriffe,
- Runtime-Verfügbarkeit.

### 10.3 Admin entscheidet

Admins entscheiden über:

- Installation von Runtimes,
- Freigabe externer Provider,
- Secrets,
- Datenaufbewahrung,
- Mandantenfähigkeit,
- Sicherheitsprofile.

---

## 11. Secrets und Integrationen

Secrets werden nie im Chat eingegeben.

Secrets gehören in:

```text
Docker Secrets
verschlüsselte Datenbank
Vault / Secret Manager
.env nur für lokale Entwicklung
```

Teacher-facing Beispiel:

```text
„Bitte poste den API-Key nicht im Chat. Du kannst ihn unter Einstellungen → Integrationen → ElevenLabs hinterlegen.“
```

Der Critical Friend darf Integrationswege erklären, aber keine Secrets entgegennehmen.

---

## 12. Skills, Capabilities und Worker

### 12.1 Begriffstrennung

```text
Task
= pädagogisch benannter nächster Schritt in ptspace-app

Capability
= App-seitige Regel, wie eine Aufgabenart pädagogisch behandelt wird

Skill
= technische Fähigkeit im Harness oder Worker-Runtime
```

Beispiel Audio:

```text
Task:
„Dialogentwurf für Audio vorbereiten“

Audio Worker Capability:
Regeln zu Transcript, Review, Transparenz, Freigabe, Providerstatus

tts-generation Skill:
technische Erzeugung der Audiodatei über lokale TTS-Runtime oder freigegebenen Provider
```

### 12.2 Skill-Ausführung

Skills werden nicht direkt von der Lehrkraft gestartet.

Ablauf:

```text
Critical Friend schlägt pädagogischen Schritt vor
Lehrkraft stimmt zu
Backend erzeugt Service Request
Policy prüft
Harness führt Skill aus
Ergebnis kehrt zum Critical Friend zurück
Critical Friend prüft
Lehrkraft sieht teacher-facing Ergebnis
```

---

## 13. Externe Nextcloud

Nextcloud ist externe Zielablage, nicht interner Denkraum.

```text
ptspace-app intern:
- Denkstand
- Entscheidungen
- Service Requests
- Entwürfe
- Versionen

Nextcloud extern:
- fertige Unterrichtsdateien
- PDF
- DOCX
- PPTX
- H5P
- Moodle-ZIP
- Quellenübersicht
```

Nextcloud-Anbindung erfolgt über Backend-Connector, nicht durch opencode und nicht direkt aus dem Browser.

---

## 14. OKF

OKF ist Austausch- und Kurationsformat.

Exportiert werden kuratierte Ergebnisse:

```text
- Learning Design
- Knowledge Proposal
- didaktisches Muster
- Quellenpaket
- Capability Proposal
- Materialpaket
```

Nicht exportiert wird standardmäßig:

```text
- roher Chatverlauf
- interne Service Requests
- persönliche Reflexionen
- technische Logs
- Secrets
```

---

## 15. Docker Compose Zielbild

Ein mögliches Compose-Setup:

```yaml
services:
  frontend:
    build: ./frontend
    depends_on:
      - backend

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://redis:6379
    volumes:
      - workspaces:/app/workspaces
    depends_on:
      - postgres
      - redis
      - opencode

  opencode:
    image: ghcr.io/anomalyco/opencode:latest
    user: "1000:1000"
    volumes:
      - workspaces:/workspaces
    # no docker socket
    # restricted network where possible

  postgres:
    image: postgres:16
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7

volumes:
  workspaces:
  postgres-data:
```

Dies ist ein Zielbild, keine finale Produktionskonfiguration.

---

## 16. Entwicklungsphasen

### Phase 0.1: Harness-first MVP

```text
- SvelteKit UI
- Planungsraum anlegen
- Chat mit Critical Friend über Backend → Harness
- Workspace pro Planungsraum
- Denkstand-Karten rechts
- Tasks / nächste Schritte sichtbar
- einfache Materialentwürfe über Harness
- interne Git-Versionierung
```

### Phase 0.2: Worker und Renderer

```text
- Service Request Parser
- Worker-/Renderer-Status
- Materialbereich
- Review-Flows
- Markdown/PDF/DOCX Export
```

### Phase 0.3: Integrationen

```text
- Nextcloud Export
- OKF Export
- Audio Worker Capability
- tts-generation Skill-Anbindung
- Admin Runtime Status
```

### Phase 0.4: Kollaboration

```text
- mehrere Lehrkräfte im Planungsraum
- Rollen und Rechte
- gemeinsame Chatansicht
- Critical Friend moderiert Teamplanung
```

---

## 17. Nicht-Ziele des Tech Stacks

Version 1 soll nicht versuchen:

- Forgejo zwingend zu integrieren,
- Browserautomation als Standardfeature einzubauen,
- ComfyUI automatisch zu installieren,
- technische Permission-Prompts an Lehrkräfte weiterzugeben,
- opencode zur sichtbaren UI zu machen,
- Nextcloud als internen Denkraum zu verwenden,
- rohe Chats als Austauschformat zu behandeln.

---

## 18. Architekturentscheidungen

- **Entscheidung 39:** Die UI wird als pädagogischer Planungstisch beschrieben, nicht als Agenten-, Repo- oder IDE-Oberfläche.
- **Entscheidung 40:** SvelteKit + Tailwind ist der vorgeschlagene Frontend-Stack.
- **Entscheidung 41:** Das Backend bleibt als eigene Schutz- und Orchestrierungsschicht getrennt vom Frontend.
- **Entscheidung 42:** Lehrer:innen-Modus zeigt keine technischen Artefakte wie Dateipfade, YAML, Git, Shell, Permissions oder Provider-Details.
- **Entscheidung 43:** UI-Komponenten übersetzen Workspace-Zustände in pädagogische Begriffe.
- **Entscheidung 44:** Die rechte Seite besteht aus kompakten, aufklappbaren Denkstand-Karten.
- **Entscheidung 45:** Karten zeigen im Normalzustand Zusammenfassung, Anzahl und wichtigste Einträge.
- **Entscheidung 46:** Klick auf eine Karte öffnet Details und pädagogische Aktionen.
- **Entscheidung 47:** Die wichtigste Aktion heißt nicht technisch „Task ausführen“, sondern z. B. „Im Gespräch klären“, „Entwurf vorbereiten“, „Prüfen lassen“, „Für Unterricht freigeben“.
- **Entscheidung 48:** Detailaktionen führen zurück in den Dialog mit dem Critical Friend, statt die Lehrkraft in technische Bearbeitungsformulare zu schicken.

---

## 19. Kurzform für Implementierende

```text
Build a SvelteKit + Tailwind teacher-facing planning interface.
Do not build an IDE.
Do not expose opencode.
Do not expose Git.
Do not expose YAML.
Do not ask teachers technical permission questions.

The product is harness-first:
- backend controls opencode/harness
- frontend shows chat and pedagogical state
- right side is collapsible thinking-state cards
- tasks are teacher-facing next steps
- worker/skill execution is hidden and policy-controlled
```

---

## Multi-harness support

The backend must implement harness access through an adapter layer.

```ts
export interface HarnessAdapter {
  id: string;
  label: string;
  mode: 'docker' | 'host-bridge' | 'external' | 'mock';
  checkAvailability(): Promise<HarnessAvailability>;
  createSession(input: CreateHarnessSessionInput): Promise<HarnessSession>;
  sendMessage(input: SendHarnessMessageInput): Promise<HarnessMessageResult>;
  getEvents(input: HarnessEventsInput): AsyncIterable<HarnessEvent>;
  requestTask(input: HarnessTaskRequest): Promise<HarnessTaskResult>;
  stopSession(input: StopHarnessSessionInput): Promise<void>;
}
```

Recommended initial adapters:

```text
OpenCodeDockerAdapter
HostBridgeHarnessAdapter
MockHarnessAdapter
```

Future adapters:

```text
ClaudeCodeBridgeAdapter
CodexBridgeAdapter
HermesBridgeAdapter
ExternalHarnessServerAdapter
```

### Host Harness Bridge

For local desktop tools, use a small host-side bridge service.

```text
ptspace-backend container
  → http://host.docker.internal:<bridge-port>
  → ptspace-harness-bridge
  → local harness CLI/SDK
```

The bridge is responsible for:

- detecting available local harnesses,
- launching or resuming sessions,
- limiting access to approved workspace folders,
- returning structured events,
- keeping local credentials local.

The Docker backend must not mount local credential directories or execute arbitrary host commands.

### `host.docker.internal` usage

Use `host.docker.internal` only to call an explicitly started bridge service. Do not use it as a substitute for a real adapter, secret store or permission model.

### Credential handling

Credentials may live in:

- Docker Secrets,
- server-side environment variables,
- encrypted app secret storage,
- harness-specific auth volumes,
- local harness configuration owned by the Host Harness Bridge.

Credentials must not be stored in:

- chat messages,
- project workspace files,
- Git commits,
- service requests,
- OKF exports,
- Nextcloud exports,
- frontend state.

See `HARNESS_ADAPTERS.md`.

