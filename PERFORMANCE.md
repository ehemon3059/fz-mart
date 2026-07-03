# fz-mart — Performance Notes (Phase 5)

Target audience: **mid-range Android on Bangladeshi mobile data.** Target:
mobile LCP < 2.5s on the homepage and product pages.

## How to audit (Lighthouse)

Run against a production build (dev mode is much slower and not representative):

```bash
npm run build && npm run start           # serve the production build on :3000
# In Chrome DevTools → Lighthouse → Mobile → Performance, run on:
#   http://localhost:3000/                (homepage)
#   http://localhost:3000/products/<slug> (a product page)
# Or headless:
npx lighthouse http://localhost:3000/ --preset=perf --form-factor=mobile \
  --screenEmulation.mobile --throttling.cpuSlowdownMultiplier=4 --view
```

Use "Slow 4G" + 4× CPU throttle to approximate a mid-range device on mobile data.

## Optimizations in place

**Images (biggest LCP lever)**
- All storefront catalog imagery uses `next/image` (automatic WebP/AVIF, responsive
  `srcset`, lazy-loading below the fold).
- LCP images carry `priority` **and** an explicit `sizes` so the browser fetches a
  right-sized asset instead of the full-resolution original:
  - Homepage hero banner — `priority`, `sizes="(max-width:768px) 100vw, 66vw"`.
  - Product-grid cards — `sizes="(max-width:760px) 50vw, 20vw"`.
  - Product page main gallery image — `priority`, `sizes="(max-width:768px) 100vw, 600px"`.
- Below-the-fold grid images are lazy by default (no `priority`).
- Remaining raw `<img>` are intentional and non-LCP: the Meta Pixel (must be a plain
  img), the interactive pinch-zoom lightbox (needs CSS transforms `next/image` can't do),
  and tiny thumbnails in dropdowns / cart lines.

**Fonts**
- Loaded via `next/font` (self-hosted, no render-blocking external request, `font-display`
  handled by Next). No FOUT-causing `<link>` to Google Fonts.

**Server data / caching (Redis)**
- Every heavy storefront read goes through `getOrSetCache` (60s TTL) so repeated hits
  don't re-scan MySQL: banners, categories, products (featured / new arrivals / best
  sellers / related / by-category / by-slug), flash sales, CMS pages, FAQ. Writes
  invalidate the relevant keys (`server/products/cache.ts`).
- Owner-dashboard analytics (best sellers, category sales, repeat rate, courier success)
  are also cached (60s) since they aggregate over orders.
- The sitemap is cached 1h; search is deliberately uncached (arbitrary query text).

**Rendering**
- Storefront pages are React Server Components — minimal client JS. Client islands are
  small and specific (cart store, add-to-cart panel, search typeahead, locale switcher).

## Ongoing watch-items
- Keep uploaded banner/product images reasonably sized at the source; `next/image`
  resizes but a 4MB source still costs bandwidth to fetch once for the optimizer.
- If a future homepage section adds a large above-the-fold image, give it `priority`
  + `sizes`.
- Re-run Lighthouse after any change to the homepage hero or product gallery.
