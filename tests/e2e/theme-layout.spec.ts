import { test, expect, type Page } from "@playwright/test";
import { prisma, E2E_ADMIN } from "./helpers/db";

// Admin-configurable Theme & Layout: an admin changes the surface preset, card
// style, custom background and home product count from Settings → Appearance,
// and the storefront reflects it immediately (SSR inline vars on the `.fz`
// wrapper — no rebuild, no flash). We drive both the change and the restore
// through the UI so the real cache-invalidation path runs and the store is
// left back on its defaults.

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill(E2E_ADMIN.username);
  await page.getByPlaceholder("••••••••").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/dashboard/);
}

function layoutForm(page: Page) {
  // Scope to the "Theme & layout" card — the page has several save buttons.
  return page.locator("form", {
    has: page.getByRole("heading", { name: "Theme & layout" }),
  });
}

test("admin can change the storefront theme & layout and it applies immediately", async ({ page }) => {
  await signIn(page);

  await page.goto("/admin/settings/appearance");
  const form = layoutForm(page);

  await form.getByRole("button", { name: "Dark" }).click();
  await form.locator("#productCardStyle").selectOption("classic");
  await form.locator("#customBgColor").fill("#123456");
  await form.locator("#homeProductCount").fill("7");
  await form.getByRole("button", { name: /Save & apply/ }).click();
  await expect(form.getByText(/Saved\. The storefront now uses this theme/)).toBeVisible();

  // Persisted to the generic Setting table under the "theme" group.
  const rows = await prisma.setting.findMany({ where: { group: "theme" } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  expect(map.preset).toBe("theme-dark");
  expect(map.productCardStyle).toBe("classic");
  expect(map.homeProductCount).toBe("7");
  expect(map.customBgColor).toBe("#123456");

  // Storefront reflects it in the SSR'd HTML — no flash, no rebuild.
  await page.goto("/");
  const fz = page.locator(".fz");
  await expect(fz).toHaveAttribute("data-card", "classic");
  const style = (await fz.getAttribute("style")) ?? "";
  expect(style).toContain("#123456"); // custom background wins over the preset

  // Restore defaults through the UI so the real invalidation path runs.
  await page.goto("/admin/settings/appearance");
  const restore = layoutForm(page);
  await restore.getByRole("button", { name: "Light" }).click();
  await restore.locator("#productCardStyle").selectOption("modern");
  await restore.getByRole("button", { name: "Clear / use preset" }).click();
  await restore.locator("#homeProductCount").fill("10");
  await restore.getByRole("button", { name: /Save & apply/ }).click();
  await expect(restore.getByText(/Saved\. The storefront now uses this theme/)).toBeVisible();
});
