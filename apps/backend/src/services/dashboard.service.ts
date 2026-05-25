// ============================================================================
// DASHBOARD SERVICE
// ============================================================================
// WHAT:  Compute and cache dashboard summary metrics.
// WHY:   Dashboard cards are high-read, aggregate-heavy, and should stay fast.
// SKIP:  Seeded data makes every refresh hit multiple aggregate queries.
// HOW:   Redis cache first; PostgreSQL snapshot tables on cache miss.
// ============================================================================

import { Prisma } from "../generated/prisma";
import {
  getCachedDashboardSummary,
  setCachedDashboardSummary,
} from "../lib/dashboard-cache";
import { prisma } from "../lib/prisma";
import type { DashboardSummaryQuery } from "../schemas/dashboard.schemas";
import type {
  DashboardSummary,
  DashboardSummaryResult,
} from "../types/dashboard.types";

type SummaryRow = {
  activeSkuCount: number;
  activeWarehouseCount: number;
  totalStockUnits: number;
  totalReservedUnits: number;
  totalAvailableUnits: number;
  inventoryValue: string;
  lowStockCount: number;
  openAlertsCount: number;
  activePurchaseOrdersCount: number;
  recentMovementCount: number;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  return Number(value ?? 0);
};

const serializeRow = (
  row: Record<string, unknown>,
  query: DashboardSummaryQuery,
): DashboardSummary => ({
  scope: query.warehouseId ? "warehouse" : "global",
  warehouseId: query.warehouseId ?? null,
  activeSkuCount: toNumber(row.activeSkuCount),
  activeWarehouseCount: toNumber(row.activeWarehouseCount),
  totalStockUnits: toNumber(row.totalStockUnits),
  totalReservedUnits: toNumber(row.totalReservedUnits),
  totalAvailableUnits: toNumber(row.totalAvailableUnits),
  inventoryValue: String(row.inventoryValue ?? "0"),
  lowStockCount: toNumber(row.lowStockCount),
  openAlertsCount: toNumber(row.openAlertsCount),
  activePurchaseOrdersCount: toNumber(row.activePurchaseOrdersCount),
  recentMovementCount: toNumber(row.recentMovementCount),
  generatedAt: new Date().toISOString(),
});

const globalSummarySql = Prisma.sql`
  SELECT
    (SELECT COUNT(*)::int FROM "SKU" WHERE "isActive" = true) AS "activeSkuCount",
    (SELECT COUNT(*)::int FROM "Warehouse" WHERE "isActive" = true) AS "activeWarehouseCount",
    COALESCE(SUM(i."stockLevel"), 0)::int AS "totalStockUnits",
    COALESCE(SUM(i.reserved), 0)::int AS "totalReservedUnits",
    COALESCE(SUM(i."stockLevel" - i.reserved), 0)::int AS "totalAvailableUnits",
    COALESCE(SUM(i."stockLevel" * s."unitCost"), 0)::text AS "inventoryValue",
    COUNT(*) FILTER (WHERE (i."stockLevel" - i.reserved) < s."reorderThreshold")::int AS "lowStockCount",
    (SELECT COUNT(*)::int FROM "Alert" WHERE status = 'OPEN') AS "openAlertsCount",
    (SELECT COUNT(*)::int FROM "PurchaseOrder" WHERE status IN ('DRAFT', 'SENT')) AS "activePurchaseOrdersCount",
    (
      SELECT COUNT(*)::int
      FROM "StockMovement"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    ) AS "recentMovementCount"
  FROM "InventoryStock" i
  JOIN "SKU" s ON s.id = i."skuId" AND s."isActive" = true
`;

const warehouseSummarySql = (warehouseId: string) => Prisma.sql`
  SELECT
    COUNT(DISTINCT s.id)::int AS "activeSkuCount",
    (SELECT COUNT(*)::int FROM "Warehouse" WHERE id = ${warehouseId} AND "isActive" = true) AS "activeWarehouseCount",
    COALESCE(SUM(i."stockLevel"), 0)::int AS "totalStockUnits",
    COALESCE(SUM(i.reserved), 0)::int AS "totalReservedUnits",
    COALESCE(SUM(i."stockLevel" - i.reserved), 0)::int AS "totalAvailableUnits",
    COALESCE(SUM(i."stockLevel" * s."unitCost"), 0)::text AS "inventoryValue",
    COUNT(*) FILTER (WHERE (i."stockLevel" - i.reserved) < s."reorderThreshold")::int AS "lowStockCount",
    (
      SELECT COUNT(*)::int
      FROM "Alert"
      WHERE status = 'OPEN' AND "warehouseId" = ${warehouseId}
    ) AS "openAlertsCount",
    (
      SELECT COUNT(*)::int
      FROM "PurchaseOrder"
      WHERE status IN ('DRAFT', 'SENT') AND "warehouseId" = ${warehouseId}
    ) AS "activePurchaseOrdersCount",
    (
      SELECT COUNT(*)::int
      FROM "StockMovement"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
        AND ("fromWarehouse" = ${warehouseId} OR "toWarehouse" = ${warehouseId})
    ) AS "recentMovementCount"
  FROM "InventoryStock" i
  JOIN "SKU" s ON s.id = i."skuId" AND s."isActive" = true
  WHERE i."warehouseId" = ${warehouseId}
`;

const fetchSummaryFromDb = async (
  query: DashboardSummaryQuery,
): Promise<DashboardSummary> => {
  const rows = await prisma.$queryRaw<SummaryRow[]>(
    query.warehouseId ? warehouseSummarySql(query.warehouseId) : globalSummarySql,
  );
  return serializeRow(rows[0] ?? {}, query);
};

export const dashboardService = {
  summary: async (
    query: DashboardSummaryQuery,
  ): Promise<DashboardSummaryResult> => {
    const cached = await getCachedDashboardSummary<DashboardSummary>(
      query.warehouseId,
    );
    if (cached) {
      return { summary: cached, cacheStatus: "HIT" };
    }

    const summary = await fetchSummaryFromDb(query);
    await setCachedDashboardSummary(query.warehouseId, summary);
    return { summary, cacheStatus: "MISS" };
  },
};
