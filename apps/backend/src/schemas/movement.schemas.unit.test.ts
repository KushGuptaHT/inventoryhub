import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { movementListQuerySchema } from "./movement.schemas";

describe("movementListQuerySchema", () => {
  it("defaults page/perPage and coerces numbers", () => {
    const parsed = movementListQuerySchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.perPage, 25);
  });

  it("rejects perPage > 100", () => {
    const result = movementListQuerySchema.safeParse({ perPage: 101 });
    assert.equal(result.success, false);
  });
});

