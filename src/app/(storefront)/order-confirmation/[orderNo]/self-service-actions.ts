"use server";

import { revalidatePath } from "next/cache";
import { cancelOwnOrder, requestReturn, SelfServiceError } from "@/server/orders/self-service";
import { rateLimitByIp } from "@/lib/rate-limit";
import { hasOrderAccess } from "@/lib/order-access";
import { getOrderPhoneForViewer } from "@/server/orders/getOrder";

export interface SelfServiceResult {
  error?: string;
  success?: string;
}

async function ipGuard(): Promise<boolean> {
  const limit = await rateLimitByIp("self-service:ip", 20, 60 * 10, "closed");
  return limit.allowed;
}

/*
 * A2-02: the phone is no longer an argument.
 *
 * It used to arrive from the client, having been rendered into the page by the
 * confirmation view. That made "knows a phone number" sufficient to cancel an
 * order or file a return — and A2-01 handed out phone numbers to anyone willing
 * to count to 999999. Locking the page down removes the disclosure, but leaving
 * the parameter here would keep the door open for anyone who obtained a phone
 * some other way (a leaked spreadsheet, a delivery slip, a guess at a common
 * number). A parameter the caller controls is not an authorisation check.
 *
 * So the caller now proves access the same way the page does — the grant cookie
 * — and the phone is read SERVER-SIDE off the order that grant authorises. The
 * client can no longer name whose order it is acting on.
 */
async function authorizeOrder(orderNo: string): Promise<string | null> {
  if (!(await hasOrderAccess(orderNo))) return null;
  return getOrderPhoneForViewer(orderNo);
}

// Deliberately identical for "no grant", "no such order" and "wrong order":
// a distinguishable message would turn these actions into the enumeration
// oracle we just closed on the page itself.
const DENIED = "We couldn't verify this order. Please look it up on the tracking page.";

export async function cancelOrderAction(
  orderNo: string,
  reason?: string,
): Promise<SelfServiceResult> {
  if (!(await ipGuard())) return { error: "Too many requests. Please wait a few minutes." };
  const phone = await authorizeOrder(orderNo);
  if (!phone) return { error: DENIED };
  try {
    await cancelOwnOrder(orderNo, phone, reason);
  } catch (err) {
    if (err instanceof SelfServiceError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/order-confirmation/${orderNo}`);
  return { success: "Your order has been cancelled." };
}

export async function requestReturnAction(
  orderNo: string,
  formData: FormData,
): Promise<SelfServiceResult> {
  if (!(await ipGuard())) return { error: "Too many requests. Please wait a few minutes." };
  const phone = await authorizeOrder(orderNo);
  if (!phone) return { error: DENIED };
  const reason = String(formData.get("reason") ?? "");
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  try {
    await requestReturn(orderNo, phone, reason, photoUrl);
  } catch (err) {
    if (err instanceof SelfServiceError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/order-confirmation/${orderNo}`);
  return { success: "Return request submitted. We'll review it shortly." };
}
