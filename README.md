# ptspace-app

> **A pedagogical planning environment for teachers — powered by the Pedagogical Thinking Space kernel.**
>
> The app is not an agent interface, not a prompt generator and not a coding environment. It is a quiet professional planning space in which teachers think together with a Critical Friend, develop a shared Learning Design and turn well-founded decisions into teaching materials.

---

## 1. Purpose

`ptspace-app` is the intended application layer for the ideas developed in:

<https://github.com/johappel/pedagogical-thinking-space>

The existing repository defines the pedagogical architecture: Critical Friend, Learning Design, Memory, Knowledge, Worker, Renderer, Service Requests and Capabilities.

`ptspace-app` turns that architecture into a usable browser-based environment for teachers.

The central question is not:

> What should the AI generate?

but:

> What kind of learning experience are we trying to create?

The app therefore starts from professional pedagogical reflection and only later moves toward production, export and sharing.

---

## 2. Relationship to `pedagogical-thinking-space`

The two repositories have different responsibilities.

```text
pedagogical-thinking-space
= pedagogical kernel, reference architecture, role definitions, schemas, principles

ptspace-app
= concrete product, user interface, backend, storage, runtime integration, export workflows
```

The kernel repository answers questions such as:

- What is the role of the Critical Friend?
- What is a Learning Design?
- When should reflection continue?
- When may work be delegated to Workers?
- How are Service Requests structured?
- How are Knowledge Proposals, Capabilities and Renderers defined?

The app repository answers questions such as:

- How does a teacher experience this in the browser?
- How are planning rooms created?
- How is a dialogue stored and summarized?
- How are Learning Designs versioned?
- How are exports generated?
- How are OKF packages shared?
- How does the app connect to opencode, local Git and external Nextcloud instances?

`pedagogical-thinking-space` is therefore the **pedagogical operating model**.

`ptspace-app` is the **working environment** built around it.

---

## 3. Core Product Idea

Teachers should not have to work inside Codex, opencode, Git, Forgejo or a repository browser.

They should see a professional planning environment using familiar pedagogical language:

```text
Conversation
Denkstand
Offene Entscheidungen
Nächste Schritte
Materialien
Export / Teilen
```

The technical structures remain available in the background, but the user interface translates them into professional teacher-facing concepts.

For example:

```text
Technical layer                       Teacher-facing layer
----------------------------------------------------------
workspace/<project>/learning-design.md  Denkstand
workspace/<project>/decisions.md        Entscheidungen
workspace/<project>/service-requests/   Nächste Schritte / Aufträge
drafts/                                 Entwürfe
materials/                              Materialien
exports/                                Für den Unterricht bereit
knowledge/_proposals/                   Zum Teilen vorgeschlagen
```

This translation is a core design principle, not a cosmetic detail.

---

## 4. Human Interaction Model

The primary interaction is a dialogue with the **Critical Friend**.

The Critical Friend is not an omniscient expert and not a material generator. It is a professional conversation partner that helps teachers think more clearly, make conscious pedagogical decisions and preserve responsibility for their own teaching.

The interface should therefore feel less like this:

```text
Prompt → AI output
```

and more like this:

```text
Teacher(s) ↔ Critical Friend ↔ shared Learning Design
```

The Critical Friend may:

- ask clarifying questions,
- summarize the current state of thinking,
- mark open decisions,
- introduce one relevant professional perspective,
- suggest consulting Knowledge,
- suggest recalling Memory,
- propose a Worker task,
- review generated material before it becomes teacher-facing.

The Critical Friend should not:

- replace the teacher’s judgement,
- silently generate materials before the pedagogical intention is clear,
- overwhelm the teacher with many options,
- expose technical service logic as the main interface,
- let Workers or Renderers speak directly to the teacher.

---

## 5. Planning Rooms Instead of Repositories

The central object of the app is the **Planungsraum**.

A Planungsraum is a shared pedagogical space for one teaching idea, lesson, unit, project or professional learning process.

A planning room may contain:

```text
Planungsraum
├─ conversation
├─ learning-design
├─ decisions
├─ open-questions
├─ next-steps
├─ service-requests
├─ drafts
├─ materials
├─ exports
└─ okf-package
```

Teachers should not experience this as a file tree. They should experience it as an evolving professional planning table.

Possible UI areas:

```text
Gespräch
Denkstand
Offene Entscheidungen
Nächste Schritte
Materialien
Export / Teilen
```

---

## 6. Collaboration Model

Collaboration is not primarily imagined as collaborative Git editing.

Instead, collaboration happens in a **shared chat room with the Critical Friend**.

