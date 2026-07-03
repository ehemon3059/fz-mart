import { prisma } from "@/lib/prisma";
import type { CheckoutItemInput } from "@/server/orders/createOrder";

// Authoritative server-side cart subtotal (paisa) from a set of cart lines.
// Used by the coupon preview so the discount is computed against REAL prices,
// never the client-submitted ones — mirrors the price selection in
// createOrder.ts (variant price wins; else discountPrice when genuinely lower).
export async function cartSubtotalPaisa(items: CheckoutItemInput[]): Promise<number> {
  if (items.length === 0) return 0;
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, status: "ACTIVE" },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || item.quantity <= 0) continue;
    if (product.variants.length > 0) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (variant) subtotal += variant.price * item.quantity;
    } else {
      const unit =
        product.discountPrice != null && product.discountPrice < product.price
          ? product.discountPrice
          : product.price;
      subtotal += unit * item.quantity;
    }
  }
  return subtotal;
}
