"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { approveReturn, rejectReturn, ReturnAdminError } from "@/server/orders/returns";

export interface ActionResult {
  error?: string;
}

export async function approveReturnAction(
  requestId: number,
  note: string,
  restockable: boolean,
): Promise<ActionResult> {
  const admin = await requirePermission("returns");
  try {
    await approveReturn(requestId, admin.username, restockable, note);
  } catch (err) {
    if (err instanceof ReturnAdminError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "return.approve",
    // The resell decision is the consequential half of an approval, so it goes
    // in the audit trail rather than only in the order's flags.
    detail: `#${requestId} · ${restockable ? "back to stock" : "written off (damaged)"}`,
  });
  revalidatePath("/admin/returns");
  revalidatePath("/admin/inventory");
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
