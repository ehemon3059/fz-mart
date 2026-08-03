/* Icon set for categories — a small, curated library the admin picks from when a
   category has no photo. Deliberately separate from components/icons.tsx: that
   set is UI chrome (save, trash, chevron) and these are merchandise categories.
   Mixing them would make both lists hard to scan in their respective pickers.

   Same visual language as the UI set: 24×24 viewBox, stroked not filled, so a
   category icon sits comfortably next to interface icons at any size.

   Keys are stored in Category.iconKey. Renaming a key orphans existing rows
   (they fall back to the letter tile), so add new keys rather than rename. */

export const CATEGORY_ICONS: Record<string, string> = {
  bag: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  jewelry: "M12 3 6 9l6 12 6-12zM6 9h12M9 3h6l3 6",
  shoe: "M2 17h13a5 5 0 0 0 5-2l-4-3-2 1-3-4H2zM2 13v4M8 13l1 1",
  beauty: "M9 2h6v5l2 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10zM7 13h10M10 2v5",
  shirt: "M8 2 4 5v5h3v12h10V10h3V5l-4-3-4 2z",
  dress: "M9 2h6l-1 4 3 6-1 10H8L7 12l3-6z",
  eyewear: "M2 11h20M6 11a3 3 0 1 0 6 0M12 11a3 3 0 1 0 6 0M4 8l2-2M20 8l-2-2",
  baby: "M12 3a6 6 0 0 0-6 6c0 4 3 7 6 12 3-5 6-8 6-12a6 6 0 0 0-6-6zM10 9h.01M14 9h.01M10 12a3 3 0 0 0 4 0",
  watch: "M12 8v4l2 2M8 3h8l-1 4H9zM8 21h8l-1-4H9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z",
  gadget: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM10 5h4M11 18h2",
  kitchen: "M4 3v7a3 3 0 0 0 6 0V3M7 10v11M17 3c-2 0-3 3-3 6s1 4 3 4 3-1 3-4-1-6-3-6zM17 13v8",
  homeDecor: "M12 2 3 9v12h6v-7h6v7h6V9zM12 2v4",
  bedding: "M2 20v-9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9M2 15h20M6 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3",
  bathroom: "M4 11h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM7 11V5a2 2 0 0 1 4 0M7 19l-1 3M17 19l1 3",
  mother: "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 21v-4a5 5 0 0 1 10 0v4M16 13a3 3 0 0 1 4 3v5",
  groceries: "M3 6h18l-2 12H5zM3 6 2 2M8 11v4M12 11v4M16 11v4",
  health: "M12 21C6 16 3 13 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4-3 7-9 12zM12 9v4M10 11h4",
  toys: "M12 2a4 4 0 0 0-4 4v1H6a3 3 0 0 0 0 6h2v3a3 3 0 0 0 6 0v-3h2a3 3 0 0 0 0-6h-2V6a4 4 0 0 0-4-4z",
  gift: "M3 11h18v10H3zM3 7h18v4H3zM12 7v14M12 7C10 7 8 6 8 4.5A2 2 0 0 1 12 4a2 2 0 0 1 4 .5C16 6 14 7 12 7z",
  tools: "m14 6 4-4 4 4-4 4zM3 21l7-7M14 10 4 20M6 3l3 3-3 3-3-3zM17 14l4 4-3 3-4-4z",
  electronics: "M4 4h16v12H4zM2 20h20M9 8l3 2-3 2M14 12h2",
  sports: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 2v20M2 12h20M5 5c4 2 10 2 14 0M5 19c4-2 10-2 14 0",
  book: "M4 3h7a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H4zM20 3h-7a2 2 0 0 0-2 2v16a2 2 0 0 1 2-2h7z",
  pet: "M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 22c-3 0-5-2-5-4s2-5 5-5 5 3 5 5-2 4-5 4z",
};

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

/** Human labels for the picker grid. Keys without a label fall back to the key. */
export const CATEGORY_ICON_LABELS: Record<string, string> = {
  bag: "Bags",
  jewelry: "Jewelry",
  shoe: "Shoes",
  beauty: "Beauty",
  shirt: "Men's wear",
  dress: "Women's wear",
  eyewear: "Eyewear",
  baby: "Baby items",
  watch: "Watches",
  gadget: "Gadgets",
  kitchen: "Kitchen",
  homeDecor: "Home decor",
  bedding: "Bedding",
  bathroom: "Bathroom",
  mother: "Mother & baby",
  groceries: "Groceries",
  health: "Health",
  toys: "Toys",
  gift: "Gifts & craft",
  tools: "Tools",
  electronics: "Electronics",
  sports: "Sports",
  book: "Books",
  pet: "Pets",
};

/** Renders a category icon by key. Unknown keys render nothing, so a stale
    iconKey degrades to blank rather than throwing. */
export function CategoryIcon({
  name,
  size = 24,
  strokeWidth = 1.7,
  className,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const d = CATEGORY_ICONS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
