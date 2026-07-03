import { notFound } from "next/navigation";
import { getCouponById } from "@/server/coupons/admin";
import CouponForm from "../../CouponForm";

export const metadata = { title: "Edit Coupon — FZ-Mart Admin" };

function toDateInput(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await getCouponById(Number(id));
  if (!coupon) notFound();

  return (
    <CouponForm
      coupon={{
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        maxDiscount: coupon.maxDiscount,
        usageLimit: coupon.usageLimit,
        perCustomerLimit: coupon.perCustomerLimit,
        startsAt: toDateInput(coupon.startsAt),
        endsAt: toDateInput(coupon.endsAt),
        isActive: coupon.isActive,
      }}
    />
  );
}
