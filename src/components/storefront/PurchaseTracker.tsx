"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/pixel";

// Fires the Pixel Purchase event once when the confirmation page mounts.
export default function PurchaseTracker({
  orderNo,
  total,
}: {
  orderNo: string;
  total: number;
}) {
  useEffect(() => {
    trackPurchase({ value: total / 100, orderNo });
    // Fire once per page load — orderNo/total are stable for a given order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
