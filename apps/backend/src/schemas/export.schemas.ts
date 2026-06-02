import { z } from "zod";

export const exportMovementsSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  warehouseId: z.string().min(1).optional(),
  skuId: z.string().min(1).optional(),
  type: z.enum(["RECEIPT", "ADJUSTMENT", "TRANSFER"]).optional(),
});

export const exportJobIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type ExportMovementsInput = z.infer<typeof exportMovementsSchema>;

