// ============================================================================
// ALERT VALIDATION (Zod)
// ============================================================================
// WHAT:  Request params/query/body schemas for alert APIs.
// WHY:   Alert lifecycle changes must validate status inputs at HTTP boundary.
// SKIP:  Invalid IDs/reasons reach services and return confusing errors.
// HOW:   Routes safeParse(), services enforce business transitions.
// ============================================================================

import { z } from "zod";
import { AlertStatus } from "../types/alert.types";

export const alertParamsSchema = z.object({
  id: z.string().min(1, "Alert id is required"),
});

export const alertListQuerySchema = z.object({
  status: z
    .enum([
      AlertStatus.OPEN,
      AlertStatus.ACKNOWLEDGED,
      AlertStatus.RESOLVED,
    ])
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const alertTransitionSchema = z.object({
  reason: z.string().optional(),
});

export type AlertParams = z.infer<typeof alertParamsSchema>;
export type AlertListQuery = z.infer<typeof alertListQuerySchema>;
export type AlertTransitionInput = z.infer<typeof alertTransitionSchema>;
