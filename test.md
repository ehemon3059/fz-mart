# FZ Mart — Testing Instructions for Claude Code

## Stack
- Next.js 16 + Prisma + MySQL + Redis (BullMQ)
- E2E: Playwright (`@playwright/test`)
- Deployed target: single VPS (4 vCPU / 4GB RAM)

## Before testing
1. Ensure `.env` has a TEST database URL, separate from production/dev DB — never run tests against real order data.
2. Run `npm run db:migrate` on the test DB first.
3. Start dependencies: MySQL, Redis, and the worker (`npm run worker`) must be running for order/checkout flows.

## Test commands
- `npm run lint` — run first, fix all errors before functional testing
- `npm run test:e2e` — Playwright suite (checkout, cart, admin CRUD)
- `npm run build` — must succeed with zero errors before any deploy

## What to test on every change
When I ask you to test the app, always cover these flows unless I say otherwise:
1. **Storefront**: homepage load, category navigation, product detail page, add to cart
2. **Checkout**: cart → address → COD order placement → order confirmation (verify DB order snapshot is immutable and stock decremented atomically — check for race conditions if two orders hit the same low-stock item)
3. **Admin**: login, product create/edit with image upload (Sharp resize), category tree CRUD
4. **Background jobs**: confirm BullMQ worker picks up and processes the order-confirmation job (check Redis queue empties, email/log output)

## How to test
- Prefer writing/running actual Playwright tests over manual clicking — add new `.spec.ts` files under `tests/` for any flow I describe.
- After code changes, run `npm run lint && npm run build` before declaring a task done.
- If a test fails, show me the failing assertion and the relevant server/DB state — don't just say "it failed."
- Never run tests against a database with real customer/order data.

## Load/capacity testing (VPS sizing)
When asked to check capacity:
- Use `k6` or `autocannon` against `/`, a product page, and `/api/checkout` (or the actual checkout route).
- Report requests/sec, p95 latency, and error rate at increasing concurrency (10 → 50 → 100 concurrent).
- Watch server-side: `htop` or `pm2 monit` for RAM/CPU during the run — flag if MySQL or the Node process approaches memory limits.

## Do not
- Do not modify production `.env` or run migrations against a non-test database without asking first.
- Do not commit test artifacts (screenshots, videos, `test-results/`) — ensure they're gitignored.