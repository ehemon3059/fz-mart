import { headers } from "next/headers";
import { getGoogleOAuthConfig } from "@/server/settings/google-oauth";
import GoogleOAuthPageClient from "./GoogleOAuthPageClient";

export const metadata = { title: "Google Sign-In — FZ-Mart Admin" };

export default async function GoogleOAuthSettingsPage() {
  const [config, headerList] = await Promise.all([getGoogleOAuthConfig(), headers()]);

  // Suggest a redirect URI from the current request so first-time setup can
  // copy it straight into the Google Cloud console.
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const defaultRedirectUri = `${proto}://${host}/login/google/callback`;

  return <GoogleOAuthPageClient config={config} defaultRedirectUri={defaultRedirectUri} />;
}
