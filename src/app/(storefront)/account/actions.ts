"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-session";
import { updateProfile } from "@/server/customers/profile";
import {
  MAX_ADDRESSES,
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
} from "@/server/customers/addresses";
import { resolveDeliveryLocation, LocationError } from "@/server/settings/locations";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

// Same rule the checkout uses, so an address saved here always passes there.
const PHONE_RE = /^01[3-9]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADDRESS_MIN = 10;
const ADDRESS_MAX = 400;

/** Every action re-reads the session; the client never supplies a customer id. */
async function requireCustomer(): Promise<string | null> {
  const session = await getCurrentCustomer();
  return session?.customerId ?? null;
}

/**
 * Address writes serialise on a row lock (see server/customers/addresses.ts),
 * so a double-submit can time out waiting its turn. Surface that as a retry
 * message rather than letting the server action throw at the customer.
 */
async function guarded<T>(run: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await run();
  } catch (err) {
    console.error("[account] address write failed:", err);
    return { error: "Something went wrong saving that. Please try again." };
  }
}

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const customerId = await requireCustomer();
  if (!customerId) return { error: "Please sign in again." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();

  if (name.length > 80) return { error: "Name is too long (80 characters max)." };
  if (phone && !PHONE_RE.test(phone)) {
    return { error: "Enter a valid mobile number (e.g. 017XXXXXXXX)." };
  }
  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return { error: "Enter a valid email address, or leave it blank." };
  }

  await updateProfile(customerId, { name, phone, contactEmail });
  revalidatePath("/account/profile");
  revalidatePath("/account", "layout"); // header shows the display name
  return { success: true };
}

/**
 * Shared parse + validate for the add and edit forms.
 *
 * Async because the delivery zone is DERIVED from the chosen location rather
 * than accepted from the form: the same upazila → district → division →
 * fallback walk checkout uses, so a saved address can never carry a cheaper
 * zone than its location actually maps to.
 */
async function readAddress(formData: FormData): Promise<AddressInput | string> {
  const label = String(formData.get("label") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!label) return "Give this address a label, like Home or Office.";
  if (label.length > 30) return "Label is too long (30 characters max).";
  if (!fullName) return "Recipient name is required.";
  if (fullName.length > 80) return "Recipient name is too long (80 characters max).";
  if (!PHONE_RE.test(phone)) return "Enter a valid mobile number (e.g. 017XXXXXXXX).";
  if (address.length < ADDRESS_MIN) {
    return "Please write the full address — house/road/area.";
  }
  if (address.length > ADDRESS_MAX) return "Address is too long (400 characters max).";

  const num = (key: string) => {
    const n = Number(String(formData.get(key) ?? "").trim());
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const divisionId = num("divisionId");
  const districtId = num("districtId");
  const upazilaId = num("upazilaId");

  if (!divisionId) return "Please choose your division.";
  if (!districtId) return "Please choose your district.";

  let shippingZoneId: number | null = null;
  try {
    const resolved = await resolveDeliveryLocation({ divisionId, districtId, upazilaId });
    shippingZoneId = resolved.zoneId;
  } catch (err) {
    if (err instanceof LocationError) return err.message;
    throw err;
  }

  return {
    label,
    fullName,
    phone,
    address,
    divisionId,
    districtId,
    upazilaId,
    shippingZoneId,
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
  };
}

export async function addAddress(formData: FormData): Promise<ActionResult> {
  const customerId = await requireCustomer();
  if (!customerId) return { error: "Please sign in again." };

  const parsed = await readAddress(formData);
  if (typeof parsed === "string") return { error: parsed };

  const created = await guarded(() => createAddress(customerId, parsed));
  if (created && typeof created === "object" && "error" in created) return created;
  if (!created) {
    return {
      error: `You can save up to ${MAX_ADDRESSES} addresses. Delete one before adding another.`,
    };
  }
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function editAddress(id: number, formData: FormData): Promise<ActionResult> {
  const customerId = await requireCustomer();
  if (!customerId) return { error: "Please sign in again." };

  const parsed = await readAddress(formData);
  if (typeof parsed === "string") return { error: parsed };

  const updated = await guarded(() => updateAddress(customerId, id, parsed));
  if (updated && typeof updated === "object" && "error" in updated) return updated;
  if (!updated) return { error: "That address no longer exists." };
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function removeAddress(id: number): Promise<ActionResult> {
  const customerId = await requireCustomer();
  if (!customerId) return { error: "Please sign in again." };

  const ok = await guarded(() => deleteAddress(customerId, id));
  if (typeof ok === "object") return ok;
  if (!ok) return { error: "That address no longer exists." };
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}

export async function makeDefaultAddress(id: number): Promise<ActionResult> {
  const customerId = await requireCustomer();
  if (!customerId) return { error: "Please sign in again." };

  const ok = await guarded(() => setDefaultAddress(customerId, id));
  if (typeof ok === "object") return ok;
  if (!ok) return { error: "That address no longer exists." };
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true };
}
