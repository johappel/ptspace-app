import { z } from "zod";

const ISODateString = z.string().datetime({ offset: true });

export const PlanningSpaceStatusSchema = z.enum(["active", "archived", "exported"]);
export type PlanningSpaceStatus = z.infer<typeof PlanningSpaceStatusSchema>;

export const ParticipantSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: z.enum(["owner", "participant", "viewer", "reviewer"]).default("owner")
});
export type Participant = z.infer<typeof ParticipantSchema>;

/**
 * Read model of `learning-design.md` (das übergeordnete pädagogische Verständnis).
 *
 * T-302: Dies ist ein klar bezeichnetes Read Model, kein kanonisches Schreibziel.
 * Die App darf hier keine konkurrierenden kanonischen Listen mehr führen. Die
 * kanonischen Quellen sind:
 *   - Lernmomente und Lernaktivitäten -> `learning-landscape.md` (LearningLandscapeSchema)
 *   - Materialien -> `materials/` (MaterialSchema)
 *   - Arbeitsvorhaben / nächste Schritte -> `planning-board.yml` (PlanningBoardSchema)
 *   - Entscheidungen -> `decisions.yml`
 * Nur die narrative Rahmung (Kontext, Intention, Lernreise-Erzählung, Reflexion)
 * wird hier zur Übersicht gespiegelt. Insbesondere gibt es hier keine
 * `phases`-, `activities`- oder `materials`-Listen mehr.
 */
export const LearningDesignSchema = z.object({
  context: z.object({
    subject: z.string().optional().default(""),
    grade: z.string().optional().default(""),
    setting: z.string().optional().default(""),
    constraints: z.array(z.string()).default([])
  }),
  intention: z.object({
    summary: z.string().default(""),
    learnersShould: z.object({
      know: z.array(z.string()).default([]),
      understand: z.array(z.string()).default([]),
      experience: z.array(z.string()).default([]),
      becomeAbleTo: z.array(z.string()).default([])
    })
  }),
  learningJourney: z.object({
    startingPoint: z.string().default(""),
    turningPoints: z.array(z.string()).default([])
  }),
  reflection: z.object({
    learnerReflection: z.array(z.string()).default([]),
    teacherReflection: z.array(z.string()).default([]),
    openQuestions: z.array(z.string()).default([])
  })
});
export type LearningDesign = z.infer<typeof LearningDesignSchema>;

export const DecisionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  decision: z.string().default(""),
  reason: z.string().default(""),
  alternatives: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
  decidedBy: z.array(z.string()).default([]),
  createdAt: ISODateString
});
export type Decision = z.infer<typeof DecisionSchema>;

export const OpenQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  context: z.string().default(""),
  createdAt: ISODateString
});
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;

export const NextStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(""),
  kind: z.enum(["reflect", "knowledge", "worker", "renderer", "export"]),
  status: z.enum(["suggested", "accepted", "in_progress", "done", "discarded"]),
  relatedServiceRequest: z.string().nullable().default(null)
});
export type NextStep = z.infer<typeof NextStepSchema>;

export const ServiceRequestSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["proposed", "approved", "queued", "in_progress", "completed", "returned", "reviewed", "discarded", "failed"]),
  service: z.enum(["memory", "knowledge", "worker", "renderer", "review", "admin"]),
  mode: z.enum(["retrieve", "research", "draft", "render", "validate", "summarize", "propose", "request_runtime"]),
  reason: z.string().min(1),
  input: z.record(z.unknown()).default({}),
  expectedOutput: z.record(z.unknown()).default({}),
  constraints: z.record(z.unknown()).default({}),
  returnTo: z.literal("critical_friend"),
  requiresApproval: z.boolean().default(false)
});
export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export const MaterialSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["lesson_plan", "worksheet", "prompt", "presentation", "source_overview", "teacher_notes", "audio_script"]),
  status: z.enum(["draft", "review_needed", "ready_for_class", "shared_proposed"]),
  createdAt: ISODateString
});
export type Material = z.infer<typeof MaterialSchema>;

export const PlanningSpaceSchema = z.object({
  id: z.string().min(1),
  workspaceSlug: z.string().min(1).optional(),
  title: z.string().min(1),
  subject: z.string().optional().default(""),
  targetGroup: z.string().optional().default(""),
  initialIdea: z.string().optional().default(""),
  status: PlanningSpaceStatusSchema.default("active"),
  participants: z.array(ParticipantSchema).default([]),
  createdAt: ISODateString,
  updatedAt: ISODateString,
  learningDesign: LearningDesignSchema,
  // T-302: Read-Model-Projektionen. Kanonisch sind die Kernel-Dateien:
  // open-questions.md, decisions.yml, planning-board.yml und materials/.
  // Kein Schreibpfad pflegt hier doppelte pädagogische Semantik.
  openQuestions: z.array(OpenQuestionSchema).default([]),
  decisions: z.array(DecisionSchema).default([]),
  nextSteps: z.array(NextStepSchema).default([]),
  materials: z.array(MaterialSchema).default([])
});
export type PlanningSpace = z.infer<typeof PlanningSpaceSchema>;

