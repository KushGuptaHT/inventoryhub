// ============================================================================
// AUTHENTICATE MIDDLEWARE
// ============================================================================
// WHAT:  Check that the request has a valid JWT before the route handler runs.
// WHY:   Proves "who is calling" — assignment requires server-side auth, not UI-only.
// SKIP:  Anyone could call POST /warehouses with curl, no login needed.
// HOW:   Read Authorization header → Bearer token → jwtVerify() → sets request.user.
//
// Runs as Fastify "preHandler" (before your route function).
//
// 401 = not logged in / bad token  → go to login again
// 403 = logged in but wrong role   → handled in requireRole.ts
// ============================================================================

import { FastifyReply, FastifyRequest } from "fastify";

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    reply.status(401).send({
      message: "Unauthorized",
      detail: "Missing or invalid Authorization header. Expected: Bearer <token>",
    });
    return;
  }

  try {
    // Uses JWT_SECRET to verify signature + expiry; fills request.user from token payload.
    await request.jwtVerify();
  } catch {
    reply.status(401).send({
      message: "Unauthorized",
      detail: "Token is invalid or expired",
    });
  }
};
