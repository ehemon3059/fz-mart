import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import GtmScript from "@/components/storefront/GtmScript";
import PixelScript from "@/components/storefront/PixelScript";
import { getGtmId, getPixelId } from "@/server/settings/tracking";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gtmId, pixelId] = await Promise.all([getGtmId(), getPixelId()]);

  return (
    <>
      <GtmScript gtmId={gtmId} />
      <PixelScript pixelId={pixelId} />
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </>
  );
}
