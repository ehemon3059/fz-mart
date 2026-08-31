import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import Redis from "ioredis";
import { prisma, E2E_ADMIN } from "./helpers/db";
import { adminLogin } from "./helpers/admin";

/*
 * Session-security regression suite.
 *
 * These cover the invariants in docs/security-decisions.md SD-003/SD-004 — the
 * absolute cap, the idle window, and revocation on credential change. They are
 * written so that REVERTING the corresponding fix makes the test fail, which is
 * the only property that makes a security test worth having:
 *
 *   - Remove the issuedAt check in getSession  → "absolute cap" fails.
 *   - Stop sliding / stop expiring the key     → "idle window" fails.
 *   - Drop revokeOtherAdminSessions from the
 *     password-change or reset path            → the two revocation tests fail.
 *
 * Elapsed time is SIMULATED by rewriting Redis directly (rolling issuedAt
 * backwards, deleting the key the way a TTL expiry would). Waiting out an 8-hour
 * idle window in a test suite is not an option, and sleeping for a shortened one
 * would test a configuration nobody deploys.
 *
 * NOTE ON SCOPE: this file changes the E2E admin's password. It restores it in
 * afterAll, and every test re-logs-in, so ordering with other admin specs stays
 * safe — but the restore is what keeps the suite re-runnable, so don't remove it.
 */

const SESSION_COOKIE = "fz_admin_session";
const ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 7; // must match SESSION_ABSOLUTE_TTL_SECONDS
const NEW_PASSWORD = "e2e-rotated-password-9";

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: 3,
});

function sessionKey(id: string): string {
  return `admin_session:${id}`;
}

/**
 * Clear the login rate-limit counters.
 *
 * This spec logs in far more often than a normal one — several contexts per
 * test, plus a re-login after each credential change — and the limiter allows
 * only 5 attempts per username per 10 minutes. Without this the later tests
 * are rejected before they ever reach the code under test, and fail as an
 * opaque navigation timeout rather than a real assertion.
 */
async function clearLoginRateLimits(): Promise<void> {
  const keys = await redis.keys("ratelimit:login:*");
  if (keys.length > 0) await redis.del(...keys);
}

/** The admin session id currently held by this browser context. */
async function sessionIdFrom(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((c) => c.name === SESSION_COOKIE);
  if (!cookie?.value) throw new Error("No admin session cookie — did login succeed?");
  return cookie.value;
}

/**
 * Whether the page is still authenticated, judged by navigating to a protected
 * route and seeing where we land.
 *
 * Deliberately NOT judged by the cookie's presence: the cookie can outlive the
 * Redis record, and it is exactly that gap (a live-looking cookie backed by
 * nothing) these tests are about.
 */
async function isStillLoggedIn(page: Page): Promise<boolean> {
  await page.goto("/admin/dashboard");
  await page.waitForURL(/\/admin\/(dashboard|login)/, { timeout: 30_000 });
  return !page.url().includes("/admin/login");
}

test.afterAll(async () => {
  // Restore the seeded password so the suite is re-runnable and other admin
  // specs still log in. Done through the DB rather than the UI: the UI path is
  // what these tests are perturbing.
  //
  // bcrypt is used directly rather than importing hashPassword from
  // src/lib/auth.ts — that module imports next/navigation, which throws
  // ("Cannot read properties of undefined") when loaded outside the Next
  // runtime, i.e. in this Playwright process. Cost of the duplication is that
  // BCRYPT_COST is repeated; it only affects how this test row is hashed.
  const bcrypt = (await import("bcrypt")).default;
  await prisma.adminUser.updateMany({
    where: { username: E2E_ADMIN.username },
    data: { passwordHash: await bcrypt.hash(E2E_ADMIN.password, 12) },
  });
  await redis.quit();
  await prisma.$disconnect();
});

test.beforeEach(async () => {
  await clearLoginRateLimits();
});

