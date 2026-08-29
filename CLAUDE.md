@AGENTS.md

# fz-mart

Next.js 16.2 App Router, React 19.2, TypeScript 5. Prisma 6 -> MySQL on TiDB Cloud.
Redis via ioredis. BullMQ workers in `src/jobs/` (`run.ts` is the worker entrypoint).
Route groups: `(storefront)` and `(admin)`; admin pages live under `(admin)/admin/(protected)/`.
Custom session auth (bcrypt + TOTP 2FA + Google OAuth), sessions in Redis.
Money is stored as integer paisa everywhere. Never use floats for money.
Payments: COD plus SSLCommerz and bKash gateway integrations (`src/integrations/payments/`,
`src/server/payments/`); `PaymentMethod` is COD | ONLINE | PARTIAL. Gateway credentials are
configured per-shop in admin settings, so treat online payment paths as live code.
REST routes are few and mostly for external callers (courier webhooks, payment IPN/return,
product feeds, health, search suggest, admin upload, Google OAuth callback, CSV exports).
Everything else is server actions.

## Security rules — non-negotiable
- Every exported server action MUST call an auth/permission guard as its FIRST statement:
  `requireAdmin()` (`src/lib/auth.ts`), `requireAdminUser()` / `requirePermission()`
  (`src/server/admin/guard.ts`), or `requireCustomer()` for storefront account actions.
- Ownership filters go inside the Prisma `where` clause, never checked in JS after the fetch.
- Order totals are recomputed server-side from the DB. Client-supplied prices are ignored.
- Stock decrements and coupon usage increments must be conditional updates inside a transaction.
- No `$queryRawUnsafe` / `$executeRawUnsafe`. Parameterized `$queryRaw` tagged templates are
  used deliberately in a few places (search, analytics, reports) and must stay parameterized.
- No server-only env var may be read inside a client component. Payment/courier API secrets
  never cross to the client.

## Conventions
- Prefer `findFirst` with a scoped `where` over `findUnique` for anything user-owned.
- Errors returned to the client are generic. Detail goes to Sentry only.
