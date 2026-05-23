// ============================================================================
// SKU REDIS CACHE
// ============================================================================
// WHAT:  Store/read/delete cached SKU JSON keyed by product code.
// WHY:   Assignment §4.3 — hot SKU lookups by code must be fast.
// SKIP:  Every GET by code hits Postgres → slow at 10k SKUs under load.
// HOW:   Key sku:{CODE}, TTL 1 hour, explicit delete on update/delete.
// ============================================================================

import { redis } from "./redis";

export const SKU_CACHE_TTL_SECONDS = 3600;

/** Normalized cache key — uppercase so "abc" and "ABC" share one entry. */
export const skuCacheKey = (code: string) => `sku:${code.trim().toUpperCase()}`;

export const getCachedSku = async <T>(code: string): Promise<T | null> => {
  const cached = await redis.get(skuCacheKey(code));
  if (!cached) {
    return null;
  }
  return JSON.parse(cached) as T;
};

export const setCachedSku = async (
  code: string,
  value: unknown,
): Promise<void> => {
  await redis.set(
    skuCacheKey(code),
    JSON.stringify(value),
    "EX",
    SKU_CACHE_TTL_SECONDS,
  );
};

export const invalidateSkuCache = async (code: string): Promise<void> => {
  await redis.del(skuCacheKey(code));
};
