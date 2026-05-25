// ============================================================================
// MOVEMENT SERVICE
// ============================================================================
// WHAT:  Receipt, adjustment, transfer — all inventory changes go through here.
// WHY:   Assignment §3.3 — atomic updates + immutable movement ledger.
// SKIP:  Logic in routes → untestable, no transactions, race conditions.
// HOW:   prisma.$transaction, lock rows, update snapshot, insert movement.
//
// Dual ledger:
//   stock_movements  = audit history (append-only)
//   inventory_stock  = fast current state (updated here)
// ============================================================================

import { prisma } from "../lib/prisma";
import {
  assertSkuAndWarehouseActive,
  ensureInventoryRow,
  getAvailable,
  decrementStockIfAvailable,
  incrementStock,
  lockInventoryRowForUpdate,
  MovementValidationError,
  toInventoryView,
} from "../lib/inventory-stock";
import { invalidateDashboardSummaryCacheSafe } from "../lib/dashboard-cache";
import type {
  AdjustmentInput,
  ReceiptInput,
  TransferInput,
} from "../schemas/movement.schemas";
import {
  MovementType,
  type MovementResult,
  type TransferResult,
  toMovementView,
} from "../types/movement.types";

export { MovementValidationError };

const assertNonNegativeStock = (
  stockLevel: number,
  reserved: number,
  context: string,
): void => {
  if (stockLevel < 0) {
    throw new MovementValidationError(
      `Insufficient stock for ${context}`,
      409,
    );
  }
  if (getAvailable(stockLevel, reserved) < 0) {
    throw new MovementValidationError(
      `Stock below reserved quantity for ${context}`,
      409,
    );
  }
};

export const movementService = {
  receipt: async (
    input: ReceiptInput,
    userId: string,
  ): Promise<MovementResult> => {
    await assertSkuAndWarehouseActive(input.skuId, input.warehouseId);

    const result = await prisma.$transaction(async (tx) => {
      await ensureInventoryRow(tx, input.skuId, input.warehouseId);
      const current = await lockInventoryRowForUpdate(
        tx,
        input.skuId,
        input.warehouseId,
      );

      const updated = await tx.inventoryStock.update({
        where: { id: current.id },
        data: {
          stockLevel: current.stockLevel + input.quantity,
          lastMovementAt: new Date(),
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          type: MovementType.RECEIPT,
          skuId: input.skuId,
          quantity: input.quantity,
          fromWarehouse: null,
          toWarehouse: input.warehouseId,
          notes: input.notes,
          createdByUserId: userId,
        },
      });

      return {
        movement: toMovementView(movement),
        inventory: toInventoryView(updated),
      };
    });

    await invalidateDashboardSummaryCacheSafe();
    return result;
  },

  adjustment: async (
    input: AdjustmentInput,
    userId: string,
  ): Promise<MovementResult> => {
    await assertSkuAndWarehouseActive(input.skuId, input.warehouseId);

    const result = await prisma.$transaction(async (tx) => {
      await ensureInventoryRow(tx, input.skuId, input.warehouseId);
      const current = await lockInventoryRowForUpdate(
        tx,
        input.skuId,
        input.warehouseId,
      );

      const newLevel = current.stockLevel + input.quantityDelta;
      assertNonNegativeStock(
        newLevel,
        current.reserved,
        "adjustment",
      );

      const updated = await tx.inventoryStock.update({
        where: { id: current.id },
        data: {
          stockLevel: newLevel,
          lastMovementAt: new Date(),
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          type: MovementType.ADJUSTMENT,
          skuId: input.skuId,
          quantity: Math.abs(input.quantityDelta),
          fromWarehouse: null,
          toWarehouse: input.warehouseId,
          notes: input.notes,
          createdByUserId: userId,
        },
      });

      return {
        movement: toMovementView(movement),
        inventory: toInventoryView(updated),
      };
    });

    await invalidateDashboardSummaryCacheSafe();
    return result;
  },

  transfer: async (
    input: TransferInput,
    userId: string,
  ): Promise<TransferResult> => {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new MovementValidationError(
        "fromWarehouseId and toWarehouseId must differ",
        400,
      );
    }

    await assertSkuAndWarehouseActive(input.skuId, input.fromWarehouseId);
    await assertSkuAndWarehouseActive(input.skuId, input.toWarehouseId);

    const result = await prisma.$transaction(async (tx) => {
      // Ensure both rows exist, then lock source first (hot path for concurrency test).
      await ensureInventoryRow(tx, input.skuId, input.fromWarehouseId);
      await ensureInventoryRow(tx, input.skuId, input.toWarehouseId);

      const source = await lockInventoryRowForUpdate(
        tx,
        input.skuId,
        input.fromWarehouseId,
      );
      const destination = await lockInventoryRowForUpdate(
        tx,
        input.skuId,
        input.toWarehouseId,
      );

      const updatedSource = await decrementStockIfAvailable(
        tx,
        source.id,
        input.quantity,
      );
      if (!updatedSource) {
        const available = getAvailable(source.stockLevel, source.reserved);
        throw new MovementValidationError(
          `Insufficient available stock: requested ${input.quantity}, available ${available}`,
          409,
        );
      }

      const updatedDest = await incrementStock(
        tx,
        destination.id,
        input.quantity,
      );

      const movement = await tx.stockMovement.create({
        data: {
          type: MovementType.TRANSFER,
          skuId: input.skuId,
          quantity: input.quantity,
          fromWarehouse: input.fromWarehouseId,
          toWarehouse: input.toWarehouseId,
          notes: input.notes,
          createdByUserId: userId,
        },
      });

      return {
        movement: toMovementView(movement),
        sourceInventory: toInventoryView(updatedSource),
        destinationInventory: toInventoryView(updatedDest),
      };
    });

    await invalidateDashboardSummaryCacheSafe();
    return result;
  },
};
