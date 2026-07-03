import { NextResponse, type NextRequest } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getGoogleOAuthConfig } from "@/server/settings/google-oauth";
import { prisma } from "@/lib/prisma";
import { createCustomerSession, setCustomerSessionCookie } from "@/lib/customer-session";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { generateCustomerId } from "@/lib/customer-id";

export async function GET(request: NextRequest) {
  const failureUrl = new URL("/login?error=google-failed", request.url);
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(failureUrl);
  }

  const config = await getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.redirect(failureUrl);
  }

  const client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);

  let payload;
  try {
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.clientId,
    });
    payload = ticket.getPayload();
  } catch {
    return NextResponse.redirect(failureUrl);
  }

  if (!payload?.email) {
    return NextResponse.redirect(failureUrl);
  }

  const customer = await prisma.customer.upsert({
    where: { email: payload.email },
    update: { name: payload.name, avatarUrl: payload.picture },
    create: {
      id: generateCustomerId(),
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
      provider: "GOOGLE",
    },
  });

  const sessionId = await createCustomerSession({ customerId: customer.id, email: customer.email });
  await setCustomerSessionCookie(sessionId);

  const next = safeRedirectPath(request.nextUrl.searchParams.get("state"));
  return NextResponse.redirect(new URL(next ?? "/", request.url));
}
