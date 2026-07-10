import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";

export type ServiceKind = "memory" | "knowledge" | "worker" | "renderer" | "review";
export type ServiceRequestStatus = "proposed" | "approved" | "in_progress" | "returned" | "reviewed" | "failed";

export type AppServiceRequest = {
  id: string;
  planningSpaceId: string;
  status: ServiceRequestStatus;
  service: ServiceKind;
  mode: string;
  capability: string;
  reason: string;
  input: Record<string, unknown>;
  expectedOutput: { type: string; location: string };
  constraints: Record<string, unknown>;
  returnTo: "critical_friend";
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  review?: { status: "passed" | "failed"; note: string; reviewedAt: string };
};

export type KernelServiceRequest = {
  id: string;
  status: ServiceRequestStatus;
  service: ServiceKind;
  mode: string;
  task: string;
  reason: string;
  input: Record<string, unknown>;
  expected_output: { type: string; location: string };
  constraints: Record<string, unknown>;
  return_to: "critical_friend";
  requires_approval: boolean;
};

type CapabilityContract = {
  id: string;
  service: ServiceKind;
  modes: string[];
  outputType: string;
  defaultLocation: string;
  teacherFacingLabel: string;
};

const capabilities: Record<string, CapabilityContract> = {
  create_student_instruction: {
    id: "create_student_instruction",
    service: "worker",
    modes: ["draft"],
    outputType: "student_instruction",
    defaultLocation: "drafts/student-instruction.md",
    teacherFacingLabel: "Arbeitsauftrag als Entwurf vorbereiten"
  }
};

export class ServiceRequestWorkflow {
  constructor(private readonly workspace: WorkspaceManager) {}

  listCapabilities(): CapabilityContract[] {
    return Object.values(capabilities);
  }

  async proposeStudentInstruction(planningSpaceId: string, reason: string): Promise<AppServiceRequest> {
    return this.propose(planningSpaceId, {
      service: "worker",
      mode: "draft",
      capability: "create_student_instruction",
      reason,
      input: { learningDesign: "learning-design.md" },
      constraints: { language: "de" }
    });
  }

  async propose(
    planningSpaceId: string,
    input: {
      service: ServiceKind;
      mode: string;
      capability: string;
      reason: string;
      input?: Record<string, unknown>;
      constraints?: Record<string, unknown>;
    }
  ): Promise<AppServiceRequest> {
    const capability = capabilities[input.capability];
    if (!capability || capability.service !== input.service || !capability.modes.includes(input.mode)) {
      throw new Error("capability_not_approved");
    }
    const now = new Date().toISOString();
    const request: AppServiceRequest = {
      id: `sr-${randomUUID()}`,
      planningSpaceId,
      status: "proposed",
      service: input.service,
      mode: input.mode,
      capability: capability.id,
      reason: input.reason,
      input: input.input ?? {},
      expectedOutput: { type: capability.outputType, location: capability.defaultLocation },
      constraints: input.constraints ?? {},
      returnTo: "critical_friend",
      requiresApproval: true,
      createdAt: now,
      updatedAt: now
    };
    await this.save(request);
    return request;
  }

