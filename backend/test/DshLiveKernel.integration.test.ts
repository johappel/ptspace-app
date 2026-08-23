import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEmptyLearningDesign } from "@ptspace/shared";
import { DeepSeekHarnessAdapter } from "../src/services/harness/DeepSeekHarnessAdapter.js";
import { DshWebRuntimeTransport } from "../src/services/harness/DshWebRuntimeTransport.js";
import { PermissionPolicy } from "../src/services/policy/PermissionPolicy.js";

// OPT-IN Durchstich gegen eine ECHTE `dsh web`-Instanz (DeepSeek Harness).
// Wird nur ausgeführt, wenn PTSPACE_DEEPSEEK_WEB_URL gesetzt ist. Ohne diese
// URL bleibt der Transport bewusst unverbunden (siehe .env.example), deshalb
// wird die Suite dann übersprungen statt einen instabilen Upstream zu erraten.
//
// Start der Gegenstelle:  npx @deepseek-ai/dsh web   (Default http://localhost:3080)
// Ausführen:              PTSPACE_DEEPSEEK_WEB_URL=http://localhost:3080 \
//                         pnpm --filter @ptspace/backend test DshLiveKernel
//
// Prüft die einfachste reale Systemzusage: Der vollständige Stack
// (PTS-Adapter -> DSH-Transport -> laufende dsh-Instanz -> Modell) beantwortet
// einen Turn. Ob der Kernel-INHALT im Modellkontext ankommt, ist ohne
// Modellintrospektion nicht live prüfbar und wird deterministisch in
// KernelContextInjection.goal.test.ts abgesichert.

const webUrl = process.env.PTSPACE_DEEPSEEK_WEB_URL;
const apiPrefix = process.env.PTSPACE_DEEPSEEK_API_PREFIX ?? "/api";
const timeoutMs = Number(process.env.PTSPACE_DEEPSEEK_TIMEOUT_MS ?? "120000");

let workspaceRoot: string;

function testSpace() {
  return {
    id: "space-live",
    title: "Wozu braucht es Religion?",
    subject: "Religion",
    targetGroup: "Klasse 9",
    status: "active" as const,
    participants: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    initialIdea: "",
    learningDesign: createEmptyLearningDesign(),
    openQuestions: [],
    decisions: [],
    nextSteps: [],
    materials: [],
    exports: []
  };
}

beforeAll(async () => {
  workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ptspace-dsh-live-"));
});

afterAll(async () => {
  if (workspaceRoot) await fs.rm(workspaceRoot, { recursive: true, force: true });
});

describe.skipIf(!webUrl)("DSH Live-Durchstich (opt-in)", () => {
  it(
    "beantwortet einen realen Turn über die laufende dsh-web-Instanz",
    async () => {
      const runtime = new DshWebRuntimeTransport({ baseUrl: webUrl!, apiPrefix, timeoutMs });
      const adapter = new DeepSeekHarnessAdapter({
        enabled: true,
        policy: new PermissionPolicy(),
        apiKeyAvailable: true,
        pinnedVersion: process.env.PTSPACE_DEEPSEEK_VERSION ?? "unpinned-evaluation",
        runtime
      });

      const availability = await adapter.checkAvailability();
      expect(availability.status).toBe("ready");

      const session = await adapter.createSession({ planningSpaceId: "space-live", workspaceRoot });
      const result = await adapter.sendMessage({
        session,
        space: testSpace() as never,
        message: "Passt das eigentlich zum Lehrplan?"
      });

      expect(result.reply.text.trim().length).toBeGreaterThan(0);
      // Keine durchgereichte technische Fehlermeldung (Entscheidung 19).
      expect(result.reply.text).not.toMatch(/Administration informieren|nicht verbunden|nicht verfügbar/i);
    },
    timeoutMs + 30000
  );
});
