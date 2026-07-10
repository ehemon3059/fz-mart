import { getFraudConfig } from "@/server/settings/fraud";
import FraudPageClient from "./FraudPageClient";

export const metadata = { title: "Fraud Check API — FZ-Mart Admin" };

export default async function FraudSettingsPage() {
  const config = await getFraudConfig();
  return <FraudPageClient config={config} />;
}
