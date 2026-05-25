// ============================================================================
// WAREHOUSE SERVICE
// ============================================================================
// WHAT:  CRUD operations for warehouse master data.
// WHY:   Inventory, dashboard summaries, and transfers depend on active warehouses.
// SKIP:  Dashboard cache could keep stale active warehouse counts after edits.
// HOW:   Prisma mutations + dashboard cache invalidation after successful writes.
// ============================================================================

import { invalidateDashboardSummaryCacheSafe } from "../lib/dashboard-cache";
import { prisma } from "../lib/prisma";
import type {
  WarehouseCreateInput,
  WarehouseListQuery,
  WarehouseUpdateInput,
} from "../schemas/warehouse.schemas";

export const warehouseService = {
  create: async (data: WarehouseCreateInput) => {
    const warehouse = await prisma.warehouse.create({
      data,
    });
    await invalidateDashboardSummaryCacheSafe();
    return warehouse;
  },

  findMany: async (query: WarehouseListQuery) => {
    const skip = (query.page - 1) * query.perPage;
    return prisma.warehouse.findMany({
      where: query.includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.perPage,
    });
  },

  findById: async (id: string) => {
    return prisma.warehouse.findUnique({
      where: { id },
    });
  },

  update: async (id: string, data: WarehouseUpdateInput) => {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data,
    });
    await invalidateDashboardSummaryCacheSafe();
    return warehouse;
  },

  softDelete: async (id: string) => {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
    await invalidateDashboardSummaryCacheSafe();
    return warehouse;
  },
};
