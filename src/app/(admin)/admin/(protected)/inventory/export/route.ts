import { NextResponse } from "next/server";
import { getActiveAdmin } from "@/server/admin/guard";
import { hasPermission } from "@/lib/permissions";
import { getStockOverview, buildStockCsv } from "@/server/inventory/reports";

// CSV download of the stock overview — the list you carry into the warehouse to
// count against. Guarded here explicitly: route handlers don't run the admin
// layout, so the area layout's permission check never fires for them.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getActiveAdmin();
  if (!admin || !hasPermission(admin.role, "inventory")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const all = await getStockOverview();

  // Honour the same filter the screen is showing, so "export" means "export
  // what I am looking at" rather than silently handing back everything.
  const filter = new URL(request.url).searchParams.get("filter");
  const rows =
    filter === "out"
      ? all.filter((r) => r.status === "OUT")
      : filter === "reorder"
        ? all.filter((r) => r.status === "REORDER")
        : filter === "dead"
          ? all.filter((r) => r.status === "DEAD")
          : all;

  const date = new Date().toISOString().slice(0, 10);
  const name = filter ? `stock-${filter}-${date}.csv` : `stock-${date}.csv`;

  return new NextResponse(buildStockCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
