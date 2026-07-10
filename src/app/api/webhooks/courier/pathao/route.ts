import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPathaoConfig } from "@/server/settings/courier-pathao";
import { verifyWebhookSignature } from "@/lib/webhook-signature";
import { pathaoAdapter } from "@/integrations/courier/pathao";
import { applyCourierWebhookStatus } from "@/server/courier";

// Pathao delivery-status webhook. Provider-scoped: this endpoint only ever
// receives Pathao callbacks, so status is parsed by the Pathao adapter and
// there's no chance of misrouting another provider's push.
//
// AUTHENTICITY — public endpoint, so we verify Pathao's HMAC signature over the
// raw body against the webhook secret configured in Settings > Courier.
// IDEMPOTENCY — providers retry; we no-op when the internal status is unchanged.
// LIFECYCLE   — a DELIVERED push moves the order through the state machine via
//               the service layer, which writes OrderStatusLog (finance reads it).

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  // Pathao signs with its own header; accept the generic one as a fallback.
  const signature =
    request.headers.get("x-pathao-signature") ??
    request.headers.get("x-webhook-signature");

  const config = await getPathaoConfig();
  if (!config) {
    return NextResponse.json({ error: "Pathao not configured" }, { status: 503 });
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

  const parsed = pathaoAdapter.parseWebhook(json);
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
    return NextResponse.json({ ok: true, note: "unknown consignment" });
  }
  if (shipment.courierStatus === parsed.status) {
    return NextResponse.json({ ok: true, note: "no-op (status unchanged)" });
  }

  await applyCourierWebhookStatus(shipment.orderId, parsed.status);
  return NextResponse.json({ ok: true });
}
