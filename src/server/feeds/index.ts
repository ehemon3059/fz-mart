import { prisma } from "@/lib/prisma";
import { paisaToTaka } from "@/lib/money";
import { SITE_NAME, absoluteUrl, stripHtml, truncate } from "@/lib/seo";
import { primeSiteUrl } from "@/server/settings/site";
import { ancestorsOf } from "@/server/categories/tree";

// Product feed data for Facebook Catalog and Google Merchant. One normalized
// shape here; the two endpoints (CSV / XML) just serialise it differently.

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  /** "1199.00 BDT" */
  price: string;
  /** Present only when genuinely discounted. */
  salePrice: string | null;
  /** "in stock" | "out of stock" */
  available: boolean;
  brand: string;
  productType: string;
}

function priceString(paisa: number): string {
  return `${paisaToTaka(paisa).toFixed(2)} BDT`;
}

export async function getFeedItems(): Promise<FeedItem[]> {
  await primeSiteUrl(); // ensure absolute URLs use the admin-configured domain
  const [products, cats] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
        category: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ select: { id: true, parentId: true, name: true } }),
  ]);

  return products
    .filter((p) => p.images.length > 0) // feeds require an image
    .map((p) => {
      const hasVariants = p.variants.length > 0;
      // Feeds want the regular price in `price` and the reduced one in
      // `sale_price`. For variant products we advertise the lowest regular price
      // and, if any variant is on sale, the lowest effective (discounted) price.
      const regularBase = hasVariants ? Math.min(...p.variants.map((v) => v.price)) : p.price;
      const effectiveBase = hasVariants
        ? Math.min(...p.variants.map((v) => v.discountPrice ?? v.price))
        : p.discountPrice != null && p.discountPrice < p.price
          ? p.discountPrice
          : p.price;
      const hasDiscount = effectiveBase < regularBase;

      const inStock = hasVariants ? p.variants.some((v) => v.stock > 0) : p.stock > 0;

      const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
      const description =
        p.metaDescription ||
        (p.description ? truncate(stripHtml(p.description), 500) : `${p.name} — ${SITE_NAME}`);

      return {
        id: p.slug,
        title: truncate(p.name, 150),
        description,
        link: absoluteUrl(`/products/${p.slug}`),
        imageLink: absoluteUrl(primary.url),
        additionalImageLinks: p.images
          .filter((i) => i.id !== primary.id)
          .slice(0, 10)
          .map((i) => absoluteUrl(i.url)),
        // For a discounted item feeds expect the REGULAR price in `price` and
        // the reduced price in `sale_price`.
        price: priceString(regularBase),
        salePrice: hasDiscount ? priceString(effectiveBase) : null,
        available: inStock,
        brand: SITE_NAME,
        // Full category path, e.g. "Electronics > Network > Routers".
        productType: [...ancestorsOf(p.categoryId, cats).map((c) => c.name), p.category.name].join(
          " > ",
        ),
      };
    });
}

// ── Serialisers ──────────────────────────────────────────────────

function csvCell(value: string): string {
  // Quote and escape any cell containing a delimiter, quote, or newline.
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Facebook Catalog CSV — one row per product, header row first. */
export function buildFacebookCsv(items: FeedItem[]): string {
  const headers = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "sale_price",
    "link",
    "image_link",
    "additional_image_link",
    "brand",
    "google_product_category",
    "product_type",
  ];
  const rows = items.map((item) =>
    [
      item.id,
      item.title,
      item.description,
      item.available ? "in stock" : "out of stock",
      "new",
      item.price,
      item.salePrice ?? "",
      item.link,
      item.imageLink,
      item.additionalImageLinks.join(","),
      item.brand,
      "",
      item.productType,
    ]
      .map(csvCell)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Google Merchant RSS 2.0 feed with the g: product namespace. */
export function buildGoogleXml(items: FeedItem[]): string {
  const entries = items
    .map((item) => {
      const extra = item.additionalImageLinks
        .map((url) => `      <g:additional_image_link>${xmlEscape(url)}</g:additional_image_link>`)
        .join("\n");
      const sale = item.salePrice
        ? `\n      <g:sale_price>${xmlEscape(item.salePrice)}</g:sale_price>`
        : "";
      return `    <item>
      <g:id>${xmlEscape(item.id)}</g:id>
      <g:title>${xmlEscape(item.title)}</g:title>
      <g:description>${xmlEscape(item.description)}</g:description>
      <g:link>${xmlEscape(item.link)}</g:link>
      <g:image_link>${xmlEscape(item.imageLink)}</g:image_link>
${extra}
      <g:availability>${item.available ? "in_stock" : "out_of_stock"}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${xmlEscape(item.price)}</g:price>${sale}
      <g:brand>${xmlEscape(item.brand)}</g:brand>
      <g:product_type>${xmlEscape(item.productType)}</g:product_type>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(SITE_NAME)}</title>
    <link>${xmlEscape(absoluteUrl("/"))}</link>
    <description>${xmlEscape(`${SITE_NAME} product feed`)}</description>
${entries}
  </channel>
</rss>`;
}
