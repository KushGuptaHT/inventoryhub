// ============================================================================
// EXPORT JOBS
// ============================================================================
// WHAT:  BullMQ jobs for large CSV exports (audit/reporting).
// WHY:   Large exports (e.g. 500k movements) must not block API requests.
// HOW:   API creates ExportJob DB row then enqueues work; worker generates file.
// ============================================================================

import { exportQueue } from "../lib/queues";

export const ExportJobName = {
  GENERATE_MOVEMENTS_CSV: "generate-movements-csv",
} as const;

export type GenerateMovementsCsvJob = {
  exportJobId: string;
};

export const enqueueMovementsCsvExport = async (
  data: GenerateMovementsCsvJob,
) => {
  await exportQueue.add(ExportJobName.GENERATE_MOVEMENTS_CSV, data, {
    removeOnComplete: 100,
    removeOnFail: 100,
  });
};

