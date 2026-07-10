import { test, expect } from "@playwright/test";
import { prisma, E2E_ADMIN } from "./helpers/db";

const email = `nl-e2e-${Date.now()}@example.com`;

test.afterAll(async () => {
  await prisma.newsletterSubscriber.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

test("guest can subscribe from the storefront and see the thank-you animation", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section.news");
  await section.getByPlaceholder("Enter your email address").fill(email);
  await section.getByRole("button", { name: "Subscribe" }).click();

  // Thank-you state (animated) replaces the form.
  await expect(section.locator(".news-thanks")).toBeVisible();
  await expect(section.getByText("Subscribed!")).toBeVisible();
  await expect(section.getByText("You're in! 🎉")).toBeVisible();

  // Persisted exactly once.
  const rows = await prisma.newsletterSubscriber.findMany({ where: { email } });
  expect(rows).toHaveLength(1);
});

test("admin can view the subscriber and export CSV", async ({ page }) => {
  // Log in as the e2e admin (same selectors as admin-orders.spec.ts).
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill(E2E_ADMIN.username);
  await page.getByPlaceholder("••••••••").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/dashboard/);

  // Subscribers list shows the email.
  await page.goto("/admin/subscribers");
  await expect(page.getByRole("cell", { name: email })).toBeVisible();

  // CSV export downloads with the email inside.
  const res = await page.request.get("/admin/subscribers/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body).toContain("Name,Email,Subscribed at");
  expect(body).toContain(email);
});
