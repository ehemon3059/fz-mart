import TrackForm from "./TrackForm";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string }>;
}) {
  const { orderNo } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
      <TrackForm initialOrderNo={orderNo} />
    </div>
  );
}
