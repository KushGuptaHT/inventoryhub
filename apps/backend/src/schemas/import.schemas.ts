// ============================================================================
// IMPORT VALIDATION (Zod)
// ============================================================================
// WHAT:  Request schemas for background import creation and inspection.
// WHY:   Imports are async; invalid type/rows should fail before queueing a job.
// SKIP:  Worker receives malformed payload and marks the whole import failed.
// HOW:   API stores raw rows; worker validates each row for partial success/failure.
// ============================================================================

import { z } from "zod";
import { ImportType } from "../types/import.types";

export const importParamsSchema = z.object({
  id: z.string().min(1, "Import id is required"),
});

export const importCreateSchema = z.object({
  type: z.enum([ImportType.SKU_IMPORT, ImportType.RECEIPT_IMPORT]),
  fileName: z.string().min(1, "fileName is required"),
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "At least one row is required"),
});

export type ImportParams = z.infer<typeof importParamsSchema>;
export type ImportCreateInput = z.infer<typeof importCreateSchema>;