```text
Teacher A
Teacher B
Teacher C
    ↕
Critical Friend
    ↕
Shared Learning Design
```

The Critical Friend moderates the shared planning process. It helps the group clarify where agreement exists, where alternatives remain open and which pedagogical decisions are sufficiently stable for implementation.

This makes the app suitable for:

- co-planning between colleagues,
- subject teams,
- year-group teams,
- teacher training,
- professional learning communities,
- curriculum development groups,
- workshop settings.

The app may still use Git internally, but teachers should not need to understand Git in order to collaborate.

---

## 7. Internal Architecture

A minimal architecture may look like this:

```text
┌─────────────────────────────────────┐
│ Browser Frontend                    │
│ Gespräch | Denkstand | Schritte     │
│ Materialien | Export                │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│ ptspace-backend                      │
│ Auth, projects, planning rooms       │
│ workspace management, service logic  │
│ Git versioning, OKF export           │
│ Nextcloud export                     │
└────────┬──────────────────┬─────────┘
         │                  │
┌────────▼────────┐   ┌─────▼─────────┐
│ Harness          │   │ local Git      │
│ e.g. opencode    │   │ versioning     │
└────────┬────────┘   └───────────────┘
         │
┌────────▼────────────────────────────┐
│ Project Workspace                    │
│ learning-design.md                   │
│ decisions.md                         │
│ service-requests/                    │
│ drafts/ materials/ exports/          │
└────────┬────────────────────────────┘
         │
┌────────▼────────────────────────────┐
│ External school Nextcloud            │
│ finished files and shared exports    │
└─────────────────────────────────────┘
```

The browser must not directly control the harness.

The backend is the protective layer. It decides which operations are allowed, where files may be written and which results become visible to teachers.

---

## 8. Role of opencode or Another Harness

`opencode` or a compatible harness is part of the intended first serious product architecture. The app is not designed as a standalone chat system that may someday receive a harness. It is designed as a safe, teacher-facing frontend for an already functioning harness-based Pedagogical Thinking Space.

The harness should not become the teacher-facing environment.

The app should treat the harness as replaceable:

```text
ptspace-backend
  → creates or resumes a session
  → provides kernel instructions and planning-room context
  → sends the teacher message
  → receives a Critical Friend response and possible file changes
  → extracts or validates Service Requests
  → updates the planning room
```

The product should therefore not be designed as an opencode UI.

It should be designed as a pedagogical planning app that controls opencode, a custom orchestrator or another compatible runtime through a safe backend adapter. The harness is core infrastructure, but it must remain replaceable and must never dictate the teacher-facing product language.


### Harness-first, UI-safe

The product vision is now **harness-first, but UI-safe**.

```text
pedagogical-thinking-space
  = pedagogical operating system
  = roles, rules, service model, Learning Design, Knowledge, Memory, Worker, Renderer

opencode / compatible harness
  = runtime and process engine
  = reads the kernel and workspace
  = runs the Critical Friend and service workflows
  = edits files, uses skills and produces artefacts inside a sandbox

ptspace-app
  = teacher-facing desktop and protection layer
  = chat, Denkstand, next steps, materials, approvals, exports
  = auth, policies, permissions, integration status and safe routing
```

This means the app should not be specified as “chat first, harness later”. For a meaningful MVP, the app must talk to a real or mocked harness through the same backend interface that will later be used in production. During development, the harness may be mocked, but the product model assumes that the Critical Friend operates on a real planning-room workspace.

### Capability vs. Harness Skill

`ptspace-app` distinguishes between app-level capabilities and runtime-level skills.

```text
Capability
  belongs to ptspace-app
  describes pedagogical workflow, permissions, review, fallback, UI language and return path

Skill
  belongs to opencode, MCP, a worker container or another runtime
  performs the concrete technical operation
```

Example:

```text
Audio Worker Capability
  app-level contract for audio dialogue material

tts-generation skill
  harness/runtime implementation that may call ElevenLabs, ComfyUI, local TTS or script-only fallback
```

The Critical Friend may propose the capability. The backend routes it to an approved skill. Teachers should not be asked which runtime or provider should execute it unless the choice has a pedagogical or organisational meaning.

---

## 9. Git, Forgejo and Nextcloud

### Git

Git is useful as an internal versioning mechanism.

The backend may create automatic commits after meaningful planning steps:

```text
git commit -m "Lernanliegen geklärt"
git commit -m "Lernreise skizziert"
git commit -m "Materialentwurf erzeugt"
```

The teacher sees:

```text
Gespeichert: Lernanliegen geklärt
```

not:

```text
commit 7f3a9c...
```

### Forgejo

