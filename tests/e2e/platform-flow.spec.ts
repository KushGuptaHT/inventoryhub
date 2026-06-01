import { test, expect } from "@playwright/test";

/**
 * End-to-end: login → browse SKUs → record a stock receipt on Movements.
 * Requires backend (4000), frontend (5173), DB seeded, and at least one warehouse.
 */
test.describe("platform operator flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("manager@inventoryhub.test");
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("browse SKUs page loads with category sidebar", async ({ page }) => {
    await page.getByRole("link", { name: "SKUs" }).click();
    await expect(page.getByRole("heading", { name: "SKUs" })).toBeVisible();
    await expect(page.getByRole("button", { name: "All SKUs" })).toBeVisible();
    await expect(
      page.getByPlaceholder("Search SKU code or name"),
    ).toBeVisible();
  });

  test("movements receipt with SKU search", async ({ page }) => {
    await page.getByRole("link", { name: "Movements" }).click();
    await expect(page.getByRole("heading", { name: "Movements" })).toBeVisible();

    const skuSearch = page
      .getByRole("heading", { name: "Receipt" })
      .locator("..")
      .getByPlaceholder("Search SKU code or name…");

    await skuSearch.fill("NIKE");
    await page.waitForTimeout(400);
    const option = page.getByRole("option").first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      test.skip(true, "No SKU match for NIKE in seed data");
    }

    const warehouseSearch = page
      .getByRole("heading", { name: "Receipt" })
      .locator("..")
      .getByPlaceholder("Search warehouse code or name…");
    if (await warehouseSearch.isVisible()) {
      await warehouseSearch.fill("WH");
      await page.waitForTimeout(400);
      const whOption = page.getByRole("option").first();
      if (await whOption.isVisible().catch(() => false)) {
        await whOption.click();
      }
    }

    await page.getByRole("button", { name: "Receive stock" }).click();
    await expect(page.locator(".form-error")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Movements" })).toBeVisible();
  });
});
