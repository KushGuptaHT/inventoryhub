import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getAvailable } from "./inventory-stock";

describe("inventory-stock helpers", () => {
  it("computes available = stockLevel - reserved", () => {
    assert.equal(getAvailable(10, 3), 7);
    assert.equal(getAvailable(0, 0), 0);
  });
});

