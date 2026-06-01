import { describe, expect, it } from "vitest";
import {
  collectDescendantCategoryIds,
  type CachedCategoryNode,
} from "./category-cache";

const nodes: CachedCategoryNode[] = [
  {
    id: "root",
    name: "Electronics",
    slug: "electronics",
    parentId: null,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "child",
    name: "Cables",
    slug: "cables",
    parentId: "root",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "grandchild",
    name: "USB",
    slug: "usb",
    parentId: "child",
    sortOrder: 0,
    isActive: true,
  },
];

describe("collectDescendantCategoryIds", () => {
  it("includes root and all descendants", () => {
    const ids = collectDescendantCategoryIds(nodes, "root");
    expect(ids.sort()).toEqual(["child", "grandchild", "root"].sort());
  });

  it("returns only the leaf when it has no children", () => {
    const ids = collectDescendantCategoryIds(nodes, "grandchild");
    expect(ids).toEqual(["grandchild"]);
  });
});
