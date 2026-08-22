import { describe, expect, it } from "vitest";
import { SkillSchema } from "@ptspace/shared";
import { SkillRegistry, defaultSkills } from "../src/services/runtime/SkillRegistry.js";

describe("SkillRegistry", () => {
  it("registers the default thin-slice skills as productive", () => {
    const registry = new SkillRegistry(defaultSkills());
    expect(registry.get("contrastive-research")).toBeTruthy();
    expect(registry.get("workspace-consistency-check")).toBeTruthy();
    const productive = registry.listProductive().map((skill) => skill.id).sort();
    expect(productive).toEqual(["contrastive-research", "workspace-consistency-check"]);
  });

  it("does not allow experimental skills to be selected productively", () => {
    const registry = new SkillRegistry(defaultSkills());
    registry.register(SkillSchema.parse({
      id: "auto-generated-candidate",
      purpose: "Ein automatisch erzeugter Kandidat.",
      status: "experimental",
      provenance: "runtime"
    }));
    expect(registry.isSelectable("auto-generated-candidate")).toBe(false);
    expect(() => registry.requireSelectable("auto-generated-candidate")).toThrow("skill_not_selectable");
  });

  it("throws for unknown skills", () => {
    const registry = new SkillRegistry(defaultSkills());
    expect(() => registry.requireSelectable("does-not-exist")).toThrow("skill_not_found");
  });

  it("validates skill input and output contracts", () => {
    const registry = new SkillRegistry();
    expect(() => registry.register({ id: "", purpose: "x" } as never)).toThrow();
    const skill = registry.register(SkillSchema.parse({ id: "s1", purpose: "Zweck", status: "approved" }));
    expect(skill.status).toBe("approved");
    expect(registry.isSelectable("s1")).toBe(true);
  });
});
