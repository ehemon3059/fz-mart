/**
 * Verify the `reserved` counters against the orders that justify them. READ-ONLY.
 *
 * `reserved` is a running counter, and counters drift. The truth it should equal
 * is derivable: the sum of unshipped, unreleased order lines for that stock row.
 *
 *   expected reserved = Σ quantity of OrderItem lines whose Order is
 *                       PENDING_PAYMENT / PENDING / CONFIRMED,
 *                       with neither fulfilledAt nor restockedAt set
 *
 * A mismatch means a reservation was taken without a matching release (stock
 * silently unsellable) or released twice (overselling risk). Either is a bug in
 * the reservation lifecycle worth finding — run this after deploying Phase D,
 * then periodically.
 *
 *   npx tsx --env-file=.env scripts/reservation-verify.ts
 */
import { prisma } from "../src/lib/prisma";

interface Row {
  label: string;
  counter: number;
  expected: number;
  drift: number;
  onHand: number;
}

async function main() {
  // What SHOULD be reserved, per stock row.
  const openLines = await prisma.orderItem.findMany({
    where: {
      productId: { not: null },
      order: {
        status: { in: ["PENDING_PAYMENT", "PENDING", "CONFIRMED"] },
        fulfilledAt: null,
        restockedAt: null,
      },
    },
    select: { productId: true, variantId: true, quantity: true },
  });

  const expected = new Map<string, number>();
  for (const line of openLines) {
    const key = line.variantId != null ? `v${line.variantId}` : `p${line.productId}`;
    expected.set(key, (expected.get(key) ?? 0) + line.quantity);
  }

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, name: true, stock: true, reserved: true, variants: { select: { id: true } } },
    }),
    prisma.productVariant.findMany({
      select: {
        id: true,
        stock: true,
        reserved: true,
        size: true,
        colorName: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  const mismatches: Row[] = [];
  const oversold: Row[] = [];
  let checked = 0;

  const consider = (row: Row) => {
    if (row.counter !== row.expected) mismatches.push(row);
    // reserved exceeding on-hand means availability is negative: the shelf owes
    // more units than it holds. Always a bug, and worth calling out separately.
    if (row.counter > row.onHand) oversold.push(row);
  };

  for (const p of products) {
    // A sized product keeps its units on the variants; its own counters are
    // vestigial there, so comparing them would report false drift.
    if (p.variants.length > 0) continue;
    checked++;
    consider({
      label: p.name,
      counter: p.reserved,
      expected: expected.get(`p${p.id}`) ?? 0,
      drift: p.reserved - (expected.get(`p${p.id}`) ?? 0),
      onHand: p.stock,
    });
  }

  for (const v of variants) {
    checked++;
    const option = [v.colorName, v.size].filter(Boolean).join(" / ");
    const exp = expected.get(`v${v.id}`) ?? 0;
    consider({
      label: option ? `${v.product.name} — ${option}` : v.product.name,
      counter: v.reserved,
      expected: exp,
      drift: v.reserved - exp,
      onHand: v.stock,
    });
  }

  console.log(`\n  RESERVATION VERIFICATION`);
  console.log(`  ${"─".repeat(74)}`);
  console.log(`  ${checked} stock row(s) checked against ${openLines.length} open order line(s)`);

  if (mismatches.length === 0 && oversold.length === 0) {
    console.log(`\n  Every reservation counter matches its open orders.\n`);
    return;
  }

  if (mismatches.length > 0) {
    console.log(`\n  ${mismatches.length} counter(s) disagree with the open orders:\n`);
    console.log(
      `  ${"PRODUCT".padEnd(44)}${"RESERVED".padStart(9)}${"EXPECTED".padStart(10)}${"DRIFT".padStart(8)}`,
    );
    console.log(`  ${"─".repeat(74)}`);
    for (const m of mismatches) {
      const drift = m.drift > 0 ? `+${m.drift}` : String(m.drift);
      console.log(
        `  ${m.label.slice(0, 42).padEnd(44)}${String(m.counter).padStart(9)}${String(m.expected).padStart(10)}${drift.padStart(8)}`,
      );
    }
    console.log(`\n  Positive drift = units held hostage (unsellable but not really ordered).`);
    console.log(`  Negative drift = a release ran twice; the shop may oversell.`);
  }

  if (oversold.length > 0) {
    console.log(`\n  ⚠ ${oversold.length} row(s) have reserved > on hand — availability is`);
    console.log(`  negative there. Investigate before trusting the storefront's counts.`);
  }

  console.log(`\n  Nothing was changed by this script.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
