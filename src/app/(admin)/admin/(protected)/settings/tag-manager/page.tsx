import { getGtmId } from "@/server/settings/tracking";
import TagManagerPageClient from "./TagManagerPageClient";

export const metadata = { title: "Tag Manager — FZ-Mart Admin" };

export default async function TagManagerSettingsPage() {
  const gtmId = await getGtmId();
  return <TagManagerPageClient initialGtmId={gtmId} />;
}
