# fz-mart — Project Overview

A full-stack, single-vendor **e-commerce platform** built for the Bangladesh market, with a
**Cash-on-Delivery (COD)** first checkout, a complete storefront, and a rich admin
panel for running the business day to day.

---

## 1. Tech Stack — Programming Languages

| Language | Where it's used |
|---|---|
| **TypeScript** | The entire application — server logic, React components, server actions, workers. Strict, end-to-end typed. |
| **JavaScript (JSX/TSX)** | React components render as TSX; a few standalone scripts (`*.mjs`) for one-off DB tasks. |
| **SQL** | Database migrations (`prisma/migrations/*/migration.sql`) targeting **MySQL**. |
| **Prisma Schema Language** | `prisma/schema.prisma` — the data model definition. |
| **CSS (Tailwind + some global CSS)** | Styling via utility classes; a little hand-written CSS for the storefront checkout. |
| **HTML (email templates)** | Table-based, inline-styled transactional emails (Gmail/Outlook-safe). |

**Runtime:** Node.js. **Framework:** Next.js 15 (App Router) with React 19 Server Components + Server Actions.

---

## 2. Frameworks, Services & Libraries

### Core framework & data
- **Next.js 15.2.x** — App Router, Server Components, Server Actions, Edge middleware.
- **React 19.2** — UI.
- **Prisma 6.19** (ORM) + **MySQL** — relational database and type-safe queries.
- **TypeScript 5** — language + type safety.
- **Tailwind CSS 3.4** (+ `@tailwindcss/typography`) — styling system.

### Infrastructure services
- **Redis** (via **ioredis**) — admin **sessions**, report **caching**, **rate limiting**, fraud-result cache, and the IP-block mirror.
- **BullMQ** — background **job queue** (Redis-backed). A separate worker process sends email/SMS asynchronously so checkout never blocks.
- **SMTP (via nodemailer)** — transactional email. Provider is **admin-configurable** (Gmail, Zoho, Brevo, Amazon SES SMTP, etc.), not hard-coded.

### Security & auth
- **bcrypt** — admin password hashing.
- **google-auth-library** — customer **Google Sign-In**.
- Passwordless **magic-link** email login for customers; **encrypted-at-rest** secrets for integration settings (custom `lib/crypto`).

### Front-end helpers
- **Zustand** — client-side cart state (persisted to `localStorage`).
- **@tiptap** — rich-text editor for CMS page content.
- **sanitize-html** — sanitizes admin-authored HTML before storage/render.
- **cropperjs** — in-browser image cropping/compression for product photos.

### Pluggable third-party integrations (admin-configured)
- **Courier API** — Steadfast / Pathao / RedX / eCourier / Paperfly (consignment creation + delivery-status webhooks).
- **Fraud-check API** — customer risk scoring by phone number (cached).
- **SMS gateway** — order-status notifications.
- **Facebook Pixel** & **Google Tag Manager** — marketing/analytics tracking.

---

## 3. E-Commerce Features Delivered

### Storefront (customer-facing)
- [x] Product catalog: **categories → subcategories → products**.
- [x] **Product variants** — a colour × size matrix (each combo has its own price & stock).
- [x] Product detail: image gallery, colour swatches, specifications, feature bullets, **customer reviews & ratings**.
- [x] **Flash sales** — scheduled, time-boxed campaigns with override pricing.
- [x] Homepage **banners** (hero slots) and featured products.
- [x] **Cart** (add / update qty / remove) and **Buy Now** (single-item express checkout).
- [x] **Checkout** with **Cash on Delivery**, shipping-zone delivery charges, and guest checkout.
- [x] **Customer accounts** — passwordless **magic-link email** login + **Google Sign-In**; order history.
- [x] **Order confirmation email** on purchase.
- [x] **Order tracking** page.
- [x] CMS **static pages** (About, Contact, Terms, Privacy, Refund/Return, Shipping, etc.) + **FAQ**.

### Admin panel (business operations)
- [x] **Admin authentication** — username/password, Redis-backed sessions, rate-limited login.
- [x] **Redesigned login** + **forgot-password / reset-password via email** *(recent work — see §4)*.
- [x] **Dashboard** — orders today, pending, revenue, status breakdown, recent orders.
- [x] **Product management** — full CRUD with variants, image upload/crop, colours, specs, features, and **sourcing cost**.
- [x] **Category / banner / flash-sale management**.
- [x] **Order management** — validated status workflow (Pending → Confirmed → Shipped → Delivered / Cancelled / Returned), **status audit log**, internal notes, **bulk status updates**, courier consignment panel, printable invoice.
- [x] **Review moderation** (approve / hide).
- [x] **CMS** — edit static pages (TipTap) and FAQ entries.
- [x] **Reports** — stock report, order reports, and a full **Profit & Loss (financial) report** *(recent work — see §4)*.
- [x] **Operating-expense tracking** *(recent work)*.
- [x] **Settings hub** — appearance/theme, shipping zones, Tag Manager, Pixel, IP block, SMTP, Google OAuth, SMS gateway, Courier API, Fraud-check API.

