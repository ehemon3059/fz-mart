/**
 * Mirror the footer payment marks into R2. Idempotent — re-run any time.
 *
 *   npx tsx --env-file=.env scripts/upload-payment-logos.ts
 *
 * The footer serves these from /public/finence-logos, which is the fast path:
 * same origin, no extra DNS, cached with the deploy. The bucket copy exists so
 * the artwork has a home outside the repo — anything that needs an absolute URL
 * (a transactional email, an invoice PDF, an off-site checkout badge) can point
 * at R2 instead of shipping the file again.
 *
 * Unlike uploadImage(), which mints a UUID key per upload, these keys are
 * STABLE: re-running overwrites the same object rather than littering the bucket
 * with orphans, and any URL already embedded somewhere keeps working. That is
 * safe precisely because the source is first-party artwork under version
 * control, not a user upload whose filename can't be trusted.
 *
 * The bytes still go through sanitizeSvg() — the same allow-list rebuild the
 * admin upload route uses. An SVG served from a public bucket is a document, and
 * "we drew it ourselves" is not a reason to skip the one step that guarantees
 * what R2 hands out contains no script and no external reference.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { sanitizeSvg } from "../src/integrations/storage/svg";

/** Key prefix inside the bucket. Sits under branding/ alongside the shop logo. */
const PREFIX = "branding/payments";

const SLUGS = ["bkash", "nagad", "rocket", "visa", "cod"] as const;

async function main() {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
    R2_PUBLIC_BASE_URL: publicBaseUrl,
  } = process.env;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error("R2_* environment variables are not set — run with --env-file=.env");
  }
  const base = publicBaseUrl.replace(/\/+$/, "");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  for (const slug of SLUGS) {
    const file = path.join(process.cwd(), "public", "finence-logos", `${slug}.svg`);
    const clean = sanitizeSvg(await readFile(file, "utf8"));
    if (!clean) throw new Error(`${slug}.svg did not survive sanitizing — check the file`);

    const key = `${PREFIX}/${slug}.svg`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(clean, "utf8"),
        ContentType: "image/svg+xml",
        // Shorter than the immutable year uploadImage() uses: these keys are
        // stable, so a re-run must be able to actually replace what's cached.
        CacheControl: "public, max-age=86400",
      }),
    );
    console.log(`${slug.padEnd(7)} → ${base}/${key}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
