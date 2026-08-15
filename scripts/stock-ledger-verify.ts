/**
 * Replay the stock ledger and compare it to the cached stock levels. READ-ONLY.
 *
 * Product.stock / ProductVariant.stock are a cache of StockMovement's running
 * sum. They should agree. Where they don't, one of two things is true:
 *
 *   • Pre-cutover drift — stock lost to the cancel-restock bug, or hand-edited
 *     directly in the database before the ledger existed. Expected on the first
 *     run; it is history, not a live fault.
 *
 *   • Post-cutover drift — a stock change that bypassed the ledger. That is a
 *     BUG: some code path is writing `stock` without recording why. Any
 *     mismatch that appears (or grows) after the cutover should be investigated.
 *
 * Because the backfill could not know historical levels, it recorded pre-cutover
 * rows with beforeQty/afterQty = 0 and an accurate delta. So this script sums
 * DELTAS rather than trusting afterQty, and reports the two eras separately.
 *
 * NOTE since Phase D: a SALE is recorded when the parcel SHIPS, not at checkout.
 * Open orders therefore hold RESERVATIONS with no ledger row at all, which is
 * correct — their units are still on the shelf. Reservation counters are
 * verified separately by scripts/reservation-verify.ts.
 *
 *   npx tsx --env-file=.env scripts/stock-ledger-verify.ts
 */
import { prisma } from "../src/lib/prisma";

/** Rows written by the Phase A backfill, which carry deltas but no levels. */
const BACKFILL_REASON = "Backfilled from order history";

interface Row {
  label: string;
  cached: number;
  ledger: number;
  drift: number;
  postCutoverRows: number;
}

async function main() {
  // The cutover is the newest backfilled row: everything after it was written
  // live by the application.
  const lastBackfill = await prisma.stockMovement.findFirst({
    where: { reason: BACKFILL_REASON },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const cutoverId = lastBackfill?.id ?? 0;

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, name: true, stock: true, variants: { select: { id: true } } },
    }),
    prisma.productVariant.findMany({
      select: {
        id: true,
        stock: true,
        size: true,
        colorName: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  // Sum deltas per stock row. Product-level movements are those with no
  // variantId — for a sized product, the product's own `stock` column is not
  // the sellable quantity, so the two are compared separately.
  const byProduct = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { variantId: null },
    _sum: { delta: true },
  });
  const byVariant = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { not: null } },
    _sum: { delta: true },
  });

  // How many movements each row has seen since the cutover — used to tell a
  // frozen historical discrepancy from one that is still growing.
  const postByProduct = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { variantId: null, id: { gt: cutoverId } },
    _count: { _all: true },
  });
  const postByVariant = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { not: null }, id: { gt: cutoverId } },
    _count: { _all: true },
  });

  const productLedger = new Map(byProduct.map((r) => [r.productId, r._sum.delta ?? 0]));
  const variantLedger = new Map(byVariant.map((r) => [r.variantId!, r._sum.delta ?? 0]));
  const productPost = new Map(postByProduct.map((r) => [r.productId, r._count._all]));
  const variantPost = new Map(postByVariant.map((r) => [r.variantId!, r._count._all]));

  const mismatches: Row[] = [];
  let checked = 0;

  for (const p of products) {
    // A sized product keeps its sellable units on the variants; its own stock
    // column is vestigial there, so comparing it would report false drift.
    if (p.variants.length > 0) continue;
    checked++;
    const ledger = productLedger.get(p.id) ?? 0;
    if (ledger !== p.stock) {
      mismatches.push({
        label: p.name,
        cached: p.stock,
        ledger,
        drift: p.stock - ledger,
        postCutoverRows: productPost.get(p.id) ?? 0,
      });
    }
  }

  for (const v of variants) {
    checked++;
    const ledger = variantLedger.get(v.id) ?? 0;
    if (ledger !== v.stock) {
      const option = [v.colorName, v.size].filter(Boolean).join(" / ");
      mismatches.push({
        label: option ? `${v.product.name} — ${option}` : v.product.name,
        cached: v.stock,
        ledger,
        drift: v.stock - ledger,
        postCutoverRows: variantPost.get(v.id) ?? 0,
      });
    }
  }

  console.log(`\n  STOCK LEDGER VERIFICATION`);
  console.log(`  ${"─".repeat(78)}`);
  console.log(`  ${checked} stock row(s) checked · cutover at movement #${cutoverId}`);

  if (mismatches.length === 0) {
    console.log(`\n  Every stock level matches its ledger. Nothing to investigate.\n`);
    return;
  }

  // Rows that have moved since cutover and STILL disagree are the concerning
  // ones — a live path may be bypassing the ledger.
  const live = mismatches.filter((m) => m.postCutoverRows > 0);
  const historical = mismatches.filter((m) => m.postCutoverRows === 0);

  console.log(`  ${mismatches.length} row(s) disagree with the ledger.\n`);
  console.log(`  ${"PRODUCT".padEnd(46)}${"STOCK".padStart(8)}${"LEDGER".padStart(9)}${"DRIFT".padStart(8)}`);
  console.log(`  ${"─".repeat(78)}`);
  for (const m of [...live, ...historical]) {
    const drift = m.drift > 0 ? `+${m.drift}` : String(m.drift);
    console.log(
      `  ${m.label.slice(0, 44).padEnd(46)}${String(m.cached).padStart(8)}${String(m.ledger).padStart(9)}${drift.padStart(8)}`,
    );
  }

  console.log(`\n  ${"─".repeat(78)}`);
  if (historical.length > 0) {
    console.log(
      `  ${historical.length} row(s) have seen no movement since the cutover — pre-existing`,
    );
    console.log(`  drift (the cancel-restock bug, or direct DB edits). Expected.`);
  }
  if (live.length > 0) {
    console.log(
      `\n  ⚠ ${live.length} row(s) HAVE moved since the cutover and still disagree.`,
    );
    console.log(`  If the drift grows between runs, a code path is changing stock`);
    console.log(`  without going through recordMovement() — that needs fixing.`);
  }
  console.log(`\n  Nothing was changed by this script.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
