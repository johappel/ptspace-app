# Scenario: Audio Worker for Pedagogical Dialogue Scenes

> This scenario belongs to `ptspace-app`. It specifies how an audio generation task should move through the architecture without exposing teachers to technical provider decisions or unsafe permission prompts.

## Purpose

The scenario describes a case in which a teacher wants an audio scene in which two students and a teacher discuss a topic. The audio may be generated via a hosted provider such as ElevenLabs, a local TTS pipeline such as ComfyUI, or another runtime. The teacher should not have to choose or approve low-level technical execution. The teacher decides the pedagogical intention, the content, the desired classroom function, and whether the final artefact may be exported or shared.

## Architectural Principle

Audio generation is not a direct chat command. It is a Worker task that may only start after the relevant Learning Design decision has been made.

This scenario distinguishes two layers:

```text
Audio Worker Capability
  belongs to ptspace-app
  defines pedagogical workflow, allowed inputs, required transcript, review, transparency, fallback and return path

tts-generation Skill
  belongs to opencode / harness / MCP / worker runtime
  performs the concrete audio generation through ElevenLabs, ComfyUI, local TTS or another approved route
```

The Audio Worker Capability never installs, selects or configures the runtime by itself. It produces a structured request. The backend policy layer routes that request to an approved `tts-generation` skill if available. If no approved skill is available, the safe fallback is script-only output or an admin request.

```text
Teacher / planning group
        ↓
Critical Friend clarifies the pedagogical purpose
        ↓
Learning Design is updated
        ↓
Service Request is proposed
        ↓
Backend policy checks whether the task is allowed
        ↓
Audio Worker creates script and/or audio draft
        ↓
Critical Friend reviews and returns the result
        ↓
Teacher decides whether it is pedagogically usable
        ↓
Renderer / Export Worker places approved files where needed
```

## User-Facing Scenario

A teacher says:

> I would like an audio impulse where two students and a teacher discuss whether it is worth acting when politics seems powerless.

The Critical Friend does not ask:

> Should I use ElevenLabs or ComfyUI?

Instead, the Critical Friend asks a pedagogical question:

> What should the audio do in the lesson: open a dilemma, model a respectful disagreement, or provide material for analysis?

Only after this purpose is clear may the system continue.

## Pedagogical Clarification

Before a Worker task is proposed, the Critical Friend should clarify:

- classroom purpose of the audio;
- target group and age level;
- role of the scene in the learning journey;
- desired emotional tone;
- relation to the Learning Design;
- whether learners should identify with, critique, continue, or transform the dialogue;
- whether a transcript is needed for accessibility;
- whether the audio contains sensitive assumptions about learners.

## Learning Design Update

The Learning Design should record:

```yaml
learning_moment:
  type: audio_dialogue_impulse
  purpose: open_dilemma_and_enable_reflection
  roles:
    - student_voice_1
    - student_voice_2
    - teacher_voice
  learner_action_after_listening: discuss_positions_and_extend_arguments
  accessibility: transcript_required
  disclosure: ai_generated_audio_should_be_identified_when_used
```

## Service Request

The Critical Friend proposes a Service Request. The teacher sees a simple pedagogical prompt such as:

> Should I prepare a first audio dialogue draft from our current design?

The internal request may look like this:

