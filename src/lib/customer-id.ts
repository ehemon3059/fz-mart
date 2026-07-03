import { randomBytes } from "node:crypto";

// Customer ids are custom, human-readable strings of the form `fz-XXXXXX`:
// the literal prefix `fz-` followed by 6 random alphanumerics. Generated in
// application code (Prisma has no custom-format default) and passed on create.

const PREFIX = "fz-";
// Crockford-ish alphabet — excludes easily-confused chars (0/O, 1/I/L) so ids
// stay readable over the phone for COD support calls.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const RANDOM_LENGTH = 6;

/** Returns a new customer id, e.g. `fz-A7K9QZ`. */
export function generateCustomerId(): string {
  const bytes = randomBytes(RANDOM_LENGTH);
  let suffix = "";
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${PREFIX}${suffix}`;
}
