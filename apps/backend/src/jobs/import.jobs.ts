// ============================================================================
// IMPORT JOBS
// ============================================================================
// WHAT:  Queue payloads for background import processing.
// WHY:   Large CSV/import workloads should not block HTTP requests.
// SKIP:  API timeouts on big imports; users cannot track partial row failures.
// HOW:   API creates Import/ImportRow records, then enqueues one processing job.
// ============================================================================

import { importQueue } from "../lib/queues";

export const ImportJobName = {
  PROCESS_IMPORT: "process-import",
} as const;

export type ProcessImportJob = {
  importId: string;
};

export const enqueueImportProcessing = async (data: ProcessImportJob) => {
  return importQueue.add(ImportJobName.PROCESS_IMPORT, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    jobId: data.importId,
    removeOnComplete: true,
    removeOnFail: 100,
  });
};
