import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { primeSiteUrl } from "@/server/settings/site";

// Served at /robots.txt. Blocks crawlers from account/checkout/admin and the
// filterable search results (infinite URL space), and points them at the
// sitemap.
export default async function robots(): Promise<MetadataRoute.Robots> {
  await primeSiteUrl();
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/checkout", "/cart", "/login", "/order-confirmation", "/payment", "/search"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
