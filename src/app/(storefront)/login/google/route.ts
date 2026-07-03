import { NextResponse, type NextRequest } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getGoogleOAuthConfig } from "@/server/settings/google-oauth";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const config = await getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", request.url));
  }

  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));

  const client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  const authUrl = client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state: next ?? undefined,
  });

  return NextResponse.redirect(authUrl);
}
