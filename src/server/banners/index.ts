import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { BANNERS_ACTIVE_CACHE_KEY } from "./cache";

const CATALOG_TTL_SECONDS = 60;

export async function listActiveBanners() {
  return getOrSetCache(BANNERS_ACTIVE_CACHE_KEY, CATALOG_TTL_SECONDS, () =>
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  );
}
