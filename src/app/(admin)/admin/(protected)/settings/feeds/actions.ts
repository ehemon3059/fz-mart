"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { regenerateFeedToken } from "@/server/settings/feeds";

export interface FeedActionResult {
  token?: string;
  error?: string;
}

export async function regenerateFeedTokenAction(): Promise<FeedActionResult> {
  await requirePermission("settings");
  const token = await regenerateFeedToken();
  revalidatePath("/admin/settings/feeds");
  return { token };
}
