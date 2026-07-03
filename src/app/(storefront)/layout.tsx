import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import GtmScript from "@/components/storefront/GtmScript";
import PixelScript from "@/components/storefront/PixelScript";
import JsonLd from "@/components/seo/JsonLd";
import ChatButtons from "@/components/storefront/ChatButtons";
import { organizationJsonLd } from "@/lib/jsonld";
import { getGtmId, getPixelId } from "@/server/settings/tracking";
import { getBrandPalette } from "@/server/settings/theme";
import { getLocalePrefs } from "@/i18n/server";
import { I18nProvider } from "@/i18n/provider";
import "@/styles/storefront.css";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gtmId, pixelId, palette, prefs] = await Promise.all([
    getGtmId(),
    getPixelId(),
    getBrandPalette(),
    getLocalePrefs(),
  ]);

  // Admin-chosen brand palette overrides the CSS defaults as inline custom
  // properties on the wrapper — applied during SSR so there's no colour flash.
  const themeVars = {
    "--brand": palette.brand,
    "--brand-dark": palette.brandDark,
    "--brand-tint": palette.brandTint,
    "--brand-tint-2": palette.brandTint2,
  } as React.CSSProperties;

  return (
    // `.fz` scopes the storefront design system — every storefront.css rule
    // lives under it, so it never leaks into the admin area or your Tailwind.
    <I18nProvider value={{ locale: prefs.locale, dict: prefs.dict, banglaDigits: prefs.banglaDigits }}>
      <div className="fz" style={themeVars} lang={prefs.locale}>
        <JsonLd data={organizationJsonLd()} />
        <GtmScript gtmId={gtmId} />
        <PixelScript pixelId={pixelId} />
        <Header />
        <main className="wrap" style={{ paddingTop: 0, paddingBottom: 8 }}>
          {children}
        </main>
        <ChatButtons />
        <Footer />
      </div>
    </I18nProvider>
  );
}
