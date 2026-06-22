import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCourierConfig } from "@/server/settings/courier";
import { verifyWebhookSignature } from "@/lib/webhook-signature";

// Public webhook for courier status callbacks. Two things matter here:
//
// 1. AUTHENTICITY — this endpoint is public, so anyone can POST to it.
//    The provider signs the raw body with a shared secret (configured under
//    Admin > Settings > Courier); we verify that signature before trusting
//    anything in the payload.
//
// 2. IDEMPOTENCY — providers retry callbacks, so the same
//    (consignmentId, status) pair can arrive more than once. We look up the
//    shipment by consignmentId and only write if the status actually
//    changed, so a duplicate delivery is a no-op rather than a double-write
//    or duplicate side effect.

interface CourierWebhookPayload {
  consignment_id: string;
  status: string;
}

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

  let payload: CourierWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.consignment_id || !payload.status) {
    return NextResponse.json({ error: "Missing consignment_id or status" }, { status: 400 });
  }

  const shipment = await prisma.courierShipment.findUnique({
    where: { consignmentId: payload.consignment_id },
  });
  if (!shipment) {
    // Unknown consignment — acknowledge so the provider stops retrying, but
    // there's nothing to update.
    return NextResponse.json({ ok: true, note: "unknown consignment" });
  }

  if (shipment.courierStatus === payload.status) {
    // Duplicate callback for a status we've already recorded — no-op.
    return NextResponse.json({ ok: true, note: "no-op (status unchanged)" });
  }

  await prisma.courierShipment.update({
    where: { consignmentId: payload.consignment_id },
    data: { courierStatus: payload.status, lastSyncedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
