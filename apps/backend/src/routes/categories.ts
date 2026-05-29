// ============================================================================
// CATEGORY ROUTES
// ============================================================================
// WHAT:  CRUD for hierarchical product categories.
// WHY:   Foundation for browse/filter UX; managers maintain the taxonomy tree.
// HOW:   authenticate all; Manager-only mutations; list supports ?format=tree.
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import {
  categoryCreateSchema,
  categoryListQuerySchema,
  categoryParamsSchema,
  categoryUpdateSchema,
} from "../schemas/category.schemas";
import { CategoryError, categoryService } from "../services/category.service";
import { UserRole } from "../types/auth.types";

export const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", async (request, reply) => {
    const parsed = categoryListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }
    const items = await categoryService.findMany(parsed.data);
    return { items };
  });

  fastify.get("/:id", async (request, reply) => {
    const parsed = categoryParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }
    const category = await categoryService.findById(parsed.data.id);
    if (!category || !category.isActive) {
      return reply.status(404).send({ message: "Category not found" });
    }
    return category;
  });

  fastify.post(
    "/",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const parsed = categoryCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }
      try {
        const category = await categoryService.create(parsed.data);
        return reply.status(201).send(category);
      } catch (error: unknown) {
        if (error instanceof CategoryError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.patch(
    "/:id",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const params = categoryParamsSchema.safeParse(request.params);
      const body = categoryUpdateSchema.safeParse(request.body);
      if (!params.success) {
        return reply.status(400).send({ error: params.error.format() });
      }
      if (!body.success) {
        return reply.status(400).send({ error: body.error.format() });
      }
      try {
        return await categoryService.update(params.data.id, body.data);
      } catch (error: unknown) {
        if (error instanceof CategoryError) {
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
      const parsed = categoryParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }
      try {
        await categoryService.softDelete(parsed.data.id);
        return reply.status(204).send();
      } catch (error: unknown) {
        if (error instanceof CategoryError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );
};
