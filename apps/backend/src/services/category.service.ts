// ============================================================================
// CATEGORY SERVICE
// ============================================================================
// WHAT:  CRUD for hierarchical categories + tree cache for filter descendants.
// WHY:   Foundation for Amazon-style browse; SKUs can belong to multiple categories.
// HOW:   Adjacency list in Postgres; flat list cached in Redis for subtree filters.
// ============================================================================

import { Prisma } from "../generated/prisma";
import {
  collectDescendantCategoryIds,
  getCachedCategoryTree,
  invalidateCategoryTreeCache,
  setCachedCategoryTree,
  type CachedCategoryNode,
} from "../lib/category-cache";
import { prisma } from "../lib/prisma";
import { resolveSlugCollision, slugify } from "../lib/slug";
import type {
  CategoryCreateInput,
  CategoryListQuery,
  CategoryUpdateInput,
  SkuCategoryAssignInput,
} from "../schemas/category.schemas";

export type CategoryResponse = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: CategoryResponse[];
};

export class CategoryError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "CategoryError";
  }
}

const toView = (row: {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CategoryResponse => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  parentId: row.parentId,
  description: row.description,
  sortOrder: row.sortOrder,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const loadFlatCategories = async (
  includeInactive: boolean,
): Promise<CachedCategoryNode[]> => {
  const rows = await prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      isActive: true,
    },
  });
  return rows;
};

const refreshCategoryTreeCache = async (): Promise<void> => {
  const nodes = await loadFlatCategories(true);
  await setCachedCategoryTree(nodes);
};

const buildTree = (
  nodes: CategoryResponse[],
  parentId: string | null = null,
): CategoryResponse[] =>
  nodes
    .filter((node) => node.parentId === parentId)
    .map((node) => ({
      ...node,
      children: buildTree(nodes, node.id),
    }));

const ensureUniqueSlug = async (name: string, explicit?: string) => {
  const existing = await prisma.category.findMany({ select: { slug: true } });
  const slugs = new Set(existing.map((row) => row.slug));
  const base = slugify(explicit ?? name);
  return resolveSlugCollision(base, slugs);
};

export const categoryService = {
  /**
   * Load categories (flat or nested tree). Uses Redis cache for flat list.
   */
  findMany: async (query: CategoryListQuery): Promise<CategoryResponse[]> => {
    // Warm cache for filter descendant lookups (separate from this response).
    if (!(await getCachedCategoryTree())) {
      await refreshCategoryTreeCache();
    }

    const rows = await prisma.category.findMany({
      where: query.includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    const views = rows.map(toView);

    if (query.format === "tree") {
      return buildTree(views);
    }
    return views;
  },

  findById: async (id: string): Promise<CategoryResponse | null> => {
    const row = await prisma.category.findUnique({ where: { id } });
    return row ? toView(row) : null;
  },

  create: async (data: CategoryCreateInput): Promise<CategoryResponse> => {
    const slug = await ensureUniqueSlug(data.name, data.slug);
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || !parent.isActive) {
        throw new CategoryError("Parent category not found", 404);
      }
    }
    try {
      const row = await prisma.category.create({
        data: {
          name: data.name,
          slug,
          parentId: data.parentId ?? null,
          description: data.description ?? null,
          sortOrder: data.sortOrder ?? 0,
        },
      });
      await invalidateCategoryTreeCache();
      return toView(row);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new CategoryError("Category slug already exists", 409);
      }
      throw error;
    }
  },

  update: async (
    id: string,
    data: CategoryUpdateInput,
  ): Promise<CategoryResponse> => {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new CategoryError("Category not found", 404);
    }
    let slug = data.slug;
    if (data.name && !data.slug) {
      const all = await prisma.category.findMany({
        where: { id: { not: id } },
        select: { slug: true },
      });
      const slugs = new Set(all.map((row) => row.slug));
      slug = resolveSlugCollision(slugify(data.name), slugs);
    }
    const row = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {}),
      },
    });
    await invalidateCategoryTreeCache();
    return toView(row);
  },

  softDelete: async (id: string): Promise<void> => {
    const child = await prisma.category.findFirst({
      where: { parentId: id, isActive: true },
    });
    if (child) {
      throw new CategoryError(
        "Cannot delete category with active child categories",
        409,
      );
    }
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new CategoryError("Category not found", 404);
    }
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    await invalidateCategoryTreeCache();
  },

  /**
   * Resolve category filter ids (root + descendants when includeDescendants).
   */
  resolveFilterCategoryIds: async (
    categoryIds: string[],
    includeDescendants: boolean,
  ): Promise<string[]> => {
    if (categoryIds.length === 0) {
      return [];
    }
    if (!includeDescendants) {
      return categoryIds;
    }
    let cached = await getCachedCategoryTree();
    if (!cached) {
      await refreshCategoryTreeCache();
      cached = await getCachedCategoryTree();
    }
    const nodes = cached ?? [];
    const resolved = new Set<string>();
    for (const id of categoryIds) {
      for (const descendantId of collectDescendantCategoryIds(nodes, id)) {
        resolved.add(descendantId);
      }
    }
    return [...resolved];
  },

  assignToSku: async (
    skuId: string,
    input: SkuCategoryAssignInput,
  ): Promise<void> => {
    const sku = await prisma.sKU.findUnique({ where: { id: skuId } });
    if (!sku || !sku.isActive) {
      throw new CategoryError("SKU not found", 404);
    }
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category || !category.isActive) {
      throw new CategoryError("Category not found", 404);
    }

    await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.sKUCategory.updateMany({
          where: { skuId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      await tx.sKUCategory.upsert({
        where: {
          skuId_categoryId: { skuId, categoryId: input.categoryId },
        },
        create: {
          skuId,
          categoryId: input.categoryId,
          isPrimary: input.isPrimary,
        },
        update: { isPrimary: input.isPrimary },
      });
    });
  },

  removeFromSku: async (skuId: string, categoryId: string): Promise<void> => {
    await prisma.sKUCategory.deleteMany({
      where: { skuId, categoryId },
    });
  },
};
