import { test, expect, type Page } from "@playwright/test";
import { prisma, E2E_ADMIN } from "./helpers/db";

// Admin-configurable Theme & Layout: an admin changes the surface preset, the
// custom page background and the per-section colours (category bar, product
// card, newsletter) from Settings → Appearance, and the storefront reflects it
// immediately (SSR inline vars on the `.fz` wrapper — no rebuild, no flash). We
// drive both the change and the restore through the UI so the real
// cache-invalidation path runs and the store is left back on its defaults.

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

test("admin can change the storefront theme & section colours and it applies immediately", async ({ page }) => {
  await signIn(page);

  await page.goto("/admin/settings/appearance");
  const form = layoutForm(page);

  await form.getByRole("button", { name: "Dark" }).click();
  await form.locator("#customBgColor").fill("#123456");
  await form.locator("#catnavBg").fill("#c9d1d9");
  await form.locator("#cardBg").fill("#204060");
  await form.locator("#trustBg").fill("#0f3b2e");
  await form.locator("#newsBg").fill("#801020");
  await form.getByRole("button", { name: /Save & apply/ }).click();
  await expect(form.getByText(/Saved\. The storefront now uses this theme/)).toBeVisible();

  // Persisted to the generic Setting table under the "theme" group.
  const rows = await prisma.setting.findMany({ where: { group: "theme" } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  expect(map.preset).toBe("theme-dark");
  expect(map.customBgColor).toBe("#123456");
  expect(map.catnavBg).toBe("#c9d1d9");
  expect(map.cardBg).toBe("#204060");
  expect(map.trustBg).toBe("#0f3b2e");
  expect(map.newsBg).toBe("#801020");

  // Storefront reflects it in the SSR'd HTML — no flash, no rebuild.
  await page.goto("/");
  const style = (await page.locator(".fz").getAttribute("style")) ?? "";
  expect(style).toContain("#123456"); // custom page background wins over the preset
  expect(style).toContain("--catnav-bg: #c9d1d9");
  expect(style).toContain("--card: #204060");
  expect(style).toContain("--trust-bg: #0f3b2e");
  expect(style).toContain("--news-bg: #801020");

  // Restore defaults through the UI so the real invalidation path runs. The
  // Reset button clears every override into the form; nothing is persisted
  // until Save, which is what makes the assertions below meaningful.
  await page.goto("/admin/settings/appearance");
  const restore = layoutForm(page);
  await restore.getByRole("button", { name: "Light" }).click();
  await restore.getByRole("button", { name: "Reset to default colours" }).click();

  // Reset is form-only: every colour field is now empty, but the storefront
  // still has the old values until we save.
  for (const id of ["customBgColor", "catnavBg", "cardBg", "trustBg", "newsBg"]) {
    await expect(restore.locator(`#${id}`)).toHaveValue("");
  }

  await restore.getByRole("button", { name: /Save & apply/ }).click();
  await expect(restore.getByText(/Saved\. The storefront now uses this theme/)).toBeVisible();

  // Cleared rows really are gone, so the preset drives every surface again.
  const after = await prisma.setting.findMany({ where: { group: "theme" } });
  const afterMap = Object.fromEntries(after.map((r) => [r.key, r.value]));
  expect(afterMap.preset).toBe("theme-light");
  for (const key of ["customBgColor", "catnavBg", "cardBg", "trustBg", "newsBg"]) {
    expect(afterMap[key] ?? "").toBe("");
  }
});
