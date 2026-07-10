import { NextResponse } from "next/server";
import { getActiveAdmin } from "@/server/admin/guard";
import { hasPermission } from "@/lib/permissions";
import { listSubscribers, buildSubscribersCsv } from "@/server/newsletter";

// CSV download of newsletter subscribers (Name, Email, Subscribed at).
// Guarded here explicitly — route handlers don't run the admin layout.
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getActiveAdmin();
  if (!admin || !hasPermission(admin.role, "reports")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const csv = buildSubscribersCsv(await listSubscribers());
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
