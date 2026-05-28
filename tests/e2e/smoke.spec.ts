import { test, expect } from "@playwright/test";

test("login and load dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("manager@inventoryhub.test");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Inventory value")).toBeVisible();
});

