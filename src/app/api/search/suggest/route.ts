import { NextResponse, type NextRequest } from "next/server";
import { suggestProducts } from "@/server/products/search";
import { formatTaka } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

// Typeahead endpoint for the header search dropdown. Returns a short list of
// matching products (name, slug, price, image). Kept deliberately light — the
// heavy filtered search lives on the /search page. Debounced client-side, but
// also rate-limited server-side so it can't be hammered as a scraping API.

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 60) {
    return NextResponse.json({ suggestions: [] });
  }

  const ip = await getClientIp();
  if (ip) {
    const limit = await rateLimit("suggest:ip", ip, 60, 60);
    if (!limit.allowed) {
      return NextResponse.json({ suggestions: [] }, { status: 429 });
    }
  }

  const suggestions = await suggestProducts(q, 6);
  return NextResponse.json({
    suggestions: suggestions.map((s) => {
      const hasDiscount = s.discountPrice != null && s.discountPrice < s.price;
      return {
        name: s.name,
        slug: s.slug,
        image: s.image,
        price: formatTaka(hasDiscount ? s.discountPrice! : s.price),
      };
    }),
  });
}
