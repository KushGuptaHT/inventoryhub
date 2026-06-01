import { describe, expect, it } from "vitest";
import { resolveSlugCollision, slugify } from "./slug";

describe("slug utilities", () => {
  it("slugify normalizes names", () => {
    expect(slugify("Beauty & Personal Care")).toBe("beauty-personal-care");
    expect(slugify("  Electronics  ")).toBe("electronics");
  });

  it("slugify falls back when empty after strip", () => {
    expect(slugify("!!!")).toBe("item");
  });

  it("resolveSlugCollision appends numeric suffix", () => {
    const existing = new Set(["electronics", "electronics-2"]);
    expect(resolveSlugCollision("electronics", existing)).toBe("electronics-3");
    expect(resolveSlugCollision("new-tag", existing)).toBe("new-tag");
  });
});
