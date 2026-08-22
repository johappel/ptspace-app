# Execution Architecture

> The Pedagogical Thinking Space is **domain-first and capability-driven**.
>
> The application owns pedagogical state, orchestration, policy and approval.
> Execution capabilities may be provided by direct model calls, adaptive agent runtimes or coding harnesses.
>
> No execution runtime defines the product architecture.

---

## 1. Purpose

`ptspace-app` is not a chat frontend for a harness.

It is the application layer of the Pedagogical Thinking Space.

The application owns:

- the teacher-facing conversation;
- the Planning Space;
- the Learning Design;
- decisions;
- the Learning Landscape;
- temporal planning;
- the Planning Board;
- materials;
- provenance;
- approval workflows;
- privacy and permission policy;
- canonical workspace state;
- teacher-facing interaction semantics.

Models, agent runtimes and coding harnesses provide **execution capabilities** to this application.

They do not own the pedagogical domain.

The architectural direction is therefore:

```text
Teacher / Planning Team
          │
          ▼
┌────────────────────────────────────┐
│ Pedagogical Thinking Space         │
│                                    │
│ Companion                          │
│ Domain                             │
│ Orchestration                      │
│ Policy                             │
│ Canonical Workspace                │
│ Approval                           │
│ Provenance                         │
└─────────────────┬──────────────────┘
                  │
             capability request
                  │
                  ▼
┌────────────────────────────────────┐
│ Execution Layer                    │
│                                    │
│ Direct LLM                         │
│ Adaptive Agent Runtime             │
│ Coding / Kernel Harness            │
│ deterministic backend functions    │
└────────────────────────────────────┘
````

The execution layer is replaceable.

The PTS domain is not.

---

## 2. Supersedes the Harness-first Architecture

Earlier versions of `ptspace-app` followed a **Harness-first** architecture.

That decision was useful while the main architectural risk was that the product might become a thin chat application and lose the workspace-, tool- and agent-oriented capabilities of the Pedagogical Thinking Space.

The earlier model was approximately:

```text
pedagogical-thinking-space
        =
pedagogical kernel

opencode or compatible harness
        =
runtime / process engine

ptspace-app
        =
safe teacher-facing frontend
```

This is no longer an accurate description of the implemented system.

`ptspace-app` now owns substantial application and domain behaviour independently of a harness:

* Planning Space lifecycle;
* conversation orchestration;
* Guided Workflow;
* proposals;
* materials;
* service requests;
* workspace management;
* policy;
* review flow;
* exports;
* privacy boundaries;
* Git-backed canonical state.

The introduction of `DirectLlmAdapter` further demonstrates that ordinary real-model operation does not require a general-purpose harness.

The current architecture therefore replaces:

> Harness-first

with:

> **Domain-first, capability-driven execution**

The security lessons of the previous architecture remain valid.

---

## 3. Architectural principles

### 3.1 Pedagogical domain first

Technical runtime capabilities must follow pedagogical requirements.

Do not add a workflow, agent, tool or background process merely because a runtime supports it.

The first question is always:

> What capability does the Thinking Space require here?

Only then:

> Which execution path provides that capability most safely, effectively and economically?

---

### 3.2 Canonical state belongs to PTS

No external runtime is the canonical source of pedagogical truth.

Canonical state remains in PTS-controlled structures.

Examples include:

```text
learning-design.md
learning-landscape.md
temporal-plan.yml
planning-board.yml
decisions.yml
open-questions.md
materials/
```

Runtime sessions, caches, summaries, agent logs and workflow memories are operational state.

The Planning Space must remain reconstructable without requiring a proprietary runtime session.

---

### 3.3 Policy remains authoritative

Execution systems operate under PTS policy.

A runtime may be technically capable of:

* editing files;
* calling tools;
* spawning agents;
* browsing the web;
* changing repositories;
* generating new skills.

That does not mean it is permitted to do so.

The backend remains responsible for:

* capability boundaries;
* file and workspace boundaries;
* approval requirements;
* privacy;
* provenance;
* teacher-facing consent;
* secret handling.

---

### 3.4 The Companion remains the visible counterpart

The teacher should experience one coherent pedagogical counterpart:

> the Pedagogical Companion.

Background execution may involve:

* direct model calls;
* tools;
* research processes;
* Workers;
* Review;
* adaptive workflows;
* subagents.

These are implementation details unless their work becomes pedagogically relevant.

The UI must not turn into an agent-control dashboard.

---

### 3.5 Capability before runtime

The PTS should describe what needs to be done independently of the implementation that performs it.

Examples:

```text
continue_conversation
clarify_decision
research_contrast
check_curriculum
create_material
review_material
maintain_workspace
explore_missing_perspective
```

The runtime layer decides how an approved capability is executed.

---

## 4. Execution classes

The architecture distinguishes at least four execution classes.

```text
1. Deterministic backend execution
2. Direct LLM execution
3. Adaptive agent runtime
4. Coding / Kernel harness
```

They are complementary.

They are not maturity levels where every task should eventually move toward the most autonomous option.

The best execution path is the **least complex path that can reliably perform the task**.

---

# 5. Deterministic backend execution

Use normal application code whenever the required behaviour is known and does not require semantic model judgement.

Examples:

* schema validation;
* path validation;
* ID and reference checking;
* Git commits;
* file writes;
* material assignment;
* state transitions;
* permission decisions;
* diff generation;
* duplicate detection;
* cache lookup;
* event persistence.

Preferred rule:

> If deterministic code can solve the problem reliably, do not call an LLM.

Benefits:

* predictable;
* cheap;
* fast;
* testable;
* explainable;
* reproducible.

---

# 6. Direct LLM execution

The current implementation is:

```text
DirectLlmAdapter
```

Direct LLM execution is appropriate for bounded semantic tasks where the application already knows the workflow.

Typical examples:

* normal Companion responses;
* summarisation;
* extracting structured information;
* rewriting;
* bounded drafting;
* simple Worker generation;
* bounded Review;
* classification;
* focused interpretation.

Architecture:

```text
PTS
 │
 ├─ selects context
 ├─ builds instructions
 └─ defines expected result
        │
        ▼
