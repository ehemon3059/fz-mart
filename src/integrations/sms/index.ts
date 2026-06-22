import { getSmsConfig } from "@/server/settings/sms";

// SMS adapter — provider-agnostic interface. No BD provider keys exist yet
// (Phase 5 wires a real one: e.g. Bulk SMS BD, Alpha SMS, SSL Wireless).
// Until then this is a stub: it logs the configured request and returns
// success in development so the rest of the queue/worker pipeline can be
// built and tested without a live account.
//
// Swapping in a real provider means rewriting only sendSms() below — the
// queue, worker, retry logic, and SmsLog auditing all stay the same.

export interface SendSmsInput {
  to: string;
  message: string;
}

export class SmsNotConfiguredError extends Error {
  constructor() {
    super("SMS gateway is not configured — set it under Admin > Settings > SMS.");
    this.name = "SmsNotConfiguredError";
  }
}

export async function sendSms(input: SendSmsInput): Promise<void> {
  const config = await getSmsConfig();
  if (!config) {
    throw new SmsNotConfiguredError();
  }

  if (!config.apiUrl) {
    // No real provider wired yet — stub send so the pipeline (queue, worker,
    // retries, SmsLog) is provably correct ahead of a real integration.
    console.log(
      `[sms:stub] would send to ${input.to} via senderId=${config.senderId}: "${input.message}"`,
    );
    return;
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.apiKey,
      sender_id: config.senderId,
      to: input.to,
      message: input.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`SMS provider responded ${response.status}: ${await response.text()}`);
  }
}
