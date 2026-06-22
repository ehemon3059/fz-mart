import { getFraudConfig } from "@/server/settings/fraud";
import FraudForm from "./FraudForm";

export default async function FraudSettingsPage() {
  const config = await getFraudConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fraud Check API</h1>
      <p className="text-sm text-gray-500">
        No real fraud-check provider is wired in yet — leaving the API URL blank
        returns a neutral, zero-risk result instead of making a real request, so the
        cache/service/admin pipeline can be tested without a live account. Checked
        once per customer phone at checkout; never blocks the order — it only
        surfaces a risk indicator on the order list and detail pages.
      </p>
      <FraudForm config={config} />
    </div>
  );
}
