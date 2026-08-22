# Harness-first, UI-safe Architecture

This document records the current architectural decision for `ptspace-app`.

## Core Decision

`ptspace-app` is not a standalone chat application that may later receive an execution layer.

It is a teacher-facing frontend and protection layer for a harness-based Pedagogical Thinking Space.

```text
pedagogical-thinking-space
  = pedagogical operating system / kernel

opencode or compatible harness
  = runtime / process engine / workspace agent

ptspace-app
  = safe browser interface, backend policies, teacher-facing semantics
```

## Why this matters

The existing `pedagogical-thinking-space` repository already works when used with a capable coding/harness environment. The missing product is not another abstract agent system, but a familiar, safe and pedagogically meaningful frontend for teachers.

The app therefore needs to preserve the power of the harness while hiding and constraining the technical environment.

## Required MVP Shape

A meaningful MVP includes:

- planning-room creation,
- isolated workspace creation,
- kernel provisioning from `pedagogical-thinking-space`,
- a minimal `HarnessClient`,
- a Critical Friend session that operates on the workspace,
- reading back `learning-design.md`, decisions, tasks and service requests,
- teacher-facing rendering of Denkstand, open decisions, next steps and materials,
- backend policy checks before any technical action is executed,
- internal Git versioning.

The harness may be mocked for tests, but the product semantics remain harness-based.

## Non-goal

The app must not become an opencode web UI.

Teachers should never see shell commands, repository paths, raw service-request YAML or technical permission prompts unless they explicitly enter an admin/developer mode.

## Boundary

```text
Browser
  speaks only to ptspace-backend

ptspace-backend
  owns auth, policy, workspace lifecycle, secrets, exports and UI state

Harness
  works only inside an isolated workspace
  returns results to backend
  never speaks directly to teachers
```

## Guiding Sentence

The harness is core infrastructure; the Critical Friend is the visible pedagogical counterpart; the app is the safe teacher-facing desktop.

---

## Harness-first does not mean opencode-only

The reference implementation may use `opencode`, but the architecture must allow other harnesses.

```text
pedagogical-thinking-space kernel
        ↓
Harness Adapter API
        ↓
opencode | Claude Code | Codex | Hermes | Custom
        ↓
Workspace
```

The teacher-facing product must remain stable across harness choices.

### Local desktop harness bridge

For tools installed on a user's desktop, such as Claude Code, Codex or Hermes, the app should use a Host Harness Bridge.

```text
Docker backend
        ↓
host.docker.internal:<bridge-port>
        ↓
ptspace-harness-bridge
        ↓
local harness
```

This keeps local authentication and settings on the user's machine while still allowing the backend to enforce workspace and policy boundaries.

The bridge is not a general remote shell. It is a narrow adapter for approved planning-room workspaces.

### Security principle

Do not mount host credential directories into containers. Do not pass API keys or OAuth tokens through chat. Do not let the selected harness bypass backend policy.

Full details are specified in `HARNESS_ADAPTERS.md`.

