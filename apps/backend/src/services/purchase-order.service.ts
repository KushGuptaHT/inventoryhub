// ============================================================================
// PURCHASE ORDER SERVICE
// ============================================================================
// WHAT:  Create POs from alerts and enforce the PO state machine.
// WHY:   Phase 3 turns low-stock alerts into audited replenishment workflows.
// SKIP:  Invalid status jumps or PO receipt that doesn't update inventory.
// HOW:   Prisma transactions; PO receive reuses Phase 2 inventory-safe helpers.
// ============================================================================

import { Prisma } from "../generated/prisma";
import {
  assertSkuAndWarehouseActive,
  ensureInventoryRow,
  incrementStock,
  lockInventoryRowForUpdate,
} from "../lib/inventory-stock";
import { invalidateDashboardSummaryCacheSafe } from "../lib/dashboard-cache";
import { prisma } from "../lib/prisma";
import type {
  PurchaseOrderFromAlertInput,
  PurchaseOrderListQuery,
  PurchaseOrderReceiveInput,
  PurchaseOrderTransitionInput,
} from "../schemas/purchase-order.schemas";
import { MovementType } from "../types/movement.types";
import { AlertStatus } from "../types/alert.types";
import {
  PurchaseOrderStatus,
  type PurchaseOrderLineResponse,
  type PurchaseOrderWarehouseResponse,
  type PurchaseOrderResponse,
} from "../types/purchase-order.types";

export class PurchaseOrderError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "PurchaseOrderError";
  }
}

type PurchaseOrderWithLines = {
  id: string;
  alertId: string;
  status: string;
  poNumber: string;
  warehouseId: string;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  };
  sentAt: Date | null;
  sentBy: string | null;
  receivedAt: Date | null;
  receivedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: Array<{
    id: string;
    poId: string;
    skuId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: Prisma.Decimal;
    receivedAt: Date | null;
    createdAt: Date;
  }>;
};

const toLineView = (
  line: PurchaseOrderWithLines["lineItems"][number],
): PurchaseOrderLineResponse => ({
  id: line.id,
  poId: line.poId,
  skuId: line.skuId,
  quantityOrdered: line.quantityOrdered,
  quantityReceived: line.quantityReceived,
  unitPrice: line.unitPrice.toString(),
  receivedAt: line.receivedAt,
  createdAt: line.createdAt,
});

const toWarehouseView = (
  warehouse: NonNullable<PurchaseOrderWithLines["warehouse"]>,
): PurchaseOrderWarehouseResponse => ({
  id: warehouse.id,
  code: warehouse.code,
  name: warehouse.name,
});

const toPurchaseOrderView = (
  po: PurchaseOrderWithLines,
): PurchaseOrderResponse => ({
  id: po.id,
  alertId: po.alertId,
  status: po.status as PurchaseOrderStatus,
  poNumber: po.poNumber,
  warehouseId: po.warehouseId,
  warehouse: po.warehouse ? toWarehouseView(po.warehouse) : undefined,
  sentAt: po.sentAt,
  sentBy: po.sentBy,
  receivedAt: po.receivedAt,
  receivedBy: po.receivedBy,
  notes: po.notes,
  createdAt: po.createdAt,
  updatedAt: po.updatedAt,
  lineItems: po.lineItems.map(toLineView),
});

const includeLineItems = {
  lineItems: { orderBy: { createdAt: "asc" } },
  warehouse: { select: { id: true, code: true, name: true } },
} as const;

const createPoNumber = () =>
  `PO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now()}`;

const ensureStatus = (
  actual: string,
  expected: string | string[],
  action: string,
) => {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) {
    throw new PurchaseOrderError(
      `Cannot ${action} purchase order from status ${actual}`,
      409,
    );
  }
};

