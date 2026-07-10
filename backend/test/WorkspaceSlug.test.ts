import { describe, expect, it } from "vitest";
import { planningSpaceSlug } from "../src/workspaceSlug.js";

describe("planningSpaceSlug", () => {
  it("maps an existing teacher-facing title to the established kernel workspace", () => {
    expect(planningSpaceSlug("KI und Gottesbild", "Religion")).toBe("ki-gottesbild-religion");
  });
});
