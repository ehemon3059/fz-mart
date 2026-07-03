import { test, expect } from "@playwright/test";
import { prisma, E2E_PRODUCTS, getProductBySlug, uniquePhone } from "./helpers/db";
import { addProductToCart, fillCheckoutForm, submitCheckout } from "./helpers/checkout";

// Money-critical flow #3: oversell protection. Two shoppers race for the
// LAST unit; the atomic conditional decrement in createOrder must let
// exactly one through.

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("two parallel checkouts for the last unit — exactly one succeeds", async ({ browser }) => {
  // Reset to exactly one unit for this run (global setup does this too, but a
  // retry within the same run must start from a clean slate).
  const product = await getProductBySlug(E2E_PRODUCTS.oversell);
  await prisma.product.update({ where: { id: product.id }, data: { stock: 1 } });
  const ordersBefore = await prisma.orderItem.count({ where: { productId: product.id } });

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    // Bring both shoppers to the brink of submission first, so the two
    // placeOrder calls hit the server as close to simultaneously as possible.
    for (const [page, name] of [
      [pageA, "E2E Racer A"],
      [pageB, "E2E Racer B"],
    ] as const) {
      await addProductToCart(page, E2E_PRODUCTS.oversell);
      await page.goto("/checkout");
      await fillCheckoutForm(page, { name, phone: uniquePhone() });
    }

    const [resultA, resultB] = await Promise.all([submitCheckout(pageA), submitCheckout(pageB)]);

    const successes = [resultA, resultB].filter((r) => r === "success").length;
    expect(successes, `expected exactly one winner, got A=${resultA} B=${resultB}`).toBe(1);

    // The database agrees: one unit sold, zero left, no negative stock.
    const after = await getProductBySlug(E2E_PRODUCTS.oversell);
    expect(after.stock).toBe(0);
    const ordersAfter = await prisma.orderItem.count({ where: { productId: product.id } });
    expect(ordersAfter - ordersBefore).toBe(1);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
