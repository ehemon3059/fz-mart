import { invalidateCache } from "@/lib/cache";

// WHAT CLEARS THIS KEY: any banner create/update/delete.
export const BANNERS_ACTIVE_CACHE_KEY = "banners:active";

export async function invalidateBannerCache(): Promise<void> {
  await invalidateCache(BANNERS_ACTIVE_CACHE_KEY);
}
