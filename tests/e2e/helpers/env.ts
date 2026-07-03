import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Minimal .env loader for the Playwright process. Next.js loads .env itself,
 * but the test runner (global setup, DB assertions) runs outside Next and
 * needs DATABASE_URL / REDIS_URL too. Existing process env always wins, so
 * CI can inject its own values.
 */
export function loadEnv(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  } catch {
    return; // no .env (e.g. CI) — rely on process env
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
