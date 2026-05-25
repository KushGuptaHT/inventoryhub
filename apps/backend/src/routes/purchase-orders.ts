// ============================================================================
// PURCHASE ORDER ROUTES
// ============================================================================
// WHAT:  API endpoints for PO creation, state transitions, and receiving stock.
// WHY:   Low-stock alerts need a server-validated reorder workflow.
// SKIP:  UI could invent invalid transitions or receive stock without audit trail.
// HOW:   authenticate all routes; requireRole guards Manager-only actions.
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import {
  purchaseOrderFromAlertSchema,
  purchaseOrderListQuerySchema,
  purchaseOrderParamsSchema,
  purchaseOrderReceiveSchema,
  purchaseOrderTransitionSchema,
} from "../schemas/purchase-order.schemas";
import {
  PurchaseOrderError,
  purchaseOrderService,
} from "../services/purchase-order.service";
import { UserRole } from "../types/auth.types";

const receiveRoles = [UserRole.MANAGER, UserRole.OPERATOR] as const;

export const purchaseOrderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.post(
    "/from-alert",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const parsed = purchaseOrderFromAlertSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      try {
        const po = await purchaseOrderService.createFromAlert(
          parsed.data,
          request.user.sub,
        );
        return reply.status(201).send(po);
      } catch (error: unknown) {
        if (error instanceof PurchaseOrderError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.get("/", async (request, reply) => {
    const parsed = purchaseOrderListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const data = await purchaseOrderService.findMany(parsed.data);
    return {
      data,
      page: parsed.data.page,
      perPage: parsed.data.perPage,
    };
  });

  fastify.get("/:id", async (request, reply) => {
    const parsed = purchaseOrderParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const po = await purchaseOrderService.findById(parsed.data.id);
    if (!po) {
      return reply.status(404).send({ message: "Purchase order not found" });
    }
    return po;
  });

  fastify.post(
    "/:id/send",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const params = purchaseOrderParamsSchema.safeParse(request.params);
      const body = purchaseOrderTransitionSchema.safeParse(request.body);
      if (!params.success) {
        return reply.status(400).send({ error: params.error.format() });
      }
      if (!body.success) {
        return reply.status(400).send({ error: body.error.format() });
      }

      try {
        return await purchaseOrderService.send(
          params.data.id,
          body.data,
          request.user.sub,
        );
      } catch (error: unknown) {
        if (error instanceof PurchaseOrderError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.post(
    "/:id/receive",
    { preHandler: [requireRole(...receiveRoles)] },
    async (request, reply) => {
      const params = purchaseOrderParamsSchema.safeParse(request.params);
      const body = purchaseOrderReceiveSchema.safeParse(request.body);
      if (!params.success) {
        return reply.status(400).send({ error: params.error.format() });
      }
      if (!body.success) {
        return reply.status(400).send({ error: body.error.format() });
      }

      try {
        return await purchaseOrderService.receive(
          params.data.id,
          body.data,
          request.user.sub,
        );
      } catch (error: unknown) {
        if (error instanceof PurchaseOrderError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.post(
    "/:id/cancel",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const params = purchaseOrderParamsSchema.safeParse(request.params);
      const body = purchaseOrderTransitionSchema.safeParse(request.body);
      if (!params.success) {
        return reply.status(400).send({ error: params.error.format() });
      }
      if (!body.success) {
        return reply.status(400).send({ error: body.error.format() });
      }

      try {
        return await purchaseOrderService.cancel(
          params.data.id,
          body.data,
          request.user.sub,
        );
      } catch (error: unknown) {
        if (error instanceof PurchaseOrderError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );
};
