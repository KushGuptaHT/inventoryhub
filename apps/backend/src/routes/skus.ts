// ============================================================================
// SKU ROUTES (protected)
// ============================================================================
// WHAT:  CRUD for SKU master data with Redis-cached lookup by code.
// WHY:   Assignment §3.2 — Operators read; Managers edit master data.
// SKIP:  Operators could PATCH SKUs; cache never invalidated after edits.
// HOW:   authenticate on all routes; requireRole(MANAGER) on POST/PATCH/DELETE.
//
// Endpoints:
//   GET    /skus              list (paginated, optional search)
//   GET    /skus/code/:code   by code — Redis cache (hot path)
//   GET    /skus/:id          by id
//   POST   /skus              Manager only
//   PATCH  /skus/:id          Manager only — invalidates cache
//   DELETE /skus/:id          Manager only — soft delete + cache invalidate
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import {
  skuCodeParamsSchema,
  skuCreateSchema,
  skuListQuerySchema,
  skuParamsSchema,
  skuUpdateSchema,
} from "../schemas/sku.schemas";
import { SkuError, skuService } from "../services/sku.service";
import { UserRole } from "../types/auth.types";

export const skuRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.post(
    "/",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const parsed = skuCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      try {
        const sku = await skuService.create(parsed.data);
        return reply.status(201).send(sku);
      } catch (error: unknown) {
        if (error instanceof SkuError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.get("/", async (request, reply) => {
    const parsed = skuListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const [data, total] = await Promise.all([
      skuService.findMany(parsed.data),
      skuService.count(parsed.data),
    ]);
    return {
      data,
      page: parsed.data.page,
      perPage: parsed.data.perPage,
      total,
      totalPages: Math.ceil(total / parsed.data.perPage),
    };
  });

  // Register BEFORE /:id so "code" is not treated as an id.
  fastify.get("/code/:code", async (request, reply) => {
    const parsed = skuCodeParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const sku = await skuService.findByCode(parsed.data.code);
    if (!sku) {
      return reply.status(404).send({ message: "SKU not found" });
    }

    return sku;
  });

  fastify.get("/:id", async (request, reply) => {
    const parsed = skuParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const sku = await skuService.findById(parsed.data.id);
    if (!sku || !sku.isActive) {
      return reply.status(404).send({ message: "SKU not found" });
    }

    return sku;
  });

  fastify.patch(
    "/:id",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const paramsResult = skuParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: paramsResult.error.format() });
      }

      const bodyResult = skuUpdateSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({ error: bodyResult.error.format() });
      }

      try {
        const sku = await skuService.update(
          paramsResult.data.id,
          bodyResult.data,
        );
        return sku;
      } catch (error: unknown) {
        if (error instanceof SkuError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.delete(
    "/:id",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const parsed = skuParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      try {
        await skuService.softDelete(parsed.data.id);
        return reply.status(204).send();
      } catch (error: unknown) {
        if (error instanceof SkuError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );
};
