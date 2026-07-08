import { PolicyDecision } from "@ptspace/shared";
import { HarnessPermissionRequest, PermissionPolicy } from "../policy/PermissionPolicy.js";
import {
  HarnessAdapter,
  HarnessAvailability,
  HarnessEvent,
  HarnessPolicySimulationResult,
  HarnessMessageResult,
  HarnessSession,
  SendHarnessMessageInput
} from "./HarnessAdapter.js";

export type OpenCodeDockerAdapterOptions = {
  enabled: boolean;
  policy: PermissionPolicy;
};

export class OpenCodeDockerAdapter implements HarnessAdapter {
  id = "opencode-docker";
  label = "Integrierter geschützter Harness";
  mode = "docker" as const;

  constructor(private readonly options: OpenCodeDockerAdapterOptions) {}

  async checkAvailability(): Promise<HarnessAvailability> {
    if (!this.options.enabled) {
      return {
        status: "requires_admin_configuration",
        teacherFacingMessage: "Die nächste Ausführungsstufe ist vorbereitet, aber noch nicht freigegeben."
      };
    }
    return {
      status: "requires_setup",
      teacherFacingMessage: "Die geschützte Ausführung braucht noch eine geprüfte Runtime-Konfiguration."
    };
  }

  async createSession(input: { planningSpaceId: string; workspaceRoot: string }): Promise<HarnessSession> {
    if (!this.options.enabled) {
      throw new Error("opencode_docker_adapter_not_enabled");
    }
    return {
      id: `opencode-session-${input.planningSpaceId}`,
      planningSpaceId: input.planningSpaceId,
      workspaceRoot: input.workspaceRoot
    };
  }

  async sendMessage(_input: SendHarnessMessageInput): Promise<HarnessMessageResult> {
    throw new Error("opencode_docker_execution_not_implemented");
  }

  async *getEvents(_session: HarnessSession): AsyncIterable<HarnessEvent> {
    yield {
      type: "status",
      status: "waiting_for_backend_policy",
      message: "Die nächste Ausführungsstufe wartet auf Policy-Freigaben."
    };
  }

  async simulatePolicy(workspaceRoot: string): Promise<HarnessPolicySimulationResult> {
    const requests = this.createSimulationRequests(workspaceRoot);
    return {
      decisions: requests.map((request) => ({ request, decision: this.options.policy.decide(request) }))
    };
  }

  async stopSession(_session: HarnessSession): Promise<void> {
    return;
  }

  private createSimulationRequests(workspaceRoot: string): HarnessPermissionRequest[] {
    return [
      {
        type: "file",
        file: {
          workspaceRoot,
          targetPath: `${workspaceRoot}/project/learning-design.md`,
          operation: "write"
        }
      },
      {
        type: "file",
        file: {
          workspaceRoot,
          targetPath: `${workspaceRoot}/../outside.txt`,
          operation: "read"
        }
      },
      { type: "command", command: "opencode run" },
      { type: "network", url: "https://example.invalid" },
      { type: "secret", name: "OPENAI_API_KEY" },
      {
        type: "pedagogical_question",
        question: "Soll der erste Entwurf eher einen offenen Gesprächseinstieg oder eine strukturierte Sicherung vorbereiten?"
      }
    ];
  }
}

export function summarizeSimulation(result: HarnessPolicySimulationResult): Record<PolicyDecision["decision"], number> {
  return result.decisions.reduce(
    (summary, item) => {
      summary[item.decision.decision] += 1;
      return summary;
    },
    { allow: 0, deny: 0, requires_admin_approval: 0, ask_critical_friend: 0 }
  );
}
