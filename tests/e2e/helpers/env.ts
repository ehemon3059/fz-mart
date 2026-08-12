import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Minimal .env loader for the Playwright process. Next.js loads .env itself,
 * but the test runner (global setup, DB assertions) runs outside Next and
 * needs DATABASE_URL / REDIS_URL too.
 *
 * Precedence, highest first:
 *   1. existing process env  — CI injects its own values
 *   2. .env.test             — test-only overrides (throwaway DB)
 *   3. .env                  — everything the tests don't need to override
 *
 * .env.test is loaded FIRST so its values win over .env, because each key is
 * only ever written once (the `undefined` check below).
 */

function applyFile(path: string): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), path), "utf8");
  } catch {
    return; // file absent — fine, the next layer supplies the value
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

export function loadEnv(): void {
  applyFile(".env.test");
  applyFile(".env");
}
