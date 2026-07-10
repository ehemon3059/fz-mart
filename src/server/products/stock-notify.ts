import { prisma } from "@/lib/prisma";
import { enqueueMailJob, enqueueSmsJob } from "@/jobs/enqueue";
import { absoluteUrl } from "@/lib/seo";
import { primeSiteUrl } from "@/server/settings/site";

// "Notify me when back in stock" subscriptions + the restock fan-out.

export class StockNotifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockNotifyError";
  }
}

const PHONE_RE = /^01[3-9]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeStockNotification(params: {
  productId: number;
  variantId?: number | null;
  email?: string | null;
  phone?: string | null;
  customerId?: string | null;
}): Promise<void> {
  const email = params.email?.trim() || null;
  const phone = params.phone?.trim() || null;
  if (!email && !phone) {
    throw new StockNotifyError("Enter an email or phone number to be notified.");
  }
  if (email && !EMAIL_RE.test(email)) throw new StockNotifyError("Enter a valid email address.");
  if (phone && !PHONE_RE.test(phone)) throw new StockNotifyError("Enter a valid phone number.");

  // De-dupe: don't stack multiple pending subscriptions for the same contact.
  const existing = await prisma.stockNotification.findFirst({
    where: {
      productId: params.productId,
      variantId: params.variantId ?? null,
      notifiedAt: null,
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) as object[],
    },
  });
  if (existing) return;

  await prisma.stockNotification.create({
    data: {
      productId: params.productId,
      variantId: params.variantId ?? null,
      email,
      phone,
      customerId: params.customerId ?? null,
    },
  });
}

/** True when a product has any sellable stock (product-level or any variant). */
export async function productInStock(productId: number): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, variants: { select: { stock: true } } },
  });
  if (!product) return false;
  return product.stock > 0 || product.variants.some((v) => v.stock > 0);
}

/**
 * Fan out back-in-stock alerts for a product: queue an email and/or SMS to
 * every pending subscriber, then mark them notified so a future restock
 * doesn't spam them. Fire-and-forget from the admin save path.
 */
export async function notifyBackInStock(productId: number): Promise<void> {
  const [product, subs] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { name: true, slug: true } }),
    prisma.stockNotification.findMany({ where: { productId, notifiedAt: null } }),
  ]);
  if (!product || subs.length === 0) return;

  await primeSiteUrl(); // notification link must use the admin-configured domain
  const productUrl = absoluteUrl(`/products/${product.slug}`);
  for (const sub of subs) {
    if (sub.email) {
      await enqueueMailJob({
        type: "back-in-stock",
        to: sub.email,
        productName: product.name,
        productUrl,
      }).catch((e) => console.error("[stock-notify] mail enqueue failed:", e));
    }
    if (sub.phone) {
      await enqueueSmsJob({
        type: "back-in-stock",
        to: sub.phone,
        message: `${product.name} is back in stock at FZ Mart: ${productUrl}`,
      }).catch((e) => console.error("[stock-notify] sms enqueue failed:", e));
    }
  }

  await prisma.stockNotification.updateMany({
    where: { productId, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
}
