"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { KpiCard } from "@/components/admin/ui/Card";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { OrderPipeline, TerminalChips } from "@/components/admin/dashboard/OrderPipeline";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import type { OrderStatus } from "@prisma/client";
import { DASHBOARD_COPY, type DashLang } from "./content";

// Everything crossing from the server page is pre-formatted: money as strings,
// dates as strings. Keeps currency and date formatting server-side and means no
// Date object has to survive serialisation.

export interface DashboardData {
  lowStock: { id: number; name: string; stock: number }[];
  kpis: {
    todayCount: string;
    todayRevenue: string;
    pendingCount: string;
    activeProducts: string;
    deliveredRevenue: string;
    totalOrders: number;
  };
  statusCounts: Record<string, number>;
  terminalStatuses: OrderStatus[];
  funnel: {
    steps: { type: string; label: string; count: number; stepRate: number | null }[];
    checkoutAbandonmentRate: number | null;
  };
  recentOrders: {
    id: number;
    orderNo: string;
    customerName: string;
    total: string;
    status: OrderStatus;
    placed: string;
  }[];
  best7: { productId: number; slug: string; name: string; qty: number; revenue: string }[];
  best30: { productId: number; slug: string; name: string; qty: number; revenue: string }[];
  categorySales: { category: string; revenue: string; qty: number }[];
  repeat: { rate: number; repeatCustomers: number; totalCustomers: number };
  courier: { courier: string; successRate: number; delivered: number; failed: number }[];
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [lang, setLang] = useState<DashLang>("en");
  const t = DASHBOARD_COPY[lang];

  const cards = [
    {
      label: t.kpiOrdersToday,
      value: data.kpis.todayCount,
      sub: t.kpiOrdersTodaySub(data.kpis.todayRevenue),
      href: "/admin/orders",
      icon: "cart" as const,
      tone: "accent" as const,
    },
    {
      label: t.kpiPending,
      value: data.kpis.pendingCount,
      sub: t.kpiPendingSub,
      href: "/admin/orders?status=PENDING",
      icon: "info" as const,
      tone: "warning" as const,
    },
    {
      label: t.kpiProducts,
      value: data.kpis.activeProducts,
      sub: t.kpiProductsSub,
      href: "/admin/products",
      icon: "box" as const,
      tone: "neutral" as const,
    },
    {
      label: t.kpiRevenue,
      value: data.kpis.deliveredRevenue,
      sub: t.kpiRevenueSub(data.kpis.totalOrders),
      href: "/admin/reports/orders",
      icon: "home" as const,
      tone: "accent" as const,
    },
  ];

  const maxFunnel = Math.max(1, ...data.funnel.steps.map((s) => s.count));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">{t.heading}</h1>
          <p className="mt-1 text-[13.5px] text-stone-500">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50"
        >
          <Icon name="globe" size={15} />
          {t.toggleLabel}
        </button>
      </div>

