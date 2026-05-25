// ============================================================================
// ALERT TYPES
// ============================================================================
// WHAT:  Shared constants and response shapes for low-stock alerts.
// WHY:   Alert status strings are used by services, routes, workers, and tests.
// SKIP:  Magic strings across files → invalid transitions and hard-to-find bugs.
// HOW:   const objects + TypeScript unions keep DB strings centralized.
// ============================================================================

export const AlertStatus = {
  OPEN: "OPEN",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
} as const;

export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

export type AlertResponse = {
  id: string;
  skuId: string;
  warehouseId: string;
  status: AlertStatus;
  availableStock: number;
  reorderThreshold: number;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AlertRow = Omit<AlertResponse, "status"> & {
  status: string;
};

export const toAlertView = (alert: AlertRow): AlertResponse => ({
  id: alert.id,
  skuId: alert.skuId,
  warehouseId: alert.warehouseId,
  status: alert.status as AlertStatus,
  availableStock: alert.availableStock,
  reorderThreshold: alert.reorderThreshold,
  acknowledgedAt: alert.acknowledgedAt,
  acknowledgedBy: alert.acknowledgedBy,
  resolvedAt: alert.resolvedAt,
  resolvedBy: alert.resolvedBy,
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
});
