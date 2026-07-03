import { getFeedToken } from "@/server/settings/feeds";
import { siteUrl } from "@/lib/seo";
import FeedsPanel from "./FeedsPanel";

export const metadata = { title: "Marketing Feeds — FZ-Mart Admin" };

export default async function FeedsSettingsPage() {
  const token = await getFeedToken();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Marketing Feeds
        </h1>
        <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
          Token-protected product feeds for Facebook Catalog and Google Merchant. They update
          automatically as you edit products.
        </p>
      </div>

      <div className="mt-6">
        <FeedsPanel baseUrl={siteUrl()} initialToken={token} />
      </div>
    </div>
  );
}
