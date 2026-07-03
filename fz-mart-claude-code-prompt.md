# Claude Code Prompt — Complete fz-mart for Production Launch (Bangladesh)

Copy everything below the line into Claude Code. Run it phase by phase — do NOT paste all phases at once. Start with Phase 0, verify, then continue.

---

## Context (paste this first, once)

You are working on **fz-mart**, a single-vendor e-commerce platform for the Bangladesh market.

Stack: Next.js 15 (App Router, Server Components + Server Actions), React 19, TypeScript 5 (strict), Prisma 6 + MySQL, Redis (ioredis) for sessions/cache/rate-limit, BullMQ worker for email/SMS, Tailwind CSS 3.4.

Code layout: `app/` (routes & UI), `server/` (business logic), `lib/` (shared utils), `integrations/` (external adapters), `jobs/` (background workers), `prisma/` (schema + migrations).

Existing conventions you MUST follow:
- Money is stored as **integer paisa** everywhere. Never use floats for currency.
- Order items are **snapshotted** at checkout (name, price, variant, sourcing cost). Never mutate historical order data.
- Stock changes use **atomic conditional decrements inside a DB transaction**.
- All email/SMS goes through the **BullMQ queue** (never send synchronously in a request), with MailLog/SmsLog audit rows.
- Integration secrets are **encrypted at rest** via `lib/crypto`, configured from Admin → Settings.
- Rate limiting via Redis on sensitive endpoints.
- Admin sessions are Redis-backed. Customer auth = magic-link email + Google Sign-In.

