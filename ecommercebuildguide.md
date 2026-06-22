# E-Commerce Build Guide — Phase 0 → End (with development reasoning)

A companion to the project blueprint. The blueprint says *what* to build; this
document explains *how a developer actually executes each phase* and, more
importantly, *why* each decision is made the way it is. Read each phase's
"Why it matters" — that's the part that separates a working build from a
maintainable one.

---

## Phase 0 — Foundation

**Goal:** Make the three load-bearing pieces (database, cache, secrets) trustworthy
before any feature touches them.

### Steps
1. Install Node.js LTS, MySQL 8.0+, Redis, Git.
2. Scaffold: `npx create-next-app@latest --typescript --app`.
3. Set up `.env` and `.env.example` on day one; add `.env` to `.gitignore`.
4. Install: `prisma`, `@prisma/client`, `ioredis`, `bullmq`, `bcrypt`.
5. `lib/prisma.ts` — single Prisma client (singleton).
6. `lib/redis.ts` — single ioredis connection (singleton).
7. `lib/crypto.ts` — AES-256-GCM encrypt/decrypt for secrets at rest.
8. Generic `Setting` model + `lib/settings.ts` typed reader (decrypts on read).
9. Model only the Phase-1 entities first; run `prisma migrate dev --name init`.
10. Write `prisma/seed.ts`; get `npm run dev` booting cleanly.

### Why it matters
- **Singleton clients are not polish.** Next.js dev hot-reload re-executes modules,
  so `new Prisma/Redis()` per import leaks connections until the pool is exhausted.
  Cache the instance on `globalThis` in dev.
- **Migrations vs push.** Use `migrate dev` locally and `migrate deploy` on prod.
  Never `db push` on production — it can silently drop columns with no history.
- **Crypto before integrations.** Building encryption before any API key exists
  removes the temptation to "store it plaintext for now." That "now" becomes
  permanent in most real projects.
- **Don't model the whole blueprint on day one.** Model what Phase 1 needs; iterate.
  Premature schema is rework waiting to happen.

---

## Phase 1 — Storefront vertical slice (the demo)

**Goal:** Prove the entire request lifecycle works once, end to end, before building breadth.
Path: Homepage → Category → Product detail → Cart → COD Checkout → Confirmation → Tracking.

### Steps
1. `ProductCard` with discount/strikethrough pricing, promo badge, stock status.
2. Cart in client state (Zustand/Context) + localStorage; add "Buy Now" shortcut.
3. Checkout form: name, phone, address, delivery zone.
4. Server-side order creation inside a transaction (re-verify price + stock).
5. Generate unique public `orderNo`; decrement stock atomically.
6. Public tracking by `orderNo` + phone as a light check.

### Why it matters
- **Service layer starts here.** `server/products/getProductBySlug()` returns typed
  data; pages call that, never `prisma` directly. When you add caching later, every
  caller benefits with zero page changes.
- **Checkout is the riskiest code in the app.** Re-fetch price and stock server-side
  inside a `prisma.$transaction`. Without the transaction, two simultaneous orders on
  the last unit both succeed → overselling. Snapshot name + price onto `OrderItem`
  at this moment — historical orders must never change when products are later edited.
- **Never trust the cart.** The browser-submitted price/qty are display only; the
  server is the authority on what gets charged and reserved.
- **orderNo:** short, random, readable over the phone, with a uniqueness retry loop.
  Not a UUID (ugly for COD calls), not sequential (trivially enumerable).

---

## Phase 2 — Admin core

**Goal:** Give staff control over what Phase 1 made public.

### Steps
1. Admin auth: bcrypt password (cost ≥10), session in Redis, route guard in middleware.
2. Product / Category / Subcategory / Banner CRUD.
3. Order management: view list, advance through status state machine.

### Why it matters
- **Session, not localStorage JWT.** Store a random session ID in an httpOnly, secure
  cookie; validate against Redis. A JWT in localStorage is XSS-exfiltratable.
- **Guard in middleware.** Auth check runs at the edge before page code — centralized
  and cheap, instead of repeating per-page.
- **Status is a state machine, not free text.** Define an ordered enum in `config/`
  (`PENDING → CONFIRMED → SHIPPED → DELIVERED`, plus `CANCELLED`/`RETURNED`). One
  definition drives both the admin dropdown and the public tracking page.

---

## Phase 3 — Light settings features (quick batch)

**Goal:** Ship several small, independent wins; each is a form + a narrow effect.

### Steps
1. **Shipping zones** — CRUD; feeds checkout `<select>`; charge added server-side.
2. **Tag Manager (GTM)** — store id, inject script in head only if set.
3. **Pixel Manager** — store id, fire AddToCart / Purchase events.
4. **IP Block** — DB table is editable source of truth; Redis set is enforcement.
5. **Stock Report** — read-only view over product data; cache in Redis (short TTL).
6. **Order Reports** — aggregation by date/status/totals; cache in Redis.

### Why it matters
- **Never trust client-submitted delivery charge.** Resolve the zone's charge on the
  server from the zone id.
- **IP block: two layers, one truth.** Middleware checks a Redis *set* (O(1), no DB
  hit per request); the DB table is what admins edit. On add/remove, sync both — and
  rebuild the Redis set on boot so a cache flush can't silently unblock everyone.
- **Conditional script injection.** If a GTM/Pixel id is empty, render nothing — not
  an empty `<script>`.

---

## Phase 4 — Notification infrastructure

**Goal:** Send SMS/email without ever blocking order placement.

