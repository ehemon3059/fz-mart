import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCourierConfig } from "@/server/settings/courier";
import { verifyWebhookSignature } from "@/lib/webhook-signature";
import { parseWebhookPayload } from "@/integrations/courier";
import { applyCourierWebhookStatus } from "@/server/courier";

// Public webhook for courier status callbacks. Three things matter here:
//
// 1. AUTHENTICITY — this endpoint is public, so anyone can POST to it.
//    The provider signs the raw body with a shared secret (configured under
//    Admin > Settings > Courier); we verify that signature before trusting
//    anything in the payload.
//
// 2. IDEMPOTENCY — providers retry callbacks, so the same
//    (consignmentId, status) pair can arrive more than once. We only write
//    when the internal status actually changed, so a duplicate delivery push
//    is a no-op rather than a double transition.
//
// 3. LIFECYCLE — a DELIVERED push moves the linked Order to DELIVERED through
//    the order state machine, which writes OrderStatusLog. The finance P&L
//    depends on that log for revenue recognition, so this is done via the
//    service layer, not a raw shipment update.

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  const config = await getCourierConfig();
  if (!config) {
    return NextResponse.json({ error: "Courier not configured" }, { status: 503 });
  }

  if (!verifyWebhookSignature(rawBody, signature, config.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseWebhookPayload(json);
  if (!parsed) {
    return NextResponse.json(
      { error: "Missing consignment_id or status" },
      { status: 400 },
    );
  }

  const shipment = await prisma.courierShipment.findUnique({
    where: { consignmentId: parsed.consignmentId },
  });
  if (!shipment) {
    // Unknown consignment — acknowledge so the provider stops retrying, but
    // there's nothing to update.
    return NextResponse.json({ ok: true, note: "unknown consignment" });
  }

  if (shipment.courierStatus === parsed.status) {
    // Duplicate callback for a status we've already recorded — no-op.
    return NextResponse.json({ ok: true, note: "no-op (status unchanged)" });
  }

  await applyCourierWebhookStatus(shipment.orderId, parsed.status);

  return NextResponse.json({ ok: true });
}
