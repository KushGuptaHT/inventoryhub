// ============================================================================
// FORECAST SERVICE
// ============================================================================
// WHAT:  SKU/warehouse stock-out projection from movement history.
// WHY:   Managers prioritize reorder before alerts fire.
// HOW:   Outflow = transfer-out + negative adjustments (signed quantityDelta).
// ============================================================================

import { Prisma } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import type { ForecastQuery } from "../schemas/forecast.schemas";

export type ForecastRow = {
  skuId: string;
  skuCode: string;
  skuName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  available: number;
  reorderThreshold: number;
  isLowStock: boolean;
  outflow90d: number;
  avgDailyOutflow30d: number;
  projectedDaysRemaining: number | null;
};

export type ForecastResponse = {
  items: ForecastRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type ForecastRowRaw = {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  available: number;
  reorder_threshold: number;
  outflow_90d: bigint | number;
  avg_daily_outflow_30d: number | null;
  projected_days_remaining: number | null;
};

const toNumber = (value: bigint | number): number =>
  typeof value === "bigint" ? Number(value) : value;

export const forecastService = {
  findMany: async (query: ForecastQuery): Promise<ForecastResponse> => {
    const skip = (query.page - 1) * query.perPage;
    const warehouseFilter = query.warehouseId ?? null;
    const skuFilter = query.skuId ?? null;

    const baseWhere = Prisma.sql`
      s."isActive" = true
      AND w."isActive" = true
      AND (${warehouseFilter}::text IS NULL OR inv."warehouseId" = ${warehouseFilter})
      AND (${skuFilter}::text IS NULL OR inv."skuId" = ${skuFilter})
    `;

    const rows = await prisma.$queryRaw<ForecastRowRaw[]>`
      WITH movement_outflow AS (
        SELECT
          m."skuId",
          m."fromWarehouse" AS "warehouseId",
          m.quantity AS outflow_units,
          m."createdAt"
        FROM "StockMovement" m
        WHERE m.type = 'TRANSFER'
          AND m."fromWarehouse" IS NOT NULL
        UNION ALL
        SELECT
          m."skuId",
          m."toWarehouse" AS "warehouseId",
          ABS(m."quantityDelta") AS outflow_units,
          m."createdAt"
        FROM "StockMovement" m
        WHERE m.type = 'ADJUSTMENT'
          AND m."quantityDelta" IS NOT NULL
          AND m."quantityDelta" < 0
      ),
      outflow AS (
        SELECT
          "skuId",
          "warehouseId",
          COALESCE(SUM(outflow_units) FILTER (
            WHERE "createdAt" >= NOW() - INTERVAL '90 days'
          ), 0) AS outflow_90d,
          COALESCE(SUM(outflow_units) FILTER (
            WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          ), 0) AS outflow_30d
        FROM movement_outflow
        GROUP BY "skuId", "warehouseId"
      )
      SELECT
        s.id AS sku_id,
        s.code AS sku_code,
        s.name AS sku_name,
        w.id AS warehouse_id,
        w.code AS warehouse_code,
        w.name AS warehouse_name,
        (inv."stockLevel" - inv.reserved) AS available,
        s."reorderThreshold" AS reorder_threshold,
        COALESCE(o.outflow_90d, 0) AS outflow_90d,
        CASE
          WHEN COALESCE(o.outflow_30d, 0) > 0
          THEN COALESCE(o.outflow_30d, 0)::float / 30.0
          ELSE 0
        END AS avg_daily_outflow_30d,
        CASE
          WHEN COALESCE(o.outflow_30d, 0) > 0
          THEN (inv."stockLevel" - inv.reserved)::float
            / (COALESCE(o.outflow_30d, 0)::float / 30.0)
          ELSE NULL
        END AS projected_days_remaining
      FROM "InventoryStock" inv
      INNER JOIN "SKU" s ON s.id = inv."skuId"
      INNER JOIN "Warehouse" w ON w.id = inv."warehouseId"
      LEFT JOIN outflow o
        ON o."skuId" = inv."skuId"
        AND o."warehouseId" = inv."warehouseId"
      WHERE ${baseWhere}
      ORDER BY projected_days_remaining ASC NULLS LAST, available ASC
      LIMIT ${query.perPage}
      OFFSET ${skip}
    `;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*)::bigint AS total
      FROM "InventoryStock" inv
      INNER JOIN "SKU" s ON s.id = inv."skuId"
      INNER JOIN "Warehouse" w ON w.id = inv."warehouseId"
      WHERE ${baseWhere}
    `;

    const total = Number(countResult[0]?.total ?? 0);

    const items: ForecastRow[] = rows.map((row) => {
      const available = toNumber(row.available);
      const reorderThreshold = toNumber(row.reorder_threshold);
      const outflow90d = toNumber(row.outflow_90d);
      const avgDailyOutflow30d = row.avg_daily_outflow_30d ?? 0;

      return {
        skuId: row.sku_id,
        skuCode: row.sku_code,
        skuName: row.sku_name,
        warehouseId: row.warehouse_id,
        warehouseCode: row.warehouse_code,
        warehouseName: row.warehouse_name,
        available,
        reorderThreshold,
        isLowStock: available < reorderThreshold,
        outflow90d,
        avgDailyOutflow30d,
        projectedDaysRemaining:
          row.projected_days_remaining === null
            ? null
            : Math.round(row.projected_days_remaining * 10) / 10,
      };
    });

    return {
      items,
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage),
    };
  },
};
