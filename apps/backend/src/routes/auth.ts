// ============================================================================
// AUTH ROUTES (public)
// ============================================================================
// WHAT:  POST /auth/register and POST /auth/login.
// WHY:   Users need a way to get a JWT before calling protected routes.
// SKIP:  No login → only public APIs work; warehouses stay wide open.
// HOW:   Zod validate body → auth.service → reply.jwtSign() → return accessToken + user.
//
// These routes do NOT use authenticate middleware (you're not logged in yet).
// Rate limit is applied in app.ts (max 10 tries / 15 min) to slow password guessing.
// ============================================================================

import { FastifyPluginAsync } from "fastify";
import { loginSchema, registerSchema } from "../schemas/auth.schemas";
import { AuthError, authService } from "../services/auth.service";
import type { JwtPayload } from "../types/auth.types";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    try {
      const user = await authService.register(parsed.data);
      const token = await reply.jwtSign({
        sub: user.id,
        email: user.email,
        role: user.role,
      } satisfies JwtPayload);

      return reply.status(201).send({ accessToken: token, user });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  fastify.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    try {
      const user = await authService.login(
        parsed.data.email,
        parsed.data.password,
      );
      const token = await reply.jwtSign({
        sub: user.id,
        email: user.email,
        role: user.role,
      } satisfies JwtPayload);

      return reply.send({ accessToken: token, user });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });
};
