// ============================================================================
// IMPORT TYPES
// ============================================================================
// WHAT:  Constants for background CSV/import jobs.
// WHY:   Import records and workers must agree on type/status values.
// SKIP:  A typo in a worker could leave imports stuck in PENDING forever.
// HOW:   Keep DB string values in one small shared module.
// ============================================================================

export const ImportType = {
  SKU_IMPORT: "SKU_IMPORT",
  RECEIPT_IMPORT: "RECEIPT_IMPORT",
} as const;

export type ImportType = (typeof ImportType)[keyof typeof ImportType];

export const ImportStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];

export const ImportRowStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type ImportRowStatus =
  (typeof ImportRowStatus)[keyof typeof ImportRowStatus];