DirectLlmAdapter
        │
        ▼
OpenAI-compatible API
        │
        ▼
model result
        │
        ▼
PTS validates and applies result
```

The model does not own the workflow.

The backend does.

## 6.1 Advantages

* low orchestration overhead;
* clear context boundaries;
* straightforward testing;
* predictable failure modes;
* low operational complexity;
* easy model/provider switching;
* suitable as a fallback and reference implementation.

## 6.2 Limits

A Direct LLM does not itself provide a general runtime for:

* discovering tools;
* composing Skills;
* open-ended research;
* persistent background jobs;
* self-organised workflows;
* workflow memory;
* agent teams;
* continuous semantic maintenance;
* runtime learning.

These capabilities should not automatically be reconstructed as large amounts of imperative backend code.

---

# 7. Adaptive Agent Runtime

The adaptive runtime is intended for tasks whose procedure cannot be fully specified in advance.

The current candidate is:

```text
DeepSeek Harness
```

Its role is fundamentally different from Direct LLM execution.

It is not primarily an alternative transport for chat completion.

Its purpose is to provide an environment where the PTS can use and develop:

* Skills;
* tools;
* persistent sessions;
* background work;
* bounded workflow planning;
* workflow memory;
* context injection;
* selective subagents;
* runtime learning;
* continuous maintenance.

Conceptually:

```text
PTS capability request
        │
        ▼
Adaptive Runtime
        │
        ├─ inspect current context
        ├─ choose Skill
        ├─ select tools
        ├─ organise bounded workflow
        ├─ perform work
        ├─ validate intermediate results
        └─ return structured outcome
        │
        ▼
PTS policy / review / approval
```

---

## 8. When an adaptive runtime is appropriate

### 8.1 Open-ended research

Example:

> Find a perspective that challenges something we currently take for granted in this Learning Design.

The procedure may involve:

```text
inspect design
→ identify dominant assumption
→ formulate different search directions
→ browse sources
→ assess provenance
→ compare alternatives
→ stop when marginal information value decreases
→ return one useful contrast
```

The required search procedure is discovered during execution.

---

### 8.2 Perspective-gap analysis

The runtime may ask:

* Which learner perspective is absent?
* Which pedagogical tradition dominates?
* Which assumption has not been questioned?
* Which contrasting approach would generate productive tension?
* Which disciplinary or interdisciplinary voice is missing?

This is different from retrieving documents matching existing keywords.

---

### 8.3 Novel artifact generation

Not every output type should be hard-coded in application logic.

A concrete planning need may imply a new artifact.

Example:

> I want something the students encounter silently on the tables when they enter.

The runtime may derive:

```text
three provocation cards
+
placement notes
+
teacher observation focus
```

The first result remains a draft.

Repeated successful use may later justify a reusable Skill.

---

### 8.4 Self-organised bounded workflows

Example:

```text
research question
   ↓
