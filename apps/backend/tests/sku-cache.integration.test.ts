// ============================================================================
// SKU CACHE — INTEGRATION TEST
// ============================================================================
// WHAT:  GET /skus/code/:code caches SKU in Redis (sku:{CODE}).
// WHY:   Hot path optimization must actually populate Redis.
// HOW:   Create a SKU, call GET twice, then assert Redis key exists.
// ============================================================================

import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildApp } from "../src/app";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";
import { skuCacheKey } from "../src/lib/sku-cache";
import { UserRole } from "../src/types/auth.types";

const runId = `sku-cache-${Date.now()}`;

describe("sku cache (redis)", () => {
  const managerEmail = `cache-${runId}@inventoryhub.test`;
  const password = "Password123!";

  let app: Awaited<ReturnType<typeof buildApp>>;
  let managerToken: string;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run integration tests");
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email: managerEmail },
      update: { passwordHash, role: UserRole.MANAGER, isActive: true },
      create: {
        email: managerEmail,
        passwordHash,
        name: "Cache Manager",
        role: UserRole.MANAGER,
      },
    });

    app = await buildApp();
    await app.ready();

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: managerEmail, password },
    });
    assert.equal(loginRes.statusCode, 200);
    managerToken = (loginRes.json() as { accessToken: string }).accessToken;
  });

  after(async () => {
    await app.close();
  });

  it("creates sku:{CODE} key after GET by code", async () => {
    const code = `CACHE-${runId}`.toUpperCase();
    const cacheKey = skuCacheKey(code);

    // Ensure clean slate for this key
    await redis.del(cacheKey);

    const createRes = await app.inject({
      method: "POST",
      url: "/skus",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        code,
        name: "Cache SKU",
        unitCost: 1,
        reorderThreshold: 10,
      },
    });
    assert.equal(createRes.statusCode, 201);

    const first = await app.inject({
      method: "GET",
      url: `/skus/code/${code}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    assert.equal(first.statusCode, 200);

    const cachedAfterFirst = await redis.get(cacheKey);
    assert.ok(cachedAfterFirst, "expected redis key to exist after first GET");

    const second = await app.inject({
      method: "GET",
      url: `/skus/code/${code}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    assert.equal(second.statusCode, 200);
  });
});

