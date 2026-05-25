// ============================================================================
// ALERT JOBS
// ============================================================================
// WHAT:  Enqueue low-stock checks after inventory changes commit.
// WHY:   Alerts are useful, but they are not allowed to slow or roll back movement APIs.
// SKIP:  Creating alerts inside movement transactions couples Redis/alerts to stock safety.
// HOW:   Routes enqueue small payloads; worker calls alertService.checkLowStock().
// ============================================================================

import { alertQueue } from "../lib/queues";

export const AlertJobName = {
  CHECK_LOW_STOCK: "check-low-stock",
} as const;

export type CheckLowStockJob = {
  skuId: string;
  warehouseId: string;
  movementId?: string;
};

export const enqueueLowStockCheck = async (data: CheckLowStockJob) => {
  return alertQueue.add(AlertJobName.CHECK_LOW_STOCK, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    jobId: `${data.skuId}:${data.warehouseId}:${data.movementId ?? Date.now()}`,
    removeOnComplete: true,
    removeOnFail: 100,
  });
};
