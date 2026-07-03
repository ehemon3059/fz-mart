import { prisma } from "@/lib/prisma";

// Append-only admin audit trail (AdminActivityLog). Same philosophy as the
// order status/notes logs: never updated or deleted, actor name snapshotted
// so the entry survives a rename/removal.
//
// logActivity is best-effort — an audit write must never break the action it
// records — so failures are logged and swallowed.

export async function logActivity(params: {
  adminId: number | null;
  actorName: string;
  action: string;
  detail?: string;
}): Promise<void> {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId: params.adminId,
        actorName: params.actorName,
        action: params.action,
        detail: params.detail ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write activity log:", err);
  }
}

export const ACTIVITY_PAGE_SIZE = 50;

export async function listActivity(page = 1) {
  const take = ACTIVITY_PAGE_SIZE;
  const skip = (Math.max(1, page) - 1) * take;
  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({ orderBy: { id: "desc" }, skip, take }),
    prisma.adminActivityLog.count(),
  ]);
  return { logs, total, page: Math.max(1, page), pageCount: Math.max(1, Math.ceil(total / take)) };
}
