# E-Commerce Project Blueprint (COD Storefront + Admin Platform)

**Stack:** Next.js (App Router) · TypeScript · MySQL 8.0+ · Prisma · Redis
**Scope:** Public COD storefront + Admin dashboard + 10 integration/settings features
**Excluded:** Online Payment Gateway, Page Builder ("Create Page")

This document is the structure a developer follows from empty folder to deployed product. It describes *what* to build and *in what order* — no code.

---

## 1. Architecture — where each technology earns its place

| Layer | Tech | Responsibility |
|---|---|---|
| UI + Server | **Next.js (App Router)** | SSR storefront pages, admin pages, API route handlers, server actions, middleware |
| Type safety | **TypeScript** | One type system across DB → server → UI; Prisma generates DB types automatically |
| Database | **MySQL 8.0+** | Source of truth: products, orders, customers, settings |
| Data access | **Prisma** | Schema, migrations, type-safe queries — replaces hand-written SQL |
| In-memory layer | **Redis** | Caching, rate limiting, IP-block set, admin sessions, and the SMS/email job queue |

### What Redis specifically does in this project
Redis is not optional decoration here — each of these is a real need:

1. **Catalog cache** — product lists, category nav, homepage blocks are read constantly and change rarely. Cache them; invalidate on admin edit.
2. **Report cache** — Stock Report and Order Reports run heavy aggregation queries. Cache results with a short TTL.
3. **IP-block set** — middleware checks every request against a Redis set; far faster than a DB hit per request.
4. **Rate limiting** — protect checkout submission, admin login, and outbound Fraud-API calls from abuse.
5. **Job queue (BullMQ on Redis)** — sending SMS and email must not block order placement. The order saves instantly; a background worker sends the notification. This is the single most important reason Redis is in the stack.
6. **Fraud-check cache** — courier fraud lookups cost money/time per call; cache the result per phone number.
7. **Admin sessions** — session store for the admin login.

> **Deployment consequence:** the job queue needs a long-running worker process. Plan to deploy the Next.js app **and** a separate worker process, both pointing at the same Redis and MySQL. This is why a VPS suits this build better than serverless.

---

## 2. Project folder structure

```
ecommerce/
├── prisma/
│   ├── schema.prisma          # all models live here
│   ├── migrations/            # generated migration history
│   └── seed.ts                # demo categories/products/admin
├── public/                    # static assets, placeholder images
├── src/
│   ├── app/
│   │   ├── (storefront)/       # public-facing route group
│   │   │   ├── layout.tsx      # header, nav, cart icon, footer
│   │   │   ├── page.tsx        # homepage (banner slider + blocks)
│   │   │   ├── products/[slug]/
│   │   │   ├── category/[slug]/
│   │   │   ├── search/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── order-confirmation/[orderNo]/
│   │   │   └── track/
│   │   ├── (admin)/admin/      # protected admin route group
│   │   │   ├── layout.tsx      # admin shell + auth guard
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── orders/
│   │   │   ├── banners/
│   │   │   ├── reports/
│   │   │   │   ├── stock/       # Stock Report
│   │   │   │   └── orders/      # Order Reports
│   │   │   └── settings/
│   │   │       ├── tag-manager/ # GTM id
│   │   │       ├── pixel/       # FB Pixel id
│   │   │       ├── shipping/    # Shipping charge / zones
│   │   │       ├── courier/     # Courier API config
│   │   │       ├── fraud/       # Fraud API config
│   │   │       ├── smtp/        # Mail SMTP config
│   │   │       ├── sms/         # SMS gateway config
│   │   │       └── ip-block/    # blocked IPs
│   │   └── api/                 # route handlers + webhooks
│   │       └── webhooks/courier/  # courier status callbacks
│   ├── components/
│   │   ├── storefront/         # ProductCard, BannerSlider, CartDrawer...
│   │   ├── admin/              # tables, forms, settings panels
│   │   └── ui/                 # buttons, inputs, shared primitives
│   ├── server/                # service/business-logic layer
│   │   ├── products/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── reports/
│   │   └── settings/
│   ├── integrations/          # external service adapters
│   │   ├── courier/           # pathao / steadfast / redx adapters
│   │   ├── fraud/
│   │   ├── sms/
│   │   └── mail/
│   ├── jobs/                  # BullMQ queue definitions + workers
│   │   ├── sms.worker.ts
│   │   └── mail.worker.ts
│   ├── lib/
│   │   ├── prisma.ts          # single Prisma client instance
│   │   ├── redis.ts           # single Redis connection
│   │   ├── auth.ts            # admin session helpers
│   │   ├── cache.ts           # get/set/invalidate helpers
│   │   ├── queue.ts           # queue producers
│   │   ├── settings.ts        # typed settings reader (decrypts secrets)
│   │   └── crypto.ts          # encrypt/decrypt API keys at rest
│   ├── middleware.ts          # IP-block check + admin route guard
│   ├── config/                # constants: order statuses, zones enum
│   └── types/                 # shared TS types
├── .env                       # secrets (never commit)
├── .env.example               # documented blank template (commit this)
├── tsconfig.json
└── package.json
```

