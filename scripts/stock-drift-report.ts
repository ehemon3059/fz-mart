/**
 * Report stock lost to the cancel-restock bug. READ-ONLY — writes nothing.
 *
 * Until Step 0, only PENDING_PAYMENT → CANCELLED released an order's units.
 * Stock is decremented at CHECKOUT, so every other death of an order
 * (a cancelled COD order, a resellable return) kept its units off the shelf
 * permanently. This script totals those orphaned units per product so you can
 * decide what, if anything, to correct.
 *
 * It deliberately does NOT fix anything. Some of this drift you may have
 * already corrected by hand via the admin's manual stock adjustment, and this
 * script cannot tell a hand-corrected product from an uncorrected one — so
 * blindly re-crediting would over-count. Read the report, then correct the
 * products you know are still wrong.
 *
 *   npx tsx --env-file=.env scripts/stock-drift-report.ts
 */
import { prisma } from "../src/lib/prisma";

interface DriftRow {
  key: string;
  productId: number;
  productName: string;
  variantLabel: string | null;
  units: number;
  orderNos: string[];
}

async function main() {
  // Orders that ended in a stock-releasing state but were never credited.
  // restockedAt is the authority: the migration backfilled it for every order
  // the old code did release, so anything still null here was missed.
  //
  // RETURNED counts only when the goods were resellable — a damaged return is
  // a genuine write-off, not drift, and its stock is correctly gone.
  const affected = await prisma.order.findMany({
    where: {
      restockedAt: null,
      OR: [
        { status: "CANCELLED" },
        { status: "RETURNED", returnRestockable: true },
      ],
    },
    select: {
      id: true,
      orderNo: true,
      status: true,
      createdAt: true,
      items: {
        select: {
          productId: true,
          variantId: true,
          productName: true,
          variantLabel: true,
          quantity: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (affected.length === 0) {
    console.log("\n  No drift found — every dead order released its stock.\n");
    return;
  }

  // Group by the exact stock row that should have been credited: a variant if
  // the line had one, otherwise the product.
  const drift = new Map<string, DriftRow>();
  let orphanedLines = 0;

  for (const order of affected) {
    for (const item of order.items) {
      // productId null = the product was deleted since. There is no row left to
      // credit, so this is unrecoverable; counted and reported separately.
      if (item.productId == null) {
        orphanedLines++;
        continue;
      }
      const key = item.variantId != null ? `v${item.variantId}` : `p${item.productId}`;
      const existing = drift.get(key);
      if (existing) {
        existing.units += item.quantity;
        if (!existing.orderNos.includes(order.orderNo)) existing.orderNos.push(order.orderNo);
      } else {
        drift.set(key, {
          key,
          productId: item.productId,
          productName: item.productName,
          variantLabel: item.variantLabel,
          units: item.quantity,
          orderNos: [order.orderNo],
        });
      }
    }
  }

  const rows = [...drift.values()].sort((a, b) => b.units - a.units);
  const totalUnits = rows.reduce((sum, r) => sum + r.units, 0);

  console.log(`\n  STOCK DRIFT REPORT`);
  console.log(`  ${"─".repeat(76)}`);
  console.log(`  ${affected.length} order(s) ended without releasing stock.`);
  console.log(`  ${totalUnits} unit(s) across ${rows.length} product/variant row(s).\n`);

  console.log(`  ${"PRODUCT".padEnd(46)}${"MISSING".padStart(9)}   ORDERS`);
  console.log(`  ${"─".repeat(76)}`);
  for (const r of rows) {
    const label = r.variantLabel ? `${r.productName} — ${r.variantLabel}` : r.productName;
    const shown = r.orderNos.slice(0, 3).join(", ");
    const more = r.orderNos.length > 3 ? ` +${r.orderNos.length - 3}` : "";
    console.log(
      `  ${label.slice(0, 44).padEnd(46)}${String(r.units).padStart(9)}   ${shown}${more}`,
    );
  }

  if (orphanedLines > 0) {
    console.log(
      `\n  ${orphanedLines} line(s) referenced deleted products — not recoverable, excluded above.`,
    );
  }

  console.log(`\n  ${"─".repeat(76)}`);
  console.log(`  Nothing was changed. To correct a product, use the admin's manual`);
  console.log(`  stock adjustment so the change is attributed and audited.`);
  console.log(`  Skip any product you have already corrected by hand.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
