/**
 * Verify the listing cap end to end, against a REAL product, then undo it all.
 *
 *   npx tsx --env-file=.env scripts/listed-qty-verify.ts
 *
 * Creates a throwaway DRAFT product with 100 units credited through the ledger,
 * runs the scenario table below against the real reservation code, and deletes
 * everything it made. It asserts the two things that must never break:
 *
 *   1. The cap limits what can be sold, at the same atomic write that already
 *      prevents overselling — including a concurrency race for the last unit.
 *   2. The cap NEVER touches physical stock. Every scenario re-checks that the
 *      ledger and `stock` still agree, so a listing change can't quietly become
 *      a stock change.
 *
 * Scenarios (from the spec):
 *
 *   Physical  Listed  Order                   Expect
 *   100       50      20                      success
 *   100       50      50                      success
 *   100       50      51                      reject
 *   100       50      sell 20 then order 31   reject
 *   100       50      admin -> 80             updates
 *   100       50      admin -> 10             safe, open orders unaffected
 *   100       50      admin -> 120            rejected, names the real figure
 */
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient({ transactionOptions: { timeout: 30000, maxWait: 15000 } });
(globalThis as unknown as { prisma: PrismaClient }).prisma = client;

const { recordMovement } = await import("../src/server/inventory/ledger");
const { reserveUnits, availableOf, releaseOrder, fulfilOrder } = await import(
  "../src/server/inventory/reservations"
);
const { setListedQuantities, ListingError } = await import("../src/server/inventory/listing");

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}${detail ? `  ${detail}` : ""}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ""}`);
  }
};

/** Current state of the throwaway product's single stock row. */
async function state(productId: number) {
  const p = await client.product.findUniqueOrThrow({
    where: { id: productId },
    select: { stock: true, reserved: true, listedQty: true },
  });
  return { ...p, available: availableOf(p) };
}

/**
 * Put the row back to a known state before an isolated scenario.
 *
 * Writes `reserved` and `listedQty` directly, which NOTHING in the application
 * is allowed to do — it is legitimate here only because this is a throwaway
 * product that exists for the length of this script, and because the
 * alternative (cancelling orders to unwind reservations) would test the release
 * path rather than the one under examination. `stock` is deliberately NOT
 * written: it stays owned by the ledger even in the harness, so the
 * ledger-agreement assertions stay meaningful.
 */
async function reset(productId: number, listedQty: number | null): Promise<void> {
  await client.$executeRaw`UPDATE Product SET reserved = 0, listedQty = ${listedQty} WHERE id = ${productId}`;
}

/** Try to reserve N units the way checkout does. Returns whether it succeeded. */
async function tryReserve(productId: number, qty: number): Promise<boolean> {
  return client.$transaction((tx) => reserveUnits(tx, { productId, quantity: qty }));
}

/** Ledger sum must always equal cached stock — the listing must never move it. */
async function ledgerAgrees(productId: number): Promise<boolean> {
  const [{ stock }, rows] = await Promise.all([
    client.product.findUniqueOrThrow({ where: { id: productId }, select: { stock: true } }),
    client.stockMovement.findMany({ where: { productId }, select: { delta: true } }),
  ]);
  return rows.reduce((s, r) => s + r.delta, 0) === stock;
}

async function main() {
  const category = await client.category.findFirstOrThrow();
  let productId: number | null = null;

  try {
    const p = await client.product.create({
      data: {
        name: "__ZZ_LISTED_QTY_TEST__",
        slug: "__zz-listed-qty-test__",
        categoryId: category.id,
        price: 70000,
        purchaseCost: 50000,
        stock: 0,
        status: "DRAFT",
      },
    });
    productId = p.id;

    // 100 units in, through the ledger — the only legitimate way stock rises.
    await client.$transaction((tx) =>
      recordMovement(tx, {
        productId: p.id,
        type: "OPENING",
        delta: 100,
        unitCost: 50000,
        reason: "listed-qty verification",
        actorName: "test-harness",
      }),
    );

    console.log(`\ntemp product #${p.id} — 100 units on hand via ledger\n`);

    // ══ THE SPEC TABLE, one isolated row at a time ════════════════════════
    //
    // Each row starts from the SAME clean slate — 100 on hand, 50 listed, no
    // open orders — because that is how the table is written. Running them as
    // one cumulative sequence (which an earlier version of this script did)
    // silently changes the question: by the time "admin -> 80" is reached, 50
    // units are already reserved, so 80 is legitimately refused and the row
    // appears to fail a rule it was never meant to test.
    console.log("\n════ SPEC TABLE (each row from a clean 100 / 50 / no orders) ════");

    // Row 1 — order 20 of 50 listed -> success
    await reset(p.id, 50);
    ok("[100 | 50 | order 20] accepted", await tryReserve(p.id, 20));

    // Row 2 — order EXACTLY the listed quantity -> success. The boundary: the
    // guard is `listedQty >= quantity`, so an off-by-one here would refuse a
    // customer buying precisely what is on offer.
    await reset(p.id, 50);
    ok("[100 | 50 | order 50] accepted exactly at the cap", await tryReserve(p.id, 50));
    {
      const s = await state(p.id);
      ok("  ↳ cap consumed to 0", s.listedQty === 0, `listedQty=${s.listedQty}`);
      ok("  ↳ 100 still physically on hand", s.stock === 100, `stock=${s.stock}`);
    }

    // Row 3 — one more than listed -> reject, even though 100 are on the shelf.
    await reset(p.id, 50);
    ok("[100 | 50 | order 51] rejected", !(await tryReserve(p.id, 51)));
    ok("  ↳ nothing reserved by the refused order", (await state(p.id)).reserved === 0);

    // Row 4 — sell 20, then try 31 of the 30 that remain -> reject.
    await reset(p.id, 50);
    ok("[100 | 50 | sell 20] accepted", await tryReserve(p.id, 20));
    ok("[100 | 50 | then order 31] rejected", !(await tryReserve(p.id, 31)));
    ok("  ↳ but 30 (the exact remainder) is accepted", await tryReserve(p.id, 30));

    // Row 5 — admin raises the cap to 80 with NO open orders. 80 <= 100 − 0, so
    // it is allowed and 80 units become buyable.
    await reset(p.id, 50);
    await setListedQuantities(p.id, [{ variantId: null, listedQty: 80 }]);
    {
      const s = await state(p.id);
      ok("[100 | 50 | admin -> 80] cap updated", s.listedQty === 80, `listedQty=${s.listedQty}`);
      ok("  ↳ 80 units now buyable", s.available === 80, `available=${s.available}`);
      ok("  ↳ physical stock untouched", s.stock === 100, `stock=${s.stock}`);
      ok("  ↳ an order of 80 now succeeds", await tryReserve(p.id, 80));
    }

    // Row 6 — admin reduces to 10. Safe: it limits future sales only.
    await reset(p.id, 50);
    ok("[100 | 50 | pre-existing order of 20]", await tryReserve(p.id, 20));
    await setListedQuantities(p.id, [{ variantId: null, listedQty: 10 }]);
    {
      const s = await state(p.id);
      ok("[100 | 50 | admin -> 10] cap lowered", s.listedQty === 10, `listedQty=${s.listedQty}`);
      ok("  ↳ the open order's 20 units are untouched", s.reserved === 20, `reserved=${s.reserved}`);
      ok("  ↳ only 10 more are buyable", s.available === 10, `available=${s.available}`);
      ok("  ↳ an 11th unit is refused", !(await tryReserve(p.id, 11)));
    }

    ok("spec table moved no stock", (await state(p.id)).stock === 100 && (await ledgerAgrees(p.id)));

    // Back to the state the cumulative scenarios below expect.
    await reset(p.id, null);
    console.log("\n════ LIFECYCLE SCENARIOS ════");

    // ── uncapped baseline ──────────────────────────────────────────────────
    console.log("Baseline (listedQty = null, uncapped)");
    ok("all 100 units sellable when uncapped", (await state(p.id)).available === 100,
      `available=${(await state(p.id)).available}`);

    // ── set the cap ────────────────────────────────────────────────────────
    await setListedQuantities(p.id, [{ variantId: null, listedQty: 50 }]);
    let s = await state(p.id);
    console.log("\nlistedQty = 50");
    ok("physical stock untouched by listing", s.stock === 100, `stock=${s.stock}`);
    ok("available capped to 50", s.available === 50, `available=${s.available}`);
    ok("ledger still agrees with stock", await ledgerAgrees(p.id));

    // ── 100 / 50 / order 20 -> success ─────────────────────────────────────
    console.log("\nScenario: physical 100, listed 50, order 20");
    ok("order of 20 accepted", await tryReserve(p.id, 20));
    s = await state(p.id);
    ok("stock still 100 (reserved, not shipped)", s.stock === 100, `stock=${s.stock}`);
    ok("reserved = 20", s.reserved === 20, `reserved=${s.reserved}`);
    ok("listedQty decremented to 30", s.listedQty === 30, `listedQty=${s.listedQty}`);
    ok("available = 30", s.available === 30, `available=${s.available}`);
    ok("ledger untouched by the reservation", await ledgerAgrees(p.id));

    // ── sold 20, now order 31 -> reject ────────────────────────────────────
    console.log("\nScenario: after selling 20, order 31 (only 30 listed)");
    ok("order of 31 rejected", !(await tryReserve(p.id, 31)));
    ok("state unchanged after rejection", (await state(p.id)).listedQty === 30);

    // ── exact boundary: order the remaining 30 -> success ──────────────────
    console.log("\nScenario: order exactly the remaining 30");
    ok("order of 30 accepted", await tryReserve(p.id, 30));
    s = await state(p.id);
    ok("listedQty now 0", s.listedQty === 0, `listedQty=${s.listedQty}`);
    ok("available now 0 despite 100 on the shelf", s.available === 0 && s.stock === 100,
      `stock=${s.stock} available=${s.available}`);
    ok("one more unit is refused", !(await tryReserve(p.id, 1)));

    // ── admin raises the cap ───────────────────────────────────────────────
    console.log("\nScenario: admin raises the cap to 30 (50 reserved, 100 on hand)");
    await setListedQuantities(p.id, [{ variantId: null, listedQty: 30 }]);
    s = await state(p.id);
    ok("available back to 30", s.available === 30, `available=${s.available}`);
    ok("stock still 100", s.stock === 100);

    // ── over-listing is refused, and names the true figure ─────────────────
    console.log("\nScenario: admin tries to list 120 of 100");
    let msg = "";
    try {
      await setListedQuantities(p.id, [{ variantId: null, listedQty: 120 }]);
    } catch (e) {
      msg = e instanceof ListingError ? e.message : `WRONG ERROR: ${(e as Error).message}`;
    }
    // 100 on hand − 50 reserved = 50 is the honest maximum here.
    ok("over-listing rejected", msg.startsWith("You only have 50"), `"${msg}"`);

    // ── reducing below reserved is safe ────────────────────────────────────
    console.log("\nScenario: admin reduces to 10 while 50 units are reserved");
    await setListedQuantities(p.id, [{ variantId: null, listedQty: 10 }]);
    s = await state(p.id);
    ok("reserved untouched — open orders still ship", s.reserved === 50, `reserved=${s.reserved}`);
    ok("available limited to 10", s.available === 10, `available=${s.available}`);
    ok("stock still 100", s.stock === 100);
    ok("ledger still agrees", await ledgerAgrees(p.id));

    // ── concurrency: two shoppers race for the last listed unit ────────────
    console.log("\nScenario: 2 concurrent orders race for the last listed unit");
    await setListedQuantities(p.id, [{ variantId: null, listedQty: 1 }]);
    const race = await Promise.all([tryReserve(p.id, 1), tryReserve(p.id, 1)]);
    ok("exactly one of two racing orders won", race.filter(Boolean).length === 1,
      `results=${JSON.stringify(race)}`);
    ok("listedQty floored at 0", (await state(p.id)).listedQty === 0);

    // ── cancel returns the allowance; shipping consumes it ─────────────────
    console.log("\nScenario: cancel credits the allowance back, shipping does not");
    const before = await state(p.id);
    const order = await client.order.create({
      data: {
        orderNo: `ZZTEST-${Date.now()}`,
        customerName: "test", customerPhone: "0", address: "test",
        subtotal: 0, deliveryCharge: 0, total: 0,
        items: { create: [{ productName: "t", unitPrice: 0, quantity: 5, productId: p.id }] },
      },
    });
    await client.$transaction((tx) => reserveUnits(tx, { productId: p.id, quantity: 5 }))
      .catch(() => false);
    await setListedQuantities(p.id, [{ variantId: null, listedQty: 5 }]);
    const beforeCancel = await state(p.id);
    await client.$transaction((tx) => releaseOrder(tx, order.id));
    const afterCancel = await state(p.id);
    ok("cancelling credits the allowance back",
      (afterCancel.listedQty ?? 0) === (beforeCancel.listedQty ?? 0) + 5,
      `${beforeCancel.listedQty} -> ${afterCancel.listedQty}`);
    ok("cancelling moved no stock", afterCancel.stock === before.stock && (await ledgerAgrees(p.id)));

    // Ship a fresh order and confirm the allowance is NOT credited back.
    const order2 = await client.order.create({
      data: {
        orderNo: `ZZTEST2-${Date.now()}`,
        customerName: "test", customerPhone: "0", address: "test",
        subtotal: 0, deliveryCharge: 0, total: 0,
        items: { create: [{ productName: "t", unitPrice: 0, quantity: 3, productId: p.id }] },
      },
    });
    await client.$transaction((tx) => reserveUnits(tx, { productId: p.id, quantity: 3 }));
    const beforeShip = await state(p.id);
    await client.$transaction((tx) => fulfilOrder(tx, order2.id, "test-harness"));
    const afterShip = await state(p.id);
    ok("shipping consumed the allowance (not credited back)",
      afterShip.listedQty === beforeShip.listedQty,
      `${beforeShip.listedQty} -> ${afterShip.listedQty}`);
    ok("shipping DID reduce physical stock", afterShip.stock === beforeShip.stock - 3,
      `${beforeShip.stock} -> ${afterShip.stock}`);
    ok("ledger recorded the sale and still agrees", await ledgerAgrees(p.id));

    // ── uncapping restores full availability ───────────────────────────────
    console.log("\nScenario: admin clears the cap (blank = unlimited)");
    await setListedQuantities(p.id, [{ variantId: null, listedQty: null }]);
    s = await state(p.id);
    ok("listedQty is null again", s.listedQty === null);
    ok("available = stock − reserved", s.available === s.stock - s.reserved,
      `stock=${s.stock} reserved=${s.reserved} available=${s.available}`);

    console.log(`\n${fail === 0 ? "ALL CHECKS PASSED" : "*** FAILURES ***"}  ${pass} passed, ${fail} failed`);
  } finally {
    if (productId) {
      await client.orderItem.deleteMany({ where: { productId } });
      await client.order.deleteMany({ where: { orderNo: { startsWith: "ZZTEST" } } });
      await client.stockMovement.deleteMany({ where: { productId } });
      await client.product.delete({ where: { id: productId } }).catch(() => {});
      console.log("cleanup: temp product, orders and movements removed.");
    }
  }
  if (fail > 0) process.exitCode = 1;
}

main().finally(() => client.$disconnect());