Forgejo is optional.

It may become useful later for institutional repository management, administration, review workflows or migration. It is not required for the first prototype.

The current assumption is:

```text
Version 1: local Git only
Later: optional Forgejo integration if institutional workflows require it
```

### Nextcloud

Nextcloud is external and belongs to the school or institution.

It is not the internal thinking space.

It is used for finished exports and school-facing files:

```text
- Stundenentwurf.pdf
- Arbeitsblatt.docx
- Präsentation.pptx
- Moodle package
- H5P package
- Quellenübersicht.pdf
```

Raw chats, unfinished reflections and sensitive notes should not be exported automatically.

---

## 10. OKF as Exchange Format

OKF is the preferred format for professional exchange and curation.

The app should distinguish between:

```text
Raw dialogue
= living collaboration, usually not exported

Learning Design
= structured current state of pedagogical thinking

OKF package
= portable, curated, shareable professional artefact
```

OKF should be used for:

- Learning Designs,
- Knowledge Proposals,
- method patterns,
- didactic patterns,
- curriculum references,
- source collections,
- Capability Proposals,
- reusable professional insights.

OKF should not simply contain the full raw chat.

The intended export logic is:

```text
Dialogue → reflected Denkstand → Learning Design → OKF package
```

Possible package structure:

```text
okf-package/
├─ manifest.yml
├─ learning-design.okf.md
├─ decisions.okf.md
├─ sources.okf.md
├─ knowledge-proposals/
├─ materials/
└─ exports/
```

---

## 11. Service Requests as Internal Nervous System

The app should implement Service Requests as a central internal concept.

A Service Request makes delegation explicit.

The teacher may see:

```text
Soll ich den Lehrplanbezug prüfen?
```

The backend stores something like:

```yaml
id: sr-2026-07-04-001
status: proposed
service: knowledge
mode: retrieve
reason: >
  The current Learning Design requires a reliable curriculum reference.
input:
  learning_design: workspace/treu-bleiben-statt-angst/learning-design.md
expected_output:
  type: curriculum_reference
  format: markdown
return_to: critical_friend
requires_approval: true
```

This protects the central principle:

> Reflection remains visible. Production, retrieval and rendering are delegated only when appropriate.

---

---

## 12. Runtime, Integrations and Secrets

`ptspace-app` separates pedagogical questions from technical permissions.

Teachers should never be asked to answer raw harness prompts such as:

```text
Allow POST request to external API?
Run docker pull?
Install package?
Enter API key in chat?
```

Instead:

```text
technical permission
  → backend policy

pedagogical decision
  → Critical Friend asks the teacher

system setup
  → admin configuration or admin request
```

The Critical Friend may explain setup paths in teacher-facing language. For example:

```text
The ElevenLabs key is not entered here in the chat.
Use Settings → Integrations → ElevenLabs.
I only see whether the integration is available, not the key itself.
```

Or:

```text
A local ComfyUI/TTS runtime is not useful on a tablet.
For everyday teaching, use the web app and let audio generation run on an approved server runtime or approved external provider.
```

Worker services must not install or modify runtimes on their own. Missing capabilities lead to:

```text
script-only fallback
admin request
clear explanation by the Critical Friend
```

Secrets belong in integration settings, admin configuration, Docker secrets, encrypted storage or a dedicated secret manager — never in the planning dialogue.

---

## 14. Data Protection Principles

The app should be designed with school data protection requirements in mind from the beginning.

Initial principles:

- The browser never talks directly to the harness.
- The backend controls all file and runtime operations.
- Workspaces are isolated per planning room.
- Student data should be avoided, minimized or pseudonymized.
- Raw conversations are not automatically exported.
- Nextcloud receives only explicitly exported files.
- LLM providers must be configurable.
- Local or institutionally hosted models should be supported where possible.
- Logs must not contain unnecessary personal data.
- Admin access and backup policies must be explicit.

The app should support a deployment model in which frontend, backend, runtime and storage run in Docker, while a school Nextcloud remains external.

---

## 14. Suggested Repository Structure

A first implementation may use this structure:

```text
ptspace-app/
├─ README.md
├─ AGENTS.md
├─ PRODUCT_SPEC.md
├─ docker-compose.yml
├─ .env.example
│
├─ frontend/
│  ├─ app/
│  ├─ components/
│  └─ README.md
│
├─ backend/
│  ├─ src/
│  ├─ tests/
│  └─ README.md
│
├─ runtime/
│  ├─ opencode/
│  ├─ prompts/
│  └─ README.md
│
├─ kernel/
│  └─ README.md
│
├─ workspaces/
│  └─ .gitkeep
│
├─ specs/
│  ├─ api/
│  ├─ okf/
│  └─ planning-room.md
│
└─ docs/
   ├─ architecture.md
   ├─ data-protection.md
   └─ deployment.md
```

