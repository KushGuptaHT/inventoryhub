import { z } from "zod";

const paginationInt = z.coerce.number().int().positive();

export const forecastQuerySchema = z.object({
  warehouseId: z.string().min(1).optional(),
  skuId: z.string().min(1).optional(),
  page: paginationInt.default(1),
  perPage: paginationInt.max(100).default(25),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
