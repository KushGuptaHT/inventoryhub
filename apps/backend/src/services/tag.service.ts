// ============================================================================
// TAG SERVICE
// ============================================================================
// WHAT:  Flat tag CRUD + assign/remove tags on SKUs.
// WHY:   Tags are filters (organic, fragile), not navigation hierarchy.
// HOW:   Simple tables; slug uniqueness like categories.
// ============================================================================

import { Prisma } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { resolveSlugCollision, slugify } from "../lib/slug";
import type {
  SkuTagAssignInput,
  TagCreateInput,
  TagUpdateInput,
} from "../schemas/tag.schemas";

export type TagResponse = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class TagError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "TagError";
  }
}

const toView = (row: {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TagResponse => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  color: row.color,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const ensureUniqueSlug = async (name: string, explicit?: string) => {
  const existing = await prisma.tag.findMany({ select: { slug: true } });
  const slugs = new Set(existing.map((row) => row.slug));
  const base = slugify(explicit ?? name);
  return resolveSlugCollision(base, slugs);
};

export const tagService = {
  findMany: async (): Promise<TagResponse[]> => {
    const rows = await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map(toView);
  },

  findById: async (id: string): Promise<TagResponse | null> => {
    const row = await prisma.tag.findUnique({ where: { id } });
    return row ? toView(row) : null;
  },

  create: async (data: TagCreateInput): Promise<TagResponse> => {
    const slug = await ensureUniqueSlug(data.name, data.slug);
    try {
      const row = await prisma.tag.create({
        data: {
          name: data.name,
          slug,
          color: data.color ?? null,
        },
      });
      return toView(row);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new TagError("Tag name or slug already exists", 409);
      }
      throw error;
    }
  },

  update: async (id: string, data: TagUpdateInput): Promise<TagResponse> => {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw new TagError("Tag not found", 404);
    }
    let slug = data.slug;
    if (data.name && !data.slug) {
      const all = await prisma.tag.findMany({
        where: { id: { not: id } },
        select: { slug: true },
      });
      const slugs = new Set(all.map((row) => row.slug));
      slug = resolveSlugCollision(slugify(data.name), slugs);
    }
    const row = await prisma.tag.update({
      where: { id },
      data: { ...data, ...(slug ? { slug } : {}) },
    });
    return toView(row);
  },

  delete: async (id: string): Promise<{ affectedSkus: number }> => {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw new TagError("Tag not found", 404);
    }
    const result = await prisma.$transaction(async (tx) => {
      const removed = await tx.sKUTag.deleteMany({ where: { tagId: id } });
      await tx.tag.delete({ where: { id } });
      return removed.count;
    });
    return { affectedSkus: result };
  },

  assignToSku: async (skuId: string, input: SkuTagAssignInput): Promise<void> => {
    const sku = await prisma.sKU.findUnique({ where: { id: skuId } });
    if (!sku || !sku.isActive) {
      throw new TagError("SKU not found", 404);
    }
    const tag = await prisma.tag.findUnique({ where: { id: input.tagId } });
    if (!tag) {
      throw new TagError("Tag not found", 404);
    }
    await prisma.sKUTag.upsert({
      where: { skuId_tagId: { skuId, tagId: input.tagId } },
      create: { skuId, tagId: input.tagId },
      update: {},
    });
  },

  removeFromSku: async (skuId: string, tagId: string): Promise<void> => {
    await prisma.sKUTag.deleteMany({ where: { skuId, tagId } });
  },
};
