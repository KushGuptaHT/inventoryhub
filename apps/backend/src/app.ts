// ============================================================================
// FASTIFY APPLICATION
// ============================================================================
// WHAT:  Builds the API app and registers plugins + routes.
// WHY:   One entry point; correct order so JWT exists before protected routes.
// SKIP:  Wrong order → jwtSign/jwtVerify not available; or CORS blocks frontend later.
// HOW:   buildApp() is async; server.ts awaits it then listens on port 4000.
// ============================================================================

import "dotenv/config";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { prisma } from "./lib/prisma";
import { closeQueues } from "./lib/queues";
import { redis } from "./lib/redis";
import { jwtPlugin } from "./plugins/jwt";
import { alertRoutes } from "./routes/alerts";
import { dashboardRoutes } from "./routes/dashboard";
import { movementRoutes } from "./routes/movements";
import { authRoutes } from "./routes/auth";
import { importRoutes } from "./routes/imports";
import { purchaseOrderRoutes } from "./routes/purchase-orders";
import { skuRoutes } from "./routes/skus";
import { warehouseRoutes } from "./routes/warehouses";

export const buildApp = async () => {
  const app = Fastify({
    logger: true,
  });

  // WHY CORS: browser on localhost:5173 can call API on :4000 (different ports = different origins)
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // WHY before routes: warehouse routes call request.jwtVerify()
  await app.register(jwtPlugin);

  // WHY rate limit only /auth: stops brute-force password guessing (assignment §4.7)
  await app.register(
    async (authScope) => {
      await authScope.register(rateLimit, {
        max: 10,
        timeWindow: "15 minutes",
      });
      await authScope.register(authRoutes);
    },
    { prefix: "/auth" },
  );

  await app.register(warehouseRoutes, { prefix: "/warehouses" });
  await app.register(skuRoutes, { prefix: "/skus" });
  await app.register(movementRoutes, { prefix: "/movements" });
  await app.register(alertRoutes, { prefix: "/alerts" });
  await app.register(purchaseOrderRoutes, { prefix: "/purchase-orders" });
  await app.register(importRoutes, { prefix: "/imports" });
  await app.register(dashboardRoutes, { prefix: "/dashboard" });

  const healthCheckTimeoutMs = 2_000;

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

  // /health stays public — load balancers check this without a JWT
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
    await closeQueues();
    await prisma.$disconnect();
    redis.disconnect();
  });

  return app;
};