  async list(planningSpaceId: string): Promise<AppServiceRequest[]> {
    const directory = this.requestsDirectory(planningSpaceId);
    try {
      const names = (await fs.readdir(directory)).filter((name) => name.endsWith(".json"));
      return Promise.all(names.map(async (name) => JSON.parse(await fs.readFile(path.join(directory, name), "utf8")) as AppServiceRequest));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async approveAndRun(planningSpaceId: string, requestId: string): Promise<AppServiceRequest> {
    const request = await this.read(planningSpaceId, requestId);
    if (request.status !== "proposed") throw new Error("service_request_not_proposed");
    request.status = "approved";
    request.updatedAt = new Date().toISOString();
    await this.save(request);
    request.status = "in_progress";
    request.updatedAt = new Date().toISOString();
    await this.save(request);
    try {
      if (request.capability !== "create_student_instruction") throw new Error("capability_not_implemented");
      await this.createStudentInstruction(planningSpaceId, request);
      request.status = "returned";
      request.updatedAt = new Date().toISOString();
      await this.reviewReturnedResult(planningSpaceId, request);
      await this.save(request);
      return request;
    } catch (error) {
      request.status = "failed";
      request.updatedAt = new Date().toISOString();
      request.review = { status: "failed", note: error instanceof Error ? error.message : "Ausführung fehlgeschlagen.", reviewedAt: request.updatedAt };
      await this.save(request);
      throw error;
    }
  }

  toKernelContract(request: AppServiceRequest): KernelServiceRequest {
    return {
      id: request.id,
      status: request.status,
      service: request.service,
      mode: request.mode,
      task: request.capability,
      reason: request.reason,
      input: { ...request.input, learning_design: `workspace/${request.planningSpaceId}/project/learning-design.md` },
      expected_output: {
        type: request.expectedOutput.type,
        location: `workspace/${request.planningSpaceId}/project/${request.expectedOutput.location}`
      },
      constraints: request.constraints,
      return_to: request.returnTo,
      requires_approval: request.requiresApproval
    };
  }

  private async createStudentInstruction(planningSpaceId: string, request: AppServiceRequest): Promise<void> {
    const learningDesign = await this.workspace.readProjectFile(planningSpaceId, "learning-design.md");
    const audience = this.extractSection(learningDesign, "Zielgruppe") || "die Lerngruppe";
    const intention = this.extractSection(learningDesign, "Lernanliegen") || "das gemeinsam geklärte Lernanliegen";
    const content = [
      "# Entwurf: Arbeitsauftrag",
      "",
      `**Für:** ${audience}`,
      "",
      `**Lernanliegen:** ${intention}`,
      "",
      "## Auftrag",
      "",
      "Beschreibt zunächst, was ihr an der Situation wahrnehmt. Tauscht euch anschließend darüber aus, welche unterschiedlichen Deutungen möglich sind, und begründet, welche davon euch überzeugt.",
      "",
      "## Rückmeldung",
      "",
      "Haltet eine offene Frage fest, die ihr im gemeinsamen Gespräch weiterverfolgen möchtet.",
      "",
      "> Status: Entwurf – vom Critical Friend zu prüfen."
    ].join("\n");
    await this.workspace.writeProjectFile(planningSpaceId, request.expectedOutput.location, content);
  }

  private async reviewReturnedResult(planningSpaceId: string, request: AppServiceRequest): Promise<void> {
    const result = await this.workspace.readProjectFile(planningSpaceId, request.expectedOutput.location);
    const learningDesign = await this.workspace.readProjectFile(planningSpaceId, "learning-design.md");
    if (!result.includes("# Entwurf") || result.length < 180 || !learningDesign.trim()) throw new Error("review_failed");
    request.status = "reviewed";
    request.updatedAt = new Date().toISOString();
    request.review = {
      status: "passed",
      note: "Der Entwurf ist vorhanden, als Entwurf gekennzeichnet und an den aktuellen Denkstand angebunden. Die Lehrkraft entscheidet über Freigabe oder Überarbeitung.",
      reviewedAt: request.updatedAt
    };
  }

  private extractSection(markdown: string, heading: string): string {
    const match = markdown.match(new RegExp(`## ${heading}\\n([^#]+)`));
    return match?.[1]?.trim().split("\n")[0] ?? "";
  }

  private requestsDirectory(planningSpaceId: string): string {
    return this.workspace.resolveInsideWorkspace(planningSpaceId, path.join("project", "service-requests"));
  }

  private async read(planningSpaceId: string, requestId: string): Promise<AppServiceRequest> {
    const safeId = path.basename(requestId);
    if (safeId !== requestId) throw new Error("invalid_service_request_id");
    const content = await fs.readFile(path.join(this.requestsDirectory(planningSpaceId), `${safeId}.json`), "utf8");
    return JSON.parse(content) as AppServiceRequest;
  }

  private async save(request: AppServiceRequest): Promise<void> {
    const directory = this.requestsDirectory(request.planningSpaceId);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, `${request.id}.json`), JSON.stringify(request, null, 2), "utf8");
  }
}