`kernel/` may either contain a copy, submodule or pinned import of selected files from `pedagogical-thinking-space`.

For the first prototype, a simple copied snapshot is acceptable. Later, a more explicit sync or versioning strategy should be defined.

---

## 15. First Prototype Scope

The first prototype should be deliberately small.

### Version 0.1 should include

- Create a planning room.
- Chat with the Critical Friend.
- Show the current Denkstand.
- Show open decisions.
- Show next steps.
- Store the planning room as Markdown files.
- Commit meaningful changes with local Git.
- Export a simple Markdown or PDF summary.

### Version 0.1 should not yet require

- Forgejo,
- full multi-tenant school administration,
- complete Nextcloud integration,
- all Worker types,
- all Renderer types,
- complex permission hierarchies,
- production-grade analytics.

The first prototype should prove the product idea:

> Teachers can think with a Critical Friend, while the app quietly keeps the Denkstand, decisions and materials organized.

---

## 16. Design Commitments

The app follows these commitments:

1. Teachers see pedagogical states, not technical structures.
2. The Critical Friend remains the primary interaction partner.
3. The Learning Design is the central object.
4. Reflection comes before production.
5. Workers implement decisions; they do not make them.
6. Renderers express a Learning Design; they do not redesign it.
7. Git versions the internal thinking process.
8. OKF supports exchange and curation.
9. Nextcloud stores finished school-facing files.
10. The harness is replaceable.
11. Datenschutz is architectural, not an afterthought.
12. The teacher remains responsible for pedagogical decisions.
13. Teachers do not answer technical permission prompts.
14. Secrets are never collected in chat.
15. Missing runtimes lead to safe fallback or admin request.
16. Worker services do not install or modify runtime environments.

---

## 17. Current Architectural Decisions

The following decisions are already assumed by this repository:

- `pedagogical-thinking-space` remains the kernel and reference architecture.
- `ptspace-app` becomes the concrete working environment.
- The visible UI is a pedagogical planning space, not an agent dashboard.
- The right side of the UI should show Denkstand, decisions, next steps and materials.
- Technical structures such as `drafts/`, `rendered/` and `service-requests/` are translated into teacher-facing language.
- Collaboration happens primarily in a shared planning chat with the Critical Friend.
- Git is internal versioning.
- Forgejo is optional and not required for the first prototype.
- OKF is the exchange format for curated professional artefacts.
- Nextcloud is external and used for finished exports.
- opencode or a compatible harness is part of the target MVP architecture, but remains replaceable behind a backend adapter.
- The backend is the protection layer between browser, harness, files and external services.
- Harness permissions are handled by backend policy, not by teachers in the chat.
- The Critical Friend may explain integrations and setup paths, but does not collect secrets.
- API keys and tokens belong in integration settings or admin configuration.
- Worker services must not install runtimes such as ComfyUI automatically.
- Missing capabilities lead to fallback, admin request or a clear explanation.
- Audio generation is an app-level Audio Worker Capability; concrete `tts-generation` is a harness/runtime skill with transcript, review and transparency requirements enforced by the app.

---

## 18. Guiding Sentence

> `ptspace-app` is not a machine for generating teaching materials. It is a professional planning environment that helps teachers think, decide and design better learning experiences — with AI as a careful colleague, not as a replacement for pedagogical judgement.

---

## Harness choices and local desktop bridge

`opencode` is the reference harness, but `ptspace-app` must not be limited to one runtime. Advanced users may prefer Claude Code, Codex, Hermes or another local/institutional harness.

The app therefore uses a **Harness Adapter API**:

```text
ptspace-app UI
        ↓
ptspace-backend
        ↓
Harness Adapter API
        ↓
opencode | Claude Code | Codex | Hermes | Custom
```

For school/institutional deployments, the default remains an integrated Docker harness. For power users with an already configured local tool, the supported model is a **Host Harness Bridge**:

```text
ptspace-backend in Docker
        ↓
http://host.docker.internal:<bridge-port>
        ↓
ptspace-harness-bridge on the user's desktop
        ↓
local Claude Code / Codex / Hermes / opencode
```

`host.docker.internal` is not a magic path to local credentials or local CLIs. It only connects the Dockerized app to a deliberately started host service. Local harness credentials remain local; the app sees availability and policy status, not API keys or OAuth tokens.

See `HARNESS_ADAPTERS.md` for the full adapter and bridge model.