perspective search
   ↓
source assessment
   ↓
comparison
   ↓
draft
   ↓
review
   ↓
return
```

The application specifies:

* goal;
* boundaries;
* approval conditions;
* budgets;
* expected result.

The runtime may determine the intermediate steps.

---

### 8.5 Continuous semantic maintenance

A Thinking Space changes continuously.

The runtime may identify:

* resolved but still open questions;
* obsolete work items;
* orphaned materials;
* contradictory states;
* missing provenance;
* stale generated artifacts;
* repeated inefficient workflow patterns.

Deterministic checks should be preferred.

Semantic maintenance should use model reasoning only when necessary.

Pedagogically consequential changes remain proposals.

---

# 9. Skills

A Skill is a reusable execution capability.

Possible examples:

```text
contrastive-research
perspective-gap-analysis
curriculum-check
material-assumption-analysis
decision-clarification
critical-incident-conversation
artifact-design
workspace-consistency-check
```

A Skill may define:

* purpose;
* applicability;
* input contract;
* tool access;
* workflow;
* expected output;
* validation;
* stop conditions;
* model requirements;
* cost expectations.

Suggested metadata:

```yaml
id:
purpose:
status:
applicable_when:
inputs:
outputs:
constraints:
provenance:
quality_history:
cost_profile:
```

Suggested lifecycle:

```text
experimental
    ↓
reviewed
    ↓
approved
    ↓
deprecated
```

An automatically created or modified Skill must not immediately become a production Skill.

---

# 10. Conversation and moderation Skills

The Companion should not require every possible conversational method to remain permanently inside one growing system prompt.

Conversation methods may become Skills.

Examples:

* mirroring;
* reframing;
* perspective rotation;
* exception questions;
* Critical Incident;
* Ladder of Inference;
* externalisation;
* decision clarification;
* deliberate contradiction;
* summarising and condensation.

The runtime may select an appropriate method based on the current conversational situation.

Constraints:

* no diagnostic profiling;
* no manipulation toward agreement;
* no optimisation for conversation length;
* normally one dominant conversational method at a time;
* teacher-facing language remains natural;
* method choice remains inspectable in runtime diagnostics.

---

# 11. Workflow Memory

Workflow Memory records knowledge about **how work is effectively performed**.

It is distinct from:

* Planning Space state;
* conversation history;
* personal professional memory;
* Knowledge.

Example:

```yaml
workflow_pattern:
  task: contrastive_material_research

  learned:
    - broad searches generated too much irrelevant material
    - one near-fit and one strong contrast were more useful
    - analyse pedagogical assumptions before comparing details

  useful_when:
    - current design feels conceptually closed
    - alternatives are being sought
```

Workflow Memory enables later tasks to reuse successful process knowledge without reloading entire previous conversations.

Workflow Memory must be:

* versioned;
* attributable;
* inspectable;
* correctable;
* removable;
* evaluated for continuing usefulness.

---

# 12. Runtime learning

A runtime with tools and sessions is not automatically a responsible self-learning system.

PTS therefore uses a controlled learning loop.

```text
DO
execute
   ↓
OBSERVE
record process and result
   ↓
EVALUATE
quality + resource use
   ↓
PROPOSE
possible improvement
   ↓
VALIDATE
run reference cases
   ↓
PROMOTE / REJECT
```

The runtime does not silently rewrite production Skills.

It produces improvement proposals.

A proposal may include:

* shorter instructions;
* different tool order;
* better stopping conditions;
* a smaller model;
* more focused retrieval;
* removal of an unnecessary step;
* a new reusable Skill.

Promotion depends on evidence.

Pedagogically significant changes require human review.

---

# 13. Economic learning

A self-developing Thinking Space should not become more expensive simply because it accumulates more capabilities.

The desired trajectory is:

> increasing capability with decreasing unnecessary computation.

Quality and resource use must therefore be evaluated together.

Acceptable improvements include:

```text
quality ↑ while cost ≤

