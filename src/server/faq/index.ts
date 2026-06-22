import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { faqCacheKeys } from "./cache";

const FAQ_TTL_SECONDS = 300;

export async function listActiveFaqs() {
  return getOrSetCache(faqCacheKeys.active(), FAQ_TTL_SECONDS, () =>
    prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  );
}
