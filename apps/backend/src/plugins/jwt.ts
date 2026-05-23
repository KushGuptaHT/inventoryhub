// ============================================================================
// JWT PLUGIN (@fastify/jwt)
// ============================================================================
// WHAT:  Registers sign + verify helpers on the Fastify app.
// WHY:   Login creates a token; protected routes verify it.
// SKIP:  No standard way to sign/verify; we'd reinvent crypto badly.
// HOW:   Secret from env; reply.jwtSign() on login; request.jwtVerify() in middleware.
//
// Token lifecycle (simple):
//   login → sign { sub, email, role } → client stores token
//   API call → header "Authorization: Bearer <token>" → jwtVerify → request.user
// ============================================================================

import jwt from "@fastify/jwt";
import { FastifyPluginAsync } from "fastify";
import { env } from "../config/env";

export const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: env.jwtSecret,
    sign: {
      expiresIn: env.jwtExpiresIn, // old tokens stop working after this (e.g. 8h)
    },
  });
};
