import Link from "next/link";
import Image from "next/image";
import { listAllBanners } from "@/server/banners/admin";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeBanner } from "./actions";

export default async function AdminBannersPage() {
  const banners = await listAllBanners();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
        <Link
          href="/admin/banners/new"
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Banner
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {banners.map((banner) => (
          <div key={banner.id} className="border rounded-lg bg-white overflow-hidden">
            <div className="relative aspect-[16/6] bg-gray-100">
              <Image src={banner.imageUrl} alt="" fill className="object-cover" />
            </div>
            <div className="p-3 flex items-center justify-between text-sm">
              <span className={banner.isActive ? "text-green-700" : "text-gray-400"}>
                {banner.isActive ? "Active" : "Inactive"}
              </span>
              <div className="flex gap-3">
                <Link href={`/admin/banners/${banner.id}/edit`} className="underline">
                  Edit
                </Link>
                <DeleteButton action={removeBanner} id={banner.id} label="banner" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
