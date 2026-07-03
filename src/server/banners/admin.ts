import type { BannerSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invalidateBannerCache } from "./cache";

export async function listAllBanners() {
  return prisma.banner.findMany({ orderBy: [{ slot: "asc" }, { sortOrder: "asc" }] });
}

export interface BannerInput {
  imageUrl: string;
  link?: string | null;
  slot?: BannerSlot;
  sortOrder?: number;
  isActive?: boolean;
}

export async function createBanner(input: BannerInput) {
  const banner = await prisma.banner.create({
    data: {
      imageUrl: input.imageUrl,
      link: input.link ?? null,
      slot: input.slot ?? "MAIN",
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  await invalidateBannerCache();
  return banner;
}

export async function updateBanner(id: number, input: BannerInput) {
  const banner = await prisma.banner.update({
    where: { id },
    data: {
      imageUrl: input.imageUrl,
      link: input.link ?? null,
      slot: input.slot ?? "MAIN",
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  await invalidateBannerCache();
  return banner;
}

export async function deleteBanner(id: number) {
  await prisma.banner.delete({ where: { id } });
  await invalidateBannerCache();
}
