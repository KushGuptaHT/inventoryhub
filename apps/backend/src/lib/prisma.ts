import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to start the backend");
}

// Prisma 7 uses a driver adapter to talk to PostgreSQL at runtime.
const adapter = new PrismaPg(databaseUrl);

// One PrismaClient instance is shared by all backend modules.
// This avoids opening a new database connection pool in every route/service file.
export const prisma = new PrismaClient({ adapter });
