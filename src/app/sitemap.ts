import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { siteUrl } from "@/lib/seo";
import { primeSiteUrl } from "@/server/settings/site";

// Served at /sitemap.xml. Auto-updating: regenerated from the DB, cached in
// Redis for an hour so a crawler hit doesn't scan the whole catalogue every
// time. New/edited products appear within the TTL without any manual step.
const SITEMAP_TTL_SECONDS = 60 * 60;

export const dynamic = "force-dynamic";

interface Entry {
  url: string;
  lastModified: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await primeSiteUrl();
  const base = siteUrl();

  const entries = await getOrSetCache<Entry[]>("seo:sitemap", SITEMAP_TTL_SECONDS, async () => {
    const [products, categories, pages] = await Promise.all([
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.page.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const list: Entry[] = [
      { url: `${base}/`, lastModified: new Date().toISOString(), changeFrequency: "daily", priority: 1 },
      { url: `${base}/products`, lastModified: new Date().toISOString(), changeFrequency: "daily", priority: 0.8 },
    ];
    for (const c of categories) {
      list.push({
        url: `${base}/category/${c.slug}`,
        lastModified: c.updatedAt.toISOString(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const p of products) {
      list.push({
        url: `${base}/products/${p.slug}`,
        lastModified: p.updatedAt.toISOString(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    for (const p of pages) {
      list.push({
        url: `${base}/pages/${p.slug}`,
        lastModified: p.updatedAt.toISOString(),
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }
    return list;
  });

  return entries.map((e) => ({
    url: e.url,
    lastModified: e.lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));
}
