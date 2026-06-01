import { expect, type Page } from "@playwright/test";

/** Assert the app shell loaded after auth (storage state or fresh login). */
export async function expectAppReady(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Dashboard" }),
  ).toBeVisible({ timeout: 15_000 });
}
