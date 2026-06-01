import { test, expect } from "@playwright/test";
import { expectAppReady } from "./helpers";

test("login and load dashboard", async ({ page }) => {
  await page.goto("/");
  await expectAppReady(page);
  await expect(page.getByText("Inventory value")).toBeVisible({
    timeout: 15_000,
  });
});
