"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { trackAddToCart } from "@/lib/pixel";
import { recordAddToCart } from "@/app/(storefront)/funnel-actions";
import { BagIcon, CheckIcon } from "./icons";

interface Props {
  productId: number;
  slug: string;
  name: string;
  /** Unit price in paisa. */
  unitPrice: number;
  imageUrl: string | null;
}

/**
 * Quick "Add to Cart" for simple products shown on storefront cards. Adds one
 * unit and shows a brief "Added" confirmation without leaving the page.
 *
 * Products that require a size/color choice never render this button — the card
 * shows a "View Details" link instead (see ProductCard).
 */
export default function CardAddButton({ productId, slug, name, unitPrice, imageUrl }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  function handleAdd(e: React.MouseEvent) {
    // The card is a link; keep the click from navigating to the product page.
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId, slug, name, unitPrice, imageUrl }, 1);
    trackAddToCart({ value: unitPrice / 100 });
    void recordAddToCart(productId); // server-side funnel (fire-and-forget)
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={`c-add${added ? " is-added" : ""}`}
      aria-label={`Add ${name} to cart`}
    >
      {added ? (
        <>
          <CheckIcon size={16} />
          Added
        </>
      ) : (
        <>
          <BagIcon size={16} />
          Add to Cart
        </>
      )}
    </button>
  );
}
