// ============================================================================
// IMPORT ROUTES
// ============================================================================
// WHAT:  Create and inspect background import jobs.
// WHY:   Bulk SKU/receipt work needs progress tracking and row-level failures.
// SKIP:  Large uploads block API requests and hide which rows failed.
// HOW:   Store import rows first, enqueue worker job, expose polling endpoints.
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { enqueueImportProcessing } from "../jobs/import.jobs";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { importCreateSchema, importParamsSchema } from "../schemas/import.schemas";
import { ImportError, importService } from "../services/import.service";
import { UserRole } from "../types/auth.types";

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.post(
    "/",
    { preHandler: [requireRole(UserRole.MANAGER)] },
    async (request, reply) => {
      const parsed = importCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      try {
        const importRecord = await importService.create(
          parsed.data,
          request.user.sub,
        );
        await enqueueImportProcessing({ importId: importRecord.id });
        return reply.status(202).send(importRecord);
      } catch (error: unknown) {
        if (error instanceof ImportError) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  fastify.get("/:id", async (request, reply) => {
    const parsed = importParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const importRecord = await importService.findById(parsed.data.id);
    if (!importRecord) {
      return reply.status(404).send({ message: "Import not found" });
    }
    return importRecord;
  });

  fastify.get("/:id/rows", async (request, reply) => {
    const parsed = importParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const importRecord = await importService.findById(parsed.data.id);
    if (!importRecord) {
      return reply.status(404).send({ message: "Import not found" });
    }

    return {
      data: await importService.findRows(parsed.data.id),
    };
  });
};
