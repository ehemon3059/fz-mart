/**
 * Copy the real catalog out of the restored TiDB snapshot instance
 * (fzmart-restored, snapshot 2026-08-25 17:00 UTC) into the live `fzmart`.
 *
 * Schemas are effectively identical (61 migrations both sides), so this is a
 * straight table-for-table copy. Columns present only in the source (e.g.
 * Category.iconUrl) are dropped automatically by intersecting column lists.
 *
 * Does NOT touch: _prisma_migrations, and any table not listed in ORDER.
 * A rollback snapshot of the live DB is written before anything is changed.
 */
require("dotenv").config({ path: ".env" });
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const RESTORED_URL =
  "mysql://2zDZJtYB7ZKs5Th.root:ElFcCFRj2EsPVRTm@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/fzmart?sslaccept=strict";

// Parent -> child. Deleted in reverse, inserted in this order, so foreign keys
// are always satisfied.
const ORDER = [
  "Division",
  "District",
  "Upazila",
  "ShippingZone",
  "Supplier",
  "SizeGuide",
  "SizeGuideValue",
  "Category",
  "Product",
  "ProductImage",
  "ProductColor",
  "ProductVariant",
  "ProductAccordionSection",
  "Banner",
  "Page",
  "FaqItem",
  "Setting",
  "Customer",
  "CustomerAddress",
  "CustomerCart",
  "CustomerCartItem",
  "Order",
  "OrderItem",
  "OrderStatusLog",
  "CourierShipment",
  "FlashSale",
  "StockMovement",
  "PurchaseOrder",
  "PurchaseOrderLine",
  "WishlistItem",
  "AdminUser",
  "AdminActivityLog",
];

const BATCH = 200;

function esc(v) {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return "'" + v.toISOString().slice(0, 23).replace("T", " ") + "'";
  if (Buffer.isBuffer(v)) return "0x" + v.toString("hex");
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  const bs = String.fromCharCode(92);
  return "'" + String(v).split(bs).join(bs + bs).split("'").join("''") + "'";
}

async function cols(client, table) {
  const rows = await client.$queryRawUnsafe(
    "SELECT COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='fzmart' AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",
    table,
  );
  return rows.map((r) => r.c);
}

async function main() {
  const src = new PrismaClient({ datasources: { db: { url: RESTORED_URL } } });
  const dst = new PrismaClient();

  // 1. Rollback snapshot of the live DB.
  const backupPath = "Extra/restore/rollback-before-recovery.sql";
  let backup = "-- live fzmart before snapshot recovery\nSET FOREIGN_KEY_CHECKS=0;\n";
  for (const table of ORDER) {
    const rows = await dst.$queryRawUnsafe("SELECT * FROM `" + table + "`");
    if (!rows.length) continue;
    const cs = Object.keys(rows[0]);
    backup +=
      "\nINSERT INTO `" + table + "` (" + cs.map((c) => "`" + c + "`").join(",") + ") VALUES\n";
    backup += rows.map((r) => "(" + cs.map((c) => esc(r[c])).join(",") + ")").join(",\n") + ";\n";
  }
  backup += "\nSET FOREIGN_KEY_CHECKS=1;\n";
  fs.writeFileSync(backupPath, backup);
  console.log("rollback snapshot written:", backupPath);

  await dst.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=0");

  // 2. Clear live tables (children first).
  for (const table of [...ORDER].reverse()) {
    try {
      const n = await dst.$executeRawUnsafe("DELETE FROM `" + table + "`");
      if (n) console.log("cleared", table, n);
    } catch (err) {
      console.log("skip clear", table, err.message.split("\n").pop().trim().slice(0, 60));
    }
  }

  // 3. Copy, using only columns that exist on BOTH sides.
  let grand = 0;
  for (const table of ORDER) {
    const srcCols = await cols(src, table);
    const dstCols = await cols(dst, table);
    const shared = srcCols.filter((c) => dstCols.includes(c));
    const dropped = srcCols.filter((c) => !dstCols.includes(c));
    if (!shared.length) {
      console.log("no shared columns, skipping", table);
      continue;
    }

    const list = shared.map((c) => "`" + c + "`").join(",");
    const rows = await src.$queryRawUnsafe("SELECT " + list + " FROM `" + table + "`");
    if (!rows.length) continue;

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = chunk
        .map((r) => "(" + shared.map((c) => esc(r[c])).join(",") + ")")
        .join(",\n");
      await dst.$executeRawUnsafe(
        "INSERT INTO `" + table + "` (" + list + ") VALUES\n" + values,
      );
    }
    grand += rows.length;
    console.log(
      "copied",
      table.padEnd(26),
      String(rows.length).padStart(5),
      dropped.length ? "(dropped: " + dropped.join(",") + ")" : "",
    );
  }

  await dst.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=1");
  console.log("\ntotal rows copied:", grand);

  const summary = await dst.$queryRawUnsafe(
    "SELECT (SELECT COUNT(*) FROM Product) products,(SELECT COUNT(*) FROM Category) categories," +
      "(SELECT COUNT(*) FROM ProductImage) images,(SELECT COUNT(*) FROM Banner) banners," +
      "(SELECT COUNT(*) FROM `Order`) orders,(SELECT COUNT(*) FROM ProductVariant) variants," +
      "(SELECT COUNT(*) FROM StockMovement) stock_moves,(SELECT COUNT(*) FROM AdminUser) admins",
  );
  console.log(
    "RESULT:",
    JSON.stringify(summary, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await src.$disconnect();
  await dst.$disconnect();
}

main().catch((err) => {
  console.error("ERR:", err.message);
  process.exit(1);
});