The `server/` and `integrations/` split is the key discipline: **pages and components never call MySQL or external APIs directly** — they call the service layer. This keeps the codebase maintainable as features grow.

---

## 3. Data model (entities, not code)

### Core storefront
- **Category** — name, slug, sort order, active.
- **Subcategory** — belongs to Category; name, slug, sort order, active.
- **Product** — belongs to Subcategory; name, slug, description, price, discountPrice (nullable), stock, isFeatured, status, promo badge text.
- **ProductImage** — belongs to Product; url, isPrimary, sort order.
- **Banner** — image, link, sort order, active (homepage slider).
- **Order** — public orderNo (unique), customer name, phone, address, shippingZoneId, deliveryCharge, subtotal, total, status, createdAt.
- **OrderItem** — belongs to Order; productId, productName snapshot, quantity, unitPrice **snapshot** (never read live price for past orders).
- **AdminUser** — username, hashed password, role.

### Features / settings
- **Setting** — generic config store: `group` (e.g. "smtp", "courier"), `key`, `value`, `isEncrypted` flag. Holds GTM id, Pixel id, SMTP creds, courier keys, fraud keys, SMS keys.
  > Secrets (API keys, SMTP password) must be **encrypted at rest** via `lib/crypto.ts`, not stored in plaintext.
- **ShippingZone** — name (e.g. Inside Dhaka / Outside Dhaka), charge, active. Feeds checkout.
- **BlockedIp** — ip, reason, createdAt. Mirrored into the Redis set for fast lookup.
- **CourierShipment** — belongs to Order; courier name, consignmentId, trackingCode, courierStatus, lastSyncedAt.
- **SmsLog** / **MailLog** — recipient, template, status, error, createdAt (auditing outbound sends).
- **FraudCheckResult** — phone, courier success/return stats, score, checkedAt (also cached in Redis).

The most important modeling rule, again: **OrderItem snapshots name and price at purchase time.** Editing or deleting a product later must never change historical orders.

---

## 4. Build order (phased)

Build a working "place an order" demo as early as possible, then layer features on. Each phase ends in something testable.

### Phase 0 — Foundation
- Init Next.js + TypeScript project; set up Git.
- Connect Prisma to MySQL 8; create `lib/prisma.ts`.
- Connect Redis; create `lib/redis.ts`.
- Define core models in `schema.prisma`; run first migration; write `seed.ts`.
- Build the **Settings module early** (the generic Setting model + typed reader) — many later features depend on it.
- Stand up `lib/crypto.ts` for encrypting secrets.

