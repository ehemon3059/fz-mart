import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

// AES-256-GCM encryption for secrets stored at rest in the Setting table
// (API keys, SMTP passwords, courier/fraud/SMS credentials).
//
// GCM is authenticated encryption: it gives confidentiality AND integrity, so
// a tampered ciphertext fails to decrypt rather than returning garbage.
//
// Serialized format (all base64, dot-separated): iv.authTag.ciphertext
//   - iv:       12 random bytes, unique per encryption (GCM standard)
//   - authTag:  16 bytes produced by GCM, verified on decrypt
//   - ciphertext

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const KEY_LENGTH = 32; // 256 bits

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars); ` +
        `got ${key.length} bytes.`,
    );
  }
  return key;
}

/** Encrypt a UTF-8 string. Returns "iv.authTag.ciphertext" (base64 parts). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

/** Decrypt a value produced by `encrypt`. Throws if tampered or malformed. */
export function decrypt(serialized: string): string {
  const parts = serialized.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed ciphertext: expected iv.authTag.ciphertext");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
