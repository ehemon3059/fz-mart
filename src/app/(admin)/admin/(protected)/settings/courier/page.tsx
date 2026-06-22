import { getCourierConfig } from "@/server/settings/courier";
import CourierForm from "./CourierForm";

export default async function CourierSettingsPage() {
  const config = await getCourierConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Courier API</h1>
      <p className="text-sm text-gray-500">
        No real courier provider is wired in yet — leaving the API URL blank logs
        consignment requests to the console instead of making a real request.
      </p>
      <CourierForm config={config} />
    </div>
  );
}
