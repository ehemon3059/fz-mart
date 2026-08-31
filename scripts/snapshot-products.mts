/**
 * Snapshot Product + ProductVariant to a timestamped JSON file. READ-ONLY.
 *
 *   npx tsx --env-file=.env scripts/snapshot-products.mts
 *
 * A lightweight safety net for schema changes that touch these two tables, for
 * machines with no mysqldump (scripts/backup.sh is a Linux production script
 * and does not run on Windows). This is NOT a substitute for a full database
 * backup — it captures two tables and no others, so use TiDB Cloud's own
 * backup for anything broader.
 *
 * Restoring is deliberately manual: the file is plain JSON, so a bad column can
 * be put back with a short script, and nothing here can overwrite live data by
 * accident.
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const client = new PrismaClient();

async function main() {
  // Raw SELECT * rather than the Prisma models on purpose: this script has to
  // run while the schema and the database DISAGREE (that is exactly when a
  // snapshot is wanted — just before a migration), and the typed client refuses
  // to read a table whose columns it doesn't recognise. Raw reads whatever is
  // actually there. No interpolation: both queries are constant.
  const [products, variants] = await Promise.all([
    client.$queryRaw`SELECT * FROM Product ORDER BY id ASC`,
    client.$queryRaw`SELECT * FROM ProductVariant ORDER BY id ASC`,
  ]) as [Record<string, unknown>[], Record<string, unknown>[]];

  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = join(dir, `products-snapshot-${stamp}.json`);

  writeFileSync(
    file,
    JSON.stringify(
      { takenAt: new Date().toISOString(), counts: { products: products.length, variants: variants.length }, products, variants },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Snapshot written: ${file}`);
  console.log(`  ${products.length} product(s), ${variants.length} variant(s)`);
  const num = (x: unknown) => (typeof x === "number" ? x : 0);
  const onHand =
    variants.reduce((s, v) => s + num(v.stock), 0) + products.reduce((s, p) => s + num(p.stock), 0);
  console.log(`  ${onHand} unit(s) of stock captured across both tables`);
}

main().finally(() => client.$disconnect());
