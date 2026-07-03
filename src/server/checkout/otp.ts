import { randomInt } from "node:crypto";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { enqueueSmsJob } from "@/jobs/enqueue";

// Phone-OTP for COD checkout (anti-fraud). Codes live only in Redis — never
// the DB — with a short TTL, an attempt cap, and a resend cooldown. On success
// a "verified" marker is set so placeOrder can trust the phone.
//
// Repeat buyers (a prior DELIVERED order to that phone) are trusted and skip
// OTP entirely.

const OTP_TTL_SECONDS = 5 * 60;
const VERIFIED_TTL_SECONDS = 15 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const codeKey = (phone: string) => `otp:code:${phone}`;
const attemptsKey = (phone: string) => `otp:attempts:${phone}`;
const cooldownKey = (phone: string) => `otp:cooldown:${phone}`;
const verifiedKey = (phone: string) => `otp:verified:${phone}`;

export class OtpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpError";
  }
}

/** True if this phone has a delivered order — trusted, no OTP needed. */
export async function isRepeatBuyer(phone: string): Promise<boolean> {
  const delivered = await prisma.order.findFirst({
    where: { customerPhone: phone, status: "DELIVERED" },
    select: { id: true },
  });
  return delivered != null;
}

export async function isPhoneVerified(phone: string): Promise<boolean> {
  return (await redis.get(verifiedKey(phone))) === "1";
}

/**
 * Send (or resend) an OTP. Enforces a resend cooldown. Returns the cooldown
 * seconds so the UI can show a countdown.
 */
export async function sendOtp(phone: string): Promise<{ cooldownSeconds: number }> {
  const onCooldown = await redis.ttl(cooldownKey(phone));
  if (onCooldown > 0) {
    throw new OtpError(`Please wait ${onCooldown}s before requesting another code.`);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await redis.set(codeKey(phone), code, "EX", OTP_TTL_SECONDS);
  await redis.del(attemptsKey(phone));
  await redis.set(cooldownKey(phone), "1", "EX", RESEND_COOLDOWN_SECONDS);

  await enqueueSmsJob({
    type: "otp",
    to: phone,
    message: `Your FZ Mart verification code is ${code}. It expires in 5 minutes.`,
  });

  return { cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

/** Verify a submitted code; on success, mark the phone verified for a window. */
export async function verifyOtp(phone: string, code: string): Promise<void> {
  const attempts = await redis.incr(attemptsKey(phone));
  if (attempts === 1) await redis.expire(attemptsKey(phone), OTP_TTL_SECONDS);
  if (attempts > MAX_ATTEMPTS) {
    await redis.del(codeKey(phone));
    throw new OtpError("Too many attempts. Request a new code.");
  }

  const stored = await redis.get(codeKey(phone));
  if (!stored) throw new OtpError("Your code expired. Request a new one.");
  if (stored !== code.trim()) throw new OtpError("Incorrect code. Please try again.");

  await redis.del(codeKey(phone));
  await redis.del(attemptsKey(phone));
  await redis.set(verifiedKey(phone), "1", "EX", VERIFIED_TTL_SECONDS);
}

/** Consume the verified marker (called once an order is placed). */
export async function clearPhoneVerification(phone: string): Promise<void> {
  await redis.del(verifiedKey(phone));
}
