import { SITE_NAME, absoluteUrl, siteUrl } from "@/lib/seo";
import { paisaToTaka } from "@/lib/money";

// Builders for schema.org JSON-LD. Kept as plain-object factories (no JSX) so
// they're easy to unit-test and reuse between pages and the <JsonLd> tag.

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(),
    logo: absoluteUrl("/icon.png"),
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path; omit for the current (last) crumb. */
  path?: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export interface ProductJsonLdInput {
  name: string;
  slug: string;
  description: string;
  images: string[];
  /** Effective (display) price in paisa. */
  pricePaisa: number;
  inStock: boolean;
  rating?: { average: number; count: number } | null;
}

export function productJsonLd(input: ProductJsonLdInput) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.images.map((src) => absoluteUrl(src)),
    sku: input.slug,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${input.slug}`),
      priceCurrency: "BDT",
      price: paisaToTaka(input.pricePaisa).toFixed(2),
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  if (input.rating && input.rating.count > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating.average.toFixed(1),
      reviewCount: input.rating.count,
    };
  }
  return data;
}
