// ============================================================================
// DEV SEED — users + sample warehouse/SKU for E2E and manual QA
// ============================================================================
// WHAT:  Manager/Operator accounts plus one warehouse and NIKE sample SKU.
// WHY:   E2E (platform-flow) searches "NIKE" / "WH"; empty DB skips that test.
// HOW:   pnpm --dir apps/backend db:seed
//
// manager@inventoryhub.test / Password123!  → MANAGER
// operator@inventoryhub.test / Password123! → OPERATOR
// Sample: warehouse WH-MAIN, SKU NIKE-AIR-001
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

  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: { name: "Main Warehouse", address: "100 Demo St", isActive: true },
    create: {
      code: "WH-MAIN",
      name: "Main Warehouse",
      address: "100 Demo St",
    },
  });
  console.log(`Seeded warehouse: ${warehouse.code}`);

  const sku = await prisma.sKU.upsert({
    where: { code: "NIKE-AIR-001" },
    update: {
      name: "Nike Air Runner",
      unitCost: 89.99,
      reorderThreshold: 10,
      isActive: true,
    },
    create: {
      code: "NIKE-AIR-001",
      name: "Nike Air Runner",
      unitCost: 89.99,
      reorderThreshold: 10,
    },
  });
  console.log(`Seeded SKU: ${sku.code}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
