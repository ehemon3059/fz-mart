import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordMovement, LedgerError } from "./ledger";

// ─────────────────────────────────────────────────────────────
// Stock-take sessions
// ─────────────────────────────────────────────────────────────
//
// Counting the shelves, then applying what you found.
//
// The admin could already correct one product at a time from the Stock panel,
// so why a session? Because a count is only trustworthy as a SNAPSHOT. A
// session lets someone walk the shop scanning, see every variance together
// before anything moves, and apply the lot as one reviewable act attributable
// to one person and one moment — instead of thirty scattered adjustments that
// nobody can later tell apart from a mistake.
//
// THE RULE THAT MATTERS AT COMMIT: the adjustment is computed against the LIVE
// stock level, not against the expectedQty captured when the line was added.
// Stock moves while a count is in progress — an order ships, a delivery
// arrives — and adjusting to a stale expectation would silently undo those.
// expectedQty is kept for the human reviewing the sheet, never for the maths.

export class StockTakeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockTakeError";
  }
}

/** Next "ST-0007". Sequential per shop, generated inside the transaction. */
async function nextReference(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.stockTake.findFirst({
    orderBy: { id: "desc" },
    select: { reference: true },
  });
  const n = last ? Number(last.reference.replace(/\D/g, "")) + 1 : 1;
  return `ST-${String(Number.isFinite(n) ? n : 1).padStart(4, "0")}`;
}

export async function createStockTake(input: {
  locationId?: number | null;
  note?: string | null;
  actorName: string;
}) {
  return prisma.$transaction(async (tx) => {
    return tx.stockTake.create({
      data: {
        reference: await nextReference(tx),
        locationId: input.locationId ?? null,
        note: input.note?.trim() || null,
        actorName: input.actorName,
      },
    });
  });
}

export async function listStockTakes() {
  return prisma.stockTake.findMany({
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    include: {
      location: { select: { name: true } },
      _count: { select: { lines: true } },
    },
  });
}

export async function getStockTake(id: number) {
  return prisma.stockTake.findUnique({
    where: { id },
    include: {
      location: true,
      lines: { orderBy: { id: "asc" } },
    },
  });
}

async function assertOpen(tx: Prisma.TransactionClient, id: number) {
  const take = await tx.stockTake.findUnique({ where: { id }, select: { status: true } });
  if (!take) throw new StockTakeError("Stock-take not found.");
  if (take.status !== "OPEN") {
    throw new StockTakeError("This stock-take is closed. Start a new one to count again.");
  }
}

/**
 * Add a counted row, or update the count if it is already on the sheet.
 *
 * Scanning the same barcode twice is normal — someone recounts a shelf — so the
 * second scan REPLACES the count rather than adding a second line to argue
 * with. The unique index on (session, product, variant) makes that structural
 * rather than a convention.
 */
export async function countLine(input: {
  stockTakeId: number;
  productId: number;
  variantId?: number | null;
  countedQty: number;
  note?: string | null;
}) {
  const { stockTakeId, productId, variantId = null, countedQty } = input;
  // Guarded here as well as in the form, because this is where the damage
  // would land: a count of 0 writes an item's entire stock off at commit, so a
  // malformed value must never be coerced into one. `Number.isInteger` already
  // rejects NaN and Infinity; the explicit typeof keeps a stringified number
  // from a hand-made request from ever reaching the coercion.
  if (typeof countedQty !== "number" || !Number.isInteger(countedQty) || countedQty < 0) {
    throw new StockTakeError("A count must be zero or a positive whole number.");
  }

  return prisma.$transaction(async (tx) => {
    await assertOpen(tx, stockTakeId);

    // Snapshot what the system believes right now, plus the labels, so the
    // sheet reads correctly even if the product is renamed mid-count.
    let expectedQty = 0;
    let productName = "";
    let variantLabel: string | null = null;

    if (variantId != null) {
      const v = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: {
          stock: true,
          size: true,
          colorName: true,
          productId: true,
          product: { select: { name: true } },
        },
      });
      if (!v || v.productId !== productId) throw new StockTakeError("Option not found.");
      expectedQty = v.stock;
      productName = v.product.name;
      variantLabel = [v.colorName, v.size].filter(Boolean).join(" / ") || null;
    } else {
      const p = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true, name: true, variants: { select: { id: true }, take: 1 } },
      });
      if (!p) throw new StockTakeError("Product not found.");
      if (p.variants.length > 0) {
        throw new StockTakeError(
          "This product is sold by option — count each option rather than the product.",
        );
      }
      expectedQty = p.stock;
      productName = p.name;
    }

    // Find-then-write rather than upsert(). The unique index covers a NULLABLE
    // variantId, and MySQL treats every NULL as distinct — so it does NOT stop
    // a second product-level line for the same product, and Prisma won't accept
    // a null inside a compound-unique lookup either. Matching explicitly is
    // both correct for those rows and safe here: this runs in a transaction,
    // and one person is holding the scanner.
    const existing = await tx.stockTakeLine.findFirst({
      where: { stockTakeId, productId, variantId },
      select: { id: true },
    });

    if (existing) {
      // A recount replaces the figure. expectedQty is refreshed too, so the
      // variance shown always compares like with like.
      return tx.stockTakeLine.update({
        where: { id: existing.id },
        data: { countedQty, expectedQty, note: input.note?.trim() || null },
      });
    }

    return tx.stockTakeLine.create({
      data: {
        stockTakeId,
        productId,
        variantId,
        productName,
        variantLabel,
        expectedQty,
        countedQty,
        note: input.note?.trim() || null,
      },
    });
  });
}

