# FZ Mart — storefront homepage (Next.js / TSX)

This is the redesigned homepage as drop-in TSX for your existing `fz-mart`
Next.js 15 project. It wires into your real data layer (`@/server/...`),
cart store (`@/lib/cart-store`) and `formatTaka` (paisa → ৳).

---

## Fonts — what to provide (nothing to download!)

The design uses **two free Google Fonts**, loaded by Next's built-in
`next/font/google`. They are self-hosted automatically at build time — **you do
not download or commit any font files**, and there's no runtime request:

| Font | Where it's used |
|------|-----------------|
| **Manrope** | all headings, UI and body text |
| **Spline Sans Mono** | tiny mono labels on image placeholders |

They're already added to `src/app/layout.tsx` in this package as CSS variables
(`--font-manrope`, `--font-spline-mono`). If you keep your own root layout,
just copy the two `Manrope(...)` / `Spline_Sans_Mono(...)` calls and append
their `.variable` classes to your `<html className=...>`. That's it.

> Want a different look? Manrope is the only "brand" font — swap it for any
> Google font (e.g. `Plus_Jakarta_Sans`, `Onest`) in one line and everything
> reflows.

---

## Install — copy these into your project

The folder mirrors your `src/` layout. Copy across:

```
src/styles/storefront.css                      ← NEW (scoped design system)
src/components/storefront/icons.tsx            ← NEW
src/components/storefront/HeaderCart.tsx       ← NEW (client cart pill)
src/components/storefront/CategoryNav.tsx      ← NEW
src/components/storefront/Hero.tsx             ← NEW
src/components/storefront/TrustStrip.tsx       ← NEW
src/components/storefront/CategoryTiles.tsx    ← NEW
src/components/storefront/ProductSection.tsx   ← NEW
src/components/storefront/FlashSale.tsx        ← NEW (client countdown)
src/components/storefront/Newsletter.tsx       ← NEW (client form)
src/components/storefront/Header.tsx           ← REPLACES your Header.tsx
src/components/storefront/ProductCard.tsx      ← REPLACES your ProductCard.tsx
src/components/storefront/Footer.tsx           ← REPLACES your Footer.tsx
src/app/(storefront)/page.tsx                  ← REPLACES your homepage
src/app/(storefront)/layout.tsx                ← REPLACES (adds `.fz` + css import)
src/app/layout.tsx                             ← MERGE the two font additions
```

No new npm dependencies. Everything else (`@/server/*`, `@/lib/*`,
`GtmScript`, `PixelScript`, `MobileNav`, `AddToCartPanel`) is reused as-is.

> Your old `Header.tsx` rendered `MobileNav` + `CartIcon`. The new header uses
> its own `HeaderCart`. Keep `MobileNav.tsx` / `CartIcon.tsx` if other pages
> import them; otherwise you can delete `CartIcon.tsx`.

---

## How it scopes (no Tailwind conflicts)

All visual rules live in `storefront.css`, **every selector prefixed with
`.fz`**. The storefront `layout.tsx` wraps everything in `<div className="fz">`,
so the design system is fully isolated from your admin area and Tailwind
utilities. Brand color, radius and spacing are CSS variables at the top of the
file.

### Switch the accent color
Top of `src/styles/storefront.css`, replace the emerald line with blue (the
one you tried in the mockup) — or any color:

```css
/* blue */
--brand:#2f6bdb; --brand-dark:#1f4fb0; --brand-tint:#e8eefc; --brand-tint-2:#c2d4f7;
```

---

## Remote product / banner images

`ProductCard` and `Hero` use `next/image`. If your image URLs are remote
(e.g. an S3/CDN host), allow the host in `next.config.ts`:

```ts
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "your-cdn.example.com" }],
  },
};
```

When a product has no image, a clean striped placeholder shows automatically.

---

## Distinct rows (optional but recommended)

`page.tsx` currently fans your `listFeaturedProducts()` out into the Flash Sale,
New Arrivals, Best Sellers and Featured sections so the page renders
immediately. For real, distinct rows, add these to
`src/server/products/index.ts` (same caching pattern you already use):

```ts
export async function listNewArrivals(limit = 5) {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listFlashSaleProducts(limit = 5) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", discountPrice: { not: null } },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listBestSellers(limit = 5) {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: { orderItems: { _count: "desc" } },
    take: limit,
  });
}
```

Then swap the relevant `featured.slice(...)` calls in `page.tsx` for these.
(Wrap each in `getOrSetCache(...)` like your existing functions for production.)

---

## Notes

- Product cards are intentionally **minimal** (image, name, price, discount) to
  match your schema — there's no rating field, so none is shown.
- The Flash Sale countdown is client-side and anchored on mount to avoid
  hydration mismatch; point it at a real campaign end time when you have one.
- `Today's Deals` / the Flash Sale anchor scroll to `#flash-sale`.
