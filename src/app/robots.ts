import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Served at /robots.txt. Blocks crawlers from account/checkout/admin and the
// filterable search results (infinite URL space), and points them at the
// sitemap.
export default function robots(): MetadataRoute.Robots {
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
