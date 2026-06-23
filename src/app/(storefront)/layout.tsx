import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import GtmScript from "@/components/storefront/GtmScript";
import PixelScript from "@/components/storefront/PixelScript";
import { getGtmId, getPixelId } from "@/server/settings/tracking";
import "@/styles/storefront.css";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gtmId, pixelId] = await Promise.all([getGtmId(), getPixelId()]);

  return (
    // `.fz` scopes the storefront design system — every storefront.css rule
    // lives under it, so it never leaks into the admin area or your Tailwind.
    <div className="fz">
      <GtmScript gtmId={gtmId} />
      <PixelScript pixelId={pixelId} />
      <Header />
      <main className="wrap" style={{ paddingTop: 0, paddingBottom: 8 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
