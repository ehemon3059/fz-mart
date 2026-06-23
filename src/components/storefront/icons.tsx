// Inline SVG icon set for the storefront. Small, dependency-free.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: P) => (
  <Svg {...p} strokeWidth={2.4}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
);
export const UserIcon = (p: P) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>
);
export const BagIcon = (p: P) => (
  <Svg {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2.3 12.4a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.2L21.5 7H6" /></Svg>
);
export const ChevronDown = (p: P) => (
  <Svg {...p} strokeWidth={2.5}><path d="m6 9 6 6 6-6" /></Svg>
);
export const ArrowRight = (p: P) => (
  <Svg {...p} strokeWidth={2.4}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>
);
export const MenuIcon = (p: P) => (
  <Svg {...p} strokeWidth={2.2}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Svg>
);
export const PinIcon = (p: P) => (
  <Svg {...p} strokeWidth={2}><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></Svg>
);
export const HeartIcon = (p: P) => (
  <Svg {...p} strokeWidth={2}><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z" /></Svg>
);
export const BoltIcon = ({ size = 14, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
);
export const FireIcon = ({ size = 22, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
    <path d="M12 2c1 3-1 4-1 6 0 1 1 2 2 2 1 0 2-1 2-3 2 2 4 4 4 8a7 7 0 0 1-14 0c0-3 2-5 4-7 1-1 3-3 3-6Z" />
  </svg>
);

// ---- trust badges ----
export const TruckIcon = (p: P) => (
  <Svg {...p}><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></Svg>
);
export const CashIcon = (p: P) => (
  <Svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const ReturnIcon = (p: P) => (
  <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /></Svg>
);
export const ShieldCheck = (p: P) => (
  <Svg {...p}><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Svg>
);

// ---- social ----
export const FacebookIcon = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
    <path d="M14 9h3V5h-3c-2.2 0-4 1.8-4 4v2H7v4h3v6h4v-6h3l1-4h-4V9c0-.6.4-1 1-1Z" />
  </svg>
);
export const InstagramIcon = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...rest}>
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
export const YoutubeIcon = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
    <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.7 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22.3 12 31 31 0 0 0 22 8.2ZM10 15V9l5.2 3L10 15Z" />
  </svg>
);

// ---- category icons, keyed by keyword in the category name ----
const CAT_ICON_PATHS: { test: RegExp; path: string; bg: string; fg: string }[] = [
  { test: /electron/i, bg: "#e8effb", fg: "#2f6bdb", path: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>' },
  { test: /fashion|cloth|apparel/i, bg: "#fdeaf0", fg: "#d6336c", path: '<path d="M16 3 12 6 8 3 4 6l2 3v11h12V9l2-3-4-3Z"/>' },
  { test: /home|living|furnitur/i, bg: "#eaf6ee", fg: "#0a7d57", path: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>' },
  { test: /grocer|food/i, bg: "#fff2e1", fg: "#c2620f", path: '<path d="M3 5h2l2 11h11l2-8H6"/><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/>' },
  { test: /beauty|cosmet/i, bg: "#f3ecfb", fg: "#7048c4", path: '<path d="M9 3h6v4l-2 2v3h-2V9L9 7V3Z"/><rect x="8" y="12" width="8" height="9" rx="2"/>' },
  { test: /mobile|gadget|phone/i, bg: "#e6f6f5", fg: "#0e8b86", path: '<rect x="6" y="2" width="12" height="20" rx="3"/><line x1="11" y1="18" x2="13" y2="18"/>' },
  { test: /health|pharma|medic/i, bg: "#eaf2ff", fg: "#3b5bdb", path: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z"/>' },
  { test: /sport|fitness|outdoor/i, bg: "#fdefe6", fg: "#d9480f", path: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>' },
  { test: /toy|baby|kid/i, bg: "#fdf0f6", fg: "#c2255c", path: '<circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/>' },
  { test: /book|station/i, bg: "#eef2f1", fg: "#37635a", path: '<path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Z"/><path d="M18 6h2v14H6"/>' },
];
const CAT_FALLBACK = { bg: "#eef1f6", fg: "#475569", path: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>' };

export function categoryVisual(name: string) {
  return CAT_ICON_PATHS.find((c) => c.test.test(name)) ?? CAT_FALLBACK;
}

export function CategoryIcon({ name, size = 28 }: { name: string; size?: number }) {
  const v = categoryVisual(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: v.path }} />
  );
}
