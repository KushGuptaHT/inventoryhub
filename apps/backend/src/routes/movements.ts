// ============================================================================
// MOVEMENT ROUTES
// ============================================================================
// WHAT:  HTTP endpoints for receipt, adjustment, transfer.
// WHY:   Assignment §3.3 — core inventory operations.
// SKIP:  Unauthenticated movement → anyone could drain warehouses via curl.
// HOW:   authenticate on all routes; requireRole blocks future roles without stock access.
//
// Who can do what:
//   POST receipt / adjustment / transfer → Manager or Operator
//
// Request order:
//   1. authenticate  → valid JWT?
//   2. requireRole     → MANAGER or OPERATOR?
//   3. route handler   → Zod + movementService
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import {
  adjustmentSchema,
  receiptSchema,
  transferSchema,
} from "../schemas/movement.schemas";
import {
  MovementValidationError,
  movementService,
} from "../services/movement.service";
import { UserRole } from "../types/auth.types";

const stockMovementRoles = [UserRole.MANAGER, UserRole.OPERATOR] as const;

export const movementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.post(
    "/receipt",
    { preHandler: [requireRole(...stockMovementRoles)] },
    async (request, reply) => {
      const parsed = receiptSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      try {
        const result = await movementService.receipt(
          parsed.data,
          request.user.sub,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        if (error instanceof MovementValidationError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.post(
    "/adjustment",
    { preHandler: [requireRole(...stockMovementRoles)] },
    async (request, reply) => {
      const parsed = adjustmentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      try {
        const result = await movementService.adjustment(
          parsed.data,
          request.user.sub,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        if (error instanceof MovementValidationError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.post(
    "/transfer",
    { preHandler: [requireRole(...stockMovementRoles)] },
    async (request, reply) => {
      const parsed = transferSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      try {
        const result = await movementService.transfer(
          parsed.data,
          request.user.sub,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        if (error instanceof MovementValidationError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        throw error;
      }
    },
  );
};
