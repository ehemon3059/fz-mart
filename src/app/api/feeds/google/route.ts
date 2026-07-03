import { NextResponse, type NextRequest } from "next/server";
import { isValidFeedToken } from "@/server/settings/feeds";
import { getFeedItems, buildGoogleXml } from "@/server/feeds";

// Google Merchant RSS 2.0 feed. Same token gate and caching as the Facebook
// feed; Google Merchant Center fetches this URL on a schedule.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!(await isValidFeedToken(token))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const xml = buildGoogleXml(await getFeedItems());
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
