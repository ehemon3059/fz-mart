import { invalidateCache } from "@/lib/cache";

// WHAT CLEARS EACH KEY:
//   faq:active -> any faq item create/update/delete

export const faqCacheKeys = {
  active: () => "faq:active",
};

export async function invalidateFaqCache(): Promise<void> {
  await invalidateCache(faqCacheKeys.active());
}
