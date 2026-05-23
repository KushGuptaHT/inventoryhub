// ============================================================================
// AUTH VALIDATION (Zod)
// ============================================================================
// WHAT:  Rules for register/login request bodies.
// WHY:   Block bad input before DB/auth logic runs.
// SKIP:  Invalid emails or short passwords could hit the DB; harder to debug.
// HOW:   Routes call safeParse() → 400 with field errors if invalid.
// ============================================================================

import { z } from "zod";
import { UserRole } from "../types/auth.types";

export const registerSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  // WHY default OPERATOR: public sign-up shouldn't create Managers (security).
  // Managers come from seed or an admin flow later.
  role: z.literal(UserRole.OPERATOR).optional().default(UserRole.OPERATOR),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
