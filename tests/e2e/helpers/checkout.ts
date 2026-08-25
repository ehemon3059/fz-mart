import { expect, type Page } from "@playwright/test";
import { E2E_DIVISION, E2E_DISTRICT } from "./db";

// UI-level helpers shared by the checkout specs. Selectors are the visible
// labels/placeholders customers see — the same contract a real shopper uses.

export async function addProductToCart(page: Page, slug: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await page.getByRole("button", { name: "Add to Cart" }).click();
}

export async function fillCheckoutForm(
  page: Page,
  { name, phone }: { name: string; phone: string },
): Promise<void> {
  await page.getByPlaceholder("Your full name *").fill(name);
  await page.getByPlaceholder("017XXXXXXXX").fill(phone);
  // Delivery location: the charge is derived from it, so checkout refuses to
  // submit until a division AND district are picked. Selected by visible label,
  // the same way a shopper does it.
  await page.getByLabel(/Division/).selectOption({ label: E2E_DIVISION });
  await page.getByLabel(/District/).selectOption({ label: E2E_DISTRICT });
  await page.getByPlaceholder(/House no/).fill("12/A E2E Street, Test Area, Dhaka");
  await page.getByRole("checkbox", { name: /terms/i }).check();
}

/** Submits checkout and waits until it either lands on the confirmation page or shows an error. */
export async function submitCheckout(page: Page): Promise<"success" | "rejected"> {
  await page.getByRole("button", { name: "PLACE ORDER" }).click();
  // CheckoutForm's own error paragraph — NOT [role=alert], which would also
  // match Next.js's route announcer and misread a successful navigation.
  const errorAlert = page.locator("p.co-err");
  await Promise.race([
    page.waitForURL(/\/order-confirmation\//).catch(() => {}),
    errorAlert.waitFor({ state: "visible" }).catch(() => {}),
  ]);
  return page.url().includes("/order-confirmation/") ? "success" : "rejected";
}

/** Asserts the confirmation page rendered and returns the public order number from the URL. */
export async function expectOrderConfirmed(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/order-confirmation\//);
  await expect(page.getByRole("heading", { name: "Order Placed!" })).toBeVisible();
  const orderNo = decodeURIComponent(page.url().split("/order-confirmation/")[1].split("?")[0]);
  expect(orderNo.length).toBeGreaterThan(0);
  return orderNo;
}
