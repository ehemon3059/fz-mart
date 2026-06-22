import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [productCount, pendingOrders, totalOrders] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count(),
  ]);

  const cards = [
    { label: "Active Products", value: productCount },
    { label: "Pending Orders", value: pendingOrders },
    { label: "Total Orders", value: totalOrders },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="border rounded-lg bg-white p-6">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
