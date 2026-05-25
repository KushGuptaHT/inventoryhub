// ============================================================================
// PERFORMANCE EXPLAIN HELPER
// ============================================================================
// WHAT:  Print EXPLAIN ANALYZE plans for Phase 4 dashboard/movement queries.
// WHY:   Index choices should be based on query plans, not guesses.
// SKIP:  We add indexes blindly and still miss the slow path.
// HOW:   Run after db:seed:perf; inspect output for sequential scans and timing.
// ============================================================================

import "dotenv/config";
import { prisma } from "../lib/prisma";

const printPlan = async (name: string, query: string) => {
  console.log(`\n=== ${name} ===`);
  const rows = await prisma.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
    `EXPLAIN ANALYZE ${query}`,
  );
  for (const row of rows) {
    console.log(row["QUERY PLAN"]);
  }
};

async function main() {
  await printPlan(
    "Global dashboard summary",
    `
      SELECT
        COALESCE(SUM(i."stockLevel"), 0)::int AS "totalStockUnits",
        COALESCE(SUM(i."stockLevel" - i.reserved), 0)::int AS "totalAvailableUnits",
        COALESCE(SUM(i."stockLevel" * s."unitCost"), 0)::text AS "inventoryValue",
        COUNT(*) FILTER (WHERE (i."stockLevel" - i.reserved) < s."reorderThreshold")::int AS "lowStockCount"
      FROM "InventoryStock" i
      JOIN "SKU" s ON s.id = i."skuId" AND s."isActive" = true
    `,
  );

  await printPlan(
    "Recent movement history",
    `
      SELECT id, type, "skuId", quantity, "createdAt"
      FROM "StockMovement"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      ORDER BY "createdAt" DESC
      LIMIT 100
    `,
  );

  await printPlan(
    "Low-stock inventory",
    `
      SELECT i.id, i."skuId", i."warehouseId", i."stockLevel", i.reserved
      FROM "InventoryStock" i
      JOIN "SKU" s ON s.id = i."skuId"
      WHERE (i."stockLevel" - i.reserved) < s."reorderThreshold"
      LIMIT 100
    `,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
