// ============================================================================
// SKU SERVICE
// ============================================================================
// WHAT:  CRUD for SKU master data + Redis cache on lookup-by-code.
// WHY:   Assignment §3.2 — Operators read SKUs; only Managers mutate master data.
// SKIP:  No cache invalidation → dashboard/movements see stale SKU after edit.
// HOW:   Prisma for DB; sku-cache.ts for get/set/del on code lookups.
// ============================================================================

import { Prisma } from "../generated/prisma";
import { invalidateDashboardSummaryCacheSafe } from "../lib/dashboard-cache";
import { prisma } from "../lib/prisma";
import {
  getCachedSku,
  invalidateSkuCache,
  setCachedSku,
} from "../lib/sku-cache";
import type {
  SkuCreateInput,
  SkuListQuery,
  SkuUpdateInput,
} from "../schemas/sku.schemas";

const normalizeCode = (code: string) => code.trim().toUpperCase();
export type SkuResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unitCost: string;
  reorderThreshold: number;
  preferredSupplier: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SkuRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unitCost: Prisma.Decimal;
  reorderThreshold: number;
  preferredSupplier: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const serializeSku = (sku: SkuRecord): SkuResponse => ({
  id: sku.id,
  code: sku.code,
  name: sku.name,
  description: sku.description,
  unitCost: sku.unitCost.toString(),
  reorderThreshold: sku.reorderThreshold,
  preferredSupplier: sku.preferredSupplier,
  isActive: sku.isActive,
  createdAt: sku.createdAt,
  updatedAt: sku.updatedAt,
});

export class SkuError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "SkuError";
  }
}

const handleUniqueViolation = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new SkuError("SKU code already exists", 409);
  }
  throw error;
};

export const skuService = {
  create: async (data: SkuCreateInput): Promise<SkuResponse> => {
    try {
      const sku = await prisma.sKU.create({
        data: {
          code: normalizeCode(data.code),
          name: data.name,
          description: data.description,
          unitCost: data.unitCost,
          reorderThreshold: data.reorderThreshold,
          preferredSupplier: data.preferredSupplier,
        },
      });
      await invalidateDashboardSummaryCacheSafe();
      return serializeSku(sku);
    } catch (error: unknown) {
      handleUniqueViolation(error);
      throw error;
    }
  },

  findMany: async (query: SkuListQuery): Promise<SkuResponse[]> => {
    const skip = (query.page - 1) * query.perPage;
    const search = query.search?.trim();

    const skus = await prisma.sKU.findMany({
      where: {
        ...(query.includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.perPage,
    });

    return skus.map(serializeSku);
  },

  findById: async (id: string): Promise<SkuResponse | null> => {
    const sku = await prisma.sKU.findUnique({ where: { id } });
    return sku ? serializeSku(sku) : null;
  },

  /**
   * Hot path: cache → DB → warm cache.
   * Used when movements/transfers look up SKU by code frequently.
   */
  findByCode: async (code: string): Promise<SkuResponse | null> => {
    const cached = await getCachedSku<SkuResponse>(code);
    if (cached) {
      return cached;
    }

    const sku = await prisma.sKU.findUnique({
      where: { code: normalizeCode(code) },
    });

    if (!sku || !sku.isActive) {
      return null;
    }

    const serialized = serializeSku(sku);
    await setCachedSku(sku.code, serialized);
    return serialized;
  },

  update: async (id: string, data: SkuUpdateInput): Promise<SkuResponse> => {
    const existing = await prisma.sKU.findUnique({ where: { id } });
    if (!existing) {
      throw new SkuError("SKU not found", 404);
    }

    try {
      const sku = await prisma.sKU.update({
        where: { id },
        data: {
          ...data,
          ...(data.code ? { code: normalizeCode(data.code) } : {}),
        },
      });

      // Invalidate old code; if code changed, old cache entry must not linger.
      await invalidateSkuCache(existing.code);
      if (data.code && normalizeCode(data.code) !== existing.code) {
        await invalidateSkuCache(data.code);
      }
      await invalidateDashboardSummaryCacheSafe();

      return serializeSku(sku);
    } catch (error: unknown) {
      handleUniqueViolation(error);
      throw error;
    }
  },

  softDelete: async (id: string): Promise<void> => {
    const existing = await prisma.sKU.findUnique({ where: { id } });
    if (!existing) {
      throw new SkuError("SKU not found", 404);
    }

    await prisma.sKU.update({
      where: { id },
      data: { isActive: false },
    });

    await invalidateSkuCache(existing.code);
    await invalidateDashboardSummaryCacheSafe();
  },
};
