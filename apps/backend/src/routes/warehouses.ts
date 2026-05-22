import { FastifyPluginAsync } from "fastify";
import {
  warehouseCreateSchema,
  warehouseListQuerySchema,
  warehouseParamsSchema,
  warehouseUpdateSchema,
} from "../schemas/warehouse.schemas";
import { warehouseService } from "../services/warehouse.service";

export const warehouseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/", async (request, reply) => {
    const result = warehouseCreateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.format() });
    }

    const warehouse = await warehouseService.create(result.data);
    return reply.status(201).send(warehouse);
  });

  fastify.get("/", async (request) => {
    const query = warehouseListQuerySchema.parse(request.query as unknown);
    const warehouses = await warehouseService.findMany(query);
    return {
      data: warehouses,
      page: query.page,
      perPage: query.perPage,
    };
  });

  fastify.get("/:id", async (request, reply) => {
    const params = warehouseParamsSchema.parse(request.params as unknown);
    const warehouse = await warehouseService.findById(params.id);

    if (!warehouse || !warehouse.isActive) {
      return reply.status(404).send({ message: "Warehouse not found" });
    }

    return warehouse;
  });

  fastify.patch("/:id", async (request, reply) => {
    const params = warehouseParamsSchema.parse(request.params as unknown);
    const result = warehouseUpdateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.format() });
    }

    try {
      const warehouse = await warehouseService.update(params.id, result.data);
      return warehouse;
    } catch (error: unknown) {
      return reply.status(404).send({ message: "Warehouse not found" });
    }
  });

  fastify.delete("/:id", async (request, reply) => {
    const params = warehouseParamsSchema.parse(request.params as unknown);

    try {
      await warehouseService.softDelete(params.id);
      return reply.status(204).send();
    } catch (error: unknown) {
      return reply.status(404).send({ message: "Warehouse not found" });
    }
  });
};
