import { test, expect } from "@playwright/test";

/**
 * End-to-end: login → browse SKUs → record a stock receipt on Movements.
 * Requires backend (4000), frontend (5173), DB seeded (users + NIKE-AIR-001 + WH-MAIN).
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

    const receiptForm = page
      .locator("form.form-card")
      .filter({ has: page.getByRole("heading", { name: "Receipt" }) });

    const skuCombobox = receiptForm.getByRole("combobox").first();
    await skuCombobox.click();
    await skuCombobox.fill("NIKE");

    const skuOption = receiptForm.getByRole("option").filter({
      hasText: /NIKE/i,
    });
    await expect(skuOption.first()).toBeVisible({ timeout: 10_000 });
    await skuOption.first().click();

    const warehouseCombobox = receiptForm.getByRole("combobox").nth(1);
    await warehouseCombobox.click();
    await warehouseCombobox.fill("WH");

    const whOption = receiptForm.getByRole("option").filter({
      hasText: /WH-MAIN|Main Warehouse/i,
    });
    await expect(whOption.first()).toBeVisible({ timeout: 10_000 });
    await whOption.first().click();

    await receiptForm.getByRole("button", { name: "Receive stock" }).click();
    await expect(receiptForm.locator(".form-error")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Movements" })).toBeVisible();
  });
});
