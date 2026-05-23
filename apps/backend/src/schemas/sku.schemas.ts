// ============================================================================
// SKU VALIDATION (Zod)
// ============================================================================
// WHAT:  Rules for SKU create/update/list/query bodies.
// WHY:   Assignment §3.2 fields + §4.5 server-side validation.
// SKIP:  Bad unitCost or empty code could corrupt master data.
// HOW:   Routes use safeParse(); Decimal fields validated as positive numbers.
// ============================================================================

import { z } from "zod";

const unitCostSchema = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "string" ? Number(value) : value))
  .refine((value) => Number.isFinite(value) && value >= 0, {
    message: "unitCost must be a non-negative number",
  });

export const skuCreateSchema = z.object({
  code: z.string().min(1, "SKU code is required"),
  name: z.string().min(1, "SKU name is required"),
  description: z.string().optional(),
  unitCost: unitCostSchema,
  reorderThreshold: z.coerce.number().int().nonnegative().optional().default(50),
  preferredSupplier: z.string().optional(),
});

export const skuUpdateSchema = z
  .object({
    code: z.string().min(1, "SKU code cannot be empty").optional(),
    name: z.string().min(1, "SKU name cannot be empty").optional(),
    description: z.string().nullable().optional(),
    unitCost: unitCostSchema.optional(),
    reorderThreshold: z.coerce.number().int().nonnegative().optional(),
    preferredSupplier: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const skuParamsSchema = z.object({
  id: z.string().min(1, "SKU id is required"),
});

export const skuCodeParamsSchema = z.object({
  code: z.string().min(1, "SKU code is required"),
});

export const skuListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(20),
  includeInactive: z.coerce.boolean().optional().default(false),
  search: z.string().optional(),
});

export type SkuCreateInput = z.infer<typeof skuCreateSchema>;
export type SkuUpdateInput = z.infer<typeof skuUpdateSchema>;
export type SkuParams = z.infer<typeof skuParamsSchema>;
export type SkuCodeParams = z.infer<typeof skuCodeParamsSchema>;
export type SkuListQuery = z.infer<typeof skuListQuerySchema>;
