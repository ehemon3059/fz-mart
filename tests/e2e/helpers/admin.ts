import { expect, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./db";

/**
 * Shared admin-panel helpers. The login sequence was duplicated across
 * admin-orders / newsletter / theme-layout specs; it lives here now so the
 * selector contract is fixed in one place.
 */

export async function adminLogin(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill(E2E_ADMIN.username);
  await page.getByPlaceholder("••••••••").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Must match /admin/dashboard specifically — a loose /admin/ pattern also
  // matches /admin/login itself and would pass on a FAILED login.
  await page.waitForURL(/\/admin\/dashboard/);
}

/** Waits for a server action to settle by watching for the row to appear in a list. */
export async function expectRowVisible(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
}
