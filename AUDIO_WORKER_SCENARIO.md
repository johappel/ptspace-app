# Scenario: Audio Worker for Pedagogical Dialogue Scenes

> This scenario belongs to `ptspace-app`. It specifies how an audio generation task should move through the architecture without exposing teachers to technical provider decisions or unsafe permission prompts.

## Purpose

The scenario describes a case in which a teacher wants an audio scene in which two students and a teacher discuss a topic. The audio may be generated via a hosted provider such as ElevenLabs, a local TTS pipeline such as ComfyUI, or another runtime. The teacher should not have to choose or approve low-level technical execution. The teacher decides the pedagogical intention, the content, the desired classroom function, and whether the final artefact may be exported or shared.

## Architectural Principle

Audio generation is not a direct chat command. It is a Worker task that may only start after the relevant Learning Design decision has been made.

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

capability: capabilities/workers/AUDIO_GENERATION.md

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

## Possible Future Capability File

Create a reviewed Worker capability at:

```text
capabilities/workers/AUDIO_GENERATION.md
```

It should define:

- allowed audio tasks;
- forbidden audio tasks;
- provider routing expectations;
- required script/transcript output;
- privacy and consent constraints;
- review criteria;
- export rules.
