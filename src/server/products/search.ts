import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";

// Full-text product search built on the MySQL FULLTEXT index (see the
// @@fulltext on Product in schema.prisma). We drop to $queryRaw here because
// Prisma's query builder can't express MATCH … AGAINST relevance ranking or
// combine it with the filter/sort matrix the search page needs.
//
// The keyword is always a BOUND PARAMETER (never string-interpolated), so this
// is injection-safe despite being raw SQL.

export type SearchSort = "relevance" | "newest" | "price_asc" | "price_desc" | "bestselling";

export interface SearchQuery {
  keyword?: string;
  categorySlug?: string;
  /** Inclusive price bounds in paisa, on the product's effective price. */
  minPrice?: number;
  maxPrice?: number;
  /** Match a ProductColor swatch name or a variant colour. */
  color?: string;
  /** Match a ProductVariant size. */
  size?: string;
  inStockOnly?: boolean;
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}

export const SEARCH_PAGE_SIZE = 24;

export interface SearchResult {
  products: ProductSearchCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ProductSearchCard {
  id: number;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  promoBadge: string | null;
  images: { url: string; isPrimary: boolean }[];
}

// Effective price = the discounted price when a genuine discount applies,
// else the base price. Used for both the price filter and price sorting so
// the two always agree with what the card displays.
const EFFECTIVE_PRICE = Prisma.sql`
  (CASE WHEN p.discountPrice IS NOT NULL AND p.discountPrice < p.price
        THEN p.discountPrice ELSE p.price END)`;

function buildConditions(q: SearchQuery): { where: Prisma.Sql; relevance: Prisma.Sql | null } {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.status = 'ACTIVE'`];
  let relevance: Prisma.Sql | null = null;

  const keyword = q.keyword?.trim();
  if (keyword) {
    // NATURAL LANGUAGE MODE ranks by relevance; the same expression is
    // selected (for ORDER BY) and used as a filter.
    relevance = Prisma.sql`MATCH(p.name, p.description) AGAINST(${keyword} IN NATURAL LANGUAGE MODE)`;
    conditions.push(Prisma.sql`${relevance} > 0`);
  }

  if (q.categorySlug) {
    conditions.push(Prisma.sql`
      EXISTS (
        SELECT 1 FROM Subcategory sc
        JOIN Category c ON c.id = sc.categoryId
        WHERE sc.id = p.subcategoryId AND sc.isActive = 1
          AND c.isActive = 1 AND c.slug = ${q.categorySlug}
      )`);
  }

  if (q.minPrice != null) conditions.push(Prisma.sql`${EFFECTIVE_PRICE} >= ${q.minPrice}`);
  if (q.maxPrice != null) conditions.push(Prisma.sql`${EFFECTIVE_PRICE} <= ${q.maxPrice}`);

  if (q.color) {
    conditions.push(Prisma.sql`
      (EXISTS (SELECT 1 FROM ProductColor pc WHERE pc.productId = p.id AND pc.name = ${q.color})
       OR EXISTS (SELECT 1 FROM ProductVariant pv WHERE pv.productId = p.id AND pv.colorName = ${q.color}))`);
  }

  if (q.size) {
    conditions.push(Prisma.sql`
      EXISTS (SELECT 1 FROM ProductVariant pv WHERE pv.productId = p.id AND pv.size = ${q.size})`);
  }

  if (q.inStockOnly) {
    // In stock if the product itself has stock OR any variant does.
    conditions.push(Prisma.sql`
      (p.stock > 0
       OR EXISTS (SELECT 1 FROM ProductVariant pv WHERE pv.productId = p.id AND pv.stock > 0))`);
  }

  return { where: Prisma.join(conditions, " AND "), relevance };
}

function orderByClause(sort: SearchSort, relevance: Prisma.Sql | null): Prisma.Sql {
  switch (sort) {
    case "newest":
      return Prisma.sql`p.createdAt DESC`;
    case "price_asc":
      return Prisma.sql`${EFFECTIVE_PRICE} ASC`;
    case "price_desc":
      return Prisma.sql`${EFFECTIVE_PRICE} DESC`;
    case "bestselling":
      return Prisma.sql`sold DESC, p.createdAt DESC`;
    case "relevance":
    default:
      // Relevance only makes sense with a keyword; otherwise newest.
      return relevance ? Prisma.sql`relevance DESC, p.createdAt DESC` : Prisma.sql`p.createdAt DESC`;
  }
}

export async function searchProducts(q: SearchQuery): Promise<SearchResult> {
  const pageSize = q.pageSize ?? SEARCH_PAGE_SIZE;
  const page = Math.max(1, q.page ?? 1);
  const offset = (page - 1) * pageSize;
  const sort: SearchSort = q.sort ?? (q.keyword?.trim() ? "relevance" : "newest");

  const { where, relevance } = buildConditions(q);

  // Best-selling needs a per-product sales total; join it lazily only when
  // that sort is chosen so ordinary searches don't pay for the aggregate.
  const salesJoin =
    sort === "bestselling"
      ? Prisma.sql`LEFT JOIN (
          SELECT productId, SUM(quantity) AS sold FROM OrderItem
          WHERE productId IS NOT NULL GROUP BY productId
        ) s ON s.productId = p.id`
      : Prisma.empty;
  const soldSelect = sort === "bestselling" ? Prisma.sql`, COALESCE(s.sold, 0) AS sold` : Prisma.empty;
  const relevanceSelect = relevance ? Prisma.sql`, ${relevance} AS relevance` : Prisma.empty;

  const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
    SELECT p.id${relevanceSelect}${soldSelect}
    FROM Product p
    ${salesJoin}
    WHERE ${where}
    ORDER BY ${orderByClause(sort, relevance)}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const countRows = await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
    SELECT COUNT(*) AS total FROM Product p WHERE ${where}
  `);
  const total = Number(countRows[0]?.total ?? 0);

