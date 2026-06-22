import { getFraudConfig } from "@/server/settings/fraud";

// Generic fraud-check adapter. No real provider is wired in yet — most BD
// courier companies (Pathao, Steadfast, etc.) expose a "courier fraud check"
// endpoint that returns a customer's order/return history across the
// network by phone number. This stub returns a neutral, zero-risk result so
// the cache/service/admin pipeline can be built and tested first.

export interface FraudCheckData {
  totalOrders: number;
  successOrders: number;
  returnOrders: number;
  riskScore: number; // 0 (no risk) - 100 (high risk)
}

export class FraudApiNotConfiguredError extends Error {
  constructor() {
    super("Fraud API is not configured — set it under Admin > Settings > Fraud.");
    this.name = "FraudApiNotConfiguredError";
  }
}

export async function checkPhone(phone: string): Promise<FraudCheckData> {
  const config = await getFraudConfig();
  if (!config) {
    throw new FraudApiNotConfiguredError();
  }

  if (!config.apiUrl) {
    console.log(`[fraud:stub] would check phone ${phone} — returning neutral result`);
    return { totalOrders: 0, successOrders: 0, returnOrders: 0, riskScore: 0 };
  }

  const response = await fetch(`${config.apiUrl}?phone=${encodeURIComponent(phone)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Fraud API responded ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    totalOrders: Number(data.total_orders ?? 0),
    successOrders: Number(data.success_orders ?? 0),
    returnOrders: Number(data.return_orders ?? 0),
    riskScore: Number(data.risk_score ?? 0),
  };
}