      {/* Low-stock alert */}
      {data.lowStock.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/15 text-warning-fg">
              <Icon name="warn" size={15} />
            </span>
            <h2 className="text-sm font-semibold text-warning-fg">
              {t.lowStock(data.lowStock.length)}
            </h2>
            <Link
              href="/admin/inventory?filter=reorder"
              className="ml-auto text-[13px] text-warning-fg underline-offset-2 hover:underline"
            >
              {t.lowStockLink}
            </Link>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {data.lowStock.slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}/edit`}
                className="rounded-full border border-warning/30 bg-white px-3 py-1 text-[13px] text-warning-fg transition-colors hover:border-warning"
              >
                {p.name} · <b className="nums">{p.stock}</b> {t.left}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Order pipeline */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-stone-900">{t.pipeline}</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline"
          >
            {t.allOrders}
          </Link>
        </div>
        <OrderPipeline counts={data.statusCounts} />
        <div className="mt-3">
          <TerminalChips counts={data.statusCounts} statuses={data.terminalStatuses} />
        </div>
      </div>

      {/* Conversion funnel */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold text-stone-900">{t.funnel}</h2>
          {data.funnel.checkoutAbandonmentRate != null && (
            <span className="text-sm text-stone-500">
              {t.abandonment}{" "}
              <b
                className={
                  data.funnel.checkoutAbandonmentRate > 60 ? "text-warning-fg" : "text-stone-700"
                }
              >
                {data.funnel.checkoutAbandonmentRate}%
              </b>
            </span>
          )}
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <div className="space-y-3">
            {data.funnel.steps.map((step) => {
              const pct = Math.round((step.count / maxFunnel) * 100);
              return (
                <div key={step.type}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-stone-700">{step.label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="nums font-bold text-stone-900">
                        {step.count.toLocaleString("en-BD")}
                      </span>
                      {step.stepRate != null ? (
                        <span
                          className={`text-xs font-medium ${step.stepRate >= 100 ? "text-success-fg" : "text-stone-400"}`}
                        >
                          {step.stepRate}%
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">{t.funnelTop}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-400">
            {t.funnelNote}
          </p>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-stone-900">{t.recentOrders}</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline"
          >
            {t.viewAll}
          </Link>
        </div>
        <DataTable
          head={
            <tr>
              <Th>{t.colOrderNo}</Th>
              <Th>{t.colCustomer}</Th>
              <Th align="right">{t.colTotal}</Th>
              <Th>{t.colStatus}</Th>
              <Th align="right">{t.colPlaced}</Th>
            </tr>
          }
        >
          {data.recentOrders.map((order) => (
            <Tr key={order.id}>
              <Td className="font-spline-mono font-medium">
                <Link href={`/admin/orders/${order.id}`} className="hover:text-accent hover:underline">
                  {order.orderNo}
                </Link>
              </Td>
              <Td>{order.customerName}</Td>
              <Td numeric className="font-medium text-stone-900">
                {order.total}
              </Td>
              <Td>
                <OrderStatusBadge status={order.status} />
              </Td>
              <Td numeric className="text-stone-500">
                {order.placed}
              </Td>
            </Tr>
          ))}
          {data.recentOrders.length === 0 && <TableEmpty colSpan={5}>{t.noOrders}</TableEmpty>}
        </DataTable>
      </div>

      {/* Insights */}
      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-stone-900">{t.insights}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { title: t.best7, rows: data.best7 },
            { title: t.best30, rows: data.best30 },
          ].map((panel) => (
            <div
              key={panel.title}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-card"
            >
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-stone-500">
                {panel.title}
              </h3>
              {panel.rows.length === 0 ? (
                <EmptyState
                  icon="star"
                  title={t.noSalesTitle}
                  description={t.noSalesBody}
                  action={{ label: t.viewProducts, href: "/admin/products", icon: "box" }}
                />
              ) : (
                <div className="divide-y divide-stone-100 text-sm">
                  {panel.rows.map((r, i) => (
                    <div key={r.productId} className="flex items-center justify-between py-2">
                      <span className="truncate">
                        <span className="nums text-stone-400">{i + 1}.</span>{" "}
                        <Link href={`/products/${r.slug}`} className="hover:text-accent hover:underline">
                          {r.name}
                        </Link>
                      </span>
                      <span className="nums ml-3 shrink-0 text-stone-500">
                        {r.qty} {t.sold} · {r.revenue}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-stone-500">
              {t.salesByCategory}
            </h3>
            {data.categorySales.length === 0 ? (
              <EmptyState icon="tag" title={t.noSalesTitle} description={t.noCategorySalesBody} />
            ) : (
              <div className="divide-y divide-stone-100 text-sm">
                {data.categorySales.map((c) => (
                  <div key={c.category} className="flex items-center justify-between py-2">
                    <span className="text-stone-700">{c.category}</span>
                    <span className="nums text-stone-500">
                      {c.revenue} · {c.qty} {t.items}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-stone-500">
              {t.repeatCustomers}
            </h3>
            <p className="nums text-3xl font-bold text-stone-900">{data.repeat.rate}%</p>
            <p className="text-xs text-stone-400">
              {t.repeatSub(data.repeat.repeatCustomers, data.repeat.totalCustomers)}
            </p>

            <h3 className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-wide text-stone-500">
              {t.courierSuccess}
            </h3>
            {data.courier.length === 0 ? (
              <p className="text-sm text-stone-400">{t.noCourier}</p>
            ) : (
              <div className="divide-y divide-stone-100 text-sm">
                {data.courier.map((c) => (
                  <div key={c.courier} className="flex items-center justify-between py-2">
                    <span className="text-stone-700">{c.courier}</span>
                    <span className="nums text-stone-500">
                      <span
                        className={
                          c.successRate >= 80
                            ? "font-semibold text-success-fg"
                            : "font-semibold text-warning-fg"
                        }
                      >
                        {c.successRate}%
                      </span>{" "}
                      ({c.delivered}✓ / {c.failed}✗)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
