import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyBackInStock } from "@/server/products/stock-notify";
import { recordMovement, LedgerError } from "@/server/inventory/ledger";

// Manual inventory corrections + low-stock reporting. Order-driven stock
// changes go through checkout/restock; this module is ONLY for hand
// adjustments. Both kinds land in the same StockMovement ledger — see
// inventory/ledger.ts, which is the single writer for every stock change.

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

/**
 * Apply a signed stock delta to a product (or a specific variant) and record it
 * in the ledger — atomically. Fires back-in-stock alerts if this takes the
 * product from out-of-stock to in-stock.
 *
 * `type` separates a counting correction from a real loss: ADJUSTMENT means the
 * recorded number was simply wrong, DAMAGE means units physically ceased to
 * exist. Both change stock identically, but only DAMAGE is a cost — conflating
 * them makes write-offs invisible in the P&L.
 */
export async function adjustStock(params: {
  productId: number;
  variantId?: number | null;
  delta: number;
  reason: string;
  adminName: string;
  type?: "ADJUSTMENT" | "DAMAGE";
}): Promise<{ newStock: number }> {
  const { productId, variantId, delta, reason, adminName, type = "ADJUSTMENT" } = params;
  if (!Number.isInteger(delta) || delta === 0) {
    throw new InventoryError("Enter a non-zero whole number to add or remove.");
  }
  if (!reason.trim()) throw new InventoryError("A reason is required for a manual stock change.");

  const wasInStock = await productHasStock(productId);

  const newStock = await prisma.$transaction(async (tx) => {
    // Validate the variant belongs to this product before moving anything —
    // recordMovement trusts the ids it is given.
    if (variantId != null) {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { productId: true },
      });
      if (!variant || variant.productId !== productId) {
        throw new InventoryError("Variant not found.");
      }
    } else {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });
      if (!product) throw new InventoryError("Product not found.");
    }

    // A write-off is valued at what the units cost; a counting correction has
    // no cost basis, so it carries none.
    const unitCost = type === "DAMAGE" ? await resolveUnitCost(tx, productId, variantId) : null;

    try {
      return await recordMovement(tx, {
        productId,
        variantId,
        type,
        delta,
        unitCost,
        reason,
        actorName: adminName,
      });
    } catch (err) {
      // Translate the ledger's guard into the message this admin form shows.
      if (err instanceof LedgerError) {
        throw new InventoryError(`Can't remove ${-delta} — not enough stock on hand.`);
      }
      throw err;
    }
  });

  if (!wasInStock && (await productHasStock(productId))) {
    notifyBackInStock(productId).catch((e) => console.error("[inventory] restock notify failed:", e));
  }

  return { newStock };
}

async function productHasStock(productId: number): Promise<boolean> {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, variants: { select: { stock: true } } },
  });
  if (!p) return false;
  return p.stock > 0 || p.variants.some((v) => v.stock > 0);
}

/**
 * Current sourcing cost for the stock row being moved, in paisa.
 *
 * Mirrors checkout's rule (see createOrder): a variant's own cost wins, and 0
 * means "inherit the product's". Null when neither carries one, so a valuation
 * can tell "cost unknown" from "cost is zero".
 */
async function resolveUnitCost(
  tx: Prisma.TransactionClient,
  productId: number,
  variantId?: number | null,
): Promise<number | null> {
  if (variantId != null) {
    const v = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { purchaseCost: true, product: { select: { purchaseCost: true } } },
    });
    const cost = v?.purchaseCost || v?.product.purchaseCost;
    return cost || null;
  }
  const p = await tx.product.findUnique({
    where: { id: productId },
    select: { purchaseCost: true },
  });
  return p?.purchaseCost || null;
}

/** Recent ledger entries for one product — every kind of movement, newest first. */
export async function listStockHistory(productId: number, take = 30) {
  return prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { id: "desc" },
    take,
  });
}

export interface LowStockRow {
  id: number;
  name: string;
  slug: string;
  stock: number;
  lowStockThreshold: number;
}

/** Active products at or below their (nonzero) low-stock threshold, worst first. */
export async function getLowStockProducts(): Promise<LowStockRow[]> {
  const rows = await prisma.$queryRaw<LowStockRow[]>`
    SELECT id, name, slug, stock, lowStockThreshold
    FROM Product
    WHERE status = 'ACTIVE'
      AND lowStockThreshold > 0
      AND stock <= lowStockThreshold
    ORDER BY stock ASC, name ASC
    LIMIT 100
  `;
  return rows;
}
