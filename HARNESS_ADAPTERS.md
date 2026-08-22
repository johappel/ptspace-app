# Execution Runtimes and Harness Adapters

> `ptspace-app` separates pedagogical domain logic from model and agent execution.
>
> A simple LLM call, an adaptive agent runtime and a coding harness are different execution capabilities. They may coexist behind stable PTS interfaces and must not determine the pedagogical domain model.

---

## 1. Purpose

The Pedagogical Thinking Space must not depend on one model provider, one agent framework or one coding harness.

The application owns:

* the Planning Space;
* the Learning Design;
* decisions;
* the Learning Landscape;
* the Planning Board;
* materials;
* permissions and approval;
* teacher-facing workflow;
* pedagogical policy;
* canonical workspace state.

Execution systems provide bounded capabilities to this domain.

The architecture therefore separates:

```text
Teacher-facing UI
        ↓
PTS application/domain
        ↓
PTS orchestration and policy
        ↓
Execution Adapter API
        ↓
┌─────────────────┬────────────────────┬───────────────────┐
│ Direct LLM      │ Adaptive Runtime   │ Coding Harness    │
│                 │                    │                   │
│ OpenRouter /    │ DeepSeek Harness   │ OpenCode          │
│ compatible API  │ or future runtime  │ or future coding  │
│                 │                    │ harness            │
└─────────────────┴────────────────────┴───────────────────┘
```

These execution forms are complementary rather than mutually exclusive.

---

## 2. Core distinction

### Pedagogical Companion

The **Pedagogical Companion** is the visible conversational partner defined by the Pedagogical Thinking Space kernel.

It owns no provider-specific identity.

The Companion may use different execution paths depending on the task.

### PTS Domain

The PTS domain contains the canonical pedagogical state and controls what may change.

An execution runtime does not become the owner of:

* pedagogical decisions;
* Planning Space state;
* Learning Design;
* long-term professional memory;
* permissions;
* approval;
* provenance policy.

### Execution Runtime

An execution runtime performs model- or agent-assisted work.

Different runtime classes have different levels of autonomy.

### Adapter

An adapter translates between the PTS contracts and a concrete execution system.

Provider- or runtime-specific types must not leak into the PTS domain.

---

# 3. Runtime classes

## 3.1 Direct LLM

The direct LLM path performs bounded model calls without a general agent runtime.

Current implementation:

```text
DirectLlmAdapter
```

Typical flow:

```text
PTS orchestration
      ↓
build bounded prompt/context
      ↓
OpenAI-compatible API
      ↓
model response
      ↓
PTS validates result
      ↓
PTS performs approved state/file changes
```

The backend remains responsible for workflow and file operations.

### Appropriate uses

Direct LLM is preferred when the task is already sufficiently defined, for example:

* normal Companion turns;
* summarisation;
* classification;
* structured extraction;
* bounded rewriting;
* simple drafting;
* well-defined Worker tasks;
* bounded review.

### Advantages

* simple execution path;
* low operational complexity;
* predictable permissions;
* easy testing;
* low latency;
* lower token and orchestration overhead;
* no autonomous tool loop;
* no agent-runtime dependency.

### Limits

Direct LLM does not by itself provide:

* autonomous tool selection;
* open-ended research workflows;
* reusable runtime skills;
* persistent workflow memory;
* adaptive workflow planning;
* background jobs;
* subagents;
* continuous maintenance;
* runtime learning.

These capabilities must not be recreated as an ever-growing collection of hard-coded backend branches if an adaptive runtime can provide them more appropriately.

---

# 4. Adaptive Agent Runtime

The adaptive runtime handles tasks whose necessary procedure cannot be completely specified in advance.

Candidate implementation:

```text
DeepSeek Harness
```

The purpose of this layer is not merely to produce another implementation of `sendMessage()`.

Its purpose is to support an **extensible and increasingly capable working environment**.

```text
Adaptive Runtime
│
├── model access
├── sessions
├── tools
├── skills
├── workflow execution
├── background jobs
├── context injection
├── subagents where justified
├── workflow memory
└── runtime learning
```

## 4.1 Typical uses

Use an adaptive runtime for tasks such as:

### Open-ended research

Example:

> Find a perspective that challenges an assumption currently dominating this Learning Design.

The search procedure may require:

```text
inspect current design
→ identify dominant assumptions
→ develop search strategy
→ search different source spaces
→ assess source quality
→ compare perspectives
→ return a curated result
```

This workflow is not necessarily known before execution.

### Perspective discovery

The runtime may investigate:

