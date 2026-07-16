import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Kernel Prompt Cache Grundlage (CHAT-PERFORMANCE-TASKS TASK 6,
 * ARCHITECTURE-SESSION-MODEL Abschnitt 2.5 / 15).
 *
 * Der pädagogische Kernel ist weitgehend statisch und wird über einen Hash
 * identifiziert. Bei unverändertem Kernel kann ein Provider-/Runtime-Cache
 * genutzt werden, statt den Prompt neu zusammenzubauen.
 */

export type KernelInfo = {
  version: string;
  hash: string;
};

const KERNEL_FINGERPRINT_FILES = [
  "AGENTS.md",
  "CRITICAL_FRIEND.de.md",
  "LEARNING_DESIGN.de.md",
  "ORCHESTRATION.md"
];

/**
 * Berechnet einen stabilen Kernel-Hash aus Größe und mtime der Kern-Dateien.
 * Fehlt der Kernel (z. B. Mock-/Testumgebung), wird ein neutraler Hash geliefert.
 */
export async function computeKernelInfo(kernelDir?: string): Promise<KernelInfo> {
  if (!kernelDir) {
    return { version: "none", hash: "sha256:none" };
  }
  const hash = createHash("sha256");
  let sawAnyFile = false;
  let newestMtime = 0;
  for (const relative of KERNEL_FINGERPRINT_FILES) {
    try {
      const stat = await fs.stat(path.join(kernelDir, relative));
      sawAnyFile = true;
      newestMtime = Math.max(newestMtime, stat.mtimeMs);
      hash.update(`${relative}:${stat.size}:${Math.floor(stat.mtimeMs)}\n`);
    } catch {
      hash.update(`${relative}:missing\n`);
    }
  }
  if (!sawAnyFile) {
    return { version: "none", hash: "sha256:none" };
  }
  const version = new Date(newestMtime).toISOString().slice(0, 10);
  return { version, hash: `sha256:${hash.digest("hex").slice(0, 16)}` };
}
