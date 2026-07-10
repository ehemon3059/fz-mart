# fz-mart — Project Overview

A full-stack, single-vendor **e-commerce platform** built for the Bangladesh market:
a fast, SEO-friendly storefront with **Cash-on-Delivery-first checkout** and online
payments (bKash / SSLCommerz), plus a comprehensive **admin panel** that covers the
entire business — catalog, orders, fulfilment, marketing, finance, and staff management.

The platform is production-verified: `next build` passes cleanly and a self-provisioning
Playwright E2E suite (checkout, coupons, payments, newsletter, and more) runs green.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15** (App Router, Server Components, Server Actions, Edge middleware) |
| UI | **React 19** + **Tailwind CSS 3.4** (+ typography plugin) |
| Language | **TypeScript 5**, strict, typed end to end |
| Database | **MySQL** via **Prisma 6** (SQL migrations checked in) |
| Cache / sessions / rate limiting | **Redis** (ioredis) |
| Background jobs | **BullMQ** worker process (email, SMS, abandoned-cart, daily maintenance) |
| Email | **nodemailer** over admin-configurable SMTP (Gmail, Zoho, Brevo, SES…) |
| Object storage | **Cloudflare R2 / S3-compatible** adapter for product & banner images |
| Testing | **Playwright** E2E suite + GitHub Actions CI (lint → migrate → build → e2e) |
| Monitoring | `/api/health` endpoint (DB + Redis), opt-in **Sentry** (server, client, worker) |

**Code layout:** `app/` (routes & UI) · `server/` (business logic) · `lib/` (shared utilities)
· `integrations/` (external-service adapters: courier, payments, fraud, SMS, mail, storage)
· `jobs/` (background workers) · `i18n/` (translations) · `tests/e2e/` (Playwright).

---

## 2. Storefront (Customer-Facing)

### Catalog & discovery
- **Categories → subcategories → products**, with **product variants** (colour × size matrix, each combination carrying its own price and stock).
- Product detail pages: image gallery, colour swatches, specifications, feature bullets, **customer reviews & ratings**.
- **Flash sales** — scheduled, time-boxed campaigns with override pricing.
- Homepage **hero banners** and featured products.
- **Full-text search** (MySQL FULLTEXT, relevance-ranked, Bangla-capable) with filters, sorting, pagination, and a **live typeahead** suggestion box in the header.
- **Wishlist** and **"Notify me when back in stock"** subscriptions (alert fires automatically on restock).

### Cart & checkout
- Cart (add / update / remove, persisted client-side) and **Buy Now** express checkout.
- **Guest checkout** — no account required.
- **Cash on Delivery**, **bKash**, and **SSLCommerz** payment options, including **partial advance** ("pay the delivery charge now, rest COD").
- Shipping-zone-based delivery charges.
- **Coupon codes** applied at checkout (validated live, redeemed atomically inside the order transaction).
- **Phone OTP verification** for COD orders (anti-fake-order; automatically skipped for repeat customers with a delivered order).
- **Abandoned-cart recovery** — carts left at checkout trigger a delayed SMS/email with a one-click cart-restore link.

### Customer accounts & post-purchase
- Passwordless **magic-link email login** and **Google Sign-In**; order history in the account area.
- **Order tracking** page (order number + phone).
- **Self-service cancellation** (while pending) and **return requests** within the configured return window — no login needed, authorized by order number + phone.
- Order confirmation email; status-update SMS notifications.
- **Newsletter signup** (footer box) with idempotent subscription storage.

### Content, localization & engagement
- CMS **static pages** (About, Terms, Privacy, Refund, Shipping…) with rich-text editing, plus **FAQ**.
- **Bangla / English UI** — cookie-based locale switcher, translated UI chrome, optional **Bangla-digit prices**, admin-set default language.
- **WhatsApp / Messenger chat buttons** (floating, admin-configured).

---

## 3. Admin Panel (Business Operations)

### Access control & staff management
- Username/password login on a branded screen, Redis-backed sessions, rate-limited, with **email-based password recovery** (single-use, 30-minute tokens, no email enumeration).
- **Two-factor authentication (TOTP)** — per-admin opt-in, two-step login flow.
- **Role-based access control**: OWNER / MANAGER / STAFF roles with a per-area permission map, enforced by a single guard that re-reads role and active status from the DB on every request (deactivation takes effect immediately).
- **Admin management** (owner only): invite staff by email, change roles, activate/deactivate — with last-owner-lockout protection.
- **Append-only activity audit log** with an in-admin viewer.

### Catalog management
- Product CRUD with variants, in-browser **image crop/compress on upload**, colours, specifications, features, **sourcing cost (COGS)**, per-product **SEO title/description overrides**, and **low-stock threshold**.
- Category, banner, flash-sale, FAQ, and CMS-page management.
- **Review moderation** (approve / hide).

### Orders & fulfilment
- Validated status workflow (Pending → Confirmed → Shipped → Delivered / Cancelled / Returned) with a **status audit log**, internal notes, **bulk status updates**, and printable invoices.
- **Courier integration (Steadfast, live API)** — one-click consignment creation from the order page, delivery-status **webhook** updates, and manual status refresh. The adapter is provider-generic, so additional couriers plug in without touching the service layer.
- **Returns queue** — approve/deny customer return requests; approval drives the standard RETURNED workflow, with restockable-vs-damaged classification feeding the P&L.
- **Fraud screening** on checkout: pluggable phone-number risk-scoring API (cached, non-blocking) plus **IP blocking** enforced in edge middleware.

### Inventory
- **Anti-oversell guarantee**: atomic, conditional stock decrements inside the checkout transaction (for both products and variants). Online payments reserve stock up front and **release it automatically on payment failure/expiry**.
- **Manual stock adjustments** with a full audit trail (who, when, why, signed delta, resulting stock).
- **Low-stock alerts** on the dashboard plus an optional **daily digest** (scheduled job).
- Stock report with per-product valuation.

