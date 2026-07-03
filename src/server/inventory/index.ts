import { prisma } from "@/lib/prisma";
import { notifyBackInStock } from "@/server/products/stock-notify";

// Manual inventory corrections + low-stock reporting. Order-driven stock
// changes go through checkout/restock; this module is ONLY for hand
// adjustments, each of which is logged (who/when/delta/reason).

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

/**
 * Apply a signed stock delta to a product (or a specific variant) and record a
 * StockAdjustment audit row — atomically. Fires back-in-stock alerts if this
 * takes the product from out-of-stock to in-stock.
 */
export async function adjustStock(params: {
  productId: number;
  variantId?: number | null;
  delta: number;
  reason: string;
  adminName: string;
}): Promise<{ newStock: number }> {
  const { productId, variantId, delta, reason, adminName } = params;
  if (!Number.isInteger(delta) || delta === 0) {
    throw new InventoryError("Enter a non-zero whole number to add or remove.");
  }
  if (!reason.trim()) throw new InventoryError("A reason is required for a manual stock change.");

  const wasInStock = await productHasStock(productId);

  const newStock = await prisma.$transaction(async (tx) => {
    let current: number;
    if (variantId != null) {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
      if (!variant || variant.productId !== productId) {
        throw new InventoryError("Variant not found.");
      }
      current = variant.stock;
    } else {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new InventoryError("Product not found.");
      current = product.stock;
    }

    const next = current + delta;
    if (next < 0) throw new InventoryError(`Can't remove ${-delta} — only ${current} in stock.`);

    if (variantId != null) {
      await tx.productVariant.update({ where: { id: variantId }, data: { stock: next } });
    } else {
      await tx.product.update({ where: { id: productId }, data: { stock: next } });
    }

    await tx.stockAdjustment.create({
      data: { productId, variantId: variantId ?? null, delta, newStock: next, reason: reason.trim(), adminName },
    });
    return next;
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

export async function listStockHistory(productId: number, take = 30) {
  return prisma.stockAdjustment.findMany({
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
