import SupplierForm from "../SupplierForm";

export const metadata = { title: "New Supplier — FZ-Mart Admin" };

export default function NewSupplierPage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
        New Supplier
      </h1>
      <SupplierForm
        initial={{
          id: null,
          name: "",
          phone: "",
          email: "",
          address: "",
          note: "",
          leadTimeDays: "",
          isActive: true,
        }}
      />
    </div>
  );
}
