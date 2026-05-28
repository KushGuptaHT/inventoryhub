// ============================================================================
// ALERT ROUTES
// ============================================================================
// WHAT:  Read and transition low-stock alerts.
// WHY:   Managers need to acknowledge/resolve async alerts; Operators can view them.
// SKIP:  Alerts exist in DB but cannot be acted on from API.
// HOW:   authenticate all routes; Manager-only lifecycle mutations.
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import {
  alertListQuerySchema,
  alertParamsSchema,
  alertTransitionSchema,
} from "../schemas/alert.schemas";
import { AlertError, alertService } from "../services/alert.service";
import { UserRole } from "../types/auth.types";

export const alertRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", async (request, reply) => {
    const parsed = alertListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const [data, total] = await Promise.all([
      alertService.findMany(parsed.data),
      alertService.count(parsed.data),
    ]);
    return {
      data,
      page: parsed.data.page,
      perPage: parsed.data.perPage,
      total,
      totalPages: Math.ceil(total / parsed.data.perPage),
    };
  });

  fastify.get("/:id", async (request, reply) => {
    const parsed = alertParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const alert = await alertService.findById(parsed.data.id);
    if (!alert) {
      return reply.status(404).send({ message: "Alert not found" });
    }
    return alert;
  });

  fastify.patch(
    "/:id/acknowledge",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const params = alertParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: params.error.format() });
      }

      const body = alertTransitionSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.format() });
      }

      try {
        return await alertService.acknowledge(
          params.data.id,
          body.data,
          request.user.sub,
        );
      } catch (error: unknown) {
        if (error instanceof AlertError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.patch(
    "/:id/resolve",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const params = alertParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: params.error.format() });
      }

      const body = alertTransitionSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.format() });
      }

      try {
        return await alertService.resolve(
          params.data.id,
          body.data,
          request.user.sub,
        );
      } catch (error: unknown) {
        if (error instanceof AlertError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );
};
