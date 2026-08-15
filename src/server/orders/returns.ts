import { prisma } from "@/lib/prisma";
import { updateOrderStatus, InvalidTransitionError } from "@/server/orders/admin";

// Admin side of the return-requests queue. Approving a request drives the
// existing RETURNED order workflow (updateOrderStatus), so all the P&L /
// restock logic that already keys off the RETURNED status just works.

export class ReturnAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnAdminError";
  }
}

export async function listReturnRequests(status?: "PENDING" | "APPROVED" | "REJECTED") {
  return prisma.returnRequest.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { order: { select: { orderNo: true, customerName: true, customerPhone: true, total: true, status: true } } },
  });
}

/**
 * Approve a return request. Moves the order to RETURNED via the normal state
 * machine (which validates the transition and writes the audit log), then
 * marks the request APPROVED. If the order can't legally move to RETURNED, the
 * request is left untouched and the reason surfaced.
 *
 * `restockable` is REQUIRED, not defaulted: whether the goods can be resold is
 * the single most consequential thing about a return — it decides whether the
 * units go back on the shelf or become a costed write-off — and it is knowledge
 * only the person holding the parcel has. Defaulting it would quietly guess,
 * and guessing "resellable" inflates inventory with goods that don't exist.
 */
export async function approveReturn(
  requestId: number,
  adminUsername: string,
  restockable: boolean,
  adminNote?: string,
): Promise<void> {
  const req = await prisma.returnRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new ReturnAdminError("Return request not found.");
  if (req.status !== "PENDING") throw new ReturnAdminError("This request has already been handled.");

  try {
    await updateOrderStatus(req.orderId, "RETURNED", adminUsername, restockable);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw new ReturnAdminError(`Can't return this order: ${err.message}`);
    }
    throw err;
  }

  await prisma.returnRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", adminNote: adminNote?.trim() || null },
  });
}

export async function rejectReturn(
  requestId: number,
  adminNote?: string,
): Promise<void> {
  const req = await prisma.returnRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new ReturnAdminError("Return request not found.");
  if (req.status !== "PENDING") throw new ReturnAdminError("This request has already been handled.");

  await prisma.returnRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", adminNote: adminNote?.trim() || null },
  });
}

export async function pendingReturnCount(): Promise<number> {
  return prisma.returnRequest.count({ where: { status: "PENDING" } });
}
