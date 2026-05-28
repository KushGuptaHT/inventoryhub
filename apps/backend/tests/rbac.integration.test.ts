// ============================================================================
// RBAC — INTEGRATION TEST
// ============================================================================
// WHAT:  Prove MANAGER vs OPERATOR route protection works.
// WHY:   Assignment requires server-side RBAC (not UI-only).
// HOW:   Create users, login for JWTs, then inject requests.
// ============================================================================

import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildApp } from "../src/app";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";
import { UserRole } from "../src/types/auth.types";

const runId = `rbac-${Date.now()}`;

describe("rbac (manager vs operator)", () => {
  const managerEmail = `manager-${runId}@inventoryhub.test`;
  const operatorEmail = `operator-${runId}@inventoryhub.test`;
  const password = "Password123!";

  let app: Awaited<ReturnType<typeof buildApp>>;
  let managerToken: string;
  let operatorToken: string;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run integration tests");
    }

    const [managerHash, operatorHash] = await Promise.all([
      hashPassword(password),
      hashPassword(password),
    ]);

    await prisma.user.upsert({
      where: { email: managerEmail },
      update: { passwordHash: managerHash, role: UserRole.MANAGER, isActive: true },
      create: {
        email: managerEmail,
        passwordHash: managerHash,
        name: "RBAC Manager",
        role: UserRole.MANAGER,
      },
    });

    await prisma.user.upsert({
      where: { email: operatorEmail },
      update: {
        passwordHash: operatorHash,
        role: UserRole.OPERATOR,
        isActive: true,
      },
      create: {
        email: operatorEmail,
        passwordHash: operatorHash,
        name: "RBAC Operator",
        role: UserRole.OPERATOR,
      },
    });

    app = await buildApp();
    await app.ready();

    const login = async (email: string) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password },
      });
      assert.equal(response.statusCode, 200);
      return response.json() as { accessToken: string };
    };

    managerToken = (await login(managerEmail)).accessToken;
    operatorToken = (await login(operatorEmail)).accessToken;
  });

  after(async () => {
    await app.close();
  });

  it("operator cannot POST /warehouses; manager can", async () => {
    const body = { code: `RBAC-WH-${runId}`, name: "RBAC Warehouse", address: "Test" };

    const operatorRes = await app.inject({
      method: "POST",
      url: "/warehouses",
      headers: { authorization: `Bearer ${operatorToken}` },
      payload: body,
    });
    assert.equal(operatorRes.statusCode, 403);

    const managerRes = await app.inject({
      method: "POST",
      url: "/warehouses",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: body,
    });
    assert.equal(managerRes.statusCode, 201);
  });

  it("operator cannot POST /skus; manager can", async () => {
    const skuBody = {
      code: `RBAC-SKU-${runId}`,
      name: "RBAC SKU",
      unitCost: 10,
      reorderThreshold: 5,
    };

    const operatorRes = await app.inject({
      method: "POST",
      url: "/skus",
      headers: { authorization: `Bearer ${operatorToken}` },
      payload: skuBody,
    });
    assert.equal(operatorRes.statusCode, 403);

    const managerRes = await app.inject({
      method: "POST",
      url: "/skus",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: skuBody,
    });
    assert.equal(managerRes.statusCode, 201);
  });
});

