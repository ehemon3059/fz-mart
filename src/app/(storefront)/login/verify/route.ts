import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerSession, setCustomerSessionCookie } from "@/lib/customer-session";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { generateCustomerId } from "@/lib/customer-id";

// Magic-link consumption — single use, short-lived. Marks the token used
// (kept for audit, not deleted) so a replayed link is rejected even if the
// expiry window hasn't passed yet.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const failureUrl = new URL("/login?error=invalid-link", request.url);

  if (!token) {
    return NextResponse.redirect(failureUrl);
  }

  const loginToken = await prisma.loginToken.findUnique({ where: { token } });
  if (!loginToken || loginToken.usedAt || loginToken.expiresAt < new Date()) {
    return NextResponse.redirect(failureUrl);
  }

  await prisma.loginToken.update({
    where: { id: loginToken.id },
    data: { usedAt: new Date() },
  });

  const customer = await prisma.customer.upsert({
    where: { email: loginToken.email },
    update: {},
    create: { id: generateCustomerId(), email: loginToken.email, provider: "EMAIL" },
  });

  const sessionId = await createCustomerSession({ customerId: customer.id, email: customer.email });
  await setCustomerSessionCookie(sessionId);

  // Signal the client to merge its localStorage cart into the now-signed-in
  // customer's server cart (see CartMergeOnLogin). Appended as a query flag
  // because the merge needs client-side localStorage, unreachable here.
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const destination = new URL(next ?? "/", request.url);
  destination.searchParams.set("cartMerge", "1");
  return NextResponse.redirect(destination);
}
