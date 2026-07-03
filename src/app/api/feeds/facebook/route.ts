import { NextResponse, type NextRequest } from "next/server";
import { isValidFeedToken } from "@/server/settings/feeds";
import { getFeedItems, buildFacebookCsv } from "@/server/feeds";

// Facebook Catalog CSV feed. Token-protected (capability URL configured in
// Admin → Settings → Marketing Feeds). Cached at the CDN/browser for an hour
// so Facebook's periodic fetch doesn't rescan the catalogue every time.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!(await isValidFeedToken(token))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const csv = buildFacebookCsv(await getFeedItems());
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="facebook-catalog.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
