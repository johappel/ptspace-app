import { describe, expect, it } from "vitest";
import { ExportFilter } from "../src/services/export/ExportFilter.js";

describe("ExportFilter", () => {
  it("removes raw chat, service requests, secrets and technical commands", () => {
    const filter = new ExportFilter();
    const result = filter.filterMarkdown(`# Lernanliegen
Bleibt erhalten.

# Roher Chatverlauf
Lehrkraft: privat gemeinter Suchprozess.

# Service Requests
service-request: sr-1

# Material
API_KEY=secret
run docker pull image
Arbeitsauftrag bleibt.
`);

    expect(result.markdown).toContain("# Lernanliegen");
    expect(result.markdown).toContain("Bleibt erhalten.");
    expect(result.markdown).toContain("# Material");
    expect(result.markdown).toContain("Arbeitsauftrag bleibt.");
    expect(result.markdown).not.toContain("Roher Chatverlauf");
    expect(result.markdown).not.toContain("service-request");
    expect(result.markdown).not.toContain("API_KEY");
    expect(result.markdown).not.toContain("docker pull");
    expect(result.removedLines).toBeGreaterThan(0);
  });
});