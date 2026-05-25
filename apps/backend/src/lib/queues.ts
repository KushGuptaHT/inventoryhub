// ============================================================================
// BULLMQ QUEUES
// ============================================================================
// WHAT:  Shared BullMQ queue instances for background Phase 3 workflows.
// WHY:   API should enqueue slow/non-critical work instead of doing it inline.
// SKIP:  Movement responses wait on alerts/imports, or each file opens queues differently.
// HOW:   Queue producers live here; workers consume the same names in workers/index.ts.
// ============================================================================

import { Queue } from "bullmq";
import type { RedisOptions } from "ioredis";
import { env } from "../config/env";

const redisUrl = new URL(env.redisUrl);

export const queueConnection: RedisOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || 0) : 0,
};

export const QueueName = {
  ALERTS: "alerts",
  IMPORTS: "imports",
  PO_FULFILLMENT: "po-fulfillment",
} as const;

export const alertQueue = new Queue(QueueName.ALERTS, {
  connection: queueConnection,
});

export const importQueue = new Queue(QueueName.IMPORTS, {
  connection: queueConnection,
});

export const poFulfillmentQueue = new Queue(QueueName.PO_FULFILLMENT, {
  connection: queueConnection,
});

export const closeQueues = async () => {
  await Promise.all([
    alertQueue.close(),
    importQueue.close(),
    poFulfillmentQueue.close(),
  ]);
};
