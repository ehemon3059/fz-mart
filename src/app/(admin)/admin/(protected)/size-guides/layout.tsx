import { requirePermission } from "@/server/admin/guard";

// Area guard: size guides are a product-authoring tool, so they ride the
// "products" permission rather than introducing a role dimension of their own.
export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("products");
  return <>{children}</>;
}
