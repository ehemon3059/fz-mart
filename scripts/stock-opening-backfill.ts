/**
 * Give every existing stock row an OPENING balance, so the ledger reconciles
 * to the shelf. DRY-RUN BY DEFAULT — pass --apply to write.
 *
 * Why this exists
 * ───────────────
 * Until the product form stopped owning `stock`, a product was born holding
 * units with nothing in StockMovement to explain them. So the ledger sums to
 * roughly zero for every product created that way, while the shelf holds real
 * goods, and scripts/stock-ledger-verify.ts reports every single row as drift.
 *
 * That is the real cost of the old gap: an alarm that fires on everything is an
 * alarm nobody reads. Products created from here on record an OPENING movement
 * at creation and reconcile on their own — but the rows that already exist
 * never will, because their history genuinely wasn't written down.
 *
 * This script closes that once: for each row whose cached level disagrees with
 * its ledger, it writes ONE OPENING movement for exactly the difference. After
 * it runs, stock-ledger-verify should report zero drift, and any drift that
 * appears afterwards is a real fault worth chasing.
 *
 * What it does NOT claim
 * ──────────────────────
 * This is not a reconstruction of history. It cannot know when those units
 * arrived or what they cost; it asserts only that they are here NOW. That is
 * why every row it writes is OPENING (a starting balance) rather than PURCHASE
 * (goods from a supplier) or ADJUSTMENT (a miscount) — neither of which would
 * be true.
 *
 * Safety
 * ──────
 *  • Dry-run unless --apply is passed; prints exactly what it would write.
 *  • Idempotent: a row already reconciled is skipped, so a second run is a
 *    no-op rather than a double credit.
 *  • Never lowers a level to a negative one, and never touches `reserved`.
 *  • Writes through recordMovement(), so the movement and the level move
 *    together like every other stock change in the system.
 *
 *   npx tsx --env-file=.env scripts/stock-opening-backfill.ts          # preview
 *   npx tsx --env-file=.env scripts/stock-opening-backfill.ts --apply  # write
 */
import { prisma } from "../src/lib/prisma";
import { recordMovement } from "../src/server/inventory/ledger";

const REASON = "Opening balance — ledger backfill";

interface Pending {
  productId: number;
  variantId: number | null;
  label: string;
  cached: number;
  ledger: number;
  /** What the OPENING movement must credit to make the two agree. */
  delta: number;
  unitCost: number | null;
}

function label(name: string, colorName: string | null, size: string | null): string {
  const option = [colorName, size].filter(Boolean).join(" / ");
  return option ? `${name} — ${option}` : name;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        purchaseCost: true,
        variants: { select: { id: true } },
      },
    }),
    prisma.productVariant.findMany({
      select: {
        id: true,
        productId: true,
        stock: true,
        size: true,
        colorName: true,
        purchaseCost: true,
        product: { select: { name: true, purchaseCost: true } },
      },
    }),
  ]);

  // Ledger totals per stock row, exactly as stock-ledger-verify computes them.
  const [byProduct, byVariant] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { variantId: null },
      _sum: { delta: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["variantId"],
      where: { variantId: { not: null } },
      _sum: { delta: true },
    }),
  ]);
  const productLedger = new Map(byProduct.map((r) => [r.productId, r._sum.delta ?? 0]));
  const variantLedger = new Map(byVariant.map((r) => [r.variantId!, r._sum.delta ?? 0]));

  const pending: Pending[] = [];

  for (const p of products) {
    // A product with options keeps its units on those options; its own column
    // is vestigial there, so crediting it would invent stock.
    if (p.variants.length > 0) continue;
    const ledger = productLedger.get(p.id) ?? 0;
    const delta = p.stock - ledger;
    if (delta === 0) continue;
    pending.push({
      productId: p.id,
      variantId: null,
      label: p.name,
      cached: p.stock,
      ledger,
      delta,
      unitCost: p.purchaseCost || null,
    });
  }

  for (const v of variants) {
    const ledger = variantLedger.get(v.id) ?? 0;
    const delta = v.stock - ledger;
    if (delta === 0) continue;
    pending.push({
      productId: v.productId,
      variantId: v.id,
      label: label(v.product.name, v.colorName, v.size),
      cached: v.stock,
      ledger,
      delta,
      unitCost: v.purchaseCost || v.product.purchaseCost || null,
    });
  }

  console.log();
  console.log("  OPENING BALANCE BACKFILL");
  console.log("  " + "─".repeat(78));
  if (pending.length === 0) {
    console.log("  Every stock row already agrees with the ledger. Nothing to do.");
    console.log();
    return;
  }

  console.log(`  ${pending.length} row(s) need an opening balance.`);
  console.log();
  console.log("  ROW                                              STOCK   LEDGER   CREDIT");
  console.log("  " + "─".repeat(78));
  for (const row of pending) {
    const name = row.label.slice(0, 44).padEnd(44);
    const cached = String(row.cached).padStart(7);
    const ledger = String(row.ledger).padStart(8);
    const delta = `${row.delta > 0 ? "+" : ""}${row.delta}`.padStart(8);
    console.log(`  ${name}${cached}${ledger}${delta}`);
  }
  console.log();

  const negatives = pending.filter((r) => r.delta < 0);
  if (negatives.length > 0) {
    console.log(
      `  Note: ${negatives.length} row(s) need a NEGATIVE credit — their ledger claims\n` +
        "  more stock than the shelf holds. Those are written as a downward opening\n" +
        "  correction, which is still the honest reading: the shelf is the truth.",
    );
    console.log();
  }

  if (!apply) {
    console.log("  DRY RUN — nothing was written.");
    console.log("  Re-run with --apply to write these movements.");
    console.log();
    return;
  }

  let written = 0;
  for (const row of pending) {
    // One transaction per row: a single bad row must not roll back the rest,
    // and each movement is independently meaningful.
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read inside the transaction and recompute, so a level that moved
        // between the scan and now is credited correctly rather than blindly.
        const current =
          row.variantId != null
            ? await tx.productVariant.findUnique({
                where: { id: row.variantId },
                select: { stock: true },
              })
            : await tx.product.findUnique({
                where: { id: row.productId },
                select: { stock: true },
              });
        if (!current) return;

        const sum = await tx.stockMovement.aggregate({
          where:
            row.variantId != null
              ? { variantId: row.variantId }
              : { productId: row.productId, variantId: null },
          _sum: { delta: true },
        });
        const ledgerNow = sum._sum.delta ?? 0;
        const deltaNow = current.stock - ledgerNow;
        if (deltaNow === 0) return; // already reconciled — idempotent

        // recordMovement applies the delta to `stock` as well, so the level
        // must be rewound first: the goal is a ledger that SUMS to the level
        // already on the shelf, not more units on it.
        if (row.variantId != null) {
          await tx.productVariant.update({
            where: { id: row.variantId },
            data: { stock: { decrement: deltaNow } },
          });
        } else {
          await tx.product.update({
            where: { id: row.productId },
            data: { stock: { decrement: deltaNow } },
          });
        }

        await recordMovement(tx, {
          productId: row.productId,
          variantId: row.variantId,
          type: "OPENING",
          delta: deltaNow,
          unitCost: row.unitCost,
          reason: REASON,
          actorName: "system",
        });
      });
      written++;
    } catch (err) {
      console.log(`  ! ${row.label}: ${(err as Error).message}`);
    }
  }

  console.log(`  Wrote ${written} opening movement(s).`);
  console.log("  Re-run scripts/stock-ledger-verify.ts — it should now report no drift.");
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
