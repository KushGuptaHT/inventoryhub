// ============================================================================
// AUTH SERVICE
// ============================================================================
// WHAT:  Register and login logic (database + passwords). No HTTP here.
// WHY:   Routes stay thin; business rules live in one testable place.
// SKIP:  Fat routes mixing SQL + bcrypt + status codes = hard to maintain.
// HOW:   prisma for User table; password.ts for hash/compare; AuthError for expected failures.
//
// Layer stack:
//   routes/auth.ts  → status codes, JWT sign
//   auth.service.ts → this file
//   password.ts     → bcrypt
// ============================================================================

import { Prisma } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import type { RegisterInput } from "../schemas/auth.schemas";
import type { PublicUser, UserRole } from "../types/auth.types";
import { isUserRole } from "../types/auth.types";

// Only fetch columns safe to send to the client (never passwordHash).
const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

const toPublicUser = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}): PublicUser => {
  if (!isUserRole(user.role)) {
    throw new Error(`Invalid role stored for user ${user.id}`);
  }
  // Pick fields explicitly — never spread DB row (login row includes passwordHash).
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
};

/** Thrown for expected failures (wrong password, duplicate email) — routes map to HTTP status. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const authService = {
  register: async (input: RegisterInput): Promise<PublicUser> => {
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(), // same email with different casing = one account
          passwordHash,
          name: input.name,
          role: input.role,
        },
        select: publicUserSelect,
      });
      return toPublicUser(user);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AuthError("Email is already registered", 409);
      }
      throw error;
    }
  },

  login: async (email: string, password: string): Promise<PublicUser> => {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // WHY same message for wrong email vs wrong password:
    // IF different messages → attacker can guess which emails exist in our system.
    const invalidCredentials = () =>
      new AuthError("Invalid email or password", 401);

    if (!user || !user.isActive) {
      throw invalidCredentials();
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return toPublicUser(user);
  },
};