```yaml
id: worker-audio-dialogue-001
status: proposed
service: worker
mode: draft
created: <YYYY-MM-DD>
created_by: critical_friend

reason: >
  The Learning Design includes an approved audio dialogue impulse. A first script
  and optionally an audio draft should be created without introducing new
  pedagogical decisions.

capability: app-capabilities/workers/AUDIO_WORKER.md
runtime_skill_requested: tts-generation

input:
  learning_design: workspace/<project-slug>/learning-design.md
  related_decision: audio-dialogue-impulse
  related_activity: listening-and-positioning-activity
  sources: []

expected_output:
  type: audio_dialogue_draft
  format:
    - markdown_script
    - audio_file_optional
  location:
    script: workspace/<project-slug>/drafts/audio-dialogue-script.md
    audio: workspace/<project-slug>/materials/audio/dialogue-draft.mp3
    transcript: workspace/<project-slug>/materials/audio/dialogue-transcript.md

constraints:
  language: de
  audience: grade 9
  tone: respectful, realistic, not theatrical
  voices: synthetic_generic_voices_only
  must:
    - include transcript
    - keep the teacher responsible for pedagogical decisions
    - mark assumptions explicitly
    - avoid real student names or identifiable voices
    - produce a review note with risks and limitations
  must_not:
    - imitate real persons
    - clone student or teacher voices
    - introduce new learning goals
    - use personal data
    - export to external services without backend policy approval

return_to: critical_friend
requires_approval: true

review:
  required: true
  reviewer: critical_friend
  criteria:
    - aligned with Learning Design
    - no unsupported claims
    - no hidden pedagogical decisions
    - age-appropriate language
    - stereotypes avoided
    - transcript available
    - rights and provider notes included

assumptions: []
risks:
  - generated dialogue may sound more authoritative than intended
  - synthetic student voices may create false realism
  - external TTS providers may require institutional approval
```


## Runtime Availability and Missing Capabilities

If the selected or preferred audio route is not available, the Worker must not install it automatically.

Example:

```text
Teacher prefers realistic audio.
Backend checks local_tts / ComfyUI.
ComfyUI is not installed.
```

The system must not ask:

```text
Should I install ComfyUI?
Should I run docker pull?
Should I install dependencies?
```

Instead the Critical Friend explains:

```text
Local audio generation is not set up in this instance.
I can prepare the dialogue script and transcript now.
For actual audio generation, an approved local TTS runtime or an approved external TTS integration is needed.
```

If helpful, the Critical Friend may offer:

```text
Should I prepare a short setup request for your administration?
```

The resulting internal request is an Admin Request, not a Worker action:

```yaml
service: admin
mode: request_runtime
runtime: local_tts_comfyui
reason: >
  Audio Worker needs an approved local TTS runtime for realistic dialogue generation.
status: proposed
requires_admin_approval: true
```

## Secrets and API Keys

API keys must never be entered in the chat.

If a teacher asks how to use ElevenLabs, the Critical Friend may explain the safe path:

```text
Do not paste the API key here.
Open Settings → Integrations → ElevenLabs and store it there.
The key is stored as a secret. I only see whether the integration is available.
```

If a teacher pastes a key into the chat, the system should not use it. It should warn the teacher and, where technically possible, mark the message for deletion or redaction.

```text
Please do not post API keys in the chat.
I will not use this key. Store it under Settings → Integrations → ElevenLabs instead.
```

## Device and Installation Guidance

The Critical Friend may give high-level orientation, but not step-by-step installation commands in the normal teacher dialogue.

```text
Tablet
  Good for using the web app. Not suitable for local ComfyUI/TTS runtime.

Teacher PC
  Possible for experimentation, but not preferred for school production unless support, updates and data protection are clear.

School or institutional server
  Preferred for productive local TTS because runtime, models, logs, storage and permissions can be centrally controlled.

Docker stack
  Useful for isolating app, harness and worker services. Still requires admin approval for new runtimes.
```

The Critical Friend may say:

```text
For your tablet, I would not recommend installing ComfyUI locally.
Use the web app. Audio generation should run on a configured server runtime or approved provider.
```


## Provider Routing

Provider selection is not a teacher-facing decision unless the teacher explicitly asks or institutional policy requires it.

The backend policy decides among available routes:

```text
route: local_tts
  Use when privacy constraints are strict or no external processing is allowed.

route: approved_external_tts
  Use only when the provider is institutionally approved and the request contains no personal data.

route: script_only
  Use when audio generation is not allowed, unclear, or requires later review.
```

Examples:

```text
ElevenLabs
  Possible route for high-quality hosted TTS if approved by institution,
  contractual and data-protection requirements are fulfilled, and no personal
  or sensitive learner data is transmitted.

ComfyUI / local TTS
  Possible route when local execution is preferred. More complex to operate,
  but stronger for privacy if models and runtime remain local.

Script-only fallback
  Always available. The system can create a script and transcript without
  generating audio.
```

## Permission Handling

Technical `ask` prompts from the harness must not be shown directly to teachers.

