import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC-SHA256 signature verification for inbound webhooks. The endpoint is
// public, so anyone can POST to it — this proves the request actually came
// from the provider, who signs the raw body with a shared secret.

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Lengths must match before timingSafeEqual — it throws on mismatched
  // buffer lengths rather than returning false.
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;

  return timingSafeEqual(expectedBuf, signatureBuf);
}
