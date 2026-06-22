import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOrderNo } from "./orderNo";

// Checkout is the riskiest code in the app. Everything the browser sends
// (price, product name, displayed totals) is for UI only — this function
// re-fetches price and stock from the database and is the sole authority on
// what gets charged and reserved.

export interface CheckoutItemInput {
  productId: number;
  quantity: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  shippingZoneId: number;
  items: CheckoutItemInput[];
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
    const zone = await tx.shippingZone.findUnique({
      where: { id: input.shippingZoneId, isActive: true },
    });
    if (!zone) {
      throw new CheckoutError("Selected delivery zone is no longer available.");
    }

    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new CheckoutError(`A product in your cart is no longer available.`);
      }
      if (item.quantity <= 0) {
        throw new CheckoutError(`Invalid quantity for ${product.name}.`);
      }
      if (product.stock < item.quantity) {
        throw new CheckoutError(
          `${product.name} only has ${product.stock} unit(s) left in stock.`,
        );
      }

      // Re-verify price server-side — never trust a client-submitted price.
      const unitPrice =
        product.discountPrice != null && product.discountPrice < product.price
          ? product.discountPrice
          : product.price;

      subtotal += unitPrice * item.quantity;
      orderItemsData.push({
        productId: product.id,
        // Snapshot name + price now — historical orders must never change
        // when products are later edited or deleted.
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
      });

      // Atomic, conditional decrement: fails (0 rows) if stock dropped below
      // the requested quantity between the read above and this write, which
      // is exactly the race that causes overselling on the last unit.
      const decremented = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (decremented.count === 0) {
        throw new CheckoutError(
          `${product.name} just sold out. Please update your cart.`,
        );
      }
    }

    const deliveryCharge = zone.charge;
    const total = subtotal + deliveryCharge;

    let lastError: unknown;
    for (let attempt = 0; attempt < ORDER_NO_MAX_ATTEMPTS; attempt++) {
      const orderNo = generateOrderNo();
      try {
        const order = await tx.order.create({
          data: {
            orderNo,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            customerEmail: input.customerEmail || null,
            address: input.address,
            shippingZoneId: zone.id,
            deliveryCharge,
            subtotal,
            total,
            status: "PENDING",
            items: { createMany: { data: orderItemsData } },
          },
          include: { items: true },
        });
        return order;
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
    throw lastError instanceof Error
      ? lastError
      : new CheckoutError("Could not generate a unique order number.");
  });
}