### Steps
1. Stand up BullMQ queue + a **separate worker process** (`jobs/`).
2. **Mail (SMTP)** — settings form, mail adapter, queue order-confirmation mail.
3. **SMS gateway** — integrate a BD provider, queue order-status SMS; log to `SmsLog`.

### Why it matters
- **This is the single reason Redis is in the stack.** The order saves instantly; a
  background worker sends the notification. If the SMS API is slow or down, checkout
  is unaffected.
- **The worker is a second process.** It does not run inside Next.js. Plan now to
  deploy two processes against the same Redis + MySQL — this dictates VPS over
  serverless (serverless has no persistent worker).
- **Retries + dead-letter.** Configure BullMQ retry with backoff. A failed SMS retries;
  it never crashes the order. Log every attempt to `SmsLog`/`MailLog` for auditing.

---

## Phase 5 — Courier & fraud integrations

**Goal:** Create consignments and assess customer risk through external courier APIs.

### Steps
1. **Courier adapter** (Pathao / Steadfast / RedX) — create consignment from an order,
   store `CourierShipment`, sync status.
2. **Webhook route** for courier status callbacks.
3. **Fraud API** — check customer phone, cache result in Redis + `FraudCheckResult`,
   surface a risk indicator to admin.

### Why it matters
- **Webhooks must be idempotent.** Providers retry callbacks; the same status can
  arrive twice. Key updates on `consignmentId` + status so a duplicate is a no-op.
- **Verify webhook authenticity.** Validate a signature/secret — the endpoint is public.
- **Fraud cache is cost control.** Each lookup costs money/time. Cache per phone number;
  pick one trigger point (recommend: at checkout for COD) rather than leaving it
  ambiguous.
- **Adapters isolate provider churn.** All courier-specific quirks live behind one
  interface; swapping providers touches one folder, not the order flow.

---

## Phase 6 — Caching & performance pass

**Goal:** Make hot reads fast and abusive requests cheap to reject.

### Steps
1. Redis cache on catalog reads and report queries.
2. Explicit invalidation: editing a product clears its cache + affected listings.
3. Rate limit checkout, admin login, and fraud-API calls.

### Why it matters
- **Every cache entry needs a written "what clears this" rule.** Cache without an
  invalidation plan is a stale-data bug generator.
- **Cache at the service layer.** Because pages already go through `server/`, you add
  caching in one place and the whole app speeds up.
- **Rate-limit COD specifically.** Fake/prank orders are a real cost in COD. Limit per
  phone + IP at checkout, not just generically.

---

## Phase 7 — Testing

**Goal:** Confirm the real behaviors, not just that pages render.

### Steps
1. Walk both cart and Buy-Now flows end to end.
2. Verify: stock decrements, order shows in admin, status change reflects on tracking,
   SMS/email actually send, old orders keep snapshot prices.
3. Edge cases: out-of-stock, empty cart, invalid phone, blocked IP, courier/SMS failure
   (queue must retry, not crash).
4. Test every page on a **real phone** — most shoppers are mobile.

### Why it matters
- **Concurrency is the test people skip.** Fire two checkouts on the last unit and
  confirm exactly one wins. This is the bug that costs real money in production.
- **Test the failure paths of every integration**, not just the happy path. The whole
  point of the queue is graceful degradation — prove it degrades gracefully.

---

## Phase 8 — Deployment (VPS-oriented)

**Goal:** Run the same two-process architecture in production safely.

### Steps
1. Provision MySQL 8 + Redis (VPS or managed).
2. Deploy two processes: Next.js app **and** the queue worker (use PM2/systemd).
3. `prisma migrate deploy` against prod; seed minimal real data.
4. Domain, HTTPS (Let's Encrypt/reverse proxy), production env vars with encrypted secrets.
5. Re-run Phase 7 checks against live before announcing.

### Why it matters
- **`migrate deploy`, never `dev` or `db push` on prod.** Deploy applies committed
  migrations only — deterministic, no schema drift.
- **The worker needs a supervisor.** PM2 or systemd restarts it on crash; a worker that
  dies silently means notifications quietly stop while orders keep flowing.
- **Encryption key is a prod secret too.** The `lib/crypto.ts` key lives in prod env
  vars — lose it and every stored API key becomes unreadable.

---

## Phase 9 — After launch

**Goal:** Keep it alive, observable, and redeployable.

### Steps
1. Automated DB backups (e.g. rclone → Backblaze B2), and **test a restore**.
2. Basic analytics + error monitoring (e.g. Sentry).
3. A documented `.env.example` so another dev/the client can redeploy.

### Why it matters
- **An untested backup is not a backup.** Restore it once to a scratch DB to prove it works.
- **Error monitoring beats waiting for complaints.** For a store, a silent checkout
  error is lost revenue; you want to know before the customer tells you.

---

## Cross-cutting rules (apply in every phase)
1. **Never trust the browser** — re-verify price + stock server-side at checkout.
2. **Snapshot order data** — name + price frozen on `OrderItem` at purchase.
3. **Service layer only** — pages/components call `server/`, never DB or external APIs directly.
4. **Encrypt secrets** — all keys/passwords encrypted in the `Setting` table.
5. **Async for slow work** — every external call (SMS, courier, fraud, mail) goes through the queue.
6. **Cache with invalidation** — every cache entry has a written rule for what clears it.

---

## Effort reality check
Base COD storefront = 100%. The ten extra features add ~30–45%. The integrations
(courier, fraud, SMS) are *small in code but heavy in time* — sandbox accounts,
provider docs, webhook testing, and failure handling dominate. **Budget by
integration count, not lines of code.**
