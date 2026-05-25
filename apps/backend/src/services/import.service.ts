// ============================================================================
// IMPORT SERVICE
// ============================================================================
// WHAT:  Create imports and process import rows in the background worker.
// WHY:   CSV-style bulk work should be trackable and should allow partial failure.
// SKIP:  One bad row rolls back a whole file, or API blocks while processing rows.
// HOW:   API stores raw rows; worker validates each row and updates row counters.
// ============================================================================

import { prisma } from "../lib/prisma";
import type { ImportCreateInput } from "../schemas/import.schemas";
import { receiptSchema } from "../schemas/movement.schemas";
import { skuCreateSchema } from "../schemas/sku.schemas";
import { movementService } from "./movement.service";
import { skuService } from "./sku.service";
import {
  ImportRowStatus,
  ImportStatus,
  ImportType,
} from "../types/import.types";

export class ImportError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export const importService = {
  create: async (input: ImportCreateInput, userId: string) => {
    const importRecord = await prisma.import.create({
      data: {
        type: input.type,
        status: ImportStatus.PENDING,
        totalRows: input.rows.length,
        fileName: input.fileName,
        uploadedBy: userId,
        rows: {
          create: input.rows.map((row, index) => ({
            rowNumber: index + 1,
            status: ImportRowStatus.PENDING,
            data: JSON.stringify(row),
          })),
        },
      },
      include: { rows: true },
    });

    return importRecord;
  },

  findById: async (id: string) => {
    return prisma.import.findUnique({ where: { id } });
  },

  findRows: async (id: string) => {
    return prisma.importRow.findMany({
      where: { importId: id },
      orderBy: { rowNumber: "asc" },
    });
  },

  processImport: async (id: string): Promise<void> => {
    const importRecord = await prisma.import.findUnique({
      where: { id },
      include: { rows: { orderBy: { rowNumber: "asc" } } },
    });
    if (!importRecord) {
      throw new ImportError("Import not found", 404);
    }

    await prisma.import.update({
      where: { id },
      data: { status: ImportStatus.IN_PROGRESS, startedAt: new Date() },
    });

    let succeededRows = 0;
    let failedRows = 0;

    for (const row of importRecord.rows) {
      try {
        const parsedJson = JSON.parse(row.data) as Record<string, unknown>;

        if (importRecord.type === ImportType.SKU_IMPORT) {
          const parsed = skuCreateSchema.safeParse(parsedJson);
          if (!parsed.success) {
            throw new Error(JSON.stringify(parsed.error.format()));
          }
          await skuService.create(parsed.data);
        } else if (importRecord.type === ImportType.RECEIPT_IMPORT) {
          const parsed = receiptSchema.safeParse(parsedJson);
          if (!parsed.success) {
            throw new Error(JSON.stringify(parsed.error.format()));
          }
          await movementService.receipt(parsed.data, importRecord.uploadedBy);
        } else {
          throw new Error(`Unsupported import type ${importRecord.type}`);
        }

        succeededRows += 1;
        await prisma.importRow.update({
          where: { id: row.id },
          data: { status: ImportRowStatus.SUCCESS },
        });
      } catch (error: unknown) {
        failedRows += 1;
        await prisma.importRow.update({
          where: { id: row.id },
          data: {
            status: ImportRowStatus.FAILED,
            errorMessage:
              error instanceof Error ? error.message : "Unknown import error",
          },
        });
      }

      await prisma.import.update({
        where: { id },
        data: {
          processedRows: succeededRows + failedRows,
          succeededRows,
          failedRows,
        },
      });
    }

    await prisma.import.update({
      where: { id },
      data: {
        status: failedRows > 0 ? ImportStatus.FAILED : ImportStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  },
};