### Marketing & growth
- **Coupons** — CRUD with usage limits and redemption tracking.
- **Facebook Pixel + Conversions API**: client-side PageView/AddToCart, and a **server-side Purchase event fired only when the owner phone-confirms an order** (the meaningful COD conversion) — with fbp/fbc attribution captured at checkout, event deduplication, and hashed customer data. Token stored encrypted; managed in the Pixel Manager page.
- **Google Tag Manager** integration.
- Token-protected **product feeds**: Facebook Catalog (CSV) and Google Merchant (XML).
- **Newsletter subscriber list** with CSV export.
- **Ad-spend tracking** per channel (Facebook / Google / TikTok / other) feeding **ROAS and CAC** reporting.

### Reports & analytics
- **Monthly Profit & Loss** — the finance centerpiece. Revenue recognized on **delivery date** (correct for COD), COGS from sourcing costs **snapshotted at checkout**, coupon discounts netted out, returns split into restockable (no cost impact) vs. damaged (**Inventory Loss** expense), gateway fees and shipping costs as OpEx, plus manually entered operating expenses (marketing, rent, salaries…). Headline Net Profit card with a month selector.
- **Conversion funnel** — product views → add-to-cart → checkout started → order placed, with step-to-step rates (bot- and blocked-IP-filtered, fire-and-forget event capture).
- **Delivery performance report** — per-courier days-to-deliver, failure rate, and shipping-cost audit, computed from the order status history.
- **Owner analytics** on the dashboard: best sellers (7/30 days), sales by category, repeat-customer rate, COD success rate per courier.
- Stock, order, and **abandoned-cart** reports; subscriber export.

### Settings hub (all admin-configurable, secrets encrypted at rest)
Appearance/theme · shipping zones · payments (bKash / SSLCommerz with **sandbox/live mode** and an in-admin sandbox warning) · courier API · fraud-check API · SMS gateway · SMTP · Google OAuth · Pixel Manager (Pixel + CAPI) · Tag Manager · marketing feeds · conversion features (OTP, abandoned-cart delay, return window, chat buttons) · localization · inventory digest · IP block list.

---

## 4. SEO & Performance

- **Metadata everywhere**: `generateMetadata` on product/category/CMS pages with admin-editable overrides; canonical `metadataBase`; Open Graph tags.
- **Structured data (JSON-LD)**: Product, BreadcrumbList, and Organization schemas.
- **`sitemap.xml`** (Redis-cached) and **`robots.txt`** via App Router metadata routes.
- **Image optimization**: `next/image` throughout, priority + sizes on LCP images (hero, product cards, gallery), R2/S3-hosted originals.
- **Redis caching** on heavy storefront reads and all report queries.
- Documented Lighthouse methodology in `PERFORMANCE.md`.

---

## 5. Security & Reliability Engineering

- **Money as integer paisa** end to end — no floating-point currency errors; conversion to taka only at the UI edge and at external API boundaries.
- **Immutable order snapshots** — name, price, variant label, coupon discount, and sourcing cost are frozen onto each order line at purchase; later catalog edits never rewrite history.
- **Security headers**: nonce-based **Content-Security-Policy** (per-request nonce via middleware), HSTS with preload, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Rate limiting** on login, magic link, password reset, OTP, order tracking, and search suggestions.
- **Webhook signature verification** on payment IPN and courier callbacks.
- **Encrypted-at-rest secrets** for every integration credential (payments, courier, CAPI, SMS, SMTP).
- **Background-job auditing**: `MailLog` / `SmsLog` trails with automatic retries; checkout never blocks on notifications.
- **Ops tooling**: `/api/health` (DB + Redis, 200/503), backup/restore/deploy scripts, opt-in Sentry across web + worker, `DEPLOYMENT.md` runbook.
- **CI pipeline** (GitHub Actions): lint → migrate → build → Playwright E2E against real MySQL + Redis services.

---

## 6. Project Summary

**fz-mart** covers the complete lifecycle of a Bangladeshi COD e-commerce business in one
codebase: **catalog → search → cart → coupon → OTP-verified COD or online payment →
courier fulfilment → delivery → returns → monthly P&L**. Growth tooling (Pixel + server-side
Conversions API tuned to phone-confirmed orders, product feeds, abandoned-cart recovery,
wishlist, back-in-stock, newsletter) is built in, and the owner gets a real control room:
conversion funnel, ROAS/CAC, delivery performance, inventory alerts, and an accountant-grade
profit-and-loss report.

The engineering underneath is deliberately conservative where it matters — atomic stock
control, immutable order snapshots, integer money, encrypted secrets, RBAC with immediate
revocation, audit logs on admin activity and stock changes — and pluggable where it helps:
courier, payment, fraud, SMS, mail, and storage providers are all adapters behind stable
interfaces, configured from the admin Settings hub.

---

## 7. Key Commands

```bash
npm run dev            # start the Next.js app (http://localhost:3000)
npm run worker         # start the background worker (email/SMS/carts/maintenance)
npm run db:migrate     # apply database migrations (development)
npm run db:deploy      # apply migrations (production)
npm run db:seed        # seed the database (admin user, shipping zones, sample data)
npm run build          # production build
npm run lint           # ESLint
npm run test:e2e       # Playwright end-to-end suite (self-provisioning)
```

> **Notes:**
> - Transactional email/SMS and abandoned-cart/digest jobs require the **worker process
>   running** and the relevant provider configured under **Admin → Settings**.
> - See `DEPLOYMENT.md` for the production runbook (env vars, migrations, backups, health checks).