test.describe("session lifetime limits", () => {
  test("a session past the absolute cap is rejected and its key deleted", async ({ page }) => {
    await adminLogin(page);
    const sessionId = await sessionIdFrom(page.context());

    // Sanity: the record exists and carries issuedAt. If this ever fails, the
    // storage shape changed and the rest of this test proves nothing.
    const before = await redis.get(sessionKey(sessionId));
    expect(before, "session should exist in Redis after login").toBeTruthy();
    const parsed = JSON.parse(before!);
    expect(parsed.issuedAt, "session record must carry issuedAt").toBeTruthy();

    // Simulate elapsed time: roll issuedAt back past the cap, leaving the TTL
    // generous so ONLY the absolute check can reject it. A test that let the
    // TTL lapse too would pass even with the cap check removed.
    parsed.issuedAt = Date.now() - (ABSOLUTE_TTL_SECONDS + 3600) * 1000;
    await redis.set(sessionKey(sessionId), JSON.stringify(parsed), "EX", ABSOLUTE_TTL_SECONDS);

    expect(await isStillLoggedIn(page), "expired-by-absolute-cap session must not authenticate")
      .toBe(false);

    // The read must also have cleaned up, not merely refused: a rejected record
    // left in Redis is a session that stays revocable-but-alive in the index.
    expect(await redis.get(sessionKey(sessionId)), "rejected session key must be deleted")
      .toBeNull();
  });

  test("a session idle past the sliding TTL is rejected", async ({ page }) => {
    await adminLogin(page);
    const sessionId = await sessionIdFrom(page.context());

    const ttl = await redis.ttl(sessionKey(sessionId));
    // The idle window must be the SHORT one (8h), not the absolute cap. If this
    // starts failing because the TTL equals the 7-day cap, sliding was removed
    // and the idle timeout is gone.
    expect(ttl, "idle TTL should be well under the absolute cap").toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60 * 60 * 8);

    // Simulate the idle window lapsing: Redis expiry deletes the key, so delete
    // it. issuedAt stays recent, meaning the absolute cap CANNOT be what
    // rejects this — only the missing record can.
    await redis.del(sessionKey(sessionId));

    expect(await isStillLoggedIn(page), "session idle past its TTL must not authenticate")
      .toBe(false);
  });

  test("a well-formed but unknown session id is rejected", async ({ page, context }) => {
    // 64 hex chars — indistinguishable in shape from a real id, so nothing but
    // the Redis lookup can reject it. This is the guess-a-session-id case.
    const forged = "a".repeat(64);
    expect(await redis.get(sessionKey(forged)), "precondition: forged id must not exist")
      .toBeNull();

    await context.addCookies([
      {
        name: SESSION_COOKIE,
        value: forged,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    expect(await isStillLoggedIn(page), "a session id we never issued must not authenticate")
      .toBe(false);
  });
});

test.describe("revocation on credential change", () => {
  // These drive several full logins plus a reset through the real UI. On a dev
  // server that compiles routes on first hit, that exceeds the 90s default.
  test.slow();

  test("changing the password logs out a second browser context", async ({ browser }) => {
    // Two independent contexts = two independent sessions for one admin, which
    // is the situation revocation exists for.
    const victimContext = await browser.newContext();
    const attackerContext = await browser.newContext();

    try {
      const victimPage = await victimContext.newPage();
      const attackerPage = await attackerContext.newPage();

      await adminLogin(victimPage);
      await clearLoginRateLimits();
      await adminLogin(attackerPage);

      const attackerSessionId = await sessionIdFrom(attackerContext);
      const victimSessionId = await sessionIdFrom(victimContext);
      expect(attackerSessionId).not.toBe(victimSessionId);

      // Both are genuinely authenticated before the change — otherwise the
      // assertion afterwards would pass for the wrong reason.
      expect(await isStillLoggedIn(attackerPage), "precondition: second session is live")
        .toBe(true);

      // The victim changes their password through the real UI. Scoped to the
      // password form by its id: "Current password" also labels a field in the
      // username form on this page, and an unscoped lookup is ambiguous.
      await victimPage.goto("/admin/account");
      await victimPage.locator("#password-current").fill(E2E_ADMIN.password);
      await victimPage.locator("#password-new").fill(NEW_PASSWORD);
      await victimPage.locator("#password-confirm").fill(NEW_PASSWORD);
      await victimPage.getByRole("button", { name: /update password/i }).click();
      await expect(victimPage.getByText(/password has been updated/i)).toBeVisible({
        timeout: 15_000,
      });

      // The other session must be dead in Redis...
      expect(
        await redis.get(sessionKey(attackerSessionId)),
        "the other session's Redis record must be gone",
      ).toBeNull();

      // ...and dead in practice.
      expect(
        await isStillLoggedIn(attackerPage),
        "a session held since before the password change must be logged out",
      ).toBe(false);

      // The victim's own session was ROTATED, not merely kept: the pre-change
      // id must no longer work either.
      const rotatedId = await sessionIdFrom(victimContext);
      expect(rotatedId, "the acting session's id must be rotated").not.toBe(victimSessionId);
      expect(await redis.get(sessionKey(victimSessionId))).toBeNull();
      expect(await isStillLoggedIn(victimPage), "the acting session stays signed in").toBe(true);
    } finally {
      await victimContext.close();
      await attackerContext.close();
    }
  });

  test("a password reset kills every existing session", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      // The previous test may have changed the password; log in with whichever
      // one is currently live so this test doesn't depend on file ordering.
      const currentPassword = await resolveCurrentPassword();
      await loginWith(pageA, currentPassword);
      await loginWith(pageB, currentPassword);
      await clearLoginRateLimits();

      const idA = await sessionIdFrom(contextA);
      const idB = await sessionIdFrom(contextB);
      expect(await isStillLoggedIn(pageA), "precondition: session A live").toBe(true);
      expect(await isStillLoggedIn(pageB), "precondition: session B live").toBe(true);

      // Seed a valid reset token directly, then consume it through the REAL
      // reset page. The email round-trip that would normally deliver the token
      // is not what this test is about, but everything after it is — driving
      // the actual form means the server action under test is the one that
      // runs, in the Next runtime where it belongs. (Importing the action into
      // this process is not an option: it transitively loads next/navigation.)
      const admin = await prisma.adminUser.findFirstOrThrow({
        where: { username: E2E_ADMIN.username },
      });
      const token = `e2e-reset-${Date.now()}`;
      await prisma.passwordResetToken.create({
        data: {
          adminId: admin.id,
          token,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      // A third context: the reset page is unauthenticated, and using one of
      // the signed-in contexts would muddy which session died and why.
      const resetContext = await browser.newContext();
      try {
        const resetPage = await resetContext.newPage();
        await resetPage.goto(`/admin/reset-password?token=${token}`);
        // Guard against a silently-invalid token turning this into a no-op pass.
        await expect(resetPage.getByRole("button", { name: /update password/i })).toBeVisible({
          timeout: 30_000,
        });
        await resetPage.getByPlaceholder("At least 8 characters").fill(E2E_ADMIN.password);
        await resetPage.getByPlaceholder("Re-enter your new password").fill(E2E_ADMIN.password);
        await resetPage.getByRole("button", { name: /update password/i }).click();
        await resetPage.waitForURL(/\/admin\/login/, { timeout: 30_000 });
      } finally {
        await resetContext.close();
      }

      // The token must have been consumed — proves the reset actually ran.
      const consumed = await prisma.passwordResetToken.findUnique({ where: { token } });
      expect(consumed?.usedAt, "reset token must be marked used").toBeTruthy();

      // A reset spares nothing — it is the "I have lost control of this account"
      // path, so both sessions must be gone.
      expect(await redis.get(sessionKey(idA)), "session A record must be gone").toBeNull();
      expect(await redis.get(sessionKey(idB)), "session B record must be gone").toBeNull();
      expect(await isStillLoggedIn(pageA), "session A must be logged out").toBe(false);
      expect(await isStillLoggedIn(pageB), "session B must be logged out").toBe(false);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

/** Whichever password currently works, so specs don't depend on run order. */
async function resolveCurrentPassword(): Promise<string> {
  const bcrypt = (await import("bcrypt")).default;
  const admin = await prisma.adminUser.findFirstOrThrow({
    where: { username: E2E_ADMIN.username },
  });
  if (await bcrypt.compare(E2E_ADMIN.password, admin.passwordHash)) return E2E_ADMIN.password;
  if (await bcrypt.compare(NEW_PASSWORD, admin.passwordHash)) return NEW_PASSWORD;
  throw new Error("Neither known E2E admin password matches — reset the test admin.");
}

async function loginWith(page: Page, password: string): Promise<void> {
  await clearLoginRateLimits();
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill(E2E_ADMIN.username);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/dashboard/);
}
