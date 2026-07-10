const forbiddenSectionPatterns = [
  /^#\s*roher\s+chatverlauf\b/i,
  /^#\s*raw\s+chat\b/i,
  /^#\s*service\s*requests?\b/i,
  /^#\s*interne\s+service\s*requests?\b/i,
  /^#\s*technische\s+logs?\b/i,
  /^#\s*logs?\b/i
];

const forbiddenLinePatterns = [
  /api[_-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /token\s*[:=]/i,
  /password\s*[:=]/i,
  /bearer\s+[a-z0-9._-]+/i,
  /service-request\s*[:=]/i,
  /allow\s+(post|delete|put|get)\s+request/i,
  /run\s+(docker|npm|pnpm|pip|git)\b/i,
  /shell\s*command/i
];

export type ExportFilterResult = {
  markdown: string;
  removedSections: string[];
  removedLines: number;
};

export class ExportFilter {
  filterMarkdown(markdown: string): ExportFilterResult {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const kept: string[] = [];
    const removedSections: string[] = [];
    let removedLines = 0;
    let droppingSection: string | null = null;

    for (const line of lines) {
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        droppingSection = null;
        if (forbiddenSectionPatterns.some((pattern) => pattern.test(line.trim()))) {
          droppingSection = heading[2].trim();
          removedSections.push(droppingSection);
          removedLines += 1;
          continue;
        }
      }

      if (droppingSection) {
        removedLines += 1;
        continue;
      }

      if (forbiddenLinePatterns.some((pattern) => pattern.test(line))) {
        removedLines += 1;
        continue;
      }

      kept.push(line);
    }

    return {
      markdown: kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
      removedSections,
      removedLines
    };
  }
}