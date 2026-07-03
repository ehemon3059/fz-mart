import { test, expect } from "@playwright/test";
import { prisma, E2E_PRODUCTS, getProductBySlug, uniquePhone } from "./helpers/db";
import {
  addProductToCart,
  fillCheckoutForm,
  submitCheckout,
  expectOrderConfirmed,
} from "./helpers/checkout";

// Money-critical flow #1: guest Cash-on-Delivery checkout via the cart.
// Verifies the order row (status, snapshot price, total) and the stock
// decrement in the DATABASE, not just what the UI claims.

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("guest COD checkout creates the order and decrements stock", async ({ page }) => {
  const before = await getProductBySlug(E2E_PRODUCTS.checkout);
  const phone = uniquePhone();

  await addProductToCart(page, E2E_PRODUCTS.checkout);
  await page.goto("/checkout");
  await fillCheckoutForm(page, { name: "E2E Guest Shopper", phone });
  expect(await submitCheckout(page)).toBe("success");
  const orderNo = await expectOrderConfirmed(page);

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true },
  });
  expect(order).not.toBeNull();
  expect(order!.status).toBe("PENDING");
  expect(order!.customerPhone).toBe(phone);
  expect(order!.items).toHaveLength(1);

  // Server-side price authority: the snapshot must match the DB price
  // (discounted when applicable), and the total must add up in paisa.
  const expectedUnitPrice =
    before.discountPrice != null && before.discountPrice < before.price
      ? before.discountPrice
      : before.price;
  expect(order!.items[0].productId).toBe(before.id);
  expect(order!.items[0].unitPrice).toBe(expectedUnitPrice);
  expect(order!.items[0].quantity).toBe(1);
  expect(order!.subtotal).toBe(expectedUnitPrice);
  expect(order!.total).toBe(order!.subtotal + order!.deliveryCharge);

  const after = await getProductBySlug(E2E_PRODUCTS.checkout);
  expect(after.stock).toBe(before.stock - 1);
});
