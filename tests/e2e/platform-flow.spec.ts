import { test, expect } from "@playwright/test";
import { expectAppReady } from "./helpers";

/**
 * Browse SKUs and record a stock receipt (manager session from auth.setup).
 * Requires backend :4000, frontend :5173, seed (NIKE-AIR-001, WH-MAIN).
 */
test.describe("platform operator flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectAppReady(page);
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
    await expect(
      page.getByRole("heading", { name: "Movements", exact: true }),
    ).toBeVisible();

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
    await expect(
      page.getByRole("heading", { name: "Movements", exact: true }),
    ).toBeVisible();
  });
});
