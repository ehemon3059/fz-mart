import { getGtmId } from "@/server/settings/tracking";
import TagManagerForm from "./TagManagerForm";

export default async function TagManagerSettingsPage() {
  const gtmId = await getGtmId();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tag Manager</h1>
      <TagManagerForm initialGtmId={gtmId} />
    </div>
  );
}
