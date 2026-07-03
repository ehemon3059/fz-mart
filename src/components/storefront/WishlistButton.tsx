"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartIcon } from "./icons";
import { toggleWishlistAction } from "@/app/(storefront)/products/[slug]/wishlist-actions";

export default function WishlistButton({
  productId,
  slug,
  initialWishlisted,
}: {
  productId: number;
  slug: string;
  initialWishlisted: boolean;
}) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleWishlistAction(productId, slug);
      if (res.needsLogin) {
        router.push("/login");
        return;
      }
      if (res.wishlisted != null) setWishlisted(res.wishlisted);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={wishlisted}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:border-black disabled:opacity-50"
    >
      <HeartIcon size={16} />
      {wishlisted ? "Saved to wishlist" : "Add to wishlist"}
    </button>
  );
}
