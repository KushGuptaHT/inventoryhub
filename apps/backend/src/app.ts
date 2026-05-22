import "dotenv/config";
import Fastify from "fastify";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

export const app = Fastify({
  logger: true,
});

const healthCheckTimeoutMs = 2_000;

// Convert any infrastructure check into the status shape returned by /health.
const checkDependency = async (check: Promise<unknown>) => {
  try {
    await Promise.race([
      check,
      new Promise((_resolve, reject) => {
        setTimeout(
          () => reject(new Error("Health check timed out")),
          healthCheckTimeoutMs,
        );
      }),
    ]);

    return "connected";
  } catch {
    return "disconnected";
  }
};

app.get("/health", async (_request, reply) => {
  const [database, redisStatus] = await Promise.all([
    checkDependency(prisma.$queryRaw`SELECT 1`),
    checkDependency(redis.ping()),
  ]);

  const isHealthy = database === "connected" && redisStatus === "connected";

  if (!isHealthy) {
    reply.code(503);
  }

  return {
    status: isHealthy ? "ok" : "error",
    database,
    redis: redisStatus,
  };
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
  redis.disconnect();
});
