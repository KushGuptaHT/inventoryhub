// ============================================================================
// PURCHASE ORDER JOBS
// ============================================================================
// WHAT:  Queue payloads for optional async PO fulfillment work.
// WHY:   Keeps the planned third queue present and ready for heavier receive flows.
// SKIP:  PO jobs get invented ad hoc later with different queue names/options.
// HOW:   Phase 3 receive stays synchronous for atomic API feedback; queue is scaffolded.
// ============================================================================

import { poFulfillmentQueue } from "../lib/queues";

export const PurchaseOrderJobName = {
  RECEIVE_PURCHASE_ORDER: "receive-purchase-order",
} as const;

export type ReceivePurchaseOrderJob = {
  purchaseOrderId: string;
  userId: string;
};

export const enqueuePurchaseOrderReceive = async (
  data: ReceivePurchaseOrderJob,
) => {
  return poFulfillmentQueue.add(
    PurchaseOrderJobName.RECEIVE_PURCHASE_ORDER,
    data,
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      jobId: data.purchaseOrderId,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
};