quality = while cost ↓

quality significantly ↑
with justified additional cost
```

Not acceptable:

```text
cost ↓
while relevant pedagogical quality ↓
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

The goal is not to optimise teachers for low usage.

The goal is to improve the runtime.

---

# 14. Adaptive execution routing

Over time the system may route tasks according to required capability.

Conceptually:

```text
task
 │
 ▼
Can deterministic code solve it?
 ├─ yes → backend
 │
 └─ no
      │
      ▼
Is the procedure known and bounded?
 ├─ yes → Direct LLM
 │
 └─ no
      │
      ▼
Does it require open research,
tool use, Skills or workflow organisation?
 ├─ yes → Adaptive Runtime
 │
 └─ no → Direct LLM
```

Repository or Kernel modification is handled separately:

```text
code / repository / kernel task
        ↓
Coding Harness
```

Routing decisions must remain:

* observable;
* configurable;
* testable;
* explainable.

They must not become an opaque autonomous subsystem.

---

# 15. Coding and Kernel Harness

The current implementation is:

```text
OpenCodeDockerAdapter
```

Coding harnesses are intended for technical tasks such as:

* modifying repositories;
* implementing code;
* evolving the Kernel;
* creating technical integrations;
* executing controlled shell/tool workflows;
* maintaining development artifacts.

This level of technical autonomy is not needed for normal Companion conversation.

The preferred distinction is:

```text
normal bounded semantic work
        ↓
Direct LLM

open adaptive work
        ↓
Adaptive Runtime

code / repository evolution
        ↓
Coding Harness
```

OpenCode remains a supported capability.

It is not the mandatory real-runtime path.

---

# 16. Current runtime implementations

## 16.1 DirectLlmAdapter

Status:

> implemented; default real-model execution path

Current responsibilities include:

* OpenAI-compatible model calls;
* Companion responses;
* bounded Worker execution;
* Review;
* teacher-facing error translation;
* backend-controlled output writing.

Current configuration includes:

```text
PTSPACE_HARNESS=direct-llm
PTSPACE_DIRECT_LLM_BASE_URL
PTSPACE_DIRECT_LLM_MODEL
PTSPACE_LLM_API_KEY
```

`OPENROUTER_API_KEY` may remain as a compatibility fallback.

---

## 16.2 OpenCodeDockerAdapter

Status:

> implemented; optional coding / agent execution path

OpenCode remains useful where the task requires a real technical agent environment.

It is not required for ordinary model conversation.

---

## 16.3 DeepSeekHarnessAdapter

Status:

> planned / evaluation in L5b

The evaluation should determine whether DeepSeek Harness can provide the adaptive runtime needed for:

* persistent sessions;
* Skills;
* open research;
* background jobs;
* workflow organisation;
* workflow memory;
* context injection;
* selective subagents;
* runtime learning;
* continuous maintenance.

DeepSeek-specific concepts must remain behind a PTS-owned adapter boundary.

---

## 16.4 MockHarnessAdapter

Status:

> development and test infrastructure

The mock adapter supports deterministic tests.

It is not representative of real model behaviour.

---

# 17. Adapter boundary

The current backend boundary is the existing:

```text
HarnessAdapter
```

Conceptually it provides operations such as:

```ts
checkAvailability()
createSession()
sendMessage()
requestTask()
reviewTask()
getEvents()
simulatePolicy()
stopSession()
```

The name reflects the historical architecture.

L5b may show that a more general name such as:

```text
ExecutionAdapter
```

or:

```text
RuntimeAdapter
```

is preferable.

Do not rename or split the interface merely for conceptual elegance before implementation evidence exists.

Any future extension must remain runtime-neutral.

Implementation-specific types must not leak into the public PTS domain.

---

# 18. Deployment is not execution semantics

The previous Harness-first architecture mixed two questions:

1. What kind of runtime is being used?
2. Where does it run?

These must remain separate.

An execution capability may run:

* in the backend process;
* in Docker;
* through a local host service;
* on an institutional server;
* through a remote provider.

Terms such as:

