// Small line-icon set for the account area (Tailwind-scoped, not the `.fz`
// design system). Plain presentational SVGs — safe to import from both server
// and client components. Size/colour come from className via currentColor.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function I({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      {children}
    </svg>
  );
}

export const OverviewIcon = (p: P) => (
  <I {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></I>
);
export const BagIcon = (p: P) => (
  <I {...p}><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></I>
);
export const TruckIcon = (p: P) => (
  <I {...p}><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7" /><circle cx="7.5" cy="18" r="1.7" /><circle cx="17.5" cy="18" r="1.7" /></I>
);
export const CartIcon = (p: P) => (
  <I {...p}><path d="M3 4h2l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L21 8H6" /><circle cx="9.5" cy="20" r="1.4" /><circle cx="17.5" cy="20" r="1.4" /></I>
);
export const HeartIcon = (p: P) => (
  <I {...p}><path d="M12 20s-7-4.6-7-10a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 5.4-7 10-7 10Z" /></I>
);
export const StarIcon = (p: P) => (
  <I {...p}><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" /></I>
);
export const LogoutIcon = (p: P) => (
  <I {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 12h10" /><path d="m13 8-4 4 4 4" /></I>
);
export const ArrowLeftIcon = (p: P) => (
  <I {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></I>
);