Rules for every task:
1. Read the existing code in the relevant area BEFORE writing anything; match existing patterns and naming.
2. Every schema change = a new Prisma migration. Never edit old migrations.
3. All new server actions must validate input (use the project's existing validation approach) and check auth/role.
4. Keep TypeScript strict — `npm run build` and `npm run lint` must pass after every phase.
5. Work one task at a time. After each task, tell me what changed, which files, and how to test it manually.

---

## Phase 0 — Audit & Test Safety Net

1. Scan the whole codebase and produce a short written audit: any TODOs, dead code, missing input validation on server actions, endpoints without rate limiting, and any place stock/money is handled outside the established patterns. Fix only critical security issues now; list the rest.
2. Set up **Playwright** e2e testing. Write tests for the money-critical flows only:
   - Guest COD checkout (cart → checkout → order created, stock decremented).
   - Buy Now checkout.
   - Oversell protection: two parallel checkouts for the last unit — exactly one succeeds.
   - Admin login + order status change Pending → Confirmed.
3. Add `npm run test:e2e` and a GitHub Actions workflow that runs lint + build + e2e on push.

## Phase 1 — Payments (bKash + SSLCommerz)

Goal: keep COD as default, add online payment as an option, and support **partial advance payment** (customer pays only the delivery charge online, rest is COD — standard BD practice to stop fake orders).

1. Add a `PaymentProvider` abstraction in `integrations/payments/` following the same adapter pattern as the courier integrations. Implement:
   - **SSLCommerz** (hosted checkout — covers bKash, Nagad, Rocket, cards).
   - **bKash PGW (tokenized checkout)** as a second provider.
2. Prisma: add `Payment` model (order relation, provider, amount paisa, status: INITIATED/SUCCESS/FAILED/REFUNDED, provider txn id, raw payload JSON, timestamps). Orders get `paymentMethod` (COD / ONLINE / PARTIAL) and `paidAmount`.
3. Checkout flow: customer picks COD, Full Online, or "Pay delivery charge now" (only if admin enabled it). Online path: create order in PENDING_PAYMENT status → redirect to gateway → **verify via server-side IPN/webhook + validation API call** (never trust the redirect alone) → mark paid → then decrement stock or reserve stock appropriately. Handle payment abandonment (auto-cancel PENDING_PAYMENT orders after 30 min via a BullMQ delayed job, releasing any reservation).
4. Admin → Settings: new Payments section (enable/disable each provider, sandbox/live mode, credentials encrypted at rest, toggle for partial advance and its amount rule).
5. Admin order detail: show payment info, and a manual "mark refunded" action with audit log.
6. P&L report: gateway fees per provider must flow into the existing per-order cost capture.
7. Add e2e test with the provider mocked.

## Phase 2 — Search, SEO & Discovery

1. **Search**: MySQL FULLTEXT index on product name/description (support Bangla text). Storefront search page with: keyword search, filters (category, price range, color, size, in-stock only), sorting (newest, price asc/desc, best selling), pagination. Debounced search suggestions dropdown in the header.
2. **SEO**:
   - `sitemap.xml` (products, categories, CMS pages — generated, cached, auto-updating) and `robots.txt`.
   - JSON-LD structured data: Product (with price, availability, ratings), BreadcrumbList, Organization.
   - Unique title/meta description per product/category (with sensible fallbacks), canonical URLs, Open Graph + Twitter cards with product images.
   - Admin: optional SEO title/description override fields on products, categories, and CMS pages.
3. **Related products** on product detail (same subcategory, simple heuristic) + "Recently viewed" (localStorage, client-side).
4. **Feeds**: generate a Facebook Catalog feed (CSV/XML endpoint, token-protected) and a Google Merchant feed for marketing.

## Phase 3 — Admin Roles (RBAC) & Ops Hardening

1. RBAC: `Admin` gets a `role` (OWNER / MANAGER / STAFF). Define a permission map (e.g., STAFF: orders + reviews only; MANAGER: everything except settings, expenses, admin management; OWNER: all). Enforce in a single middleware/helper used by every admin server action and page — no scattered checks. Admin management UI (OWNER only): invite by email, deactivate, change role. Log admin actions to the existing activity/audit pattern.
2. **2FA (TOTP)** optional for admin accounts.
3. **Ops**:
   - `scripts/backup.sh`: mysqldump → gzip → upload to Backblaze B2 via rclone, keep 30 daily; document the cron entry.
   - Integrate **Sentry** (client + server + worker) behind an env flag.
   - Health endpoint `/api/health` checking DB + Redis; document UptimeRobot setup.
   - Write `DEPLOYMENT.md`: Ubuntu 22.04 + Nginx reverse proxy + PM2 (app + worker as separate processes), env var list, zero-downtime deploy steps (`git pull → npm ci → build → prisma migrate deploy → pm2 reload`), and restore-from-backup procedure.
4. Security pass: security headers (CSP, HSTS, X-Frame-Options) in Next config/middleware, confirm CSRF safety of all server actions, cookie flags, and add rate limiting to any sensitive endpoint the Phase 0 audit found missing.

## Phase 4 — Conversion & Anti-Fraud (BD-specific)

1. **Phone OTP at COD checkout** (via the existing SMS gateway integration): verify the customer's phone before order placement. Admin toggle + rate limit + resend cooldown. Skip for customers with prior delivered orders.
2. **Coupons**: `Coupon` model (code, percent/fixed amount in paisa, min order, max discount, usage limit total & per customer, validity window, active flag). Apply at cart/checkout, snapshot discount onto the order, show in P&L as a revenue deduction. Admin CRUD UI.
3. **Abandoned cart recovery**: persist carts for logged-in/identified customers; BullMQ delayed job sends SMS/email after a configurable delay (e.g., 3h) with a restore-cart link. Admin toggle + template + report of recovered carts.
4. **Customer self-service**: cancel own order while status is Pending; request a return within X days of Delivered (reason + optional photo) → appears in an admin return-requests queue feeding the existing return workflow.
5. **Wishlist** (customer account) + **"Notify me when back in stock"** (email/SMS via queue when admin restocks).
6. **WhatsApp + Messenger floating chat button** (numbers/links configurable in Admin → Settings → Appearance).

## Phase 5 — Bangla i18n, Inventory & Polish

1. **i18n**: locale switcher (bn/en) for the storefront using Next.js App Router i18n patterns. Externalize all storefront UI strings; default locale configurable in admin. Product content stays as-entered (admin may write Bangla directly). Bangla digit formatting for prices (optional toggle) and bn-BD date formatting.
2. **Inventory**: low-stock threshold per product with an admin dashboard alert + optional daily email digest; `StockAdjustment` log (who, when, delta, reason) for manual corrections; stock history visible on product page in admin.
3. **Performance pass** (BD = mid-range Android on mobile data): audit with Lighthouse; ensure next/image everywhere with proper sizes, lazy loading below the fold, font optimization, and verify Redis caching on the heaviest storefront queries. Target: mobile LCP < 2.5s on the homepage and product pages.
4. **Analytics for the owner**: admin dashboard additions — best-selling products (7/30 days), sales by category, repeat-customer rate, COD delivery success rate (delivered vs returned/cancelled ratio per courier).

---

## How to run this

1. Paste the **Context** block into a fresh Claude Code session in the repo.
2. Paste **Phase 0** and let it finish. Run the tests. Commit.
3. Continue one phase at a time. Commit after each numbered task, not just each phase.
4. If Claude Code proposes deviating from the paisa/snapshot/queue conventions — stop it and point back to the Context rules.
