import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const authFile = path.join("playwright", ".auth", "manager.json");

setup("authenticate as manager", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill("manager@inventoryhub.test");
  await page.getByLabel("Password").fill("Password123!");

  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/auth/login") &&
      response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Sign in" }).click();

  const response = await loginResponse;
  expect(
    response.ok(),
    `Login failed (${response.status()}). Is the API running on :4000?`,
  ).toBeTruthy();

  await page.waitForURL(
    (url) => !url.pathname.includes("/login"),
    { timeout: 15_000 },
  );

  await expect(
    page.getByRole("heading", { name: "Dashboard" }),
  ).toBeVisible({ timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
