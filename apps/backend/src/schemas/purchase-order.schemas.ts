// ============================================================================
// PURCHASE ORDER VALIDATION (Zod)
// ============================================================================
// WHAT:  Request schemas for PO creation and state transitions.
// WHY:   Phase 3 PO flow is a state machine; bad bodies must stop at the route.
// SKIP:  Invalid quantities/status actions leak into inventory transactions.
// HOW:   Routes safeParse(); service enforces allowed transition from current status.
// ============================================================================

import { z } from "zod";
import { PurchaseOrderStatus } from "../types/purchase-order.types";

const positiveInt = z.coerce.number().int().positive();
const money = z.coerce.number().nonnegative();

export const purchaseOrderParamsSchema = z.object({
  id: z.string().min(1, "Purchase order id is required"),
});

export const purchaseOrderListQuerySchema = z.object({
  status: z
    .enum([
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.SENT,
      PurchaseOrderStatus.RECEIVED,
      PurchaseOrderStatus.CANCELLED,
    ])
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const purchaseOrderFromAlertSchema = z.object({
  alertId: z.string().min(1, "alertId is required"),
  quantityOrdered: positiveInt,
  unitPrice: money.optional(),
  notes: z.string().optional(),
});

export const purchaseOrderTransitionSchema = z.object({
  reason: z.string().optional(),
});

export const purchaseOrderReceiveSchema = z.object({
  lineReceipts: z
    .array(
      z.object({
        lineId: z.string().min(1, "lineId is required"),
        quantityReceived: positiveInt,
      }),
    )
    .optional(),
  reason: z.string().optional(),
});

export type PurchaseOrderParams = z.infer<typeof purchaseOrderParamsSchema>;
export type PurchaseOrderListQuery = z.infer<
  typeof purchaseOrderListQuerySchema
>;
export type PurchaseOrderFromAlertInput = z.infer<
  typeof purchaseOrderFromAlertSchema
>;
export type PurchaseOrderTransitionInput = z.infer<
  typeof purchaseOrderTransitionSchema
>;
export type PurchaseOrderReceiveInput = z.infer<
  typeof purchaseOrderReceiveSchema
>;
