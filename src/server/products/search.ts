import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { listActiveCategories } from "@/server/categories";
import { collectDescendantIds } from "@/server/categories/tree";

/**
 * Resolve a category slug to the set of category ids it covers — the node plus
 * every descendant — so a search scoped to a parent finds items in its whole
 * subtree. Returns [] when the slug matches nothing (caller renders no results).
 */
async function categoryIdsForSlug(slug: string): Promise<number[]> {
  const cats = await listActiveCategories();
  const node = cats.find((c) => c.slug === slug);
  return node ? collectDescendantIds(node.id, cats) : [];
}

// Product search. This ran on the MySQL FULLTEXT index via MATCH … AGAINST
// until TiDB Serverless turned out to parse but not execute it, failing with
// `UnknownType: *ast.MatchAgainst` regardless of tidb_enable_fulltext_index.
// Keyword matching is therefore LIKE-based (see buildConditions).
//
// Trade-off: leading-wildcard LIKE can't use an index, so keyword search is a
// table scan — fine at this catalogue's size, but if Product grows into the
// high thousands this should move to a real search service rather than adding
// more indexes, which cannot help a '%term%' pattern.
//
// We still drop to $queryRaw because Prisma's query builder can't express the
// relevance ranking or combine it with the filter/sort matrix the page needs.
//
// Keywords are always BOUND PARAMETERS (never string-interpolated) and LIKE
// metacharacters are escaped, so this is injection-safe despite being raw SQL.

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
  priceColor: string | null;
  variants: { price: number; discountPrice: number | null; priceColor: string | null }[];
  images: { url: string; isPrimary: boolean }[];
}

// Effective price = the discounted price when a genuine discount applies,
// else the base price. Used for both the price filter and price sorting so
// the two always agree with what the card displays.
const EFFECTIVE_PRICE = Prisma.sql`
  (CASE WHEN p.discountPrice IS NOT NULL AND p.discountPrice < p.price
        THEN p.discountPrice ELSE p.price END)`;

/**
 * Escape the LIKE metacharacters so a shopper searching for "50%" or "a_b"
 * matches those literal characters instead of them acting as wildcards.
 * Paired with an explicit ESCAPE '!' on every LIKE below.
 */
function escapeLike(value: string): string {
  return value.replace(/[!%_]/g, (c) => `!${c}`);
}

/** Split a query into distinct non-empty words, capped so a pathological
 *  paste can't turn into hundreds of OR'd LIKE scans. */
function tokenize(keyword: string): string[] {
  return [...new Set(keyword.split(/\s+/).filter(Boolean))].slice(0, 8);
}

function buildConditions(
  q: SearchQuery,
  categoryIds: number[] | null,
): { where: Prisma.Sql; relevance: Prisma.Sql | null } {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.status = 'ACTIVE'`];
  let relevance: Prisma.Sql | null = null;

  const keyword = q.keyword?.trim();
  const words = keyword ? tokenize(keyword) : [];
  if (words.length > 0) {
    // Substring matching rather than MATCH … AGAINST: TiDB Serverless parses
    // but cannot execute MATCH (`UnknownType: *ast.MatchAgainst`), even with
    // tidb_enable_fulltext_index = ON and the FULLTEXT indexes present. LIKE
    // also sidesteps the FULLTEXT minimum-token-length floor, so short terms
    // and Bangla substrings match — neither worked reliably under AGAINST.
    //
    // Every word must appear (in name OR description), so extra words narrow
    // the result set the way a shopper expects.
    for (const w of words) {
      const pat = `%${escapeLike(w)}%`;
      conditions.push(
        Prisma.sql`(p.name LIKE ${pat} ESCAPE '!' OR p.description LIKE ${pat} ESCAPE '!')`,
      );
    }

    // FULLTEXT scoring is gone, so relevance is synthesised: a name hit beats
    // a description-only hit, and an earlier position in the name beats a
    // later one (prefix ≈ best). Summed over words, highest score wins.
    relevance = Prisma.join(
      words.map((w) => {
        const pat = `%${escapeLike(w)}%`;
        return Prisma.sql`(CASE
          WHEN p.name LIKE ${pat} ESCAPE '!'
            THEN 1000 - LEAST(INSTR(LOWER(p.name), LOWER(${w})), 100)
          WHEN p.description LIKE ${pat} ESCAPE '!' THEN 1
          ELSE 0 END)`;
      }),
      " + ",
    );
  }

  if (q.categorySlug) {
    // categoryIds = the node + its descendants (resolved by the caller). An
    // empty set means the slug matched nothing → force zero results.
    conditions.push(
      categoryIds && categoryIds.length > 0
        ? Prisma.sql`p.categoryId IN (${Prisma.join(categoryIds)})`
        : Prisma.sql`1 = 0`,
    );
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

  const categoryIds = q.categorySlug ? await categoryIdsForSlug(q.categorySlug) : null;
  const { where, relevance } = buildConditions(q, categoryIds);

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
          priceColor: true,
          // Cheapest row backs the card's "from" price and its colour.
          variants: {
            orderBy: { sortOrder: "asc" },
            select: { price: true, discountPrice: true, priceColor: true },
          },
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
 * Typeahead suggestions for the header dropdown. Matches on the name only —
 * a dropdown row shows the name, so a description-only hit looks like a
 * non-sequitur to the shopper. Name hits are ordered by match position, so
 * prefix matches ("shir" → "Shirt") surface above mid-word ones.
 *
 * The former BOOLEAN MODE query was removed with the rest of the MATCH …
 * AGAINST usage; see the note at the top of this file.
 */
export async function suggestProducts(keyword: string, limit = 6): Promise<Suggestion[]> {
  const term = keyword.trim();
  if (term.length < 2) return [];

  const words = tokenize(term);
  if (words.length === 0) return [];

  const nameConditions = words.map(
    (w) => Prisma.sql`p.name LIKE ${`%${escapeLike(w)}%`} ESCAPE '!'`,
  );
  const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
    SELECT p.id FROM Product p
    WHERE p.status = 'ACTIVE' AND ${Prisma.join(nameConditions, " AND ")}
    ORDER BY INSTR(LOWER(p.name), LOWER(${words[0]})) ASC, p.name ASC
    LIMIT ${limit}`);

  const ids = rows.map((r) => r.id);
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
