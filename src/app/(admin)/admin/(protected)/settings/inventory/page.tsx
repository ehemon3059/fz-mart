import { getInventoryConfig } from "@/server/settings/inventory";
import InventoryForm from "./InventoryForm";

export const metadata = { title: "Inventory — FZ-Mart Admin" };

export default async function InventorySettingsPage() {
  const config = await getInventoryConfig();
  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">Inventory</h1>
      <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
        Low-stock alerting. Set per-product thresholds on each product; low items appear on the dashboard.
      </p>
      <div className="mt-6">
        <InventoryForm digestEnabled={config.digestEnabled} />
      </div>
    </div>
  );
}
