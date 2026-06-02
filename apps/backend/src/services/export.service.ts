// ============================================================================
// EXPORT SERVICE
// ============================================================================
// WHAT:  Create and manage CSV export jobs (starting with movements).
// WHY:   Auditors need exportable movement history at large scale.
// HOW:   Persist ExportJob rows; worker updates status and file info.
// ============================================================================

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "../generated/prisma";
import { prisma } from "../lib/prisma";

type ExportStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type MovementsExportParams = {
  from?: string;
  to?: string;
  warehouseId?: string;
  skuId?: string;
  type?: "RECEIPT" | "ADJUSTMENT" | "TRANSFER";
};

export const ExportType = {
  MOVEMENTS_CSV: "MOVEMENTS_CSV",
} as const;

export const exportService = {
  createMovementsCsvJob: async (params: MovementsExportParams, userId: string) => {
    return prisma.exportJob.create({
      data: {
        type: ExportType.MOVEMENTS_CSV,
        status: "PENDING",
        params,
        requestedBy: userId,
      },
    });
  },

  getJob: async (id: string) => prisma.exportJob.findUnique({ where: { id } }),

  /**
   * Worker helper: generate movements CSV to local disk.
   *
   * NOTE: This intentionally uses cursor/keyset paging to avoid OFFSET and COUNT(*)
   * on very large histories.
   */
  generateMovementsCsvToFile: async (exportJobId: string) => {
    const job = await prisma.exportJob.findUnique({ where: { id: exportJobId } });
    if (!job) {
      throw new Error(`ExportJob not found: ${exportJobId}`);
    }

    const params = job.params as MovementsExportParams;

    const exportsDir = path.join(process.cwd(), "exports");
    await mkdir(exportsDir, { recursive: true });
    const fileName = `movements-${exportJobId}.csv`;
    const filePath = path.join(exportsDir, fileName);

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: "IN_PROGRESS" satisfies ExportStatus,
        startedAt: new Date(),
        fileName,
        filePath,
      },
    });

    const stream = createWriteStream(filePath, { encoding: "utf8" });

    const writeLine = async (line: string) =>
      new Promise<void>((resolve, reject) => {
        stream.write(line, (error) => (error ? reject(error) : resolve()));
      });

    const csvEscape = (value: unknown) => {
      const raw = value === null || value === undefined ? "" : String(value);
      if (raw.includes('"') || raw.includes(",") || raw.includes("\n")) {
        return `"${raw.replaceAll('"', '""')}"`;
      }
      return raw;
    };

    // Header
    await writeLine(
      [
        "createdAt",
        "type",
        "skuCode",
        "skuName",
        "quantity",
        "quantityDelta",
        "fromWarehouse",
        "toWarehouse",
        "userId",
        "notes",
      ].join(",") + "\n",
    );

    const where: Prisma.StockMovementWhereInput = {
      ...(params.type ? { type: params.type } : {}),
      ...(params.skuId ? { skuId: params.skuId } : {}),
      ...(params.warehouseId
        ? {
            OR: [
              { fromWarehouse: params.warehouseId },
              { toWarehouse: params.warehouseId },
            ],
          }
        : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    };

    const pageSize = 5_000;
    let cursor: { createdAt: Date; id: string } | null = null;
    let rowCount = 0;

    while (true) {
      const cursorWhere: Prisma.StockMovementWhereInput = cursor
        ? ({
            AND: [
              where,
              {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  {
                    AND: [
                      { createdAt: { equals: cursor.createdAt } },
                      { id: { lt: cursor.id } },
                    ],
                  },
                ],
              },
            ],
          } satisfies Prisma.StockMovementWhereInput)
        : where;

      const rows = await prisma.stockMovement.findMany({
        where: cursorWhere,
        include: {
          sku: { select: { code: true, name: true } },
          source: { select: { code: true } },
          destination: { select: { code: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pageSize,
      });

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        await writeLine(
          [
            csvEscape(row.createdAt.toISOString()),
            csvEscape(row.type),
            csvEscape(row.sku.code),
            csvEscape(row.sku.name),
            csvEscape(row.quantity),
            csvEscape(row.quantityDelta ?? ""),
            csvEscape(row.source?.code ?? ""),
            csvEscape(row.destination.code),
            csvEscape(row.createdByUserId),
            csvEscape(row.notes ?? ""),
          ].join(",") + "\n",
        );
        rowCount += 1;
      }

      const last = rows[rows.length - 1];
      cursor = { createdAt: last.createdAt, id: last.id };
    }

    await new Promise<void>((resolve, reject) => {
      stream.end((error?: Error | null) => (error ? reject(error) : resolve()));
    });

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: "COMPLETED" satisfies ExportStatus,
        completedAt: new Date(),
        rowCount,
      },
    });

    return { fileName, filePath, rowCount };
  },

  markFailed: async (exportJobId: string, errorMessage: string) => {
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: "FAILED" satisfies ExportStatus,
        completedAt: new Date(),
        errorMessage,
      },
    });
  },
};