* voices not currently represented;
* contrasting pedagogical traditions;
* neglected learner perspectives;
* alternative learning architectures;
* disciplinary or interdisciplinary perspectives.

It must not simply retrieve more material matching the current assumptions.

### Novel output forms

A user requirement may imply an artifact type that has not been pre-programmed.

For example:

> I need something students discover on the tables as they enter the room.

The runtime may determine that an appropriate output is:

```text
three provocation cards
+
placement instructions
+
teacher observation prompt
```

A successful pattern may later become a reusable Skill candidate.

### Workflow organisation

The runtime may organise bounded multi-step work such as:

```text
research
→ compare
→ draft
→ validate
→ review
→ return
```

without requiring each step to be permanently encoded in application code.

### Continuous maintenance

The runtime may detect potential maintenance needs such as:

* an open question apparently resolved by a later decision;
* an orphaned material reference;
* a Planning Board task made obsolete by a design change;
* an outdated generated artifact;
* inconsistent state between related artifacts.

Pedagogically consequential changes remain proposals and require the existing PTS approval rules.

---

# 5. Skills

A Skill is a reusable runtime capability.

Examples:

```text
contrastive-research
perspective-gap-analysis
curriculum-check
material-assumption-analysis
artifact-design
decision-clarification
critical-incident-conversation
workspace-consistency-check
```

A Skill may combine:

* instructions;
* tools;
* workflow steps;
* output contracts;
* validation;
* stopping conditions;
* model selection hints;
* cost expectations.

Minimum metadata should eventually include:

```yaml
id:
purpose:
status:
inputs:
outputs:
constraints:
applicable_when:
provenance:
quality_history:
cost_profile:
```

Suggested lifecycle:

```text
experimental
→ reviewed
→ approved
→ deprecated
```

Generated or modified Skills must not become production capabilities merely because an agent generated them.

---

# 6. Workflow Memory

The adaptive runtime requires memory about **how work can be performed**, not only memory about the user or Planning Space.

This is distinct from conversation memory.

Example:

```yaml
workflow_pattern:
  task: contrastive_material_research

  observations:
    - broad searches produced too many irrelevant results
    - one near-fit and one strong contrast were more useful
    - pedagogical assumptions should be analysed before material details

  useful_when:
    - current design has become conceptually closed
    - teacher asks for alternatives
```

Workflow Memory should help the runtime reuse successful strategies without loading previous raw conversations.

It must remain:

* versioned;
* attributable;
* inspectable;
* correctable;
* removable.

---

# 7. Runtime learning

An adaptive runtime is not automatically self-learning merely because it has tools and sessions.

PTS therefore uses a controlled improvement cycle:

```text
DO
execute task
    ↓
OBSERVE
record process and outcome
    ↓
EVALUATE
assess quality and resource use
    ↓
PROPOSE
suggest Skill or workflow improvement
    ↓
VALIDATE
run against reference cases
    ↓
PROMOTE / REJECT
```

Production Skills must not silently rewrite themselves.

Learning produces proposals.

Promotion requires evidence.

Fundamental pedagogical or policy changes require human review.

---

# 8. Quality and economic learning

Runtime improvement must optimise **quality and resource use together**.

A runtime is not better merely because it performs more reasoning, launches more agents or uses a larger model.

Acceptable improvement patterns include:

```text
quality ↑   while cost ≤
quality =   while cost ↓
quality significantly ↑ with justified additional cost
```

Not acceptable:

```text
cost ↓
while pedagogical quality ↓
```

Relevant measurements may include:

```yaml
usage:
  input_tokens:
  output_tokens:
  cached_tokens:
  model_calls:
  tool_calls:
  retrieval_items:
  runtime_ms:
  estimated_cost:
```

and:

```yaml
outcome:
  review_status:
  accepted:
  edited:
  rejected:
  followup_needed:
```

Over time, the runtime should learn:

* when no model is required;
* when a small model is sufficient;
* when Direct LLM is sufficient;
* when an existing Skill is sufficient;
* when retrieval is necessary;
* when open-ended research is justified;
* when an adaptive workflow is necessary;
* when a stronger review model should be invoked.

The desired direction is:

> increasing capability with decreasing unnecessary computation.

---

# 9. Coding and Kernel Harness

A coding harness serves a different purpose from the normal pedagogical runtime.

Current implementation/reference:

```text
OpenCodeDockerAdapter
```

Typical uses:

* repository modification;
* Kernel evolution;
* implementation of new technical capabilities;
* code generation;
* controlled shell/tool execution;
* structured development tasks.

