// ============================================================================
// REQUIRE ROLE MIDDLEWARE
// ============================================================================
// WHAT:  After authenticate, check JWT role is allowed for this route.
// WHY:   Operator and Manager are different — assignment §3.1.
// SKIP:  Any logged-in user could create warehouses (Operators shouldn't).
// HOW:   Pass allowed roles: requireRole(UserRole.MANAGER) on POST/PATCH/DELETE.
//
// Must run AFTER authenticate (needs request.user from token).
//
// Example:
//   fastify.post('/', { preHandler: [requireRole(UserRole.MANAGER)] }, ...)
// ============================================================================

import { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "../types/auth.types";

export const requireRole =
  (...allowedRoles: UserRole[]) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;

    if (!user) {
      reply.status(401).send({ message: "Unauthorized" });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      // 403 = you are logged in, but this action is not for your role
      reply.status(403).send({
        message: "Forbidden",
        detail: `This action requires one of: ${allowedRoles.join(", ")}`,
        yourRole: user.role,
      });
    }
  };