```text
technical permission
  → backend policy decides

pedagogical uncertainty
  → Critical Friend asks the teacher

system risk
  → deny or require admin approval
```

The teacher may be asked:

> Should the audio sound like a realistic classroom conversation, or rather like a clearly staged listening text?

The teacher should not be asked:

> Allow POST request to external TTS API?

## Review Before Presentation

The generated audio result must return to the Critical Friend first. The Critical Friend reviews:

- Does the script still serve the approved learning moment?
- Are student voices represented respectfully?
- Is the teacher voice too authoritative or manipulative?
- Is the dialogue plausible without pretending to be real classroom speech?
- Are sensitive topics handled carefully?
- Is there a transcript?
- Are source/provider/licence notes included?
- Should the audio be labelled as AI-generated?

Only then is the result presented to the teacher as a draft.

## Export

Approved outputs may be exported to:

```text
workspace/<project-slug>/exports/audio/
external Nextcloud folder selected by the teacher
OKF package metadata, if the dialogue becomes a reusable learning design example
```

The raw chat is not exported. OKF export should include the reusable pedagogical artefact, not the full planning conversation.

## Safety and Data Protection Rules

- No real student names.
- No cloned voices of students, teachers, parents, public figures, or colleagues.
- No biometric voice data unless an explicit institutional policy and consent process exists.
- No sensitive learner data in prompts sent to external providers.
- Audio should be labelled as AI-generated where used with learners.
- A transcript should be created by default for accessibility.
- External provider routing must be disabled unless explicitly configured by an administrator.
- Local generation should be preferred when privacy constraints are high.

## Product Decisions Captured

**Decision 22:** Audio generation is a Worker capability, not a direct chat command.

**Decision 23:** The teacher decides pedagogical purpose, tone, classroom use, and release; the backend decides technical routing.

**Decision 24:** Provider choice is handled by policy. Local TTS, approved hosted TTS, and script-only fallback are interchangeable routes.

**Decision 25:** Technical permission prompts are never shown directly to teachers. They are resolved by backend policy or translated into meaningful pedagogical questions by the Critical Friend.

**Decision 26:** Audio artefacts require transcript, review, and clear status before export.

**Decision 27:** Voice cloning and identifiable learner/person voices are out of scope for the default system.

**Decision 28:** Workers must not install or modify runtime environments automatically.

**Decision 29:** Missing audio runtimes lead to script-only fallback or Admin Request, not to technical install prompts for teachers.

**Decision 30:** API keys and secrets must never be entered in the chat.

**Decision 31:** Provider availability and routing are backend/admin responsibilities.

**Decision 32:** The Critical Friend may explain where to configure integrations and whether local installation is sensible, but must not collect secrets or execute setup.

**Decision 33:** Realistic AI audio requires transcript, review, transparency, provider status and explicit release before classroom use or export.

## Possible Future Capability File

Create a reviewed app-level Worker capability at:

```text
app-capabilities/workers/AUDIO_WORKER.md
```

Do not confuse this with the runtime-level skill, which may be named for example:

```text
opencode skills/tts-generation
```

It should define:

- allowed audio tasks;
- forbidden audio tasks;
- provider routing expectations;
- required script/transcript output;
- privacy and consent constraints;
- review criteria;
- export rules.


---

## Architecture Update: Capability in App, Skill in Harness

This scenario assumes the current product decision: **harness-first, UI-safe**.

The Audio Worker Capability belongs to `ptspace-app`. It defines the pedagogical workflow: purpose clarification, transcript-first production, review, transparency notice, provider policy, fallback and teacher-facing language.

The concrete `tts-generation` skill belongs to the harness/runtime layer, for example `opencode`, an MCP tool, a local worker container or an external provider adapter.

```text
Teacher request
  ↓
Critical Friend clarifies pedagogical purpose
  ↓
Audio Worker Capability governs the app-side workflow
  ↓
Backend checks policy and integration status
  ↓
Harness executes `tts-generation` only if approved and available
  ↓
Result returns to Critical Friend before teacher-facing use
```

If the harness is not available, the scenario may still produce a transcript and speaker concept, but it must not pretend that audio generation is complete.
