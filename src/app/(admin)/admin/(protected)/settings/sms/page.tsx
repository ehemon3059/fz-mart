import { getSmsConfig } from "@/server/settings/sms";
import SmsForm from "./SmsForm";

export default async function SmsSettingsPage() {
  const config = await getSmsConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">SMS Gateway</h1>
      <p className="text-sm text-gray-500">
        No BD provider is wired in yet — leaving the API URL blank logs SMS sends to
        the console instead of making a real request, so the queue/worker pipeline
        can be tested without a live account.
      </p>
      <SmsForm config={config} />
    </div>
  );
}