export async function removeLine(stockTakeId: number, lineId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertOpen(tx, stockTakeId);
    await tx.stockTakeLine.deleteMany({ where: { id: lineId, stockTakeId } });
  });
}

export interface CommitSummary {
  /** Lines that moved stock. */
  applied: number;
  /** Counted lines that already agreed with the shelf. */
  unchanged: number;
  /** Net units added (positive) or written off (negative). */
  netUnits: number;
  /** Lines that could not be applied, with why. */
  failures: { label: string; reason: string }[];
}

/**
 * Apply the count: every variance becomes an ADJUSTMENT movement.
 *
 * ADJUSTMENT rather than DAMAGE even when units are missing, because a
 * stock-take establishes that the count was wrong — it does not establish that
 * anything was broken. Shrinkage that is known to be breakage should be written
 * off explicitly from the Stock panel, where it carries a cost.
 *
 * Each line commits in its own transaction: one bad row (a variant deleted
 * mid-count) must not roll back an afternoon of counting. Failures are
 * reported, not swallowed.
 *
 * The session is claimed (OPEN -> COMMITTING) before any line is applied, so
 * the whole commit is exclusive: a concurrent count, removal, cancel or second
 * commit is refused for its duration rather than interleaving with it.
 */
export async function commitStockTake(id: number, actorName: string): Promise<CommitSummary> {
  const take = await prisma.stockTake.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!take) throw new StockTakeError("Stock-take not found.");
  if (take.status !== "OPEN") throw new StockTakeError("This stock-take has already been closed.");

  if (!take.lines.some((l) => l.countedQty != null)) {
    throw new StockTakeError("Nothing has been counted yet.");
  }

  // CLAIM THE SESSION BEFORE APPLYING ANYTHING.
  //
  // The check above is only advisory — it reads outside any transaction, so on
  // its own it races. This conditional update is the real gate: exactly one
  // caller can move a session out of OPEN, so a second commit fired from a
  // double-clicked button loses here and applies nothing.
  //
  // Claiming also shuts the door on writes for the duration. countLine and
  // removeLine both go through assertOpen, which demands OPEN — so once the
  // status is COMMITTING they are rejected by a guard that already existed.
  // Without this, a line counted during the loop was written and then closed
  // out unapplied, and a cancel during the loop was overwritten back to a
  // committed state.
  const claimed = await prisma.stockTake.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "COMMITTING" },
  });
  if (claimed.count === 0) {
    throw new StockTakeError("This stock-take has already been closed.");
  }

  // Re-read the lines now the session is sealed. The set read above could have
  // grown or shrunk between that read and the claim, and applying a stale set
  // would silently drop a line someone counted seconds before hitting Apply.
  const counted = (await prisma.stockTakeLine.findMany({ where: { stockTakeId: id } })).filter(
    (l) => l.countedQty != null,
  );

  const summary: CommitSummary = { applied: 0, unchanged: 0, netUnits: 0, failures: [] };

  // Anything thrown from here on must release the claim, or the session is
  // sealed in COMMITTING with no way back to counting. Per-line failures are
  // caught inside the loop and reported; this is the backstop for the rest.
  try {
    for (const line of counted) {
      const label = [line.productName, line.variantLabel].filter(Boolean).join(" — ");
      try {
        const moved = await prisma.$transaction(async (tx) => {
          // Live level, NOT line.expectedQty — see the note at the top of this
          // file. A sale that shipped during the count must survive it.
          const current =
            line.variantId != null
              ? await tx.productVariant.findUnique({
                  where: { id: line.variantId },
                  select: { stock: true },
                })
              : await tx.product.findUnique({
                  where: { id: line.productId },
                  select: { stock: true },
                });
          if (!current) throw new StockTakeError("The product or option no longer exists.");

          const delta = line.countedQty! - current.stock;
          if (delta === 0) return 0;

          await recordMovement(tx, {
            productId: line.productId,
            variantId: line.variantId,
            type: "ADJUSTMENT",
            delta,
            // A counting correction has no cost basis of its own — the units were
            // always there (or never were), so nothing was bought or lost today.
            unitCost: null,
            reason: `${take.reference}${line.note ? ` · ${line.note}` : ""}`,
            actorName,
            locationId: take.locationId,
          });
          return delta;
        });

        if (moved === 0) summary.unchanged++;
        else {
          summary.applied++;
          summary.netUnits += moved;
        }
      } catch (err) {
        const reason =
          err instanceof LedgerError || err instanceof StockTakeError
            ? err.message
            : "Could not be applied.";
        summary.failures.push({ label, reason });
      }
    }

    // Closed even when some lines failed: the count happened, and its outcome —
    // including what could not be applied — is the record. Re-counting the
    // failures belongs in a new session, not a half-open old one.
    //
    // Conditional on still holding the claim, so this can only ever close the
    // session it opened — it can never force a COMMITTED over some other state.
    await prisma.stockTake.updateMany({
      where: { id, status: "COMMITTING" },
      data: { status: "COMMITTED", committedAt: new Date() },
    });
  } catch (err) {
    // Hand the session back so the count is not lost. Only ever releases a
    // claim this call still holds.
    await prisma.stockTake.updateMany({
      where: { id, status: "COMMITTING" },
      data: { status: "OPEN" },
    });
    throw err;
  }

  return summary;
}

/**
 * Abandon a count. The lines are kept: someone spent an afternoon producing
 * them, and "we counted and decided not to act" is itself worth having.
 */
export async function cancelStockTake(id: number): Promise<void> {
  const updated = await prisma.stockTake.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 0) throw new StockTakeError("Only an open stock-take can be cancelled.");
}
