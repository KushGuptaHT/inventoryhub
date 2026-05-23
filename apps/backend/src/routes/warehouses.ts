// ============================================================================
// WAREHOUSE ROUTES (protected)
// ============================================================================
// WHAT:  CRUD for warehouses with auth + role checks.
// WHY:   Assignment §3.2 data + §3.1 server-side roles.
// SKIP:  Without hooks below, curl could create/delete warehouses with no login.
// HOW:   Plugin hook authenticate (all routes) + requireRole(MANAGER) on mutations.
//
// Who can do what:
//   GET list/detail     → Manager or Operator (must be logged in)
//   POST / PATCH / DELETE → Manager only (Operator gets 403)
//
// Request order for POST /warehouses:
//   1. authenticate  → valid JWT?
//   2. requireRole   → role === MANAGER?
//   3. route handler → Zod + warehouseService.create
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import {
  warehouseCreateSchema,
  warehouseListQuerySchema,
  warehouseParamsSchema,
  warehouseUpdateSchema,
} from "../schemas/warehouse.schemas";
import { warehouseService } from "../services/warehouse.service";
import { UserRole } from "../types/auth.types";

export const warehouseRoutes: FastifyPluginAsync = async (fastify) => {
  // Every route in this file: must send Authorization: Bearer <token>
  fastify.addHook("preHandler", authenticate);

  fastify.post(
    "/",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const result = warehouseCreateSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: result.error.format() });
      }

      const warehouse = await warehouseService.create(result.data);
      return reply.status(201).send(warehouse);
    },
  );

  // GET: any authenticated role (Manager or Operator) — hook above is enough
  fastify.get("/", async (request, reply) => {
    const queryResult = warehouseListQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ error: queryResult.error.format() });
    }

    const query = queryResult.data;
    const warehouses = await warehouseService.findMany(query);
    return {
      data: warehouses,
      page: query.page,
      perPage: query.perPage,
    };
  });

  fastify.get("/:id", async (request, reply) => {
    const paramsResult = warehouseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: paramsResult.error.format() });
    }

    const warehouse = await warehouseService.findById(paramsResult.data.id);

    if (!warehouse || !warehouse.isActive) {
      return reply.status(404).send({ message: "Warehouse not found" });
    }

    return warehouse;
  });

  fastify.patch(
    "/:id",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const paramsResult = warehouseParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: paramsResult.error.format() });
      }

      const bodyResult = warehouseUpdateSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({ error: bodyResult.error.format() });
      }

      try {
        const warehouse = await warehouseService.update(
          paramsResult.data.id,
          bodyResult.data,
        );
        return warehouse;
      } catch {
        return reply.status(404).send({ message: "Warehouse not found" });
      }
    },
  );

  fastify.delete(
    "/:id",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const paramsResult = warehouseParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: paramsResult.error.format() });
      }

      try {
        await warehouseService.softDelete(paramsResult.data.id);
        return reply.status(204).send();
      } catch {
        return reply.status(404).send({ message: "Warehouse not found" });
      }
    },
  );
};