  // Hydrate the page of IDs with images, preserving the SQL ordering.
  const ids = rows.map((r) => r.id);
  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          discountPrice: true,
          stock: true,
          promoBadge: true,
          images: { orderBy: { sortOrder: "asc" }, select: { url: true, isPrimary: true } },
        },
      })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null);

  return {
    products: ordered,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface SearchFacets {
  colors: string[];
  sizes: string[];
}

/**
 * Filter options for the search sidebar — distinct colour and size values in
 * the active catalogue. Global (not query-scoped) and cached briefly; a small
 * store's facet list is short and changes rarely.
 */
export async function getSearchFacets(): Promise<SearchFacets> {
  return getOrSetCache("search:facets", 300, async () => {
    const [colorRows, sizeRows] = await Promise.all([
      prisma.$queryRaw<{ name: string }[]>(Prisma.sql`
        SELECT DISTINCT pc.name FROM ProductColor pc
        JOIN Product p ON p.id = pc.productId AND p.status = 'ACTIVE'
        ORDER BY pc.name`),
      prisma.$queryRaw<{ size: string }[]>(Prisma.sql`
        SELECT DISTINCT pv.size FROM ProductVariant pv
        JOIN Product p ON p.id = pv.productId AND p.status = 'ACTIVE'
        WHERE pv.size IS NOT NULL AND pv.size <> ''
        ORDER BY pv.size`),
    ]);
    return {
      colors: colorRows.map((r) => r.name),
      sizes: sizeRows.map((r) => r.size),
    };
  });
}

export interface Suggestion {
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  image: string | null;
}

/**
 * Typeahead suggestions for the header dropdown. Uses BOOLEAN MODE with a
 * trailing wildcard for prefix matching (what a typeahead wants), and falls
 * back to a LIKE prefix scan for terms shorter than the FULLTEXT minimum
 * token length, which AGAINST would otherwise ignore.
 */
export async function suggestProducts(keyword: string, limit = 6): Promise<Suggestion[]> {
  const term = keyword.trim();
  if (term.length < 2) return [];

  // Strip boolean-mode operators from user input, then require each word as a
  // prefix (+word*). Guards against a stray "+"/"-"/"*" breaking the query.
  const cleaned = term.replace(/[+\-><()~*"@]/g, " ").trim();
  const booleanExpr = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `+${w}*`)
    .join(" ");

  const rows = booleanExpr
    ? await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT p.id FROM Product p
        WHERE p.status = 'ACTIVE'
          AND MATCH(p.name, p.description) AGAINST(${booleanExpr} IN BOOLEAN MODE)
        LIMIT ${limit}`)
    : [];

  let ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    // Fallback: prefix/substring match on the name for short or unindexed terms.
    const like = await prisma.product.findMany({
      where: { status: "ACTIVE", name: { contains: term } },
      select: { id: true },
      take: limit,
    });
    ids = like.map((r) => r.id);
  }
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      discountPrice: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true }, take: 1 },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      price: p.price,
      discountPrice: p.discountPrice,
      image: p.images[0]?.url ?? null,
    }));
}
