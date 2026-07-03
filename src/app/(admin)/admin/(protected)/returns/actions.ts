"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { approveReturn, rejectReturn, ReturnAdminError } from "@/server/orders/returns";

export interface ActionResult {
  error?: string;
}

export async function approveReturnAction(requestId: number, note: string): Promise<ActionResult> {
  const admin = await requirePermission("returns");
  try {
    await approveReturn(requestId, admin.username, note);
  } catch (err) {
    if (err instanceof ReturnAdminError) return { error: err.message };
    throw err;
  }
  await logActivity({ adminId: admin.id, actorName: admin.username, action: "return.approve", detail: `#${requestId}` });
  revalidatePath("/admin/returns");
  return {};
}

export async function rejectReturnAction(requestId: number, note: string): Promise<ActionResult> {
  const admin = await requirePermission("returns");
  try {
    await rejectReturn(requestId, note);
  } catch (err) {
    if (err instanceof ReturnAdminError) return { error: err.message };
    throw err;
  }
  await logActivity({ adminId: admin.id, actorName: admin.username, action: "return.reject", detail: `#${requestId}` });
  revalidatePath("/admin/returns");
  return {};
}
