import { test, expect } from "@playwright/test";
import { assertTestEnvironment } from "./guard";

/*
 * The guard needs its own test, or the next connection we add gets forgotten
 * the same way Redis was.
 *
 * This spec is unusual: it is the only one that asserts the harness ABORTS.
 * Every other spec proves the app works; this one proves the safety check that
 * lets those specs run at all actually fires. Without it the guard is a
 * function nobody ever sees fail, and a guard that silently stops working is
 * indistinguishable from one that is passing.
 *
 * Each case sets a deliberately production-looking value, runs the guard, and
 * requires a throw. env is restored after every case so nothing leaks into the
 * rest of the run.
 */

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const saved = new Map<string, string | undefined>();
  for (const key of Object.keys(overrides)) saved.set(key, process.env[key]);
  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

// The override exists for CI service containers; it must not mask a live
// mail/SMS provider, so it is cleared for every case here.
const BASE = { E2E_ALLOW_UNSAFE_DB: undefined };

test.describe("E2E environment guard", () => {
  test("passes on the current (test) environment", () => {
    // If this fails, the suite is misconfigured and every other assertion
    // below is meaningless — so it runs first.
    expect(() => assertTestEnvironment()).not.toThrow();
  });

  test("aborts on a hosted database", () => {
    withEnv(
      { ...BASE, DATABASE_URL: "mysql://u:p@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/fz" },
      () => expect(() => assertTestEnvironment()).toThrow(/tidbcloud\.com|hosted provider/i),
    );
  });

  test("aborts on hosted Redis — the failure that actually happened", () => {
    withEnv({ ...BASE, REDIS_URL: "rediss://default:tok@apn1-real-12345.upstash.io:6379" }, () =>
      expect(() => assertTestEnvironment()).toThrow(/upstash\.io|hosted provider/i),
    );
  });

  test("aborts on a non-local host that is not a known provider", () => {
    // The provider list can never be complete, so the local-host rule is what
    // actually carries the guarantee. This proves it does.
    withEnv({ ...BASE, REDIS_URL: "redis://cache.internal.example.com:6379" }, () =>
      expect(() => assertTestEnvironment()).toThrow(/not a local host/i),
    );
  });

  test("aborts on a production-looking R2 bucket", () => {
    // The gap this spec was written for: R2 has no local host to check, so an
    // unmarked bucket name is the only thing standing between a spec and the
    // client's live product images.
    withEnv({ ...BASE, R2_BUCKET: "fzmart-media" }, () =>
      expect(() => assertTestEnvironment()).toThrow(/not identifiably a test resource/i),
    );
  });

  test("accepts a test-named R2 bucket", () => {
    withEnv({ ...BASE, R2_BUCKET: "fz-mart-test" }, () =>
      expect(() => assertTestEnvironment()).not.toThrow(),
    );
  });

  test("aborts when mail would really be delivered", () => {
    withEnv({ ...BASE, MAIL_DELIVERY: "inline" }, () =>
      expect(() => assertTestEnvironment()).toThrow(/DELIVERS FOR REAL/i),
    );
  });

  test("aborts when an SMS provider would really send", () => {
    // SMS is not built yet. This asserts the guard is ready BEFORE the feature
    // lands, so the first OTP adapter cannot text real customers during a run.
    withEnv({ ...BASE, SMS_PROVIDER: "twilio" }, () =>
      expect(() => assertTestEnvironment()).toThrow(/DELIVERS FOR REAL/i),
    );
  });

  test("E2E_ALLOW_UNSAFE_DB exempts hosts but NOT delivery", () => {
    // A CI job sets this for its ephemeral containers. It must not become a
    // blanket "disable the safety checks" flag: real mail is real mail whether
    // or not the database is disposable.
    withEnv({ E2E_ALLOW_UNSAFE_DB: "1", MAIL_DELIVERY: "inline" }, () =>
      expect(() => assertTestEnvironment()).toThrow(/DELIVERS FOR REAL/i),
    );
  });
});