### Phase 1 — Storefront vertical slice (the demo)
Build one complete path before anything else:
Homepage → Category listing → Product detail → Cart → COD Checkout → Confirmation → Tracking.
- Reusable `ProductCard` (discount/strikethrough pricing, promo badge, stock status).
- Cart in browser state + storage.
- **Buy Now** shortcut bypassing cart.
- Checkout: name, phone, address, delivery zone; **re-verify stock and price on the server**.
- Generate unique public orderNo; decrement stock on order creation.
- Public tracking by orderNo (+ phone as a light check).

### Phase 2 — Admin core
- Admin auth (hashed password, Redis session, route guard in middleware).
- Product, Category/Subcategory, Banner CRUD.
- Order management — view orders, move through status list, which drives the tracking page.

### Phase 3 — Light settings features (quick batch)
These are mostly "settings form + small effect":
- **Shipping Charge** — manage ShippingZone records (already wired into checkout).
- **Tag Manager** — store GTM id, inject script in document head.
- **Pixel Manager** — store Pixel id, inject script, fire AddToCart / Purchase events.
- **IP Block** — manage BlockedIp; sync to Redis set; enforce in middleware.
- **Stock Report** — read-only view over existing product data; cache in Redis.
- **Order Reports** — read-only aggregation over orders (by date, status, totals); cache in Redis.

### Phase 4 — Notification infrastructure
- Stand up BullMQ queue + worker process (`jobs/`).
- **Mail SMTP** — settings form; mail adapter; send order-confirmation mail via queue. (Your existing SMTP/Postfix experience applies directly.)
- **SMS Gateway** — integrate a Bangladeshi SMS provider; send order-status SMS via the same queue. Log to SmsLog.

### Phase 5 — Courier & fraud integrations
- **Courier API** — pick the provider(s) the client actually uses (Pathao / Steadfast / RedX). Build an adapter to create consignments from an order, store CourierShipment, and sync status. Add a webhook route for courier status callbacks.
- **Fraud API** — call the courier fraud-check service with the customer phone at checkout or in admin; cache result in Redis + FraudCheckResult; surface a risk indicator to the admin.

### Phase 6 — Caching & performance pass
- Add Redis caching to catalog reads and report queries.
- Define clear invalidation: editing a product clears its cache and the affected listings.
- Add rate limiting to checkout, admin login, and fraud-API calls.

### Phase 7 — Testing
- Walk both cart and Buy-Now order flows end to end.
- Verify: stock decrements, order appears in admin, status change reflects on tracking, SMS/email actually send, old orders keep snapshot prices.
- Edge cases: out-of-stock, empty cart, invalid phone, blocked IP, courier/SMS API failure (the queue must retry, not crash checkout).
- Test every page on a **real phone** — most shoppers are mobile.

### Phase 8 — Deployment (VPS-oriented)
- Provision MySQL 8 and Redis (on the VPS or managed).
- Deploy two processes: the Next.js app and the queue worker.
- Run migrations against production; seed minimal real data.
- Domain, HTTPS, production env vars (with encrypted secrets).
- Re-run Phase 7 checks against live before announcing.

### Phase 9 — After launch
- Database backups (reuse your rclone → Backblaze B2 approach).
- Basic analytics + error monitoring.
- A documented `.env.example` so the client/another dev can redeploy.

---

## 5. Cross-cutting rules (apply throughout)
1. **Never trust the browser** — re-verify price and stock server-side at checkout.
2. **Snapshot order data** — name + price frozen on OrderItem at purchase.
3. **Service layer only** — pages/components call `server/`, never the DB or external APIs directly.
4. **Encrypt secrets** — all API keys and SMTP passwords encrypted in the Setting table.
5. **Async for slow work** — anything calling an external API (SMS, courier, fraud, mail) runs through the queue, never blocking the user.
6. **Cache with invalidation** — every cache entry has a clear "what clears this" rule.

---

## 6. Effort note
On top of the base COD storefront (= 100%), these ten features add roughly **+30–45%** of work. The integrations (courier, fraud, SMS) are *small in code but heavy in time* — sandbox accounts, provider docs, webhook testing, and failure handling dominate. Budget time by integration count, not lines of code.
