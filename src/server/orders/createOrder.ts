import { Prisma, type PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOrderNo } from "./orderNo";
import { redeemCoupon, type CouponCartLine } from "@/server/coupons";
import { lineageIds } from "@/server/categories/tree";
import { reserveUnits } from "@/server/inventory/reservations";
import { resolveDeliveryLocation, LocationError } from "@/server/settings/locations";

// Checkout is the riskiest code in the app. Everything the browser sends
// (price, product name, displayed totals) is for UI only — this function
// re-fetches price and stock from the database and is the sole authority on
// what gets charged and reserved.

export interface CheckoutItemInput {
  productId: number;
  /** Chosen size/option — required when the product has variants. */
  variantId?: number | null;
  quantity: number;
}

export interface CreateOrderInput {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  customerNote?: string;
  /**
   * The delivery location the customer picked. The charge is NOT taken from
   * here — it is re-resolved server-side from these ids (upazila → district →
   * division → fallback zone), so a client that fakes a cheap zone still pays
   * the rate its real location maps to.
   */
  divisionId: number;
  districtId: number;
  upazilaId?: number | null;
  items: CheckoutItemInput[];
  /**
   * COD (default) starts the order at PENDING. ONLINE/PARTIAL start at
   * PENDING_PAYMENT: stock is reserved by the same atomic decrement, and the
   * payment webhook (or the expiry job) decides whether the order becomes
   * real or the reservation is released.
   */
  paymentMethod?: PaymentMethod;
  /** Optional coupon code; re-validated + redeemed inside the checkout txn. */
  couponCode?: string;
  /** Facebook click identifiers captured client-side, for later CAPI matching. */
  fbp?: string | null;
  fbc?: string | null;
  /** First-touch marketing attribution (Google/TikTok/etc.) for ROAS/CAC. */
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

const ORDER_NO_MAX_ATTEMPTS = 5;

export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new CheckoutError("Cart is empty.");
  }

  return prisma.$transaction(async (tx) => {
    // Resolved inside the transaction so the charge written to the order is the
    // one live at write time, not the one the page rendered minutes ago.
    let location;
    try {
      location = await resolveDeliveryLocation(
        {
          divisionId: input.divisionId,
          districtId: input.districtId,
          upazilaId: input.upazilaId ?? null,
        },
        tx,
      );
    } catch (err) {
      if (err instanceof LocationError) throw new CheckoutError(err.message);
      throw err;
    }

    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
      include: { variants: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    // Category lineage (product node + ancestors) for CATEGORY-scoped coupons.
    const cats = await tx.category.findMany({ select: { id: true, parentId: true } });

    let subtotal = 0;
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
    // Per-line data for coupon scoping (category/product coupons discount only
    // the eligible lines). Built here from authoritative prices, not the client.
    const couponLines: CouponCartLine[] = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new CheckoutError(`A product in your cart is no longer available.`);
      }
      if (item.quantity <= 0) {
        throw new CheckoutError(`Invalid quantity for ${product.name}.`);
      }

      const hasVariants = product.variants.length > 0;

      if (hasVariants) {
        // Sized/colour product: a valid variant MUST be chosen, and that
        // variant's own price + stock are authoritative for the line.
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new CheckoutError(`Please choose an option for ${product.name}.`);
        }
        // Combine the chosen colour + size into one human label, e.g. "Navy / M".
        const variantLabel = [variant.colorName, variant.size].filter(Boolean).join(" / ");
        const labelSuffix = variantLabel ? ` (${variantLabel})` : "";

        // Availability, not raw stock: units promised to other unshipped orders
        // are on the shelf but not sellable.
        const variantAvailable = variant.stock - variant.reserved;
        if (variantAvailable < item.quantity) {
          throw new CheckoutError(
            `${product.name}${labelSuffix} only has ${Math.max(0, variantAvailable)} unit(s) left in stock.`,
          );
        }

        // Honor a variant sale price when set (and below the regular price);
        // this is the sole authority on what's charged, never the client value.
        const unitPrice =
          variant.discountPrice != null && variant.discountPrice < variant.price
            ? variant.discountPrice
            : variant.price;
        subtotal += unitPrice * item.quantity;
        couponLines.push({
          productId: product.id,
          categoryIds: lineageIds(product.categoryId, cats),
          lineTotal: unitPrice * item.quantity,
        });
        orderItemsData.push({
          productId: product.id,
          variantId: variant.id,
          variantLabel: variantLabel || null,
          // Bake the option into the snapshot name so every order view (emails,
          // admin, confirmation) shows it without extra plumbing.
          productName: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
          unitPrice,
          // Snapshot the sourcing cost for COGS. A variant may carry its own
          // cost; 0 means "inherit the product's" (see schema), so fall back.
          purchaseCost: variant.purchaseCost || product.purchaseCost,
          quantity: item.quantity,
        });

        // Atomic conditional RESERVATION on the variant row. The units stay on
        // the shelf — they leave only when the parcel ships — but no other
        // shopper can claim them. Same anti-oversell guarantee as the old
        // decrement: the predicate is evaluated at write time, so of two racing
        // checkouts for the last unit exactly one succeeds.
        const reserved = await reserveUnits(tx, {
          productId: product.id,
          variantId: variant.id,
          quantity: item.quantity,
        });
        if (!reserved) {
          throw new CheckoutError(
            `${product.name}${labelSuffix} just sold out. Please update your cart.`,
          );
        }
        continue;
      }

      // Unsized product: original product-level price + stock path.
      const available = product.stock - product.reserved;
      if (available < item.quantity) {
        throw new CheckoutError(
          `${product.name} only has ${Math.max(0, available)} unit(s) left in stock.`,
        );
      }

      // Re-verify price server-side — never trust a client-submitted price.
      const unitPrice =
        product.discountPrice != null && product.discountPrice < product.price
          ? product.discountPrice
          : product.price;

      subtotal += unitPrice * item.quantity;
      couponLines.push({
        productId: product.id,
        categoryIds: lineageIds(product.categoryId, cats),
        lineTotal: unitPrice * item.quantity,
      });
      orderItemsData.push({
        productId: product.id,
        // Snapshot name + price now — historical orders must never change
        // when products are later edited or deleted.
        productName: product.name,
        unitPrice,
        // Snapshot the sourcing cost now — the COGS basis for this line.
        purchaseCost: product.purchaseCost,
        quantity: item.quantity,
      });

      // Atomic, conditional reservation: fails if availability dropped below
      // the requested quantity between the read above and this write, which is
      // exactly the race that causes overselling on the last unit.
      const reserved = await reserveUnits(tx, {
        productId: product.id,
        quantity: item.quantity,
      });
      if (!reserved) {
        throw new CheckoutError(
          `${product.name} just sold out. Please update your cart.`,
        );
      }
    }

    const deliveryCharge = location.charge;
    const baseTotal = subtotal + deliveryCharge;
    const paymentMethod = input.paymentMethod ?? "COD";
    const initialStatus = paymentMethod === "COD" ? "PENDING" : "PENDING_PAYMENT";

    let created: Prisma.OrderGetPayload<{ include: { items: true } }> | null = null;
    let lastError: unknown;
    for (let attempt = 0; attempt < ORDER_NO_MAX_ATTEMPTS; attempt++) {
      const orderNo = generateOrderNo();
      try {
        created = await tx.order.create({
          data: {
            orderNo,
            customerId: input.customerId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            customerEmail: input.customerEmail || null,
            address: input.address,
            customerNote: input.customerNote || null,
            fbp: input.fbp || null,
            fbc: input.fbc || null,
            utmSource: input.utmSource || null,
            utmMedium: input.utmMedium || null,
            utmCampaign: input.utmCampaign || null,
            shippingZoneId: location.zoneId,
            divisionName: location.divisionName,
            districtName: location.districtName,
            upazilaName: location.upazilaName,
            deliveryCharge,
            subtotal,
            total: baseTotal,
            paymentMethod,
            status: initialStatus,
            items: { createMany: { data: orderItemsData } },
            // Seed the audit trail so the timeline starts at "order placed".
            statusLogs: { create: { toStatus: initialStatus, changedBy: null } },
          },
          include: { items: true },
        });
        break;
      } catch (err) {
        // Unique constraint collision on orderNo — extremely rare, retry.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    if (!created) {
      throw lastError instanceof Error
        ? lastError
        : new CheckoutError("Could not generate a unique order number.");
    }

    // Coupon: re-validate + redeem atomically inside this transaction, then
    // fold the snapshotted discount into the order total. A limit hit here
    // rolls back the whole checkout (no half-placed order).
    if (input.couponCode) {
      const { code, discount } = await redeemCoupon(
        tx,
        input.couponCode,
        couponLines,
        created.id,
        input.customerPhone,
        input.customerId ?? null,
      );
      created = await tx.order.update({
        where: { id: created.id },
        data: { couponCode: code, couponDiscount: discount, total: baseTotal - discount },
        include: { items: true },
      });
    }

    // No ledger row here. Checkout RESERVES units; it does not move them off
    // the shelf, and the ledger records stock changes only. The SALE is written
    // when the order ships (see inventory/reservations.ts → fulfilOrder), which
    // is the moment `stock` actually falls.

    return created;
  },
  // Coupon redemption takes a row lock on the Coupon, so concurrent checkouts
  // using one coupon queue up. Prisma's default 2s maxWait rejects with P2028
  // under that burst; give the queue room rather than failing real orders.
  { maxWait: 8000, timeout: 15000 });
}
