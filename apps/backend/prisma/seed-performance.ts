// ============================================================================
// PERFORMANCE SEED
// ============================================================================
// WHAT:  Create a large deterministic dataset for Phase 4 performance checks.
// WHY:   Dashboard and movement-history queries must be tested beyond toy data.
// SKIP:  Queries look fast on a tiny database, then fail under assignment scale.
// HOW:   PERF_* namespace + createMany chunks; normal dev data is left untouched.
// ============================================================================

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma";
import { UserRole } from "../src/types/auth.types";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run performance seed");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const PERF_PREFIX = "PERF";
const WAREHOUSE_COUNT = 5;
const SKU_COUNT = 10_000;
const MOVEMENT_COUNT = 500_000;
const CHUNK_SIZE = 5_000;
const USER_EMAIL = "perf-seed@inventoryhub.test";

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const log = (message: string) => {
  console.log(`[perf-seed] ${message}`);
};

async function cleanPerfData() {
  log("Cleaning prior PERF_* data");
  await prisma.stockMovement.deleteMany({
    where: { sku: { code: { startsWith: `${PERF_PREFIX}-SKU-` } } },
  });
  await prisma.inventoryStock.deleteMany({
    where: { sku: { code: { startsWith: `${PERF_PREFIX}-SKU-` } } },
  });
  await prisma.alert.deleteMany({
    where: { sku: { code: { startsWith: `${PERF_PREFIX}-SKU-` } } },
  });
  await prisma.purchaseOrder.deleteMany({
    where: { poNumber: { startsWith: `${PERF_PREFIX}-PO-` } },
  });
  await prisma.sKU.deleteMany({
    where: { code: { startsWith: `${PERF_PREFIX}-SKU-` } },
  });
  await prisma.warehouse.deleteMany({
    where: { code: { startsWith: `${PERF_PREFIX}-WH-` } },
  });
}

async function main() {
  await cleanPerfData();

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: { isActive: true, role: UserRole.MANAGER },
    create: {
      email: USER_EMAIL,
      passwordHash: "performance-seed-only",
      name: "Performance Seed User",
      role: UserRole.MANAGER,
    },
  });

  log(`Creating ${WAREHOUSE_COUNT} warehouses`);
  await prisma.warehouse.createMany({
    data: Array.from({ length: WAREHOUSE_COUNT }, (_value, index) => ({
      code: `${PERF_PREFIX}-WH-${String(index + 1).padStart(2, "0")}`,
      name: `Performance Warehouse ${index + 1}`,
      address: `Performance Address ${index + 1}`,
    })),
  });

  log(`Creating ${SKU_COUNT} SKUs`);
  for (const [index, skuChunk] of chunk(
    Array.from({ length: SKU_COUNT }, (_value, skuIndex) => ({
      code: `${PERF_PREFIX}-SKU-${String(skuIndex + 1).padStart(5, "0")}`,
      name: `Performance SKU ${skuIndex + 1}`,
      description: `Seeded performance SKU ${skuIndex + 1}`,
      unitCost: new Prisma.Decimal(((skuIndex % 100) + 1).toFixed(2)),
      reorderThreshold: 25 + (skuIndex % 50),
    })),
    CHUNK_SIZE,
  ).entries()) {
    await prisma.sKU.createMany({ data: skuChunk });
    log(`SKUs inserted: ${Math.min((index + 1) * CHUNK_SIZE, SKU_COUNT)}`);
  }

  const [warehouses, skus] = await Promise.all([
    prisma.warehouse.findMany({
      where: { code: { startsWith: `${PERF_PREFIX}-WH-` } },
      orderBy: { code: "asc" },
    }),
    prisma.sKU.findMany({
      where: { code: { startsWith: `${PERF_PREFIX}-SKU-` } },
      orderBy: { code: "asc" },
      select: { id: true },
    }),
  ]);

  log(`Creating inventory rows across ${warehouses.length} warehouses`);
  const inventoryRows = skus.flatMap((sku, skuIndex) =>
    warehouses.map((warehouse, warehouseIndex) => ({
      skuId: sku.id,
      warehouseId: warehouse.id,
      stockLevel: 50 + ((skuIndex + warehouseIndex) % 200),
      reserved: (skuIndex + warehouseIndex) % 10,
      lastMovementAt: new Date(),
    })),
  );

  for (const [index, inventoryChunk] of chunk(inventoryRows, CHUNK_SIZE).entries()) {
    await prisma.inventoryStock.createMany({ data: inventoryChunk });
    log(
      `Inventory rows inserted: ${Math.min(
        (index + 1) * CHUNK_SIZE,
        inventoryRows.length,
      )}`,
    );
  }

  log(`Creating ${MOVEMENT_COUNT} stock movements`);
  for (let offset = 0; offset < MOVEMENT_COUNT; offset += CHUNK_SIZE) {
    const movements = Array.from({ length: Math.min(CHUNK_SIZE, MOVEMENT_COUNT - offset) }, (_value, index) => {
      const movementIndex = offset + index;
      const sku = skus[movementIndex % skus.length];
      const warehouse = warehouses[movementIndex % warehouses.length];
      return {
        type: "RECEIPT",
        skuId: sku.id,
        quantity: 1 + (movementIndex % 20),
        fromWarehouse: null,
        toWarehouse: warehouse.id,
        notes: `${PERF_PREFIX} movement ${movementIndex + 1}`,
        createdByUserId: user.id,
        createdAt: new Date(Date.now() - (movementIndex % 30) * 86_400_000),
      };
    });

    await prisma.stockMovement.createMany({ data: movements });
    log(`Movements inserted: ${Math.min(offset + CHUNK_SIZE, MOVEMENT_COUNT)}`);
  }

  log("Performance seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