This is a high-autonomy technical environment and should not be the default path for ordinary Companion conversation.

Conceptually:

```text
normal pedagogical turn
        ↓
Direct LLM

open-ended adaptive task
        ↓
Adaptive Runtime

code / repository / Kernel evolution
        ↓
Coding Harness
```

OpenCode remains supported, but it is no longer the architectural reference for all real model execution.

---

# 10. Runtime selection

The long-term architecture may route tasks dynamically.

Example:

```text
incoming task
    ↓
can it be solved deterministically?
    ├── yes → backend code
    │
    └── no
         ↓
is the task well-bounded?
    ├── yes → Direct LLM
    │
    └── no
         ↓
does it require tools, Skills,
research or workflow organisation?
    ├── yes → Adaptive Runtime
    │
    └── no → Direct LLM
```

Coding or Kernel changes are separately routed to an approved coding harness.

Runtime routing must remain observable and configurable.

It must not become an opaque autonomous decision system.

---

# 11. Current adapters

## 11.1 `DirectLlmAdapter`

Status:

**implemented; current standard real-runtime path**

Responsibilities:

* OpenAI-compatible model access;
* Companion response generation;
* bounded Worker generation;
* review calls;
* teacher-facing error translation;
* backend-controlled workspace interaction.

Configuration includes:

```text
PTSPACE_HARNESS=direct-llm
PTSPACE_DIRECT_LLM_BASE_URL
PTSPACE_DIRECT_LLM_MODEL
PTSPACE_LLM_API_KEY
```

`OPENROUTER_API_KEY` may be supported as a compatibility fallback.

---

## 11.2 `OpenCodeDockerAdapter`

Status:

**implemented; optional coding/agent execution path**

Responsibilities include:

* controlled OpenCode invocation;
* Docker execution;
* coding/agent tasks requiring a richer technical runtime;
* optional Kernel evolution.

It is not required for the Real Runtime MVP.

---

## 11.3 `DeepSeekHarnessAdapter`

Status:

**implemented (spike / evaluation); real transport not yet connected**

Its purpose is to evaluate whether DeepSeek Harness can provide the adaptive runtime required for:

* Skills;
* open research;
* persistent agent sessions;
* background jobs;
* workflow organisation;
* workflow memory;
* context injection;
* controlled subagents;
* runtime learning;
* continuous maintenance.

The adapter implements `checkAvailability`, `createSession` (with resume),
`sendMessage` (with provider-neutral `RuntimeUsage`), `getEvents`, `stopSession`
and `simulatePolicy`. All DeepSeek-specific concepts stay behind the injectable
`DeepSeekRuntimeTransport` boundary. Without a connected transport the adapter
reports `requires_setup` rather than guessing unstable upstream API details.

Configuration: `PTSPACE_HARNESS=deepseek`, `PTSPACE_DEEPSEEK_VERSION=<pin>`.
See `docs/harness-deepseek.md`.

The DeepSeek integration must remain behind PTS-owned contracts.

DeepSeek-specific session types, events and concepts must not become canonical PTS domain concepts.

---

## 11.4 `MockHarnessAdapter`

Status:

**development/test infrastructure**

The mock adapter provides deterministic application and workflow tests.

It must not be presented as representative of real model behaviour.

---

# 12. Adapter API

The existing `HarnessAdapter` remains the current execution boundary.

Current conceptual responsibilities include:

```ts
interface HarnessAdapter {
  checkAvailability()
  createSession()
  sendMessage()
  requestTask()
  reviewTask?()
  getEvents()
  simulatePolicy?()
  stopSession()
}
```

The interface may evolve as the adaptive runtime is evaluated.

Any extension must remain runtime-neutral.

Possible future generic events include:

```text
message_delta
activity
task_started
task_completed
```

Do not expose implementation-specific events such as native DeepSeek agent-loop events through the public PTS API.

---

# 13. Canonical state boundary

No execution runtime is the canonical source of pedagogical truth.

Canonical state remains owned by PTS.

Examples:

```text
learning-design.md
learning-landscape.md
temporal-plan.yml
planning-board.yml
decisions.yml
materials/
```

Runtime sessions, summaries, caches and memories are derived operational state.

The application must be able to reconstruct the Planning Space without requiring a proprietary runtime session log.

---

# 14. Memory boundary

Different memory types must remain distinct.

```text
Project State
= canonical Planning Space state

Conversation Runtime Memory
= short-/medium-term context required for dialogue

Professional Memory
= deliberately retained professional experience

Workflow Memory
= reusable knowledge about how tasks are performed

Skill History
= versions, outcomes and performance of capabilities
```

