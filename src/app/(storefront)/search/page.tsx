import type { Metadata } from "next";
import Link from "next/link";
import { listActiveCategories } from "@/server/categories";
import {
  searchProducts,
  getSearchFacets,
  type SearchSort,
} from "@/server/products/search";
import { takaToPaisa } from "@/lib/money";
import ProductCard from "@/components/storefront/ProductCard";
import SearchFilters from "./SearchFilters";

// Result pages carry no unique long-term value for crawlers and can create
// infinite filter-combination URLs — keep them out of the index.
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const VALID_SORTS: SearchSort[] = ["relevance", "newest", "price_asc", "price_desc", "bestselling"];

function toSort(value: string | undefined, hasKeyword: boolean): SearchSort {
  if (value && (VALID_SORTS as string[]).includes(value)) return value as SearchSort;
  return hasKeyword ? "relevance" : "newest";
}

function toPaisa(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? takaToPaisa(n) : undefined;
}

interface SearchParams {
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  color?: string;
  size?: string;
  inStock?: string;
  sort?: string;
  page?: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const keyword = sp.q?.trim() || "";
  const sort = toSort(sp.sort, Boolean(keyword));
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, facets, categories] = await Promise.all([
    searchProducts({
      keyword: keyword || undefined,
      categorySlug: sp.category || undefined,
      minPrice: toPaisa(sp.min),
      maxPrice: toPaisa(sp.max),
      color: sp.color || undefined,
      size: sp.size || undefined,
      inStockOnly: sp.inStock === "1",
      sort,
      page,
    }),
    getSearchFacets(),
    listActiveCategories(),
  ]);

  // Preserve all active filters when building pagination links.
  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (sp.category) params.set("category", sp.category);
    if (sp.min) params.set("min", sp.min);
    if (sp.max) params.set("max", sp.max);
    if (sp.color) params.set("color", sp.color);
    if (sp.size) params.set("size", sp.size);
    if (sp.inStock === "1") params.set("inStock", "1");
    if (sp.sort) params.set("sort", sp.sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  return (
    <div className="font-manrope mx-auto w-full max-w-[1200px] px-5 py-8">
      <h1 className="text-2xl font-bold text-gray-900">
        {keyword ? `Search: “${keyword}”` : "Search products"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {result.total} {result.total === 1 ? "product" : "products"} found
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-4 md:self-start">
          <SearchFilters
            facets={facets}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            current={{
              keyword,
              categorySlug: sp.category ?? "",
              minPriceTaka: sp.min ?? "",
              maxPriceTaka: sp.max ?? "",
              color: sp.color ?? "",
              size: sp.size ?? "",
              inStockOnly: sp.inStock === "1",
              sort,
            }}
          />
        </aside>

        <div>
          {result.products.length === 0 ? (
            <p className="text-gray-500">
              No products match your search. Try fewer filters or a different keyword.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {result.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {result.pageCount > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
                  {page > 1 && (
                    <Link href={pageHref(page - 1)} className="rounded border px-3 py-1.5 hover:border-black">
                      Previous
                    </Link>
                  )}
                  <span className="px-2 text-gray-500">
                    Page {page} of {result.pageCount}
                  </span>
                  {page < result.pageCount && (
                    <Link href={pageHref(page + 1)} className="rounded border px-3 py-1.5 hover:border-black">
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
