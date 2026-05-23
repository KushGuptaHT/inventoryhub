// ============================================================================
// INVENTORY STOCK HELPERS
// ============================================================================
// WHAT:  Row locking + available quantity math on inventory_stock.
// WHY:   Phase 2 concurrency — lock before read/update so two transfers can't over-draw.
// SKIP:  Race conditions → negative stock (assignment failure).
// HOW:   prisma.$transaction + SELECT … FOR UPDATE via $queryRaw.
// ============================================================================

import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma";
import { prisma } from "./prisma";

export type TransactionClient = Prisma.TransactionClient;

/** available = stockLevel - reserved (what can still be moved or sold). */
export const getAvailable = (stockLevel: number, reserved: number): number =>
  stockLevel - reserved;

export const toInventoryView = (row: {
  skuId: string;
  warehouseId: string;
  stockLevel: number;
  reserved: number;
}) => ({
  skuId: row.skuId,
  warehouseId: row.warehouseId,
  stockLevel: row.stockLevel,
  reserved: row.reserved,
  available: getAvailable(row.stockLevel, row.reserved),
});

/**
 * Ensure a (sku, warehouse) row exists with zero stock.
 * WHY: Receipt/transfer-dest may be first time this SKU appears in a warehouse.
 */
export const ensureInventoryRow = async (
  tx: TransactionClient,
  skuId: string,
  warehouseId: string,
) => {
  // ON CONFLICT: concurrent transfers may all try to create the dest row at once.
  await tx.$executeRaw`
    INSERT INTO "InventoryStock" (
      id, "skuId", "warehouseId", "stockLevel", reserved, "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${skuId}, ${warehouseId}, 0, 0, NOW()
    )
    ON CONFLICT ("skuId", "warehouseId") DO NOTHING
  `;

  return tx.inventoryStock.findUniqueOrThrow({
    where: {
      skuId_warehouseId: { skuId, warehouseId },
    },
  });
};

export type LockedInventoryRow = {
  id: string;
  skuId: string;
  warehouseId: string;
  stockLevel: number;
  reserved: number;
};

/**
 * Lock row and return current stock in one round-trip.
 * WHY: Separate lock + findUnique can race under Prisma/pg; read under FOR UPDATE.
 */
export const lockInventoryRowForUpdate = async (
  tx: TransactionClient,
  skuId: string,
  warehouseId: string,
): Promise<LockedInventoryRow> => {
  const rows = await tx.$queryRaw<LockedInventoryRow[]>`
    SELECT id, "skuId", "warehouseId", "stockLevel", reserved
    FROM "InventoryStock"
    WHERE "skuId" = ${skuId} AND "warehouseId" = ${warehouseId}
    FOR UPDATE
  `;

  const row = rows[0];
  if (!row) {
    throw new MovementValidationError(
      `Inventory row not found for sku ${skuId} at warehouse ${warehouseId}`,
      404,
    );
  }

  return row;
};

/**
 * Decrement stock only when available >= quantity (single atomic UPDATE).
 * WHY: Read-then-write under load can still lose counts; WHERE guards the row.
 */
export const decrementStockIfAvailable = async (
  tx: TransactionClient,
  rowId: string,
  quantity: number,
): Promise<LockedInventoryRow | null> => {
  const rows = await tx.$queryRaw<LockedInventoryRow[]>`
    UPDATE "InventoryStock"
    SET
      "stockLevel" = "stockLevel" - ${quantity},
      "lastMovementAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${rowId}
      AND ("stockLevel" - reserved) >= ${quantity}
    RETURNING id, "skuId", "warehouseId", "stockLevel", reserved
  `;
  return rows[0] ?? null;
};

/** Increment stockLevel on a row already locked in this transaction. */
export const incrementStock = async (
  tx: TransactionClient,
  rowId: string,
  quantity: number,
): Promise<LockedInventoryRow> => {
  const rows = await tx.$queryRaw<LockedInventoryRow[]>`
    UPDATE "InventoryStock"
    SET
      "stockLevel" = "stockLevel" + ${quantity},
      "lastMovementAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${rowId}
    RETURNING id, "skuId", "warehouseId", "stockLevel", reserved
  `;
  const row = rows[0];
  if (!row) {
    throw new MovementValidationError("Inventory row not found for increment", 404);
  }
  return row;
};

/** Validate SKU + warehouse exist and are active before touching inventory. */
export const assertSkuAndWarehouseActive = async (
  skuId: string,
  warehouseId: string,
): Promise<void> => {
  const [sku, warehouse] = await Promise.all([
    prisma.sKU.findUnique({ where: { id: skuId } }),
    prisma.warehouse.findUnique({ where: { id: warehouseId } }),
  ]);

  if (!sku || !sku.isActive) {
    throw new MovementValidationError("SKU not found or inactive", 404);
  }
  if (!warehouse || !warehouse.isActive) {
    throw new MovementValidationError("Warehouse not found or inactive", 404);
  }
};

export class MovementValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "MovementValidationError";
  }
}