```text
docker
host-bridge
external
```

describe deployment topology.

They do not describe what kind of capability the runtime provides.

---

# 19. Host Harness Bridge

A Host Harness Bridge remains a valid deployment mechanism for locally installed runtimes.

```text
ptspace-backend
        ↓
controlled host bridge
        ↓
approved local runtime
```

The bridge may expose only explicitly supported operations.

It must not expose:

* arbitrary shell access;
* arbitrary filesystem access;
* home directories;
* credentials;
* unrestricted process execution.

The Host Bridge is not needed for Direct LLM operation.

It may be useful for local adaptive or coding runtimes.

---

# 20. Security boundary

The core security boundary from the earlier Harness-first architecture remains valid.

```text
Browser
   │
   ▼
ptspace-backend
   │
   ├─ auth
   ├─ policy
   ├─ secrets
   ├─ workspace lifecycle
   ├─ approval
   └─ provenance
   │
   ▼
Execution Runtime
```

The browser never communicates directly with an execution runtime.

Execution systems never become trusted merely because they run locally.

---

# 21. Workspace boundary

Every execution path receives an explicit workspace scope.

An execution runtime may only access what the capability contract requires.

It must not:

* traverse arbitrary host paths;
* inspect unrelated Planning Spaces;
* access credentials as model context;
* silently modify Kernel or Knowledge;
* write outside approved output paths;
* bypass PTS approval.

Where possible:

> read narrowly, write narrowly, return structured results.

---

# 22. Credential principle

Secrets remain execution-environment concerns.

Examples:

* model API keys;
* provider credentials;
* OpenCode credentials;
* local coding-harness authentication;
* future DeepSeek/provider credentials.

Secrets must never be:

* delivered to the browser;
* written into Planning Space files;
* committed to Git;
* included in normal model-visible context;
* exposed in teacher-facing error messages.

PTS may know only states such as:

```text
runtime ready
provider configured
authentication failed
setup required
policy denied
```

---

# 23. Memory boundaries

The architecture distinguishes several kinds of memory.

```text
Canonical Project State
        =
Planning Space

Conversation Runtime Memory
        =
short-/medium-term dialogue context

Professional Memory
        =
deliberately retained professional experience

Workflow Memory
        =
knowledge about how tasks are performed

Skill History
        =
versions, outcomes and performance data
```

These categories must not silently collapse into one opaque runtime memory.

Long-term professional memory remains subject to explicit PTS memory policy and capture rules.

---

# 24. Knowledge boundary

Knowledge is not simply runtime memory.

Curated Knowledge should remain:

* attributable;
* versioned;
* portable;
* independently inspectable.

The adaptive runtime may:

* retrieve Knowledge;
* discover candidate sources;
* compare perspectives;
* propose Knowledge additions.

It must not automatically turn arbitrary retrieved material into trusted canonical Knowledge.

---

# 25. Quality progression

The runtime should become better through use.

But improvement must be observable.

Relevant dimensions include:

* pedagogical coherence;
* relevance;
* epistemic discipline;
* provenance;
* usefulness;
* error rate;
* required follow-up;
* token usage;
* model calls;
* tool calls;
* latency;
* estimated cost.

A future runtime change should be assessable not only as:

> Does it work?

but as:

> Is this better than the previous version, and at what cost?

---

# 26. Reference cases

Stable reference cases should be maintained for at least:

* normal Companion conversation;
* decision clarification;
* open research;
* perspective discovery;
* Knowledge retrieval;
* artifact generation;
* Worker + Review;
* Learning Landscape change;
* maintenance;
* conversation Skill selection.

Runtime, Skill, prompt, model and workflow changes should be tested against relevant reference cases before promotion.

---

# 27. Teacher-facing semantics

Normal teacher-facing language should describe pedagogical work rather than infrastructure.

Prefer:

> I am looking for two genuinely different perspectives on this.

> I am preparing a draft in the background.

> I found something that may challenge our current assumption.

> The preparation needs another check before I bring it back.

Avoid normal product language such as:

```text
Harness
Agent Runtime
Subagent
Tool Call
Token Budget
DeepSeek
OpenCode
```

Technical information belongs in:

* administration;
* diagnostics;
* development tooling.

---

# 28. Current product decisions

The following decisions are currently binding:

