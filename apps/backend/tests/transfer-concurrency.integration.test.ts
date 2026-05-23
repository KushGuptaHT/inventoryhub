// ============================================================================
// TRANSFER CONCURRENCY — INTEGRATION TEST
// ============================================================================
// WHAT:  50 parallel transfers against real Postgres (Phase 2 exit gate).
// WHY:   Proves SELECT … FOR UPDATE prevents over-draw / negative stockLevel.
// SKIP:  Mocked DB → race passes in tests, fails in production under load.
// HOW:   node --import tsx --test (requires DATABASE_URL + docker postgres up).
// ============================================================================

import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Prisma } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import {
  MovementValidationError,
  movementService,
} from "../src/services/movement.service";
import { UserRole } from "../src/types/auth.types";

const runId = `concurrency-${Date.now()}`;
const CONCURRENT_REQUESTS = 50;
const UNITS_PER_TRANSFER = 1;

const isMovementValidationError = (
  error: unknown,
): error is MovementValidationError =>
  error instanceof MovementValidationError;

describe("transfer concurrency (real Postgres)", () => {
  let userId: string;
  let skuId: string;
  let sourceWarehouseId: string;
  let destWarehouseId: string;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run integration tests");
    }

    const user = await prisma.user.upsert({
      where: { email: `test-${runId}@inventoryhub.test` },
      update: { isActive: true, role: UserRole.MANAGER },
      create: {
        email: `test-${runId}@inventoryhub.test`,
        passwordHash: "integration-test-only",
        name: "Concurrency Test User",
        role: UserRole.MANAGER,
      },
    });
    userId = user.id;

    const sku = await prisma.sKU.create({
      data: {
        code: `SKU-${runId}`,
        name: "Concurrency Test SKU",
        unitCost: new Prisma.Decimal("1.00"),
        reorderThreshold: 5,
      },
    });
    skuId = sku.id;

    const source = await prisma.warehouse.create({
      data: {
        code: `WH-SRC-${runId}`,
        name: "Source Warehouse",
        address: "Test Source",
      },
    });
    const dest = await prisma.warehouse.create({
      data: {
        code: `WH-DST-${runId}`,
        name: "Destination Warehouse",
        address: "Test Destination",
      },
    });
    sourceWarehouseId = source.id;
    destWarehouseId = dest.id;
  });

  after(async () => {
    await prisma.stockMovement.deleteMany({ where: { skuId } });
    await prisma.inventoryStock.deleteMany({ where: { skuId } });
    await prisma.sKU.deleteMany({ where: { id: skuId } });
    await prisma.warehouse.deleteMany({
      where: { id: { in: [sourceWarehouseId, destWarehouseId] } },
    });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("50 concurrent transfers of 1 unit each — no negative stock", async () => {
    const initialStock = CONCURRENT_REQUESTS;

    await movementService.receipt(
      {
        skuId,
        warehouseId: sourceWarehouseId,
        quantity: initialStock,
      },
      userId,
    );

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_REQUESTS }, () =>
        movementService.transfer(
          {
            skuId,
            fromWarehouseId: sourceWarehouseId,
            toWarehouseId: destWarehouseId,
            quantity: UNITS_PER_TRANSFER,
          },
          userId,
        ),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(
      succeeded.length,
      CONCURRENT_REQUESTS,
      `expected ${CONCURRENT_REQUESTS} successful transfers, got ${succeeded.length}`,
    );
    assert.equal(
      rejected.length,
      0,
      `unexpected failures: ${rejected.map((r) => (r.status === "rejected" ? String(r.reason) : "")).join("; ")}`,
    );

    const sourceRow = await prisma.inventoryStock.findUniqueOrThrow({
      where: {
        skuId_warehouseId: {
          skuId,
          warehouseId: sourceWarehouseId,
        },
      },
    });
    const destRow = await prisma.inventoryStock.findUniqueOrThrow({
      where: {
        skuId_warehouseId: {
          skuId,
          warehouseId: destWarehouseId,
        },
      },
    });

    assert.ok(
      sourceRow.stockLevel >= 0,
      `source stockLevel must not be negative (got ${sourceRow.stockLevel})`,
    );
    assert.ok(
      destRow.stockLevel >= 0,
      `destination stockLevel must not be negative (got ${destRow.stockLevel})`,
    );
    assert.equal(sourceRow.stockLevel, 0);
    assert.equal(destRow.stockLevel, initialStock);

    const transferCount = await prisma.stockMovement.count({
      where: {
        skuId,
        type: "TRANSFER",
        fromWarehouse: sourceWarehouseId,
        toWarehouse: destWarehouseId,
      },
    });
    assert.equal(transferCount, CONCURRENT_REQUESTS);
  });

  it("oversubscribed concurrent transfers — some 409, stock never negative", async () => {
    const initialStock = 10;

    await prisma.inventoryStock.update({
      where: {
        skuId_warehouseId: {
          skuId,
          warehouseId: sourceWarehouseId,
        },
      },
      data: { stockLevel: initialStock, reserved: 0 },
    });
    await prisma.inventoryStock.update({
      where: {
        skuId_warehouseId: {
          skuId,
          warehouseId: destWarehouseId,
        },
      },
      data: { stockLevel: 0 },
    });
    await prisma.stockMovement.deleteMany({
      where: { skuId, type: "TRANSFER" },
    });

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_REQUESTS }, () =>
        movementService.transfer(
          {
            skuId,
            fromWarehouseId: sourceWarehouseId,
            toWarehouseId: destWarehouseId,
            quantity: UNITS_PER_TRANSFER,
          },
          userId,
        ),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const insufficient = results.filter(
      (r): r is PromiseRejectedResult =>
        r.status === "rejected" &&
        isMovementValidationError(r.reason) &&
        r.reason.statusCode === 409,
    );

    assert.equal(succeeded.length, initialStock);
    assert.equal(insufficient.length, CONCURRENT_REQUESTS - initialStock);

    const sourceRow = await prisma.inventoryStock.findUniqueOrThrow({
      where: {
        skuId_warehouseId: {
          skuId,
          warehouseId: sourceWarehouseId,
        },
      },
    });

    assert.ok(sourceRow.stockLevel >= 0);
    assert.equal(sourceRow.stockLevel, 0);
  });
});
