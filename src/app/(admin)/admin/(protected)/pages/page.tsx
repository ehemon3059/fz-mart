import {
  PAGE_SLUGS,
  PAGE_FALLBACK_TITLES,
  PAGE_CATEGORIES,
  CATEGORY_ORDER,
  listAllPages,
} from "@/server/pages/admin";
import { PageStatsRow } from "@/components/admin/pages/PageStatsRow";
import { CategorySection } from "@/components/admin/pages/CategorySection";
import FooterShopLinks from "@/components/admin/pages/FooterShopLinks";
import type { AdminPageRow } from "@/components/admin/pages/PageRow";
import { Icon } from "@/components/icons";
import { getShopLinksForAdmin, MAX_SHOP_LINKS } from "@/server/settings/footer-links";
import { listActiveCategories } from "@/server/categories";

export const metadata = { title: "Content Pages — FZ-Mart Admin" };

export default async function AdminPagesPage() {
  const [pages, shopLinks, categories] = await Promise.all([
    listAllPages(),
    getShopLinksForAdmin(),
    listActiveCategories(),
  ]);
  const bySlug = new Map(pages.map((p) => [p.slug, p]));

  const rows: AdminPageRow[] = PAGE_SLUGS.map((slug) => {
    const page = bySlug.get(slug);
    return {
      slug,
      title: page?.title ?? PAGE_FALLBACK_TITLES[slug],
      status: page?.status ?? "PUBLISHED",
      updatedAt: page?.updatedAt ?? new Date(),
      category: PAGE_CATEGORIES[slug],
    };
  });

  const published = rows.filter((p) => p.status === "PUBLISHED").length;
  const draft = rows.length - published;

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-7 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">
            All Static Pages Information
          </h1>
          <p className="mt-1 text-[14.5px] text-stone-500">
            Manage the static pages customers see across the FZ-Mart storefront.
          </p>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            <Icon name="search" size={17} />
          </span>
          <input
            placeholder="Search pages…"
            className="h-11 w-[260px] rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-[14px] text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
          />
        </div>
      </div>

      <PageStatsRow total={rows.length} published={published} draft={draft} />

      <div className="mt-8 space-y-9">
        {CATEGORY_ORDER.map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            pages={rows.filter((p) => p.category === cat)}
          />
        ))}
      </div>

      {/* The footer's Shop column is a list of links, not a page, so it sits
          below the page sections rather than inside one. */}
      <div className="mt-9">
        <FooterShopLinks
          initialLinks={shopLinks.links}
          configured={shopLinks.configured}
          max={MAX_SHOP_LINKS}
          categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
        />
      </div>
    </div>
  );
}
