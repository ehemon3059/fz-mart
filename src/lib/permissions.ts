// Single source of truth for admin RBAC. Pure module (no node/prisma imports)
// so both server guards and client components (the sidebar) can share it.
//
// Roles, least → most privileged:
//   STAFF   — front-line: orders + reviews only.
//   MANAGER — runs the catalogue and reads reports, but NOT settings,
//             expenses, or admin management.
//   OWNER   — everything.

export type AdminRole = "OWNER" | "MANAGER" | "STAFF";

// A Permission is an "area" of the admin — one per nav section / feature.
export type Permission =
  | "orders"
  | "reviews"
  | "products"
  | "categories"
  | "banners"
  | "flash-sales"
  | "coupons"
  | "returns"
  | "pages"
  | "faq"
  | "reports"
  | "expenses"
  | "settings"
  | "admins";

// STAFF also handles the return-requests queue (front-line customer service).
const STAFF: Permission[] = ["orders", "reviews", "returns"];

const MANAGER: Permission[] = [
  ...STAFF,
  "products",
  "categories",
  "banners",
  "flash-sales",
  "coupons",
  "pages",
  "faq",
  "reports",
];

const OWNER: Permission[] = [...MANAGER, "expenses", "settings", "admins"];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  OWNER,
  MANAGER,
  STAFF,
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export const ALL_ROLES: AdminRole[] = ["OWNER", "MANAGER", "STAFF"];

export function isAdminRole(value: string): value is AdminRole {
  return value === "OWNER" || value === "MANAGER" || value === "STAFF";
}
