import { describe, expect, it } from "vitest";
import { SensitiveContentScanner } from "../src/services/privacy/SensitiveContentScanner.js";

describe("SensitiveContentScanner", () => {
  it("marks names, diagnoses and secrets with teacher-facing suggestions", () => {
    const scanner = new SensitiveContentScanner();
    const findings = scanner.scan("Schüler Max verweigert oft die Mitarbeit. ADHS ist bekannt. API_KEY=123");

    expect(findings.map((finding) => finding.kind)).toContain("student_name");
    expect(findings.map((finding) => finding.kind)).toContain("diagnosis");
    expect(findings.map((finding) => finding.kind)).toContain("secret");
    expect(findings.some((finding) => finding.severity === "block_export")).toBe(true);
    expect(findings[0].suggestion.length).toBeGreaterThan(10);
  });
});