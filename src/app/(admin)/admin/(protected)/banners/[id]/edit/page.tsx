import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BannerForm from "../../BannerForm";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await prisma.banner.findUnique({ where: { id: Number(id) } });
  if (!banner) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Banner</h1>
      <BannerForm banner={banner} />
    </div>
  );
}
