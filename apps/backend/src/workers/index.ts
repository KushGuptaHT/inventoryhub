// ============================================================================
// WORKER PROCESS
// ============================================================================
// WHAT:  Background workers for Phase 3 queues.
// WHY:   Alerts/imports/PO jobs should not block Fastify request handling.
// SKIP:  Queue jobs pile up in Redis with no consumer.
// HOW:   BullMQ Worker instances consume named queues and close on SIGTERM/SIGINT.
// ============================================================================

import "dotenv/config";
import { Job, QueueEvents, Worker } from "bullmq";
import {
  AlertJobName,
  type CheckLowStockJob,
} from "../jobs/alert.jobs";
import {
  ImportJobName,
  type ProcessImportJob,
} from "../jobs/import.jobs";
import {
  PurchaseOrderJobName,
  type ReceivePurchaseOrderJob,
} from "../jobs/po.jobs";
import { closeQueues, queueConnection, QueueName } from "../lib/queues";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { alertService } from "../services/alert.service";
import { importService } from "../services/import.service";
import { purchaseOrderService } from "../services/purchase-order.service";

const alertWorker = new Worker<CheckLowStockJob>(
  QueueName.ALERTS,
  async (job) => {
    if (job.name !== AlertJobName.CHECK_LOW_STOCK) {
      throw new Error(`Unknown alert job ${job.name}`);
    }
    await alertService.checkLowStock(job.data.skuId, job.data.warehouseId);
  },
  { connection: queueConnection },
);

const importWorker = new Worker<ProcessImportJob>(
  QueueName.IMPORTS,
  async (job) => {
    if (job.name !== ImportJobName.PROCESS_IMPORT) {
      throw new Error(`Unknown import job ${job.name}`);
    }
    await importService.processImport(job.data.importId);
  },
  { connection: queueConnection },
);

const poWorker = new Worker<ReceivePurchaseOrderJob>(
  QueueName.PO_FULFILLMENT,
  async (job) => {
    if (job.name !== PurchaseOrderJobName.RECEIVE_PURCHASE_ORDER) {
      throw new Error(`Unknown purchase order job ${job.name}`);
    }
    await purchaseOrderService.receive(
      job.data.purchaseOrderId,
      {},
      job.data.userId,
    );
  },
  { connection: queueConnection },
);

const queueEvents = [
  new QueueEvents(QueueName.ALERTS, { connection: queueConnection }),
  new QueueEvents(QueueName.IMPORTS, { connection: queueConnection }),
  new QueueEvents(QueueName.PO_FULFILLMENT, { connection: queueConnection }),
];

const logWorkerError = (workerName: string, job: Job | undefined, error: Error) => {
  console.error(`[${workerName}] job failed`, {
    jobId: job?.id,
    name: job?.name,
    error: error.message,
  });
};

alertWorker.on("failed", (job, error) =>
  logWorkerError("alerts", job, error),
);
importWorker.on("failed", (job, error) =>
  logWorkerError("imports", job, error),
);
poWorker.on("failed", (job, error) =>
  logWorkerError("po-fulfillment", job, error),
);

const shutdown = async () => {
  console.log("Worker shutdown requested");
  await Promise.all([
    alertWorker.close(),
    importWorker.close(),
    poWorker.close(),
    ...queueEvents.map((events) => events.close()),
    closeQueues(),
    prisma.$disconnect(),
  ]);
  redis.disconnect();
};

process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

console.log("InventoryHub workers started");
