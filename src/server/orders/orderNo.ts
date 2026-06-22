import { randomInt } from "node:crypto";

// Public order identifier: short, readable over the phone for COD calls.
// Not a UUID (ugly to read aloud), not sequential (trivially enumerable).
// Format: 6 digits, prefixed — e.g. FZ482913.

const DIGITS = "0123456789";

export function generateOrderNo(): string {
  let digits = "";
  for (let i = 0; i < 6; i++) {
    digits += DIGITS[randomInt(DIGITS.length)];
  }
  return `FZ${digits}`;
}
