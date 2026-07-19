import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

// Object-storage adapter — Cloudflare R2 (S3-compatible, zero egress).
//
// This is the ONE place that talks to the storage provider. Admin upload flows
// (products, variants, banners, appearance/logo) go through the /api/admin/upload
// route, which calls uploadImage() here. The absolute public URL is stored in
// the DB as a plain string, so switching providers means editing only this file
// and next.config.ts's images.remotePatterns.
//
// R2 breaks the "images vanish on redeploy" problem: files live in the bucket,
// not the container's ephemeral filesystem, so they survive a fresh deploy onto
// an empty local disk.

// --- Config -----------------------------------------------------------------

export interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL the bucket is served from (r2.dev or a custom domain). */
  publicBaseUrl: string;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Image storage is not configured — set R2_* variables in the environment.",
    );
    this.name = "StorageNotConfiguredError";
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

function readConfig(): StorageConfig | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicBaseUrl
  ) {
    return null;
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    // Normalise: no trailing slash so we can join with `/key` cleanly.
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
}

/** True when the environment is configured for object storage. */
export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

let cachedClient: { client: S3Client; config: StorageConfig } | null = null;

function getClient(): { client: S3Client; config: StorageConfig } {
  const config = readConfig();
  if (!config) throw new StorageNotConfiguredError();

  // Reuse the client across invocations (it holds a connection pool), but rebuild
  // if the resolved config ever changes (e.g. rotated keys between deploys).
  if (
    cachedClient &&
    cachedClient.config.accessKeyId === config.accessKeyId &&
    cachedClient.config.bucket === config.bucket
  ) {
    return cachedClient;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedClient = { client, config };
  return cachedClient;
}

// --- Upload validation ------------------------------------------------------

/** Content types accepted for upload. SVG/GIF are intentionally excluded — SVG
 *  is a script-injection vector and next/image can't optimize either well. */
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Whitelisted key prefixes — callers can only write inside these folders. */
export const STORAGE_FOLDERS = ["products", "banners", "branding", "categories"] as const;
export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

/** Largest edge (px) an uploaded image is downscaled to before storing.
 *  next/image regenerates responsive variants at serve time, so we only need a
 *  sane upper bound to cap stored file size — never upscale. */
const MAX_DIMENSION = 1600;

// --- Public API -------------------------------------------------------------

export interface UploadImageInput {
  /** Raw file bytes (already read from the multipart form). */
  buffer: Buffer;
  /** Browser-declared content type — validated against the allowlist. */
  contentType: string;
  /** Destination folder; must be one of STORAGE_FOLDERS. */
  folder: StorageFolder;
}

/**
 * Validate, resize, and store an image. Returns the absolute public URL to
 * persist in the DB. The object key is a random UUID — no part of a
 * user-controlled filename reaches the key, so path traversal is impossible.
 */
export async function uploadImage(input: UploadImageInput): Promise<string> {
  const ext = ALLOWED_TYPES[input.contentType];
  if (!ext) {
    throw new StorageError(
      "Unsupported file type. Use JPEG, PNG, WebP, or AVIF.",
    );
  }
  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new StorageError("File too large (max 5 MB).");
  }
  if (!STORAGE_FOLDERS.includes(input.folder)) {
    throw new StorageError("Invalid upload folder.");
  }

  const { client, config } = getClient();

  // Downscale oversized images and re-encode; this also normalizes the bytes
  // (strips EXIF, defends against decompression-bomb payloads that passed the
  // byte check) and confirms the file is actually a decodable image.
  const { body, outExt, outType } = await processImage(input.buffer, ext);

  // UUID key — the stored filename shares nothing with the uploaded name.
  const key = `${input.folder}/${randomUUID()}.${outExt}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: outType,
        // Long cache: keys are immutable (UUID), so a URL never changes content.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (err) {
    throw new StorageError(
      `Upload to storage failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return `${config.publicBaseUrl}/${key}`;
}

/**
 * Delete a previously uploaded image by its public URL. No-ops silently for
 * URLs that don't belong to our bucket (e.g. seed placehold.co images) so
 * callers can delete freely without first checking provenance.
 */
export async function deleteImage(url: string): Promise<void> {
  const config = readConfig();
  if (!config) return; // storage not configured — nothing we own to delete

  if (!url.startsWith(`${config.publicBaseUrl}/`)) return; // not ours
  const key = url.slice(config.publicBaseUrl.length + 1);
  if (!key) return;

  try {
    const { client } = getClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  } catch (err) {
    // Deletion is best-effort cleanup; a failure must not break the admin flow
    // that triggered it (the DB row is already updated).
    console.error("[storage] deleteImage failed (non-blocking):", err);
  }
}

// --- Internal ---------------------------------------------------------------

async function processImage(
  buffer: Buffer,
  ext: string,
): Promise<{ body: Buffer; outExt: string; outType: string }> {
  try {
    const pipeline = sharp(buffer, { failOn: "error" }).rotate(); // apply EXIF orientation
    const meta = await pipeline.metadata();

    // Only downscale when larger than the cap — never upscale.
    if (
      (meta.width && meta.width > MAX_DIMENSION) ||
      (meta.height && meta.height > MAX_DIMENSION)
    ) {
      pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Re-encode in the original format so transparency (PNG/WebP) is preserved.
    switch (ext) {
      case "png":
        return { body: await pipeline.png().toBuffer(), outExt: "png", outType: "image/png" };
      case "webp":
        return { body: await pipeline.webp().toBuffer(), outExt: "webp", outType: "image/webp" };
      case "avif":
        return { body: await pipeline.avif().toBuffer(), outExt: "avif", outType: "image/avif" };
      case "jpg":
      default:
        return {
          body: await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer(),
          outExt: "jpg",
          outType: "image/jpeg",
        };
    }
  } catch {
    throw new StorageError(
      "Could not process the image — it may be corrupt or not a real image.",
    );
  }
}