* PTS is **domain-first**, not Harness-first.
* The Planning Space remains the canonical pedagogical state.
* `DirectLlmAdapter` is the current standard real-model execution path.
* Direct LLM is preferred for bounded tasks with known workflows.
* DeepSeek Harness is evaluated as an adaptive runtime, not merely as another chat transport.
* OpenCode remains available for coding and Kernel evolution.
* No execution runtime owns pedagogical decisions.
* Backend policy remains authoritative.
* Skills and Workflow Memory remain subject to PTS policy.
* Runtime learning uses proposals, evaluation, versioning and promotion rather than uncontrolled self-modification.
* Quality and resource economy must be evaluated together.
* Deterministic execution is preferred where possible.
* Deployment topology and execution semantics are separate concerns.
* The browser never talks directly to execution runtimes.
* Provider credentials never enter Planning Space state or teacher-facing conversation.

---

# 29. Migration from the previous architecture

The transition does not require a rewrite of `ptspace-app`.

Existing components remain valuable:

```text
HarnessAdapter
DirectLlmAdapter
OpenCodeDockerAdapter
ConversationOrchestrator
GuidedWorkflowService
WorkspaceManager
PermissionPolicy
ServiceRequestWorkflow
```

The migration consists primarily of:

1. correcting architectural documentation;
2. treating Direct LLM as a first-class execution path;
3. evaluating DeepSeek Harness behind the existing adapter boundary;
4. adding adaptive Skills and Workflow Memory only where they provide demonstrated value;
5. evolving the adapter interface only when implementation evidence requires it.

`HARNESS_FIRST_ARCHITECTURE.md` should be retained as a historical architecture decision or moved under `docs/history/`.

It is superseded by this document.

---

# 30. Relationship to HARNESS_ADAPTERS.md

`EXECUTION_ARCHITECTURE.md` defines the architectural model.

`HARNESS_ADAPTERS.md` documents the concrete runtime adapters and their technical integration.

Conceptually:

```text
EXECUTION_ARCHITECTURE.md
        │
        │ architecture and boundaries
        ▼
HARNESS_ADAPTERS.md
        │
        │ concrete implementations
        ▼
backend/src/services/harness/
```

If L5b demonstrates that the historical term `HarnessAdapter` has become misleading, the adapter document and interface may later be renamed.

That decision should follow implementation evidence.

---

# 31. Relationship to L5b and L6

`TASKS.md` defines the implementation sequence.

### L5b

L5b evaluates and builds the adaptive runtime layer:

* DeepSeek integration;
* persistent sessions;
* context economy;
* Skills;
* open research;
* Workflow Memory;
* conversation methods;
* self-organised bounded workflows;
* maintenance;
* controlled runtime learning.

### L6

L6 turns those capabilities into a measurable quality system:

* Knowledge;
* provenance;
* graduated Review;
* reference cases;
* quality measurement;
* token and cost measurement;
* adaptive model selection;
* retrieval economy;
* workflow economy;
* regression detection.

The architectural goal is not maximal agent autonomy.

It is:

> the smallest sufficient execution path for the best defensible pedagogical result.

---

# 32. Open questions

The following questions remain intentionally open until L5b/L6 provide implementation evidence:

1. Should `HarnessAdapter` become `ExecutionAdapter` or `RuntimeAdapter`?
2. Should Direct LLM and adaptive runtimes implement one common interface or capability-specific interfaces?
3. Which Skills belong to the generic runtime and which belong to the pedagogical domain?
4. Which Workflow Memories are suitable for reuse across Planning Spaces?
5. Which runtime improvements may be promoted automatically?
6. Which changes always require human review?
7. Which model-routing decisions should be automatic?
8. Which memory backend should store Workflow Memory and Skill History?
9. Which adaptive-runtime capabilities are valuable enough to justify their operational complexity?
10. Which parts of the architecture can later be shared with the Theological Thinking Space?

These questions must be answered through usage, benchmarks and qualitative evaluation rather than architectural speculation.

---

## Guiding sentence

> **The Pedagogical Thinking Space owns the thinking process; execution systems provide capabilities.**
>
> Use deterministic code when possible, Direct LLM when sufficient, an adaptive runtime when the path must emerge during the work, and a coding harness when the system itself must be changed.

