import type { CourierProvider } from "@prisma/client";
import {
  createConsignment as steadfastCreate,
  getConsignmentStatus as steadfastStatus,
  parseWebhookPayload as steadfastParseWebhook,
  testCourierConnection as steadfastTest,
} from "./index";
import { getCourierConfig } from "@/server/settings/courier";
import { pathaoAdapter } from "./pathao";
import { redxAdapter } from "./redx";
import type { CourierAdapter } from "./types";

// Adapter registry. This is the ONLY place that maps a CourierProvider enum to
// a concrete adapter. The service layer and webhook routes ask for an adapter
// by provider and never import a concrete implementation directly.
//
// The Steadfast adapter (./index.ts) predates the CourierAdapter interface, so
// we wrap its free functions here rather than modifying that file. Its
// testConnection reads credentials from the `courier` settings group.

const steadfastAdapter: CourierAdapter = {
  provider: "STEADFAST",
  createConsignment: steadfastCreate,
  getConsignmentStatus: steadfastStatus,
  parseWebhook: steadfastParseWebhook,
  async testConnection() {
    const config = await getCourierConfig();
    if (!config) {
      return {
        ok: false,
        message: "Steadfast is not configured — set it under Admin > Settings > Courier.",
      };
    }
    return steadfastTest(config);
  },
};

const ADAPTERS: Record<CourierProvider, CourierAdapter> = {
  STEADFAST: steadfastAdapter,
  PATHAO: pathaoAdapter,
  REDX: redxAdapter,
};

/** Resolve the adapter for a provider. Total over the enum — never throws. */
export function resolveAdapter(provider: CourierProvider): CourierAdapter {
  return ADAPTERS[provider];
}