No execution runtime may silently merge these categories into a single opaque memory store.

Personal or professionally sensitive long-term memory remains subject to the PTS capture and privacy policy.

---

# 15. Workspace and file policy

All execution systems operate inside explicit capability boundaries.

A runtime may:

* read explicitly allowed Planning Space context;
* propose changes;
* produce drafts;
* create approved outputs through PTS-controlled paths.

A runtime must not:

* arbitrarily traverse the host filesystem;
* modify canonical artifacts outside PTS policy;
* access secrets as ordinary context;
* silently change Kernel or Knowledge;
* bypass teacher approval for pedagogical changes.

Backend policy remains authoritative regardless of runtime.

---

# 16. Credentials

Credentials belong to the execution environment.

Examples:

```text
PTSPACE_LLM_API_KEY
OpenRouter key
DeepSeek/provider credentials
OpenCode provider credentials
local coding-harness authentication
```

Secrets must never be:

* sent to the browser;
* written into the Planning Space;
* included in Git;
* exposed in model-visible context;
* returned in teacher-facing errors.

The application may know only operational state such as:

```text
provider configured
runtime available
authentication failed
setup required
```

---

# 17. Deployment modes

Deployment topology is separate from runtime capability.

A runtime may be deployed:

* directly inside the backend process;
* as a local service;
* in Docker;
* through a controlled host bridge;
* on an institutional server.

Therefore terms such as:

```text
docker
host-bridge
external
```

describe **deployment**, not the semantic kind of runtime.

This distinction should remain explicit in configuration and future interfaces.

---

# 18. Host Bridge

A Host Harness Bridge remains a valid deployment option for locally installed tools.

```text
ptspace-backend
        ↓
controlled bridge API
        ↓
approved local runtime
```

The bridge must not expose:

* arbitrary shell access;
* arbitrary filesystem access;
* user home directories;
* authentication files;
* unrestricted process execution.

The Host Bridge is not required for `DirectLlmAdapter`.

It may become relevant for locally installed adaptive or coding runtimes.

---

# 19. Teacher-facing language

Teacher-facing UI must not expose execution architecture unless needed for setup or administration.

Avoid terms such as:

```text
Harness
Agent Runtime
Subagent
Tool Call
Token Budget
OpenCode
DeepSeek Harness
```

during normal planning.

Teacher-facing states should describe the pedagogical situation:

```text
Ich recherchiere dazu zwei unterschiedliche Perspektiven.

Die Vorbereitung läuft im Hintergrund.

Ich habe einen Entwurf zur Prüfung vorbereitet.

Die Recherche konnte noch nicht sicher abgeschlossen werden.
```

Technical runtime information belongs in administration, diagnostics and development tooling.

---

# 20. Product decisions

Current architectural decisions:

* `DirectLlmAdapter` is the standard simple real-model execution path.
* OpenCode is not required for ordinary real-model conversation.
* `OpenCodeDockerAdapter` remains available for coding- and Kernel-oriented agent tasks.
* DeepSeek Harness is evaluated as an adaptive runtime, not merely as another chat transport.
* PTS domain state remains independent of every execution runtime.
* Skills and Workflow Memory belong to the adaptive execution layer, subject to PTS policy.
* Runtime learning occurs through versioned proposals, evaluation and promotion, not uncontrolled self-modification.
* Quality and token/resource economy are evaluated together.
* Backend policy remains authoritative.
* Deployment topology and runtime capability are separate concerns.
* The browser never communicates directly with execution runtimes.
* Provider credentials never enter teacher-visible state, Planning Spaces, Git or exported Knowledge.

---

# 21. Open architecture questions

The following questions are intentionally deferred until the adaptive-runtime evaluation is complete:

1. Should `HarnessAdapter` be renamed to a more general `ExecutionAdapter` or `RuntimeAdapter`?
2. Should Direct LLM and adaptive runtimes continue implementing one interface or use capability-specific interfaces?
3. Which Skills are genuinely generic enough to share between Thinking Spaces?
4. Which Workflow Memories are pedagogical-domain-specific?
5. Which runtime events need to become first-class PTS events?
6. Should normal Companion turns remain Direct LLM while adaptive work is delegated selectively?
7. Which memory provider should store Workflow Memory and Skill History?
8. Which self-improvements may be promoted automatically after benchmark validation?
9. Which changes always require human approval?
10. Which parts of this runtime architecture are suitable for reuse by the Theological Thinking Space?

These questions must be answered from implementation and evaluation evidence rather than by prematurely generalising the current PTS architecture.
