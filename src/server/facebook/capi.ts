import { createHash } from "node:crypto";
import type { Order } from "@prisma/client";
import { getCapiConfig } from "@/server/settings/tracking";

// Facebook Conversions API (server-side events).
//
// For this COD store the ONE conversion that matters is a *confirmed* order:
// the owner phones the customer, they confirm, and only then do we tell Meta a
// Purchase happened. That teaches ad delivery to find people who genuinely
// confirm — not everyone who fills the form (many of which are fake).
//
// This is deliberately best-effort: every entry point wraps it so a Facebook
// outage, a missing token, or a bad response can never block or fail an admin
// status change. Failures are logged, not thrown.

const GRAPH_VERSION = "v21.0";

/** SHA-256 lowercased-trimmed hash, as Meta requires for all PII fields. */
function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// Bangladeshi numbers are stored as 01XXXXXXXXX; Meta wants E.164 without the
// leading "+", i.e. country code + number. 8801XXXXXXXXX.
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return digits;
}

/**
 * Report a confirmed order to Meta as a Purchase conversion. No-ops silently
 * unless BOTH a Pixel ID and a CAPI access token are configured. `event_id` is
 * the order number so this event de-duplicates against any browser-side
 * Purchase that shares the same id.
 *
 * Never throws — returns false on any problem so callers can fire-and-forget.
 */
export async function sendPurchaseConfirmed(order: Order): Promise<boolean> {
  const { pixelId, accessToken, testEventCode } = await getCapiConfig();
  if (!pixelId || !accessToken) return false;

  // user_data: the more matched fields, the better attribution. fbc/fbp tie the
  // event to the ad click; hashed phone/email match the person.
  const userData: Record<string, unknown> = {};
  if (order.customerPhone) userData.ph = hash(normalizePhone(order.customerPhone));
  if (order.customerEmail) userData.em = hash(order.customerEmail);
  if (order.fbc) userData.fbc = order.fbc;
  if (order.fbp) userData.fbp = order.fbp;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        // When the confirmation actually happened (now), in seconds.
        event_time: Math.floor(Date.now() / 1000),
        // De-dupe key shared with any pixel Purchase for this order.
        event_id: order.orderNo,
        // The conversion originated from the owner's phone confirmation call.
        action_source: "phone_call",
        user_data: userData,
        custom_data: {
          currency: "BDT",
          // Order money is stored in paisa; Meta wants major units.
          value: order.total / 100,
          order_id: order.orderNo,
        },
      },
    ],
  };
  if (testEventCode) payload.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
    accessToken,
  )}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Never let a slow Graph call hold up the admin request.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[capi] Purchase event rejected (${res.status}):`, body.slice(0, 500));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[capi] failed to send Purchase event:", err);
    return false;
  }
}
