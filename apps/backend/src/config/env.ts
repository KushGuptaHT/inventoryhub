// ============================================================================
// ENVIRONMENT CONFIG
// ============================================================================
// WHAT:  Read secrets/settings from .env once at startup.
// WHY:   One place to fail fast if JWT_SECRET or DATABASE_URL is missing.
// SKIP:  App might start then crash on first login with a vague error.
// HOW:   requireEnv() throws if a required key is empty.
// ============================================================================

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required to start the backend`);
  }
  return value;
};

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: requireEnv("JWT_SECRET"), // signs tokens; without it anyone could forge JWTs
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
};
