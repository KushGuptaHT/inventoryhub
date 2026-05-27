import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { forecastQuerySchema } from "../schemas/forecast.schemas";
import { forecastService } from "../services/forecast.service";
import { UserRole } from "../types/auth.types";

export const forecastRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get(
    "/skus",
    { preHandler: [requireRole(UserRole.MANAGER, UserRole.OPERATOR)] },
    async (request, reply) => {
      const parsed = forecastQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      return forecastService.findMany(parsed.data);
    },
  );
};
