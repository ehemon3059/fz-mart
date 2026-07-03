import { test, expect } from "@playwright/test";
import { prisma, E2E_PRODUCTS, E2E_ADMIN, createPendingOrder } from "./helpers/db";

// Money-critical flow #4: admin login and the Pending → Confirmed status
// transition, including the append-only status audit log.

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("admin can log in and confirm a pending order", async ({ page }) => {
  const order = await createPendingOrder(E2E_PRODUCTS.checkout);

  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill(E2E_ADMIN.username);
  await page.getByPlaceholder("••••••••").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/dashboard/);

  await page.goto(`/admin/orders/${order.id}`);
  await page.getByRole("button", { name: "Mark as Confirmed" }).click();

  // After the transition the next forward step is offered instead.
  await expect(page.getByRole("button", { name: "Mark as Shipped" })).toBeVisible();

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { statusLogs: { orderBy: { id: "asc" } } },
  });
  expect(updated.status).toBe("CONFIRMED");
  // Audit trail: PENDING at creation, then PENDING → CONFIRMED by this admin.
  const last = updated.statusLogs[updated.statusLogs.length - 1];
  expect(last.toStatus).toBe("CONFIRMED");
  expect(last.changedBy).toBe(E2E_ADMIN.username);
});
