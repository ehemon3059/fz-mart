/**
 * Is the inventory rebuild actually live in THIS database? READ-ONLY.
 *
 * Checks the database itself rather than the migrations folder, because a
 * migration row can exist without its effects being what you expect. Reports
 * each phase as applied or not, and shows the current stock picture.
 *
 *   npx tsx --env-file=.env scripts/inventory-status.ts
 */
import { prisma } from "../src/lib/prisma";

/** Does a column exist on a table in the current schema? */
async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
  `;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function hasTable(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}
  `;
  return Number(rows[0]?.n ?? 0) > 0;
}

const tick = (ok: boolean) => (ok ? "APPLIED    " : "NOT APPLIED");

async function main() {
  const db = await prisma.$queryRaw<{ d: string }[]>`SELECT DATABASE() AS d`;
  console.log(`\n  INVENTORY REBUILD — STATUS`);
  console.log(`  ${"─".repeat(72)}`);
  console.log(`  Database: ${db[0]?.d ?? "?"}\n`);

  const step0 = await hasColumn("Order", "restockedAt");
  const phaseA = await hasTable("StockMovement");
  const phaseD =
    (await hasColumn("Product", "reserved")) &&
    (await hasColumn("ProductVariant", "reserved")) &&
    (await hasColumn("Order", "fulfilledAt"));
  const phaseE =
    (await hasTable("Supplier")) &&
    (await hasTable("PurchaseOrder")) &&
    (await hasTable("PurchaseOrderLine"));

  console.log(`  ${tick(step0)}  Step 0  — cancel/return restock fix`);
  console.log(`  ${tick(phaseA)}  Phase A — StockMovement ledger`);
  console.log(`  ${tick(true)}  Phase B — admin screens (code only, no schema)`);
  console.log(`  ${tick(step0 && phaseA)}  Phase C — honest returns (code only, no schema)`);
  console.log(`  ${tick(phaseD)}  Phase D — On Hand / Reserved / Available`);
  console.log(`  ${tick(phaseE)}  Phase E — suppliers & purchase orders`);

  // ── What the data actually looks like ────────────────────────────────────
  console.log(`\n  ${"─".repeat(72)}`);
  console.log(`  CURRENT STATE\n`);

  if (phaseA) {
    const byType = await prisma.stockMovement.groupBy({
      by: ["type"],
      _count: { _all: true },
      _sum: { delta: true },
    });
    const total = byType.reduce((s, r) => s + r._count._all, 0);
    console.log(`  Ledger: ${total.toLocaleString("en-BD")} movement(s)`);
    for (const r of byType.sort((a, b) => b._count._all - a._count._all)) {
      const units = r._sum.delta ?? 0;
      console.log(
        `    ${r.type.padEnd(16)}${String(r._count._all).padStart(7)} rows ${
          units >= 0 ? "+" : ""
        }${units} units`,
      );
    }
  } else {
    console.log(`  Ledger: table does not exist.`);
  }

  if (phaseD) {
    const [pAgg, vAgg] = await Promise.all([
      prisma.product.aggregate({ _sum: { stock: true, reserved: true } }),
      prisma.productVariant.aggregate({ _sum: { stock: true, reserved: true } }),
    ]);
    // Products WITH variants keep their units on the variants, so their own
    // stock column is vestigial — summing both would double count. Reported
    // separately rather than added together.
    const simpleStock = pAgg._sum.stock ?? 0;
    const simpleRes = pAgg._sum.reserved ?? 0;
    const varStock = vAgg._sum.stock ?? 0;
    const varRes = vAgg._sum.reserved ?? 0;

    console.log(`\n  Stock (product rows):  ${simpleStock} on hand · ${simpleRes} reserved`);
    console.log(`  Stock (variant rows):  ${varStock} on hand · ${varRes} reserved`);

    const openOrders = await prisma.order.count({
      where: {
        status: { in: ["PENDING_PAYMENT", "PENDING", "CONFIRMED"] },
        fulfilledAt: null,
        restockedAt: null,
      },
    });
    const fulfilled = await prisma.order.count({ where: { fulfilledAt: { not: null } } });
    console.log(`\n  Orders holding reservations: ${openOrders}`);
    console.log(`  Orders marked fulfilled:     ${fulfilled}`);
  }

  if (phaseE) {
    const [suppliers, pos] = await Promise.all([
      prisma.supplier.count(),
      prisma.purchaseOrder.count(),
    ]);
    console.log(`\n  Suppliers: ${suppliers} · Purchase orders: ${pos}`);
  }

  console.log(`\n  ${"─".repeat(72)}`);
  if (!phaseE) {
    console.log(`  Phase E is not applied. Run:  npm run db:deploy`);
    console.log(`  It only adds three new tables — no existing row is touched.\n`);
  } else {
    console.log(`  All phases are live.\n`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
