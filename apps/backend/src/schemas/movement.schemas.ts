// ============================================================================
// MOVEMENT VALIDATION (Zod)
// ============================================================================
// WHAT:  Request body rules for receipt, adjustment, transfer.
// WHY:   Assignment §4.5 — server validates; never trust client JSON.
// SKIP:  Bad quantities hit DB → corrupt stock or 500 errors.
// HOW:   Routes call safeParse(); service enforces business rules (available stock).
// ============================================================================

import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();

export const receiptSchema = z.object({
  skuId: z.string().min(1, "skuId is required"),
  warehouseId: z.string().min(1, "warehouseId is required"),
  quantity: positiveInt,
  notes: z.string().optional(),
});

export const adjustmentSchema = z.object({
  skuId: z.string().min(1, "skuId is required"),
  warehouseId: z.string().min(1, "warehouseId is required"),
  // Signed: positive adds stock, negative removes (audited correction).
  quantityDelta: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, { message: "quantityDelta cannot be zero" }),
  notes: z.string().min(1, "notes are required for adjustments"),
});

export const transferSchema = z.object({
  skuId: z.string().min(1, "skuId is required"),
  fromWarehouseId: z.string().min(1, "fromWarehouseId is required"),
  toWarehouseId: z.string().min(1, "toWarehouseId is required"),
  quantity: positiveInt,
  notes: z.string().optional(),
});

export type ReceiptInput = z.infer<typeof receiptSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
