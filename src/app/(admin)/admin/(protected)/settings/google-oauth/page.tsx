import Link from "next/link";
import { headers } from "next/headers";
import { getGoogleOAuthConfig } from "@/server/settings/google-oauth";
import { Icon } from "@/components/icons";
import GoogleOAuthForm from "./GoogleOAuthForm";

export const metadata = { title: "Google Sign-In — FZ-Mart Admin" };

export default async function GoogleOAuthSettingsPage() {
  const [config, headerList] = await Promise.all([getGoogleOAuthConfig(), headers()]);

  // Suggest a redirect URI from the current request so first-time setup can
  // copy it straight into the Google Cloud console.
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const defaultRedirectUri = `${proto}://${host}/login/google/callback`;

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-12 sm:px-7 sm:py-8">
      <Link
        href="/admin/settings/shipping"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Settings
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">
        Google Sign-In
      </h1>
      <p className="mt-1 max-w-xl text-[14.5px] text-stone-500">
        Enable &quot;Continue with Google&quot; on the storefront login. Follow the steps on the right to
        get a Client ID and Secret, then save them here.
      </p>

      <div className="mt-6">
        <GoogleOAuthForm config={config} defaultRedirectUri={defaultRedirectUri} />
      </div>
    </div>
  );
}
