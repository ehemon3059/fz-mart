import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import GtmScript from "@/components/storefront/GtmScript";
import PixelScript from "@/components/storefront/PixelScript";
import JsonLd from "@/components/seo/JsonLd";
import ChatButtons from "@/components/storefront/ChatButtons";
import ScrollToTop from "@/components/storefront/ScrollToTop";
import CartMergeOnLogin from "@/components/storefront/CartMergeOnLogin";
import UtmCapture from "@/components/storefront/UtmCapture";
import { headers } from "next/headers";
import { organizationJsonLd } from "@/lib/jsonld";
import { getGtmId, getPixelId } from "@/server/settings/tracking";
import { getBrandPalette, getElementColors, getThemeLayout } from "@/server/settings/theme";
import { SURFACE_PRESET_VARS, elementColorVars, isGlossyPalette, resolveTopBarColor } from "@/lib/theme-colors";
import type { Viewport } from "next";
import { getLocalePrefs } from "@/i18n/server";
import { I18nProvider } from "@/i18n/provider";
import "@/styles/storefront.css";

/**
 * Paints the mobile browser chrome (Chrome/Android URL bar, Safari/iOS status
 * area) the same colour as the utility bar at the top of the page.
 *
 * Server-side is the right place for this: the colour already comes from the
 * DB during SSR, so the tag ships in the initial HTML and the URL bar is
 * correct on first paint — no flash of the default colour, and it works with
 * JS disabled. `getElementColors()` reads a Redis-cached settings group that
 * this layout requests anyway, so this adds no extra database round trip.
 *
 * Scoped to the storefront route group deliberately: the admin area keeps the
 * browser default rather than inheriting a shopper-facing brand colour.
 */
export async function generateViewport(): Promise<Viewport> {
  const elementColors = await getElementColors();
  return { themeColor: resolveTopBarColor(elementColors) };
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gtmId, pixelId, palette, layout, elementColors, prefs, headerList] = await Promise.all([
    getGtmId(),
    getPixelId(),
    getBrandPalette(),
    getThemeLayout(),
    getElementColors(),
    getLocalePrefs(),
    headers(),
  ]);
  // Per-request nonce from middleware — applied to the GTM/Pixel inline scripts
  // so they pass the nonce-based CSP.
  const nonce = headerList.get("x-nonce") ?? undefined;

  // Admin-chosen brand palette + surface preset override the CSS defaults as
  // inline custom properties on the wrapper — applied during SSR so there's no
  // colour flash. A custom background colour, when set, wins over the preset.
  const surface = SURFACE_PRESET_VARS[layout.preset];
  // Golden Elegance opts into a glossy brand→white gradient on primary buttons
  // (see `.fz[data-brand-gloss="on"]` in storefront.css). Other presets fall
  // through to flat solid fills.
  const brandGloss = isGlossyPalette(palette) ? "on" : undefined;
  const themeVars = {
    "--brand": palette.brand,
    "--brand-dark": palette.brandDark,
    "--brand-tint": palette.brandTint,
    "--brand-tint-2": palette.brandTint2,
    "--bg": layout.customBgColor ?? surface.bg,
    "--card": surface.card,
    "--ink": surface.ink,
    "--ink-soft": surface.inkSoft,
    "--ink-mute": surface.inkMute,
    "--line": surface.line,
    // Per-element overrides come LAST so they win over the palette. Slots the
    // admin hasn't set emit nothing, leaving the stylesheet's var() fallbacks
    // to keep tracking the brand colours.
    ...elementColorVars(elementColors),
  } as React.CSSProperties;

  return (
    // `.fz` scopes the storefront design system — every storefront.css rule
    // lives under it, so it never leaks into the admin area or your Tailwind.
    <I18nProvider value={{ locale: prefs.locale, dict: prefs.dict, banglaDigits: prefs.banglaDigits }}>
      {/* The top loading bar lives in the root layout, outside `.fz`, so it
          can't inherit the brand vars. Feed it the palette's third swatch
          (brandTint2) directly — this is what admin picks per storefront. */}
      <style>{`.topbar-progress{--topbar-color:${palette.brandTint2};}`}</style>
      <div className="fz" style={themeVars} lang={prefs.locale} data-card={layout.productCardStyle} data-brand-gloss={brandGloss} data-surface={layout.preset}>
        <JsonLd data={organizationJsonLd()} />
        <GtmScript gtmId={gtmId} nonce={nonce} />
        <PixelScript pixelId={pixelId} nonce={nonce} />
        <Header />
        <CartMergeOnLogin />
        <UtmCapture />
        <main className="wrap" style={{ paddingTop: 0, paddingBottom: 8 }}>
          {children}
        </main>
        <ChatButtons />
        <ScrollToTop />
        <Footer />
      </div>
    </I18nProvider>
  );
}
