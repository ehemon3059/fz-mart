import { invalidateCache } from "@/lib/cache";

// WHAT CLEARS THIS KEY: any flash sale or its product list create/update/delete.
export const FLASH_SALE_ACTIVE_CACHE_KEY = "flash-sale:active";

export async function invalidateFlashSaleCache(): Promise<void> {
  await invalidateCache(FLASH_SALE_ACTIVE_CACHE_KEY);
}
