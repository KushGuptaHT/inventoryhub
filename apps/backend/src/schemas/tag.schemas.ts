// ============================================================================
// TAG VALIDATION (Zod)
// ============================================================================

import { z } from "zod";

export const tagCreateSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  slug: z.string().min(1).optional(),
  color: z.string().optional().nullable(),
});

export const tagUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    color: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const tagParamsSchema = z.object({
  id: z.string().min(1),
});

export const skuTagParamsSchema = z.object({
  id: z.string().min(1),
  tagId: z.string().min(1),
});

export const skuTagAssignSchema = z.object({
  tagId: z.string().min(1),
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
export type SkuTagAssignInput = z.infer<typeof skuTagAssignSchema>;
