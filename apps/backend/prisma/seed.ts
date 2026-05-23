// ============================================================================
// DEV SEED — test users
// ============================================================================
// WHAT:  Creates Manager + Operator accounts for local testing.
// WHY:   You need both roles to test 403 vs 201 on POST /warehouses.
// SKIP:  You'd register only Operators and never test Manager-only routes easily.
// HOW:   pnpm --dir apps/backend db:seed
//
// manager@inventoryhub.test / Password123!  → MANAGER
// operator@inventoryhub.test / Password123! → OPERATOR
// ============================================================================

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/password";
import { UserRole } from "../src/types/auth.types";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run seed");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const DEV_USERS = [
  {
    email: "manager@inventoryhub.test",
    password: "Password123!",
    name: "Dev Manager",
    role: UserRole.MANAGER,
  },
  {
    email: "operator@inventoryhub.test",
    password: "Password123!",
    name: "Dev Operator",
    role: UserRole.OPERATOR,
  },
] as const;

async function main() {
  for (const user of DEV_USERS) {
    const passwordHash = await hashPassword(user.password);
    // upsert = create if missing, update if exists (safe to run seed many times)
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
      },
    });
    console.log(`Seeded user: ${user.email} (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
