// ============================================================================
// TAG ROUTES
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import {
  tagCreateSchema,
  tagParamsSchema,
  tagUpdateSchema,
} from "../schemas/tag.schemas";
import { TagError, tagService } from "../services/tag.service";
import { UserRole } from "../types/auth.types";

export const tagRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", async () => {
    const items = await tagService.findMany();
    return { items };
  });

  fastify.get("/:id", async (request, reply) => {
    const parsed = tagParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }
    const tag = await tagService.findById(parsed.data.id);
    if (!tag) {
      return reply.status(404).send({ message: "Tag not found" });
    }
    return tag;
  });

  fastify.post(
    "/",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const parsed = tagCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }
      try {
        const tag = await tagService.create(parsed.data);
        return reply.status(201).send(tag);
      } catch (error: unknown) {
        if (error instanceof TagError) {
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
      const params = tagParamsSchema.safeParse(request.params);
      const body = tagUpdateSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.status(400).send({
          error: params.success ? body.error!.format() : params.error.format(),
        });
      }
      try {
        return await tagService.update(params.data.id, body.data);
      } catch (error: unknown) {
        if (error instanceof TagError) {
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
      const parsed = tagParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }
      try {
        const result = await tagService.delete(parsed.data.id);
        return result;
      } catch (error: unknown) {
        if (error instanceof TagError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );
};
