// ============================================================================
// CATEGORY VALIDATION (Zod)
// ============================================================================

import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1).optional(),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const categoryUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    parentId: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const categoryParamsSchema = z.object({
  id: z.string().min(1),
});

export const skuCategoryParamsSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
});

export const categoryListQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
  format: z.enum(["flat", "tree"]).optional().default("flat"),
});

export const skuCategoryAssignSchema = z.object({
  categoryId: z.string().min(1),
  isPrimary: z.coerce.boolean().optional().default(false),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
export type SkuCategoryAssignInput = z.infer<typeof skuCategoryAssignSchema>;
