import { prisma } from "@/lib/prisma";
import type { CheckoutItemInput } from "@/server/orders/createOrder";
import type { CouponCartLine } from "@/server/coupons";

// Authoritative server-side cart pricing (paisa) from a set of cart lines,
// used by the coupon preview so discounts are computed against REAL prices,
// never the client-submitted ones — mirrors the price selection in
// createOrder.ts (variant price wins; else discountPrice when genuinely lower).

/**
 * Turn client cart items into coupon cart lines: each with its authoritative
 * line total AND the top-level categoryId (via subcategory → category), so the
 * coupon engine can scope discounts to a category or a single product.
 */
export async function cartLinesForCoupon(
  items: CheckoutItemInput[],
): Promise<CouponCartLine[]> {
  if (items.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, status: "ACTIVE" },
    include: { variants: true, subcategory: { select: { categoryId: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: CouponCartLine[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || item.quantity <= 0) continue;

    let lineTotal = 0;
    if (product.variants.length > 0) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) continue;
      lineTotal = variant.price * item.quantity;
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
      categoryId: product.subcategory.categoryId,
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
