// ============================================================================
// CATEGORY TREE REDIS CACHE
// ============================================================================
// WHAT:  Cache the full category list for fast descendant lookups in filters.
// WHY:   Category tree is small and changes rarely; avoid recursive SQL per request.
// SKIP:  Do not store SKU counts here — use a separate key when counts are added.
// HOW:   Key categories:tree, TTL 1h; invalidate on any category mutation.
// ============================================================================

import { redis } from "./redis";

export const CATEGORY_TREE_CACHE_KEY = "categories:tree";
export const CATEGORY_TREE_TTL_SECONDS = 3600;

export type CachedCategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

export const getCachedCategoryTree = async (): Promise<
  CachedCategoryNode[] | null
> => {
  const cached = await redis.get(CATEGORY_TREE_CACHE_KEY);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached) as CachedCategoryNode[];
};

export const setCachedCategoryTree = async (
  nodes: CachedCategoryNode[],
): Promise<void> => {
  await redis.set(
    CATEGORY_TREE_CACHE_KEY,
    JSON.stringify(nodes),
    "EX",
    CATEGORY_TREE_TTL_SECONDS,
  );
};

export const invalidateCategoryTreeCache = async (): Promise<void> => {
  await redis.del(CATEGORY_TREE_CACHE_KEY);
};

/**
 * Collect category id + all descendant ids (in-memory walk on flat list).
 */
export const collectDescendantCategoryIds = (
  nodes: CachedCategoryNode[],
  rootId: string,
): string[] => {
  const ids = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const node of nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        added = true;
      }
    }
  }
  return [...ids];
};
