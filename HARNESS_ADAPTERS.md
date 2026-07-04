# HARNESS_ADAPTERS.md

> Multiple harnesses may be used behind `ptspace-app`. `opencode` is the reference harness, but the product architecture must not hard-code one execution engine.

---

## 1. Purpose

`ptspace-app` is harness-first, but not opencode-only.

Some users may prefer:

- `opencode`,
- Claude Code,
- Codex,
- Hermes,
- a custom institutional harness,
- a mocked development harness.

The app therefore needs a **Harness Adapter API**. The teacher-facing product remains stable while the execution layer can differ.

```text
Teacher-facing UI
        ↓
ptspace-backend
        ↓
Harness Adapter API
        ↓
opencode | Claude Code | Codex | Hermes | Custom
```

The browser never talks directly to any harness.

---

## 2. Core distinction

```text
Critical Friend
= pedagogical conversational role defined by the Pedagogical Thinking Space kernel

Harness
= technical runtime that can operate on the workspace and execute tasks or skills

Harness Adapter
= backend component that translates ptspace requests into the selected harness protocol
```

The Critical Friend is not tied to one harness. A different harness may run the same Critical Friend role if it receives the kernel instructions, workspace context and policy constraints.

---

## 3. Supported harness modes

### 3.1 Integrated Docker Harness

The harness runs inside the `ptspace-app` Docker stack.

```text
frontend
backend
opencode-container or compatible harness-container
workspace-volume
```

Use this mode for:

- institutional deployments,
- reproducible server setups,
- controlled sandboxing,
- admin-managed provider credentials,
- school-safe operation.

This is the safest default for school or institutional use.

---

### 3.2 Local Desktop Harness via Host Bridge

Some advanced users may already have Claude Code, Codex, Hermes or another coding agent installed and authenticated on their own desktop.

A Docker container cannot simply use `host.docker.internal` to run a local CLI or inherit local credentials. `host.docker.internal` only helps when a controlled service is already running on the host and exposes a network port.

Therefore local desktop harnesses must be connected through a small **Host Harness Bridge**.

```text
ptspace-backend in Docker
        ↓
http://host.docker.internal:<bridge-port>
        ↓
ptspace-harness-bridge on host
        ↓
local Claude Code / Codex / Hermes / opencode
        ↓
approved local workspace folder
```

The bridge runs in the user's local account. It may use the local harness installation and its existing authentication, but it must not expose arbitrary host access to the Docker stack.

---

### 3.3 External Harness Server

An institution may run a central harness server.

```text
ptspace-backend
        ↓
HTTPS Harness API
        ↓
institutional harness runtime
        ↓
isolated workspace sandbox
```

Use this mode for:

- managed school servers,
- shared GPU or TTS infrastructure,
- central provider configuration,
- admin-controlled runtimes.

---

### 3.4 Mock Harness

A mock harness may be used in development and tests.

It must make clear that it does not represent the final product experience.

The product architecture remains harness-first even when a mock is used.

---

## 4. Harness Adapter API

The backend should define a minimal common interface.

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

The adapter must return structured states, not raw terminal output only.

Examples:

```text
ready
unavailable
requires_setup
requires_admin_configuration
permission_denied
workspace_policy_violation
running
waiting_for_backend_policy
failed
```

---

## 5. Host Harness Bridge

The host bridge is a controlled local service that allows a Dockerized `ptspace-app` to use a locally installed harness.

It may:

- detect installed harnesses,
- report availability,
- start or resume sessions,
- pass messages to the selected harness,
- expose structured events,
- write only into approved workspace folders,
- use local harness credentials without revealing them to `ptspace-app`.

It must not:

- expose arbitrary shell access,
- expose the user's home folder,
- forward secrets to the app,
- allow arbitrary paths,
- silently install tools,
- bypass backend policy,
- send raw local config files to the app.

---

## 6. Credential principle

Local harness credentials remain local.

```text
Claude Code OAuth/API state
Codex auth
Hermes config
opencode auth.json
provider API keys
```

These are owned by the harness or by the host environment.

`ptspace-app` may know:

```text
harness available: yes/no
provider configured: yes/no
model policy: allowed/denied
error category: setup needed / auth expired / policy denied
```

`ptspace-app` must not receive:

```text
actual API keys
OAuth refresh tokens
provider auth files
full local config directories
```

---

## 7. `host.docker.internal` rule

`host.docker.internal` may only be used to reach a deliberately started host service, such as `ptspace-harness-bridge`.

It must not be treated as a way to access arbitrary host programs, local credentials or the host file system.

Correct:

```text
ptspace-backend → host.docker.internal:47321 → ptspace-harness-bridge
```

Incorrect:

```text
ptspace-backend → host.docker.internal → magically use local Claude Code settings
```

---

## 8. Workspace boundary

Every harness mode must operate on an explicit workspace.

```text
workspace/<project-id>/
  learning-design.md
  decisions.md
  tasks/
  service-requests/
  drafts/
  materials/
  exports/
```

The harness must not work outside the approved workspace unless an admin-level configuration explicitly permits a separate shared kernel or knowledge path.

The teacher sees teacher-facing states, not file-system paths.

---

## 9. Teacher-facing setup language

The Critical Friend may explain harness availability in teacher-facing language.

Example:

> "Your local Claude Code harness is available through the desktop bridge. I can use it for this planning room, but only inside the approved project folder."

If a harness is missing:

> "No approved harness is currently available. You can either use the integrated opencode runtime, start the desktop bridge for your local harness, or ask an administrator to configure an institutional harness."

The Critical Friend must never ask for API keys in the chat.

---

## 10. Product decisions

- `opencode` is the reference harness, not the only supported harness.
- `ptspace-app` supports multiple harness types through a common Harness Adapter API.
- Local desktop harnesses are connected through a Host Harness Bridge, not by mounting host secrets into Docker.
- `host.docker.internal` is only used to reach an explicitly started bridge service.
- Local harness credentials remain local and are never copied into the app, chat, workspace, Git or OKF exports.
- The backend policy layer remains authoritative even when the actual harness runs locally on the user's desktop.
- Advanced users may choose Claude Code, Codex, Hermes or another adapter, but teacher-facing semantics remain unchanged.
