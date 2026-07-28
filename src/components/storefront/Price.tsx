"use client";

import { usePrice } from "@/i18n/provider";

// Renders a paisa amount as a localized price. Client component so it can read
// the Bangla-digit preference from the i18n context; use it anywhere a price
// is shown on the storefront in place of formatTaka().
export default function Price({
  paisa,
  className,
  style,
}: {
  paisa: number;
  className?: string;
  /** Inline overrides (e.g. the admin-chosen price colour). */
  style?: React.CSSProperties;
}) {
  const price = usePrice();
  return (
    <span className={className} style={style}>
      {price(paisa)}
    </span>
  );
}