### Cross-cutting engineering
- [x] **Money stored as integers (paisa)** to avoid floating-point rounding on currency.
- [x] **Snapshotting** — order items freeze product name, price, variant label, and **sourcing cost** at purchase time, so later edits never rewrite historical orders.
- [x] **Anti-oversell** — atomic conditional stock decrements inside a DB transaction at checkout.
- [x] **Background jobs** — mail/SMS via BullMQ, with `MailLog` / `SmsLog` audit trails and automatic retries.
- [x] **Fraud check** + **IP blocking** (edge middleware + Redis).
- [x] **Rate limiting** on sensitive endpoints (login, magic link, password reset).

---

## 4. Recent Work (This Engagement)

### A. Financial Reporting Module (Monthly P&L)
A complete profit-and-loss system built on standard e-commerce accounting:

- **Formula:** `Net Revenue = Gross Sales − Returns`, `Gross Profit = Net Revenue − COGS`, `Net Profit = Gross Profit − Operating Expenses`.
- **Accurate recognition:** sales are counted on the **delivery date** and returns on the **return date** (read from the order status-change history), so a "monthly" report reflects money actually realised — correct for COD.
- **COGS rules:** only goods **sold and kept** count; resellable returns have no cost impact; **damaged returns** become an *Inventory Loss* expense.
- **Per-order cost capture:** outbound shipping, return shipping, and COD/gateway fees are tracked per order on the order detail page.
- **Product sourcing cost:** entered per product, **snapshotted** onto each order line at checkout.
- **Manual expenses:** admin-entered overheads (Marketing, Software, Rent, Salaries, Utilities, Packaging…) with a management UI.
- **Dashboard:** summary cards (Net Revenue, COGS, Gross Profit, Total OpEx), a headline **Net Profit** card with a profit/loss indicator, and a full P&L breakdown table with a month selector.

*(Also fixed a caching bug where `Date` objects lost their type through the Redis JSON round-trip.)*

### B. Admin Login Redesign + Password Recovery
- **Redesigned** the admin login into a modern, branded, dark "glassmorphic" screen (shared `AuthShell` across login/forgot/reset).
- **Forgot-password → email recovery:** enter your email → receive a **single-use, 30-minute** secure reset link → set a new password.
- **Modern reset email template** — table-based, inline-styled, brand-consistent, with a clear CTA, copy-paste fallback link, and a security notice.
- **Security:** no email enumeration, per-email + per-IP rate limiting, tokens invalidated on use, `email` added to the admin account.
- Fixed the edge middleware so the recovery routes are reachable while signed out.

---

## 5. Project Summary

**fz-mart** is a production-oriented, **single-vendor e-commerce platform** tailored to a
**Cash-on-Delivery** business in Bangladesh. It pairs a fast, SEO-friendly **Next.js 15 /
React 19** storefront with a comprehensive **admin panel**, backed by **MySQL (via Prisma)**
for durable data and **Redis** for sessions, caching, and rate limiting. Money is handled as
integer paisa, order history is immutably snapshotted, and stock is protected against
overselling with transactional, atomic decrements.

The platform covers the full commerce lifecycle: **catalog → variants → cart → COD checkout →
courier fulfilment → returns**, with **passwordless customer auth**, **flash sales**, **reviews**,
and a **CMS**. Notifications (email/SMS) run through a **BullMQ background-job queue** with full
audit logging, and the system integrates pluggably with **courier**, **fraud-check**, **SMS**,
and **marketing-pixel** providers — all configured (with secrets encrypted at rest) from the
admin Settings hub.

Most recently, the platform gained a **true monthly Profit & Loss module** — turning raw order
data plus captured costs into real financial insight (revenue, COGS, operating expenses, and net
profit/loss) — and a **redesigned admin login with full email-based password recovery**. The
codebase is fully **TypeScript**, type-checked end to end, and organised into clear layers:
`app/` (routes & UI), `server/` (business logic), `lib/` (shared utilities), `integrations/`
(external adapters), and `jobs/` (background workers).

---

### Key Commands

```bash
npm run dev          # start the Next.js app (http://localhost:3000)
npm run worker       # start the background mail/SMS worker (required for emails to send)
npm run db:migrate   # apply database migrations (development)
npm run db:deploy    # apply migrations (production)
npm run db:seed      # seed the database (admin user, shipping zones, sample data)
npm run build        # production build
npm run lint         # ESLint
```

> **Note:** For transactional emails (order confirmation, magic link, password reset) to
> actually send, the **worker process must be running** *and* **SMTP must be configured**
> under **Admin → Settings → SMTP**.
