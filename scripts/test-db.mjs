#!/usr/bin/env node
/**
 * Runs a Prisma command against the TEST database from .env.test.
 *
 * Exists instead of `dotenv -e .env.test -- prisma …` so the repo doesn't
 * take a dotenv-cli dependency, and — more importantly — so the same safety
 * guard the Playwright suite uses also protects schema commands. `prisma
 * migrate reset` against production would be unrecoverable.
 *
 * Usage:
 *   node scripts/test-db.mjs migrate deploy
 *   node scripts/test-db.mjs migrate reset --force
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HOSTED_HOST_PATTERNS = [
  "tidbcloud.com",
  "planetscale",
  "rds.amazonaws.com",
  "azure.com",
  "digitalocean.com",
  "aivencloud.com",
  "scalegrid",
  "clever-cloud.com",
];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"]);

function parseEnvFile(path) {
  let raw;
  try {
    raw = readFileSync(resolve(process.cwd(), path), "utf8");
  } catch {
    return null;
  }
  const out = {};
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function die(lines) {
  console.error(["", ...lines.map((l) => `  ${l}`), ""].join("\n"));
  process.exit(1);
}

const testEnv = parseEnvFile(".env.test");
if (!testEnv) {
  die([
    "✖ .env.test not found.",
    "",
    "  Copy .env.test.example to .env.test and point DATABASE_URL at a",
    "  throwaway local MySQL database before running test DB commands.",
  ]);
}

const url = testEnv.DATABASE_URL;
if (!url) die(["✖ .env.test has no DATABASE_URL."]);

let host = "";
try {
  host = new URL(url).hostname.toLowerCase();
} catch {
  die(["✖ .env.test DATABASE_URL is not a parseable connection string."]);
}

const hosted = HOSTED_HOST_PATTERNS.find((p) => host.includes(p));
if (hosted) {
  die([
    `✖ REFUSING to run: .env.test DATABASE_URL points at a hosted provider (${hosted}).`,
    `  Host: ${host}`,
    "",
    "  Test-database commands can drop and recreate every table.",
  ]);
}
if (!LOCAL_HOSTS.has(host)) {
  die([
    "✖ REFUSING to run: .env.test DATABASE_URL is not a local host.",
    `  Host: ${host} — expected localhost or 127.0.0.1.`,
  ]);
}

const production = parseEnvFile(".env");
if (production?.DATABASE_URL && production.DATABASE_URL === url) {
  die([
    "✖ REFUSING to run: .env.test DATABASE_URL is identical to .env.",
    "  These must be different databases.",
  ]);
}

const args = process.argv.slice(2);
if (args.length === 0) die(["Usage: node scripts/test-db.mjs <prisma args…>"]);

console.log(`→ prisma ${args.join(" ")}  (db: ${host}/${url.split("/").pop().split("?")[0]})`);

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...testEnv },
});
process.exit(result.status ?? 1);
