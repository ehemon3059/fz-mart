"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

// Runs the cart merge once, right after login. The login routes redirect back
// with a `?cartMerge=1` flag (the merge needs client-side localStorage, which
// those server routes can't reach). On mount we detect the flag, merge the
// local cart into the customer's server cart, then strip the flag from the URL
// so a refresh doesn't re-run it.
//
// Reads the flag straight off window.location instead of useSearchParams so it
// needs no Suspense boundary and never triggers a static-render bailout.
export default function CartMergeOnLogin() {
  const mergeWithServer = useCartStore((s) => s.mergeWithServer);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("cartMerge") !== "1") return;

    void mergeWithServer();

    // Remove the flag without adding a history entry.
    url.searchParams.delete("cartMerge");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [mergeWithServer]);

  return null;
}
