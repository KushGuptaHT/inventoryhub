// ============================================================================
// AUTH TYPES
// ============================================================================
// WHAT:  Shared TypeScript shapes for roles, JWT payload, and API user object.
// WHY:   Same types in login, middleware, and routes → fewer bugs and autocomplete.
// SKIP:  We'd use `any` or repeat strings; easy to typo roles or miss fields.
// HOW:   UserRole constants + JwtPayload type + Fastify module augmentation below.
// ============================================================================

/** Manager = full access. Operator = cannot create warehouses / edit SKU master (later). */
export const UserRole = {
  MANAGER: "MANAGER",
  OPERATOR: "OPERATOR",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Guards DB/JWT values so we never treat a random string as a valid role.
export const isUserRole = (value: string): value is UserRole =>
  value === UserRole.MANAGER || value === UserRole.OPERATOR;

/**
 * WHAT:  Data stored inside the JWT after login.
 * WHY:   Every protected request carries id + role without hitting the DB again.
 * SKIP:  Server couldn't know who is calling /warehouses without a DB lookup each time.
 * HOW:   `sub` = user id (JWT standard name). email + role copied from User row.
 */
export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

/** WHAT: User fields we allow in JSON responses. */
/** SKIP: If we returned the full User row, passwordHash could leak in a bug. */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

// After jwtVerify(), Fastify sets request.user — this tells TypeScript its shape.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
