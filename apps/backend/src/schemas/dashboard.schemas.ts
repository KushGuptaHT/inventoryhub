// ============================================================================
// DASHBOARD VALIDATION (Zod)
// ============================================================================
// WHAT:  Query validation for dashboard summary reads.
// WHY:   Optional warehouse filter changes query/cache scope and must be explicit.
// SKIP:  Empty or malformed warehouseId creates confusing cache keys.
// HOW:   Routes safeParse() before calling dashboardService.
// ============================================================================

import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId cannot be empty").optional(),
});

export type DashboardSummaryQuery = z.infer<
  typeof dashboardSummaryQuerySchema
>;
