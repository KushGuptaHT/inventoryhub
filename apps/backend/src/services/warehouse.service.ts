import { prisma } from "../lib/prisma";
import type {
  WarehouseCreateInput,
  WarehouseListQuery,
  WarehouseUpdateInput,
} from "../schemas/warehouse.schemas";

export const warehouseService = {
  create: async (data: WarehouseCreateInput) => {
    return prisma.warehouse.create({
      data,
    });
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
    return prisma.warehouse.update({
      where: { id },
      data,
    });
  },

  softDelete: async (id: string) => {
    return prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
