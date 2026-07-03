import { getSettingGroup, setSetting } from "@/lib/settings";

// Storefront conversion / anti-fraud settings (Phase 4), stored unencrypted in
// the generic Setting table under the "conversion" group. All optional with
// safe defaults so the features stay off until an admin turns them on.

const GROUP = "conversion";

export interface ConversionConfig {
  // Phone OTP at COD checkout
  otpEnabled: boolean;
  // Customer self-service returns
  returnWindowDays: number;
  // Abandoned-cart recovery
  abandonedCartEnabled: boolean;
  abandonedCartDelayHours: number;
  abandonedCartMessage: string;
  // Floating chat buttons
  whatsappNumber: string; // e.g. 8801XXXXXXXXX (no +)
  messengerUrl: string; // e.g. https://m.me/yourpage
}

const DEFAULTS: ConversionConfig = {
  otpEnabled: false,
  returnWindowDays: 7,
  abandonedCartEnabled: false,
  abandonedCartDelayHours: 3,
  abandonedCartMessage:
    "You left items in your cart at FZ Mart! Complete your order here: {link}",
  whatsappNumber: "",
  messengerUrl: "",
};

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function int(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export async function getConversionConfig(): Promise<ConversionConfig> {
  const g = await getSettingGroup(GROUP);
  return {
    otpEnabled: bool(g.otpEnabled, DEFAULTS.otpEnabled),
    returnWindowDays: int(g.returnWindowDays, DEFAULTS.returnWindowDays),
    abandonedCartEnabled: bool(g.abandonedCartEnabled, DEFAULTS.abandonedCartEnabled),
    abandonedCartDelayHours: int(g.abandonedCartDelayHours, DEFAULTS.abandonedCartDelayHours),
    abandonedCartMessage: g.abandonedCartMessage || DEFAULTS.abandonedCartMessage,
    whatsappNumber: g.whatsappNumber ?? DEFAULTS.whatsappNumber,
    messengerUrl: g.messengerUrl ?? DEFAULTS.messengerUrl,
  };
}

export async function saveConversionConfig(config: ConversionConfig): Promise<void> {
  const set = (key: string, value: string) => setSetting({ group: GROUP, key, value });
  await Promise.all([
    set("otpEnabled", String(config.otpEnabled)),
    set("returnWindowDays", String(config.returnWindowDays)),
    set("abandonedCartEnabled", String(config.abandonedCartEnabled)),
    set("abandonedCartDelayHours", String(config.abandonedCartDelayHours)),
    set("abandonedCartMessage", config.abandonedCartMessage),
    set("whatsappNumber", config.whatsappNumber.replace(/[^\d]/g, "")),
    set("messengerUrl", config.messengerUrl.trim()),
  ]);
}