export const CreatePlanningSpaceSchema = z.object({
  title: z.string().min(3),
  subject: z.string().optional().default(""),
  targetGroup: z.string().optional().default(""),
  initialIdea: z.string().optional().default("")
});
export type CreatePlanningSpaceInput = z.infer<typeof CreatePlanningSpaceSchema>;

export const ConversationMessageSchema = z.object({
  id: z.string().min(1),
  author: z.enum(["teacher", "critical_friend", "system"]),
  text: z.string().min(1),
  createdAt: ISODateString,
  focus: z.object({
    kind: z.enum(["learning_moment", "teaching_window", "planning_item", "material"]),
    id: z.string().min(1),
    label: z.string().min(1)
  }).optional()
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const TeacherFacingStatusSchema = z.enum([
  "bereit",
  "wartet_kurz",
  "wird_vorbereitet",
  "liegt_zur_prüfung_bereit",
  "konnte_noch_nicht_erstellt_werden",
  "admin_freigabe_noetig"
]);
export type TeacherFacingStatus = z.infer<typeof TeacherFacingStatusSchema>;

export const PolicyDecisionSchema = z.object({
  decision: z.enum(["allow", "deny", "requires_admin_approval", "ask_critical_friend"]),
  reason: z.string().min(1),
  teacherFacingMessage: z.string().optional()
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export function createEmptyLearningDesign(input?: { subject?: string; targetGroup?: string; initialIdea?: string }): LearningDesign {
  return {
    context: {
      subject: input?.subject ?? "",
      grade: input?.targetGroup ?? "",
      setting: "",
      constraints: []
    },
    intention: {
      summary: input?.initialIdea ?? "",
      learnersShould: { know: [], understand: [], experience: [], becomeAbleTo: [] }
    },
    learningJourney: { startingPoint: "", turningPoints: [] },
    reflection: { learnerReflection: [], teacherReflection: [], openQuestions: [] }
  };
}
export type InternalWorkStatus = "queued" | "in_progress" | "completed" | "failed" | "requires_admin_approval";

export function toTeacherFacingStatus(status: InternalWorkStatus): TeacherFacingStatus {
  const statuses: Record<InternalWorkStatus, TeacherFacingStatus> = {
    queued: "wartet_kurz",
    in_progress: "wird_vorbereitet",
    completed: "liegt_zur_prüfung_bereit",
    failed: "konnte_noch_nicht_erstellt_werden",
    requires_admin_approval: "admin_freigabe_noetig"
  };
  return statuses[status];
}
export const SensitiveFindingSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["student_name", "grade", "diagnosis", "family_detail", "personal_conflict", "secret"]),
  severity: z.enum(["notice", "review", "block_export"]),
  excerpt: z.string().min(1),
  message: z.string().min(1),
  suggestion: z.string().min(1)
});
export type SensitiveFinding = z.infer<typeof SensitiveFindingSchema>;

export const ExportApprovalSchema = z.object({
  id: z.string().min(1),
  planningSpaceId: z.string().min(1),
  exportType: z.enum(["markdown", "okf_markdown"]),
  approvedBy: z.string().min(1),
  approvedAt: ISODateString,
  note: z.string().optional().default(""),
  sensitiveFindingsReviewed: z.boolean().default(false)
});
export type ExportApproval = z.infer<typeof ExportApprovalSchema>;

export const CreateExportApprovalSchema = z.object({
  exportType: z.enum(["markdown", "okf_markdown"]),
  approvedBy: z.string().min(1).default("Lehrkraft"),
  note: z.string().optional().default(""),
  sensitiveFindingsReviewed: z.boolean().default(false)
});
export type CreateExportApprovalInput = z.infer<typeof CreateExportApprovalSchema>;

export const OkfPackageSchema = z.object({
  type: z.literal("learning_design"),
  title: z.string().min(1),
  status: z.literal("proposal"),
  sourceStatus: z.literal("teacher_generated_review_needed"),
  subject: z.string().default(""),
  targetGroup: z.string().default(""),
  markdown: z.string().min(1)
});
export type OkfPackage = z.infer<typeof OkfPackageSchema>;


export const LearningLandscapeStructureSchema = z.enum(["linear", "branching", "stations", "buffet", "project", "spatial", "hybrid"]);
export type LearningLandscapeStructure = z.infer<typeof LearningLandscapeStructureSchema>;

export const LearningMomentKindSchema = z.enum([
  "impulse", "learning_place", "positioning", "inquiry", "choice", "practice",
  "project", "product", "reflection", "assessment", "other"
]);
export type LearningMomentKind = z.infer<typeof LearningMomentKindSchema>;

export const LandscapeTransitionKindSchema = z.enum([
  "required", "choice", "parallel", "return", "meeting_point", "prerequisite"
]);
export type LandscapeTransitionKind = z.infer<typeof LandscapeTransitionKindSchema>;

export const LearningMomentStatusSchema = z.enum([
  "draft", "in_progress", "ready", "needs_revision"
]);
export type LearningMomentStatus = z.infer<typeof LearningMomentStatusSchema>;

export const LearningMomentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: LearningMomentKindSchema,
  didacticPurpose: z.string().default(""),
  learningActivity: z.string().default(""),
  expectedExperience: z.string().default(""),
  materialNeeds: z.array(z.string().min(1)).default([]),
  materialIds: z.array(z.string().min(1)).default([]),
  openQuestions: z.array(z.string()).default([]),
  status: LearningMomentStatusSchema.default("draft")
});
export type LearningMoment = z.infer<typeof LearningMomentSchema>;

