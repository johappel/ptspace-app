import fs from "node:fs/promises";
import path from "node:path";

// Für Ausführungsstufen OHNE Dateisystemzugriff (DirectLlm, DeepSeek/DSH) muss der
// pädagogische Kernel als TEXT in den Modellkontext gelangen – ein bloßer Pfad
// bliebe für ein reines Chat-Modell unlesbar. OpenCode liest den Kernel dagegen
// über ein gemountetes Volume und braucht diese Einbettung nicht.

const KERNEL_CONTEXT_FILES = ["AGENTS.md", "CRITICAL_FRIEND.de.md", "LEARNING_DESIGN.de.md", "ORCHESTRATION.md"];

/**
 * Liest die zentralen Kernel-Dateien und bündelt sie zu einem begrenzten
 * Kontextblock. Fehlende Dateien werden übersprungen; ohne `kernelDir` ist das
 * Ergebnis leer.
 */
export async function loadKernelContext(kernelDir?: string, maxCharsPerFile = 4000): Promise<string> {
  if (!kernelDir) return "";
  const parts: string[] = [];
  for (const file of KERNEL_CONTEXT_FILES) {
    try {
      const content = (await fs.readFile(path.join(kernelDir, file), "utf8")).trim();
      if (content) parts.push(`### ${file}\n${content.slice(0, maxCharsPerFile)}`);
    } catch {
      // Optionale Kernel-Datei fehlt – kein Grund abzubrechen.
    }
  }
  if (parts.length === 0) return "";
  return `## Pädagogischer Kernel (verbindlicher Engine-Kontext)\n\n${parts.join("\n\n")}`;
}
