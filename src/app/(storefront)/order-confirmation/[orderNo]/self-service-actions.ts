"use server";

import { revalidatePath } from "next/cache";
import { cancelOwnOrder, requestReturn, SelfServiceError } from "@/server/orders/self-service";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export interface SelfServiceResult {
  error?: string;
  success?: string;
}

async function ipGuard(): Promise<boolean> {
  const ip = await getClientIp();
  if (!ip) return true;
  const limit = await rateLimit("self-service:ip", ip, 20, 60 * 10);
  return limit.allowed;
}

export async function cancelOrderAction(orderNo: string, phone: string): Promise<SelfServiceResult> {
  if (!(await ipGuard())) return { error: "Too many requests. Please wait a few minutes." };
  try {
    await cancelOwnOrder(orderNo, phone);
  } catch (err) {
    if (err instanceof SelfServiceError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/order-confirmation/${orderNo}`);
  return { success: "Your order has been cancelled." };
}

export async function requestReturnAction(
  orderNo: string,
  phone: string,
  formData: FormData,
): Promise<SelfServiceResult> {
  if (!(await ipGuard())) return { error: "Too many requests. Please wait a few minutes." };
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
