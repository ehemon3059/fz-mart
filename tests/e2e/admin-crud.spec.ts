import { test, expect } from "@playwright/test";
import { prisma, E2E_PRODUCTS, getProductBySlug } from "./helpers/db";
import { adminLogin } from "./helpers/admin";

// Admin CRUD coverage: category tree create → edit → delete, and editing an
// existing product. Every assertion lands in the DATABASE, because the admin
// list can render optimistically and would hide a failed server action.
//
// Image upload (Sharp resize) is deliberately NOT covered here — see the note
// on the skipped test at the bottom.

const CREATED_SLUGS: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await adminLogin(page);
});

test.afterAll(async () => {
  // Clean up anything the specs created, even on failure, so reruns start clean.
  if (CREATED_SLUGS.length > 0) {
    await prisma.category.deleteMany({ where: { slug: { in: CREATED_SLUGS } } });
  }
  await prisma.$disconnect();
});

test("admin can create a root category", async ({ page }) => {
  const name = `E2E Root ${Date.now()}`;

  await page.goto("/admin/categories/new");
  await page.getByPlaceholder("e.g. Electronics").fill(name);
  await page.getByRole("button", { name: "Create Category" }).click();

  // Server action redirects back to the list on success.
  await page.waitForURL(/\/admin\/categories/, { timeout: 15_000 });

  const created = await prisma.category.findFirst({ where: { name } });
  expect(created, "category row should exist in the DB").not.toBeNull();
  expect(created!.parentId).toBeNull();
  // Slug is derived server-side, not sent by the client.
  expect(created!.slug).toMatch(/^e2e-root-\d+$/);
  CREATED_SLUGS.push(created!.slug);
});

test("admin can create a child category under an existing parent", async ({ page }) => {
  const parent = await prisma.category.findFirstOrThrow({ where: { slug: "e2e-tests" } });
  const name = `E2E Child ${Date.now()}`;

  await page.goto("/admin/categories/new");
  await page.getByPlaceholder("e.g. Electronics").fill(name);
  // Parent is a native <select> keyed by category id.
  await page.locator("select").first().selectOption(String(parent.id));
  await page.getByRole("button", { name: "Create Category" }).click();
  await page.waitForURL(/\/admin\/categories/, { timeout: 15_000 });

  const created = await prisma.category.findFirst({ where: { name } });
  expect(created, "child category row should exist").not.toBeNull();
  expect(created!.parentId).toBe(parent.id);
  CREATED_SLUGS.push(created!.slug);
});

test("admin can rename a category", async ({ page }) => {
  const slug = CREATED_SLUGS[0];
  const category = await prisma.category.findFirstOrThrow({ where: { slug } });
  const renamed = `${category.name} Renamed`;

  await page.goto(`/admin/categories/${category.id}/edit`);
  const nameInput = page.getByPlaceholder("e.g. Electronics");
  await expect(nameInput).toHaveValue(category.name);
  await nameInput.fill(renamed);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.waitForURL(/\/admin\/categories/, { timeout: 15_000 });

  const after = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
  expect(after.name).toBe(renamed);
});

test("admin can edit a product's price and stock", async ({ page }) => {
  const product = await getProductBySlug(E2E_PRODUCTS.buyNow);
  const newStock = product.stock + 7;

  await page.goto(`/admin/products/${product.id}/edit`);
  // Stock is a labelled number input; scope by label text to avoid matching
  // the other numeric fields (price, discount, sourcing cost).
  const stockInput = page.locator("input[type=number]").nth(2);
  await expect(stockInput).toBeVisible();
  await stockInput.fill(String(newStock));
  await page.getByRole("button", { name: "Save Changes" }).first().click();
  await page.waitForURL(/\/admin\/products/, { timeout: 15_000 });

  const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  expect(after.stock).toBe(newStock);
  // Price must be untouched — a form that silently rewrites money on an
  // unrelated edit is exactly the bug worth catching.
  expect(after.price).toBe(product.price);

  // Restore so the checkout/buy-now specs see the stock they expect.
  await prisma.product.update({ where: { id: product.id }, data: { stock: product.stock } });
});

test("deleting a category removes it from the tree", async ({ page }) => {
  const slug = CREATED_SLUGS[CREATED_SLUGS.length - 1];
  const category = await prisma.category.findFirstOrThrow({ where: { slug } });

  await page.goto("/admin/categories");
  // Confirm dialogs are native window.confirm in this admin.
  page.on("dialog", (dialog) => dialog.accept());
  const row = page.locator("tr, li").filter({ hasText: category.name }).first();
  await row.getByRole("button", { name: /delete|remove/i }).first().click();

  await expect
    .poll(() => prisma.category.count({ where: { id: category.id } }), { timeout: 15_000 })
    .toBe(0);
  CREATED_SLUGS.splice(CREATED_SLUGS.indexOf(slug), 1);
});

// Image upload needs a real R2 bucket or a writable public/uploads dir, and
// asserting the Sharp resize means reading back the stored object. Enable
// once the test env has upload storage configured — see test.md.
test.skip("admin can upload a product image (Sharp resize)", async () => {});
