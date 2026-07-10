import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedxConfig } from "@/server/settings/courier-redx";
import { verifyWebhookSignature } from "@/lib/webhook-signature";
import { redxAdapter } from "@/integrations/courier/redx";
import { applyCourierWebhookStatus } from "@/server/courier";

// RedX delivery-status webhook. Provider-scoped: parses with the RedX adapter,
// so it can never misroute another provider's callback. Same authenticity /
// idempotency / lifecycle guarantees as the Pathao and Steadfast routes.

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-redx-signature") ??
    request.headers.get("x-webhook-signature");

  const config = await getRedxConfig();
  if (!config) {
    return NextResponse.json({ error: "RedX not configured" }, { status: 503 });
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

  const parsed = redxAdapter.parseWebhook(json);
  if (!parsed) {
    return NextResponse.json(
      { error: "Missing tracking_id or status" },
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
