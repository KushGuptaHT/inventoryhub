// ============================================================================
// ALERT SERVICE
// ============================================================================
// WHAT:  Low-stock checks and alert lifecycle transitions.
// WHY:   Phase 3 requires async, deduplicated alerts after inventory movement.
// SKIP:  Duplicate alert spam or alerts blocking stock transaction safety.
// HOW:   Worker calls checkLowStock(); routes call acknowledge/resolve.
// ============================================================================
//This file manages the complete low-stock alert business workflow — detecting low stock, 
// preventing duplicate alerts, handling alert state transitions, and 
// maintaining audit history safely with transactions and concurrency protection.

import { Prisma } from "../generated/prisma";
import { getAvailable } from "../lib/inventory-stock";
import { prisma } from "../lib/prisma";
import type {
  AlertListQuery,
  AlertTransitionInput,
} from "../schemas/alert.schemas";
import {
  AlertStatus,
  type AlertResponse,
  toAlertView,
} from "../types/alert.types";

export class AlertError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "AlertError";
  }
}

const createAuditLog = async (input: {
  alertId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
}) => {
  await prisma.alertAuditLog.create({
    data: {
      alertId: input.alertId,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      changedBy: input.changedBy,
      reason: input.reason,
    },
  });
};

const handleDuplicateOpenAlert = async (
  skuId: string,
  warehouseId: string,
): Promise<AlertResponse | null> => {
  const existing = await prisma.alert.findFirst({
    where: { skuId, warehouseId, status: AlertStatus.OPEN },
  });
  return existing ? toAlertView(existing) : null;
};

export const alertService = {
  findMany: async (query: AlertListQuery): Promise<AlertResponse[]> => {
    const skip = (query.page - 1) * query.perPage;
    const alerts = await prisma.alert.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: { createdAt: "desc" },
      skip,
      take: query.perPage,
    });
    return alerts.map(toAlertView);
  },

  findById: async (id: string): Promise<AlertResponse | null> => {
    const alert = await prisma.alert.findUnique({ where: { id } });
    return alert ? toAlertView(alert) : null;
  },

  checkLowStock: async (
    skuId: string,
    warehouseId: string,
  ): Promise<AlertResponse | null> => {
    const [sku, stock] = await Promise.all([
      prisma.sKU.findUnique({ where: { id: skuId } }),
      prisma.inventoryStock.findUnique({
        where: { skuId_warehouseId: { skuId, warehouseId } },
      }),
    ]);

    if (!sku || !sku.isActive || !stock) {
      return null;
    }

    const available = getAvailable(stock.stockLevel, stock.reserved);
    if (available >= sku.reorderThreshold) {
      return null;
    }

    const existing = await handleDuplicateOpenAlert(skuId, warehouseId);
    if (existing) {
      return existing;
    }

    try {
      const alert = await prisma.alert.create({
        data: {
          skuId,
          warehouseId,
          availableStock: available,
          reorderThreshold: sku.reorderThreshold,
        },
      });
      return toAlertView(alert);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return handleDuplicateOpenAlert(skuId, warehouseId);
      }
      throw error;
    }
  },

  acknowledge: async (
    id: string,
    input: AlertTransitionInput,
    userId: string,
  ): Promise<AlertResponse> => {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      throw new AlertError("Alert not found", 404);
    }
    if (existing.status !== AlertStatus.OPEN) {
      throw new AlertError("Only OPEN alerts can be acknowledged", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const alert = await tx.alert.update({
        where: { id },
        data: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        },
      });
      await tx.alertAuditLog.create({
        data: {
          alertId: id,
          previousStatus: existing.status,
          newStatus: AlertStatus.ACKNOWLEDGED,
          changedBy: userId,
          reason: input.reason,
        },
      });
      return alert;
    });

    return toAlertView(updated);
  },

  resolve: async (
    id: string,
    input: AlertTransitionInput,
    userId: string,
  ): Promise<AlertResponse> => {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      throw new AlertError("Alert not found", 404);
    }
    if (existing.status === AlertStatus.RESOLVED) {
      throw new AlertError("Alert is already resolved", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const alert = await tx.alert.update({
        where: { id },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: userId,
        },
      });
      await tx.alertAuditLog.create({
        data: {
          alertId: id,
          previousStatus: existing.status,
          newStatus: AlertStatus.RESOLVED,
          changedBy: userId,
          reason: input.reason,
        },
      });
      return alert;
    });

    return toAlertView(updated);
  },

  // Used by manual/admin workflows when a transition was performed elsewhere.
  createAuditLog,
};
