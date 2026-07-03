import { test, expect } from "@playwright/test";
import { prisma, E2E_PRODUCTS, getProductBySlug, uniquePhone } from "./helpers/db";
import { fillCheckoutForm, submitCheckout, expectOrderConfirmed } from "./helpers/checkout";

// Money-critical flow #2: Buy Now — straight from the product page to a
// single-item checkout, without touching whatever else is in the cart.

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("Buy Now checkout creates the order and decrements stock", async ({ page }) => {
  const before = await getProductBySlug(E2E_PRODUCTS.buyNow);
  const phone = uniquePhone();

  await page.goto(`/products/${E2E_PRODUCTS.buyNow}`);
  await page.getByRole("button", { name: "Buy Now" }).click();
  await page.waitForURL(/\/checkout\?buyNow=/);

  await fillCheckoutForm(page, { name: "E2E Buy Now Shopper", phone });
  expect(await submitCheckout(page)).toBe("success");
  const orderNo = await expectOrderConfirmed(page);

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true },
  });
  expect(order).not.toBeNull();
  expect(order!.status).toBe("PENDING");
  expect(order!.items).toHaveLength(1);
  expect(order!.items[0].productId).toBe(before.id);
  expect(order!.items[0].quantity).toBe(1);

  const after = await getProductBySlug(E2E_PRODUCTS.buyNow);
  expect(after.stock).toBe(before.stock - 1);
});
