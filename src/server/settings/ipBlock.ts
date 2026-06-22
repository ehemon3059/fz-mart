import { prisma } from "@/lib/prisma";

export async function listBlockedIps() {
  return prisma.blockedIp.findMany({ orderBy: { createdAt: "desc" } });
}
