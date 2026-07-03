import { test, expect, type Page } from "@playwright/test";
import { prisma, E2E_PRODUCTS, getProductBySlug, uniquePhone } from "./helpers/db";
import { addProductToCart, fillCheckoutForm } from "./helpers/checkout";

// Online payment flows against the MOCK gateway (enabled in global-setup).
// The mock adapter runs the identical pipeline as SSLCommerz/bKash — order in
// PENDING_PAYMENT with stock reserved, IPN-style verification, transactional
// settlement — with the gateway page swapped for an internal one.

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function startOnlineCheckout(
  page: Page,
  method: "Pay full amount online" | "Pay delivery charge now",
): Promise<string> {
  await addProductToCart(page, E2E_PRODUCTS.checkout);
  await page.goto("/checkout");
  await fillCheckoutForm(page, { name: "E2E Online Shopper", phone: uniquePhone() });
  await page.getByRole("button", { name: method }).click();
  await page.getByRole("button", { name: "PLACE ORDER" }).click();

  // Checkout redirects to the mock gateway page.
  await page.waitForURL(/\/payment\/mock\?/);
  const orderNo = await page.locator("span.font-mono").innerText();
  expect(orderNo.length).toBeGreaterThan(0);
  return orderNo;
}

test("full online payment: pay at gateway → order confirmed, paid in DB", async ({ page }) => {
  const before = await getProductBySlug(E2E_PRODUCTS.checkout);
  const orderNo = await startOnlineCheckout(page, "Pay full amount online");

  // Order exists as PENDING_PAYMENT with stock already reserved.
  const reserved = await prisma.order.findUniqueOrThrow({ where: { orderNo } });
  expect(reserved.status).toBe("PENDING_PAYMENT");
  expect(reserved.paymentMethod).toBe("ONLINE");
  expect((await getProductBySlug(E2E_PRODUCTS.checkout)).stock).toBe(before.stock - 1);

  // Pay on the mock gateway → verified server-side → confirmation page.
  await page.getByRole("button", { name: /^Pay ৳/ }).click();
  await page.waitForURL(/\/order-confirmation\//);

  const paid = await prisma.order.findUniqueOrThrow({
    where: { orderNo },
    include: { payments: true, statusLogs: { orderBy: { id: "asc" } } },
  });
  expect(paid.status).toBe("PENDING");
  expect(paid.paidAmount).toBe(paid.total);
  expect(paid.payments).toHaveLength(1);
  expect(paid.payments[0].status).toBe("SUCCESS");
  expect(paid.payments[0].provider).toBe("mock");
  expect(paid.payments[0].providerTxnId).toBeTruthy();
  // Gateway fee (2.5% of the paid amount) auto-captured for the P&L.
  expect(paid.paymentGatewayFee).toBe(Math.round((paid.total * 250) / 10000));
  // Audit trail: PENDING_PAYMENT at creation, then promoted to PENDING.
  expect(paid.statusLogs.map((l) => l.toStatus)).toEqual(["PENDING_PAYMENT", "PENDING"]);

  // Stock stays sold (reservation kept).
  expect((await getProductBySlug(E2E_PRODUCTS.checkout)).stock).toBe(before.stock - 1);
});

test("partial advance: only the delivery charge is paid online", async ({ page }) => {
  const orderNo = await startOnlineCheckout(page, "Pay delivery charge now");

  await page.getByRole("button", { name: /^Pay ৳/ }).click();
  await page.waitForURL(/\/order-confirmation\//);

  const order = await prisma.order.findUniqueOrThrow({
    where: { orderNo },
    include: { payments: true },
  });
  expect(order.status).toBe("PENDING");
  expect(order.paymentMethod).toBe("PARTIAL");
  expect(order.paidAmount).toBe(order.deliveryCharge);
  expect(order.paidAmount).toBeLessThan(order.total);
  expect(order.payments[0].amount).toBe(order.deliveryCharge);
});

test("failed payment cancels the order and releases reserved stock", async ({ page }) => {
  const before = await getProductBySlug(E2E_PRODUCTS.checkout);
  const orderNo = await startOnlineCheckout(page, "Pay full amount online");

  expect((await getProductBySlug(E2E_PRODUCTS.checkout)).stock).toBe(before.stock - 1);

  await page.getByRole("button", { name: "Fail payment" }).click();
  await page.waitForURL(/\/payment\/return\?/);
  await expect(page.getByRole("heading", { name: "Payment not completed" })).toBeVisible();

  const order = await prisma.order.findUniqueOrThrow({
    where: { orderNo },
    include: { payments: true },
  });
  expect(order.status).toBe("CANCELLED");
  expect(order.paidAmount).toBe(0);
  expect(order.payments[0].status).toBe("FAILED");

  // The reservation was released — stock is back where it started.
  expect((await getProductBySlug(E2E_PRODUCTS.checkout)).stock).toBe(before.stock);
});
