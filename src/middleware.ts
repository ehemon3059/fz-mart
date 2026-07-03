import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// First-pass auth guard for /admin/* routes, run at the edge before page
// code. This only checks COOKIE PRESENCE — it cannot reach Redis, because
// middleware runs in the Edge runtime by default on Next 15.2.x (Node.js
// middleware is still experimental at this version) and ioredis is a raw
// TCP client that doesn't work there.
//
// The actual session validity check against Redis happens in
// src/app/(admin)/admin/layout.tsx, which runs in the Node.js runtime like
// any normal server component and wraps every admin page. Together these
// two layers give the same effect as a single edge check: cheap rejection
// of unauthenticated requests here, authoritative validation in the layout.
//
// IP-block enforcement (Phase 3) will also live here, checking a Redis set
// — same constraint applies, so that check will likely move to the layout
// too, or use an edge-compatible Redis REST client.

// Auth screens reachable WITHOUT a session — a user resetting a forgotten
// password is by definition signed out, so these must be public too.
const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
