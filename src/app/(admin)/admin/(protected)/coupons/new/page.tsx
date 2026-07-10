import { getCouponScopeOptions } from "@/server/coupons/admin";
import CouponForm from "../CouponForm";

export const metadata = { title: "New Coupon — FZ-Mart Admin" };

export default async function NewCouponPage() {
  const { categories, products } = await getCouponScopeOptions();
  return <CouponForm categories={categories} products={products} />;
}
