// ============================================================================
// DASHBOARD ROUTES
// ============================================================================
// WHAT:  Cached dashboard summary API.
// WHY:   Frontend dashboard cards should be fast on seeded inventory data.
// SKIP:  Every page refresh recomputes aggregate totals from PostgreSQL.
// HOW:   authenticate all reads; service returns cache status for X-Cache header.
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { dashboardSummaryQuerySchema } from "../schemas/dashboard.schemas";
import { dashboardService } from "../services/dashboard.service";
import { UserRole } from "../types/auth.types";

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get(
    "/summary",
    { preHandler: [requireRole(UserRole.MANAGER, UserRole.OPERATOR)] },
    async (request, reply) => {
      const parsed = dashboardSummaryQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const result = await dashboardService.summary(parsed.data);
      reply.header("X-Cache", result.cacheStatus);
      return result.summary;
    },
  );
};