export const LandscapeTransitionSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: LandscapeTransitionKindSchema,
  rationale: z.string().default("")
});
export type LandscapeTransition = z.infer<typeof LandscapeTransitionSchema>;

export const TeachingWindowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["lesson", "double_lesson", "project_block", "open_learning_time"]),
  durationMinutes: z.number().nonnegative(),
  note: z.string().default("")
});
export type TeachingWindow = z.infer<typeof TeachingWindowSchema>;

export const TimePlacementSchema = z.object({
  id: z.string().min(1),
  momentId: z.string().min(1),
  windowId: z.string().min(1),
  startMinute: z.number().nonnegative(),
  durationMinutes: z.number().nonnegative(),
  dramaturgicalRole: z.enum(["opening", "irritation", "exploration", "deepening", "practice", "decision", "consolidation", "reflection", "closing", "transition", "buffer", "other"]),
  mode: z.enum(["common", "choice", "parallel", "individual", "group", "open"]),
  note: z.string().default("")
});
export type TimePlacement = z.infer<typeof TimePlacementSchema>;

export const TemporalPlanSchema = z.object({
  schema: z.literal("ptspace.temporal-plan/v1"),
  title: z.string().min(1),
  landscape: z.literal("learning-landscape.md"),
  windows: z.array(TeachingWindowSchema).default([]),
  placements: z.array(TimePlacementSchema).default([])
});
export type TemporalPlan = z.infer<typeof TemporalPlanSchema>;export const LearningLandscapeSchema = z.object({
  schema: z.literal("ptspace.learning-landscape/v1"),
  structure: LearningLandscapeStructureSchema.default("linear"),
  title: z.string().min(1),
  moments: z.array(LearningMomentSchema).default([]),
  transitions: z.array(LandscapeTransitionSchema).default([])
}).superRefine((landscape, ctx) => {
  const momentIds = new Set(landscape.moments.map((moment) => moment.id));
  for (const transition of landscape.transitions) {
    if (!momentIds.has(transition.from) || !momentIds.has(transition.to)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "transition_references_unknown_moment" });
    }
  }
});
export type LearningLandscape = z.infer<typeof LearningLandscapeSchema>;

export const PlanningBoardColumnSchema = z.enum(["clarify", "prepare", "review", "ready"]);
export type PlanningBoardColumn = z.infer<typeof PlanningBoardColumnSchema>;

export const PlanningBoardItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["clarify", "research", "design", "produce", "review", "render", "export"]),
  column: PlanningBoardColumnSchema,
  status: z.enum(["proposed", "approved", "in_progress", "review", "ready", "blocked", "discarded"]),
  relatedNodes: z.array(z.string().min(1)).default([]),
  relatedWindows: z.array(z.string().min(1)).default([]),
  materialIds: z.array(z.string().min(1)).default([]),
  // T-601: fachlicher Kontext einer Board-Karte. `materialNeed` verweist auf den
  // auslösenden Materialbedarf eines Lernmoments (Text), `expectedResult`
  // beschreibt das erwartete Ergebnis. Beide bleiben optional.
  materialNeed: z.string().default(""),
  expectedResult: z.string().default(""),
  requiresTeacherApproval: z.boolean().default(true)
});
export type PlanningBoardItem = z.infer<typeof PlanningBoardItemSchema>;

export const PlanningBoardSchema = z.object({
  schema: z.literal("ptspace.planning-board/v1"),
  items: z.array(PlanningBoardItemSchema).default([])
});
export type PlanningBoard = z.infer<typeof PlanningBoardSchema>;

