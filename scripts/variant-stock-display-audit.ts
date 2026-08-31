/**
 * How many products did the admin list mis-report? READ-ONLY — writes nothing.
 *
 * A product with options keeps its units on the option rows: recordMovement
 * (server/inventory/ledger.ts) updates EITHER ProductVariant.stock OR
 * Product.stock, never both, so for a sized product the product column is only
 * ever the value createProduct wrote — 0. The admin products list read that
 * column, so it called every such product out of stock.
 *
 * This script classifies the whole catalogue so you can see the real blast
 * radius, and confirms the fix (lib/product-stock.ts) addresses all of it.
 *
 *   npx tsx --env-file=.env scripts/variant-stock-display-audit.ts
 */
import { prisma } from "../src/lib/prisma";
import { availableUnits, onHandUnits } from "../src/lib/product-stock";

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      stock: true,
      reserved: true,
      variants: { select: { size: true, colorName: true, stock: true, reserved: true } },
    },
    orderBy: { id: "asc" },
  });

  // What the list used to print, vs. what it prints now.
  const before = (p: (typeof products)[number]) => p.stock;
  const after = (p: (typeof products)[number]) => availableUnits(p);

  const withVariants = products.filter((p) => p.variants.length > 0);
  const simple = products.filter((p) => p.variants.length === 0);

  // The headline bug: shown as out of stock while the shelf actually held units.
  const falselyOut = products.filter((p) => before(p) <= 0 && after(p) > 0);
  // The quieter half: a product created simple (stock credited to the product
  // row) that later gained options. Its product column froze at a non-zero
  // number and never moved again, so the list advertised phantom units.
  const falselyStocked = products.filter(
    (p) => p.variants.length > 0 && p.stock > 0,
  );
  // Genuinely empty — the fix changes nothing for these, they really are out.
  const trulyOut = products.filter((p) => after(p) <= 0);

  console.log(`Catalogue: ${products.length} products`);
  console.log(`  with options : ${withVariants.length}`);
  console.log(`  simple       : ${simple.length}`);
  console.log("");
  console.log(`WRONGLY "Out of stock" before the fix : ${falselyOut.length}`);
  console.log(`Stale non-zero product column         : ${falselyStocked.length}`);
  console.log(`Genuinely out of stock (still will be): ${trulyOut.length}`);
  console.log("");

  if (falselyOut.length > 0) {
    console.log("— Products the list wrongly called out of stock —");
    for (const p of falselyOut) {
      console.log(
        `  #${p.id} ${p.name.slice(0, 52).padEnd(52)} ` +
          `showed 0 → now ${after(p)} available (${onHandUnits(p)} on hand, ` +
          `${p.variants.length} options) [${p.status}]`,
      );
    }
    console.log("");
  }

  if (falselyStocked.length > 0) {
    console.log("— Options-based products with a stale product-level number —");
    for (const p of falselyStocked) {
      console.log(
        `  #${p.id} ${p.name.slice(0, 52).padEnd(52)} ` +
          `showed ${p.stock} → now ${after(p)} available`,
      );
    }
    console.log("");
  }

  if (trulyOut.length > 0) {
    console.log("— Genuinely out of stock: no display fix will help these —");
    for (const p of trulyOut) {
      console.log(`  #${p.id} ${p.name} [${p.status}] — ${p.variants.length} options`);
      for (const v of p.variants) {
        const label = [v.colorName, v.size].filter(Boolean).join(" / ") || "(unnamed)";
        console.log(`      ${label.padEnd(24)} stock ${v.stock}, reserved ${v.reserved}`);
      }
    }
    console.log("");
  }

  const stillOutWithOptions = trulyOut.filter((p) => p.variants.length > 0).length;
  console.log(
    `Of the ${trulyOut.length} genuinely out of stock, ${stillOutWithOptions} have options ` +
      `— those need stock credited per option, not a display fix.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
