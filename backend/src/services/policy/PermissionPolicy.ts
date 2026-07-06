import path from "node:path";
import { PolicyDecision } from "@ptspace/shared";

export type FilePolicyRequest = {
  workspaceRoot: string;
  targetPath: string;
  operation: "read" | "write";
};

export type HarnessPermissionRequest =
  | { type: "file"; file: FilePolicyRequest }
  | { type: "network"; url: string }
  | { type: "command"; command: string }
  | { type: "secret"; name: string };

export class PermissionPolicy {
  decide(request: HarnessPermissionRequest): PolicyDecision {
    if (request.type === "file") {
      return this.decideFile(request.file);
    }
    if (request.type === "secret") {
      return {
        decision: "deny",
        reason: "secrets_do_not_belong_in_dialog_or_workspace",
        teacherFacingMessage: "Zugangsdaten gehoeren nicht ins Gespräch. Sie werden nur in freigegebenen Einstellungen verwaltet."
      };
    }
    if (request.type === "command") {
      return {
        decision: "requires_admin_approval",
        reason: "commands_require_backend_or_admin_policy",
        teacherFacingMessage: "Dieser technische Schritt braucht eine Admin-Freigabe und wird nicht im Planungsdialog entschieden."
      };
    }
    return {
      decision: "requires_admin_approval",
      reason: "network_access_requires_admin_policy",
      teacherFacingMessage: "Externe Dienste werden nur genutzt, wenn sie in dieser Instanz freigegeben sind."
    };
  }

  private decideFile(request: FilePolicyRequest): PolicyDecision {
    const workspaceRoot = path.resolve(request.workspaceRoot);
    const target = path.resolve(request.targetPath);
    const relative = path.relative(workspaceRoot, target);
    const inside = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    if (!inside) {
      return {
        decision: "deny",
        reason: "outside_workspace",
        teacherFacingMessage: "Ich arbeite nur im geschützten Planungsraum."
      };
    }
    return { decision: "allow", reason: `${request.operation}_inside_workspace` };
  }
}
