import { prisma } from "@/lib/prisma";
import type { CheckoutItemInput } from "@/server/orders/createOrder";
import type { CouponCartLine } from "@/server/coupons";
import { lineageIds } from "@/server/categories/tree";

// Authoritative server-side cart pricing (paisa) from a set of cart lines,
// used by the coupon preview so discounts are computed against REAL prices,
// never the client-submitted ones — mirrors the price selection in
// createOrder.ts (a variant's own sale price wins, else its regular price; for
// unsized products, the product discountPrice when genuinely lower).

/**
 * Turn client cart items into coupon cart lines: each with its authoritative
 * line total AND its full category lineage (node + ancestors), so the coupon
 * engine can scope discounts to any category level or a single product.
 */
export async function cartLinesForCoupon(
  items: CheckoutItemInput[],
): Promise<CouponCartLine[]> {
  if (items.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, status: "ACTIVE" },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  // Category lineage for CATEGORY-scoped coupons (product node + ancestors).
  const cats = await prisma.category.findMany({ select: { id: true, parentId: true } });

  const lines: CouponCartLine[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || item.quantity <= 0) continue;

    let lineTotal = 0;
    if (product.variants.length > 0) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) continue;
      const unit =
        variant.discountPrice != null && variant.discountPrice < variant.price
          ? variant.discountPrice
          : variant.price;
      lineTotal = unit * item.quantity;
    } else {
      const unit =
        product.discountPrice != null && product.discountPrice < product.price
          ? product.discountPrice
          : product.price;
      lineTotal = unit * item.quantity;
    }
    if (lineTotal <= 0) continue;

    lines.push({
      productId: product.id,
      categoryIds: lineageIds(product.categoryId, cats),
      lineTotal,
    });
  }
  return lines;
}

/** Convenience: full cart subtotal (paisa) from the coupon lines. */
export async function cartSubtotalPaisa(items: CheckoutItemInput[]): Promise<number> {
  const lines = await cartLinesForCoupon(items);
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}
