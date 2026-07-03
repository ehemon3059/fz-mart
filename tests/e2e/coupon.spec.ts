import { test, expect } from "@playwright/test";
import { prisma, E2E_PRODUCTS, getProductBySlug, uniquePhone } from "./helpers/db";
import { addProductToCart, fillCheckoutForm, submitCheckout, expectOrderConfirmed } from "./helpers/checkout";

// Coupon applied at checkout: the discount is snapshotted onto the order and
// the total is reduced by exactly the coupon value (E2E100 = ৳100 = 10000 paisa).

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("COD checkout with a coupon snapshots the discount and reduces the total", async ({ page }) => {
  const product = await getProductBySlug(E2E_PRODUCTS.checkout);
  const phone = uniquePhone();

  await addProductToCart(page, E2E_PRODUCTS.checkout);
  await page.goto("/checkout");
  await fillCheckoutForm(page, { name: "E2E Coupon Shopper", phone });

  // Apply the coupon and wait for the discount row to appear.
  await page.getByPlaceholder("Coupon code").fill("E2E100");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("E2E100")).toBeVisible();

  expect(await submitCheckout(page)).toBe("success");
  const orderNo = await expectOrderConfirmed(page);

  const order = await prisma.order.findUniqueOrThrow({ where: { orderNo } });
  expect(order.couponCode).toBe("E2E100");
  expect(order.couponDiscount).toBe(10000);
  // total = subtotal + delivery - discount
  expect(order.total).toBe(order.subtotal + order.deliveryCharge - 10000);

  // A redemption row was recorded against the order.
  const redemption = await prisma.couponRedemption.findUnique({ where: { orderId: order.id } });
  expect(redemption?.amount).toBe(10000);

  // Sanity: the discounted total is less than an un-couponed order would be.
  expect(order.total).toBeLessThan(order.subtotal + order.deliveryCharge);
  expect(product.price).toBeGreaterThan(0);
});
