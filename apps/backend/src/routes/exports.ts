import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { UserRole } from "../types/auth.types";
import {
  exportJobIdParamsSchema,
  exportMovementsSchema,
} from "../schemas/export.schemas";
import { exportService } from "../services/export.service";
import { enqueueMovementsCsvExport } from "../jobs/export.jobs";
import { createReadStream } from "node:fs";

const exportRoles = [UserRole.MANAGER] as const;

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // Create a movements CSV export job (async).
  fastify.post(
    "/movements",
    { preHandler: [requireRole(...exportRoles)] },
    async (request, reply) => {
      const parsed = exportMovementsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const job = await exportService.createMovementsCsvJob(
        parsed.data,
        request.user.sub,
      );
      await enqueueMovementsCsvExport({ exportJobId: job.id });
      return reply.status(202).send({ id: job.id, status: job.status });
    },
  );

  // Fetch export job status.
  fastify.get(
    "/:id",
    { preHandler: [requireRole(...exportRoles)] },
    async (request, reply) => {
      const parsed = exportJobIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }
      const job = await exportService.getJob(parsed.data.id);
      if (!job) {
        return reply.status(404).send({ message: "Export job not found" });
      }
      return job;
    },
  );

  // Download completed export file.
  fastify.get(
    "/:id/download",
    { preHandler: [requireRole(...exportRoles)] },
    async (request, reply) => {
      const parsed = exportJobIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }
      const job = await exportService.getJob(parsed.data.id);
      if (!job) {
        return reply.status(404).send({ message: "Export job not found" });
      }
      if (job.status !== "COMPLETED" || !job.filePath || !job.fileName) {
        return reply
          .status(409)
          .send({ message: "Export not ready", status: job.status });
      }

      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename=\"${job.fileName}\"`,
      );
      return reply.send(createReadStream(job.filePath));
    },
  );
};

