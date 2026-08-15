import { notFound } from "next/navigation";
import { getSupplier } from "@/server/purchasing";
import SupplierForm from "../../SupplierForm";

export const metadata = { title: "Edit Supplier — FZ-Mart Admin" };

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getSupplier(Number(id));
  if (!supplier) notFound();

  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
        {supplier.name}
      </h1>
      <SupplierForm
        initial={{
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          note: supplier.note ?? "",
          leadTimeDays: supplier.leadTimeDays != null ? String(supplier.leadTimeDays) : "",
          isActive: supplier.isActive,
        }}
      />
    </div>
  );
}
