// ============================================================================
// DASHBOARD REDIS CACHE
// ============================================================================
// WHAT:  Store/read/invalidate cached dashboard summary JSON.
// WHY:   Dashboard aggregates touch several tables; repeated refreshes should be fast.
// SKIP:  Every dashboard refresh recomputes totals under seeded performance load.
// HOW:   Short TTL + explicit invalidation after inventory-affecting writes.
// ============================================================================

import { redis } from "./redis";

export const DASHBOARD_CACHE_TTL_SECONDS = 5;

export const dashboardSummaryCacheKey = (warehouseId?: string) =>
  warehouseId
    ? `dashboard:summary:warehouse:${warehouseId}`
    : "dashboard:summary:global";

export const getCachedDashboardSummary = async <T>(
  warehouseId?: string,
): Promise<T | null> => {
  const cached = await redis.get(dashboardSummaryCacheKey(warehouseId));
  if (!cached) {
    return null;
  }
  return JSON.parse(cached) as T;
};

export const setCachedDashboardSummary = async (
  warehouseId: string | undefined,
  value: unknown,
): Promise<void> => {
  await redis.set(
    dashboardSummaryCacheKey(warehouseId),
    JSON.stringify(value),
    "EX",
    DASHBOARD_CACHE_TTL_SECONDS,
  );
};

/**
 * Invalidate all dashboard summaries without Redis KEYS.
 * WHY: dashboard has global + warehouse keys; SCAN is safer as Redis grows.
 */
export const invalidateDashboardSummaryCache = async (): Promise<void> => {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      "dashboard:summary:*",
      "COUNT",
      100,
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
};

export const invalidateDashboardSummaryCacheSafe = async (
  log?: { error: (payload: unknown, message?: string) => void },
): Promise<void> => {
  try {
    await invalidateDashboardSummaryCache();
  } catch (error: unknown) {
    log?.error({ error }, "Failed to invalidate dashboard summary cache");
  }
};
