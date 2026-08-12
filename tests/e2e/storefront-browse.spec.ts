import { test, expect } from "@playwright/test";
import { prisma, E2E_PRODUCTS, getProductBySlug } from "./helpers/db";

// Core browse path a real shopper walks before any money moves:
//   homepage → category navigation → product detail → add to cart.
// The checkout specs all start by jumping straight to /products/<slug>, so
// this is the only coverage of the navigation that gets a customer there.

const E2E_CATEGORY_SLUG = "e2e-tests-sub";

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("homepage renders and exposes storefront navigation", async ({ page }) => {
  await page.goto("/");
  // The header is the one element every storefront route depends on; if the
  // homepage server component throws, Next renders an error page instead and
  // this fails fast with a clear cause.
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  // Cards render as links to /products/<slug>; at minimum the three e2e
  // products exist, so the grid must not be empty.
  await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
});

test("category page lists the e2e products and links to the detail page", async ({ page }) => {
  await page.goto(`/category/${E2E_CATEGORY_SLUG}`);

  await expect(page.getByRole("heading", { name: "E2E Tests Sub" })).toBeVisible();
  await expect(page.getByText("No products in this category yet.")).toHaveCount(0);

  const checkoutProduct = await getProductBySlug(E2E_PRODUCTS.checkout);
  const card = page.locator(`a[href="/products/${E2E_PRODUCTS.checkout}"]`).first();
  await expect(card).toBeVisible();
  await expect(card).toContainText(checkoutProduct.name);

  await card.click();
  await expect(page).toHaveURL(new RegExp(`/products/${E2E_PRODUCTS.checkout}$`));
});

test("product detail page shows name, price and an in-stock add button", async ({ page }) => {
  const product = await getProductBySlug(E2E_PRODUCTS.checkout);
  await page.goto(`/products/${E2E_PRODUCTS.checkout}`);

  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
  // Price is rendered in taka from paisa; assert the taka figure appears
  // rather than the raw paisa integer.
  const taka = Math.round((product.discountPrice ?? product.price) / 100);
  await expect(page.getByText(new RegExp(taka.toLocaleString("en-US")))).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
});

test("adding to cart from the detail page updates the cart", async ({ page }) => {
  await page.goto(`/products/${E2E_PRODUCTS.checkout}`);
  await page.getByRole("button", { name: "Add to Cart" }).click();

  // The cart is client-side (zustand, persisted); the authoritative check is
  // that /cart shows the line item and offers checkout.
  await page.goto("/cart");
  const product = await getProductBySlug(E2E_PRODUCTS.checkout);
  await expect(page.getByText(product.name).first()).toBeVisible();
  await expect(page.getByText("Your cart is empty")).toHaveCount(0);
});

test("out-of-stock product cannot be added to the cart", async ({ page }) => {
  // Drive the oversell product to zero so the OOS branch of ProductCard and
  // the detail page are actually exercised. global-setup resets it to 1 on
  // the next run, so this does not leak into other specs.
  const product = await getProductBySlug(E2E_PRODUCTS.oversell);
  await prisma.product.update({ where: { id: product.id }, data: { stock: 0 } });

  try {
    await page.goto(`/products/${E2E_PRODUCTS.oversell}`);
    await expect(page.getByRole("button", { name: "Add to Cart" })).toHaveCount(0);
    await expect(page.getByText(/out of stock/i).first()).toBeVisible();
  } finally {
    await prisma.product.update({ where: { id: product.id }, data: { stock: 1 } });
  }
});
