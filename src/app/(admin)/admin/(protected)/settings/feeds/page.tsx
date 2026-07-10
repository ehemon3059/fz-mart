import { getFeedToken } from "@/server/settings/feeds";
import { siteUrl } from "@/lib/seo";
import { primeSiteUrl } from "@/server/settings/site";
import FeedsPageClient from "./FeedsPageClient";

export const metadata = { title: "Marketing Feeds — FZ-Mart Admin" };

export default async function FeedsSettingsPage() {
  await primeSiteUrl();
  const token = await getFeedToken();
  const base = siteUrl();
  const isLocalhost = /localhost|127\.0\.0\.1/.test(base);

  return <FeedsPageClient baseUrl={base} initialToken={token} isLocalhost={isLocalhost} />;
}
