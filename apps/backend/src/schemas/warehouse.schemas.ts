import { z } from "zod";

export const warehouseCreateSchema = z.object({
  code: z.string().min(1, "Warehouse code is required"),
  name: z.string().min(1, "Warehouse name is required"),
  address: z.string().min(1, "Warehouse address is required"),
});

export const warehouseUpdateSchema = z
  .object({
    code: z.string().min(1, "Warehouse code cannot be empty").optional(),
    name: z.string().min(1, "Warehouse name cannot be empty").optional(),
    address: z.string().min(1, "Warehouse address cannot be empty").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const warehouseParamsSchema = z.object({
  id: z.string().min(1, "Warehouse id is required"),
});

export const warehouseListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(20),
  includeInactive: z
    .coerce.boolean()
    .optional()
    .default(false),
});

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;
export type WarehouseUpdateInput = z.infer<typeof warehouseUpdateSchema>;
export type WarehouseParams = z.infer<typeof warehouseParamsSchema>;
export type WarehouseListQuery = z.infer<typeof warehouseListQuerySchema>;