export const purchaseOrderService = {
  findMany: async (
    query: PurchaseOrderListQuery,
  ): Promise<PurchaseOrderResponse[]> => {
    const skip = (query.page - 1) * query.perPage;
    const orders = await prisma.purchaseOrder.findMany({
      where: query.status ? { status: query.status } : {},
      include: includeLineItems,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.perPage,
    });
    return orders.map(toPurchaseOrderView);
  },

  findById: async (id: string): Promise<PurchaseOrderResponse | null> => {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: includeLineItems,
    });
    return order ? toPurchaseOrderView(order) : null;
  },

  createFromAlert: async (
    input: PurchaseOrderFromAlertInput,
    userId: string,
  ): Promise<PurchaseOrderResponse> => {
    const alert = await prisma.alert.findUnique({
      where: { id: input.alertId },
      include: { sku: true },
    });
    if (!alert) {
      throw new PurchaseOrderError("Alert not found", 404);
    }
    if (
      alert.status !== AlertStatus.OPEN &&
      alert.status !== AlertStatus.ACKNOWLEDGED
    ) {
      throw new PurchaseOrderError("Cannot create PO from this alert", 409);
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { alertId: input.alertId },
    });
    if (existing) {
      throw new PurchaseOrderError("Purchase order already exists for alert", 409);
    }

    const unitPrice =
      input.unitPrice !== undefined
        ? new Prisma.Decimal(input.unitPrice)
        : alert.sku.unitCost;

    const order = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          alertId: alert.id,
          poNumber: createPoNumber(),
          warehouseId: alert.warehouseId,
          notes: input.notes,
          lineItems: {
            create: {
              skuId: alert.skuId,
              quantityOrdered: input.quantityOrdered,
              unitPrice,
            },
          },
        },
        include: includeLineItems,
      });

      await tx.purchaseOrderAuditLog.create({
        data: {
          poId: po.id,
          previousStatus: "NONE",
          newStatus: PurchaseOrderStatus.DRAFT,
          changedBy: userId,
          reason: "Created from low-stock alert",
        },
      });

      return po;
    });

    return toPurchaseOrderView(order);
  },

  send: async (
    id: string,
    input: PurchaseOrderTransitionInput,
    userId: string,
  ): Promise<PurchaseOrderResponse> => {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: includeLineItems,
    });
    if (!existing) {
      throw new PurchaseOrderError("Purchase order not found", 404);
    }
    ensureStatus(existing.status, PurchaseOrderStatus.DRAFT, "send");

    const updated = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.SENT,
          sentAt: new Date(),
          sentBy: userId,
        },
        include: includeLineItems,
      });

      await tx.purchaseOrderAuditLog.create({
        data: {
          poId: id,
          previousStatus: existing.status,
          newStatus: PurchaseOrderStatus.SENT,
          changedBy: userId,
          reason: input.reason,
        },
      });
      return po;
    });

    return toPurchaseOrderView(updated);
  },

  cancel: async (
    id: string,
    input: PurchaseOrderTransitionInput,
    userId: string,
  ): Promise<PurchaseOrderResponse> => {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: includeLineItems,
    });
    if (!existing) {
      throw new PurchaseOrderError("Purchase order not found", 404);
    }
    ensureStatus(
      existing.status,
      [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT],
      "cancel",
    );

    const updated = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.CANCELLED },
        include: includeLineItems,
      });

      await tx.purchaseOrderAuditLog.create({
        data: {
          poId: id,
          previousStatus: existing.status,
          newStatus: PurchaseOrderStatus.CANCELLED,
          changedBy: userId,
          reason: input.reason,
        },
      });
      return po;
    });

    return toPurchaseOrderView(updated);
  },

  receive: async (
    id: string,
    input: PurchaseOrderReceiveInput,
    userId: string,
  ): Promise<PurchaseOrderResponse> => {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: includeLineItems,
    });
    if (!existing) {
      throw new PurchaseOrderError("Purchase order not found", 404);
    }
    ensureStatus(existing.status, PurchaseOrderStatus.SENT, "receive");

    const receiptByLineId = new Map(
      input.lineReceipts?.map((line) => [line.lineId, line.quantityReceived]) ??
        [],
    );

    const updated = await prisma.$transaction(async (tx) => {
      for (const line of existing.lineItems) {
        const quantityReceived =
          receiptByLineId.get(line.id) ?? line.quantityOrdered;
        if (quantityReceived <= 0 || quantityReceived > line.quantityOrdered) {
          throw new PurchaseOrderError(
            `Invalid received quantity for line ${line.id}`,
            400,
          );
        }

        await assertSkuAndWarehouseActive(line.skuId, existing.warehouseId);
        await ensureInventoryRow(tx, line.skuId, existing.warehouseId);
        const current = await lockInventoryRowForUpdate(
          tx,
          line.skuId,
          existing.warehouseId,
        );
        await incrementStock(tx, current.id, quantityReceived);

        await tx.stockMovement.create({
          data: {
            type: MovementType.RECEIPT,
            skuId: line.skuId,
            quantity: quantityReceived,
            fromWarehouse: null,
            toWarehouse: existing.warehouseId,
            notes: `PO ${existing.poNumber} received`,
            createdByUserId: userId,
          },
        });

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: {
            quantityReceived,
            receivedAt: new Date(),
          },
        });
      }

      const po = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.RECEIVED,
          receivedAt: new Date(),
          receivedBy: userId,
        },
        include: includeLineItems,
      });

      await tx.purchaseOrderAuditLog.create({
        data: {
          poId: id,
          previousStatus: existing.status,
          newStatus: PurchaseOrderStatus.RECEIVED,
          changedBy: userId,
          reason: input.reason,
        },
      });

      return po;
    });

    await invalidateDashboardSummaryCacheSafe();
    return toPurchaseOrderView(updated);
  },
};
