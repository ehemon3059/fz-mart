import { notFound } from "next/navigation";
import { getSizeGuideById } from "@/server/size-guides/admin";
import SizeGuideForm from "../../SizeGuideForm";

export const metadata = { title: "Edit Size Guide — FZ-Mart Admin" };

export default async function EditSizeGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = await getSizeGuideById(Number(id));
  if (!guide) notFound();

  return (
    <SizeGuideForm
      guide={{
        id: guide.id,
        name: guide.name,
        sizeLabel: guide.sizeLabel,
        chart: guide.chart,
        isActive: guide.isActive,
        values: guide.values.map((v) => v.value),
      }}
    />
  );
}
