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
import { slugify } from "../src/lib/slug";
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

  const nikeSku = await prisma.sKU.upsert({
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
  console.log(`Seeded SKU: ${nikeSku.code}`);

  const demoCategories = [
    { name: "Footwear", sortOrder: 10 },
    { name: "Apparel", sortOrder: 20 },
    { name: "Accessories", sortOrder: 30 },
    { name: "Equipment", sortOrder: 40 },
    { name: "Nutrition", sortOrder: 50 },
  ] as const;

  const categoryRecords = await Promise.all(
    demoCategories.map((category) =>
      prisma.category.upsert({
        where: { slug: slugify(category.name) },
        update: { name: category.name, sortOrder: category.sortOrder, isActive: true },
        create: {
          name: category.name,
          slug: slugify(category.name),
          sortOrder: category.sortOrder,
        },
      }),
    ),
  );
  console.log(`Seeded categories: ${categoryRecords.map((c) => c.slug).join(", ")}`);

  const demoTags = [
    { name: "New", color: "#2563eb" },
    { name: "Best Seller", color: "#059669" },
    { name: "Clearance", color: "#dc2626" },
    { name: "Seasonal", color: "#7c3aed" },
    { name: "Nike", color: "#111827" },
    { name: "Demo", color: "#0f766e" },
  ] as const;

  const tagRecords = await Promise.all(
    demoTags.map((tag) =>
      prisma.tag.upsert({
        where: { slug: slugify(tag.name) },
        update: { name: tag.name, color: tag.color ?? undefined },
        create: { name: tag.name, slug: slugify(tag.name), color: tag.color ?? undefined },
      }),
    ),
  );
  console.log(`Seeded tags: ${tagRecords.map((t) => t.slug).join(", ")}`);

  const demoSkus = [
    {
      code: "DEMO-SHOE-001",
      name: "Demo Running Shoe",
      unitCost: 79.99,
      reorderThreshold: 15,
      category: "footwear",
      tags: ["new", "nike", "demo"],
      stock: 40,
    },
    {
      code: "DEMO-TEE-001",
      name: "Demo Training Tee",
      unitCost: 24.99,
      reorderThreshold: 30,
      category: "apparel",
      tags: ["best-seller", "demo"],
      stock: 120,
    },
    {
      code: "DEMO-JACKET-001",
      name: "Demo Wind Jacket",
      unitCost: 59.99,
      reorderThreshold: 10,
      category: "apparel",
      tags: ["seasonal", "demo"],
      stock: 25,
    },
    {
      code: "DEMO-SOCK-001",
      name: "Demo Crew Socks (3-pack)",
      unitCost: 9.99,
      reorderThreshold: 40,
      category: "accessories",
      tags: ["best-seller", "demo"],
      stock: 200,
    },
    {
      code: "DEMO-BAG-001",
      name: "Demo Gym Bag",
      unitCost: 34.99,
      reorderThreshold: 20,
      category: "accessories",
      tags: ["new", "demo"],
      stock: 60,
    },
    {
      code: "DEMO-MAT-001",
      name: "Demo Yoga Mat",
      unitCost: 19.99,
      reorderThreshold: 25,
      category: "equipment",
      tags: ["clearance", "demo"],
      stock: 18,
    },
    {
      code: "DEMO-BOTTLE-001",
      name: "Demo Water Bottle (750ml)",
      unitCost: 12.99,
      reorderThreshold: 35,
      category: "equipment",
      tags: ["seasonal", "demo"],
      stock: 90,
    },
    {
      code: "DEMO-BAR-001",
      name: "Demo Protein Bar (Box)",
      unitCost: 22.5,
      reorderThreshold: 50,
      category: "nutrition",
      tags: ["best-seller", "demo"],
      stock: 140,
    },
  ] as const;

  const seededSkus = await Promise.all(
    demoSkus.map((sku) =>
      prisma.sKU.upsert({
        where: { code: sku.code },
        update: {
          name: sku.name,
          unitCost: sku.unitCost,
          reorderThreshold: sku.reorderThreshold,
          isActive: true,
        },
        create: {
          code: sku.code,
          name: sku.name,
          unitCost: sku.unitCost,
          reorderThreshold: sku.reorderThreshold,
        },
        select: { id: true, code: true },
      }),
    ),
  );
  console.log(`Seeded demo SKUs: ${seededSkus.length}`);

  const categoryBySlug = new Map(categoryRecords.map((c) => [c.slug, c.id]));
  const tagBySlug = new Map(tagRecords.map((t) => [t.slug, t.id]));
  const skuByCode = new Map(seededSkus.map((s) => [s.code, s.id]));

  await prisma.sKUCategory.createMany({
    data: demoSkus.map((sku) => ({
      skuId: skuByCode.get(sku.code) as string,
      categoryId: categoryBySlug.get(sku.category) as string,
      isPrimary: true,
    })),
    skipDuplicates: true,
  });

  await prisma.sKUTag.createMany({
    data: demoSkus.flatMap((sku) =>
      sku.tags.map((tagSlug) => ({
        skuId: skuByCode.get(sku.code) as string,
        tagId: tagBySlug.get(tagSlug) as string,
      })),
    ),
    skipDuplicates: true,
  });

  await prisma.inventoryStock.createMany({
    data: demoSkus.map((sku) => ({
      skuId: skuByCode.get(sku.code) as string,
      warehouseId: warehouse.id,
      stockLevel: sku.stock,
      reserved: 0,
      lastMovementAt: new Date(),
    })),
    skipDuplicates: true,
  });

  const nikeCategoryId = categoryBySlug.get("footwear");
  if (nikeCategoryId) {
    await prisma.sKUCategory.createMany({
      data: [{ skuId: nikeSku.id, categoryId: nikeCategoryId, isPrimary: false }],
      skipDuplicates: true,
    });
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
