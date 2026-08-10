"use client";

/**
 * Which size guide this product uses — normally the one inherited from its
 * category, occasionally an override, rarely a one-off label and chart typed
 * here for a product that doesn't deserve a guide of its own.
 *
 * The guide supplies three things: the chips offered in the Options step, the
 * label above them on the storefront ("Select Bust Size:"), and the table
 * behind the Size Chart link.
 */

import Link from "next/link";
import { Icon } from "@/components/icons";
import { renderMarkdown } from "@/lib/markdown";
import { Label } from "./atoms";

export interface GuideOption {
  id: number;
  name: string;
  sizeLabel: string | null;
  chart: string | null;
  values: string[];
}

interface Props {
  guides: GuideOption[];
  /** Selected guide id as a select value; "" = inherit the category's. */
  value: string;
  onChange: (next: string) => void;
  /** The guide the chosen category resolves to, when nothing is set here. */
  inherited: GuideOption | null;
  /** Per-product overrides; "" = use the resolved guide's own value. */
  labelOverride: string;
  chartOverride: string;
  onLabelChange: (next: string) => void;
  onChartChange: (next: string) => void;
  /** The guide actually in effect — inherited or chosen. */
  resolved: GuideOption | null;
}

export default function SizeGuidePanel({
  guides,
  value,
  onChange,
  inherited,
  labelOverride,
  chartOverride,
  onLabelChange,
  onChartChange,
  resolved,
}: Props) {
  const effectiveLabel = labelOverride.trim() || resolved?.sizeLabel || "Size";
  const effectiveChart = chartOverride.trim() || resolved?.chart || "";

  return (
    <div className="space-y-4">
      <div>
        <Label>Size guide</Label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
        >
          <option value="">{inherited ? `— Inherit: ${inherited.name} —` : "— None —"}</option>
          {guides.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[12px] text-stone-400">
          {resolved ? (
            <>
              Offers{" "}
              <span className="font-semibold text-stone-500">
                {resolved.values.slice(0, 10).join(", ")}
                {resolved.values.length > 10 ? " …" : ""}
              </span>
              {value ? " (set here)" : " (from the category)"}.
            </>
          ) : guides.length === 0 ? (
            <>
              No size guides yet —{" "}
              <Link href="/admin/size-guides/new" className="font-semibold text-brand-600 hover:underline">
                create one
              </Link>
              .
            </>
          ) : (
            "Nothing inherited — pick a guide, or type sizes by hand in the Options step."
          )}
        </p>
      </div>

      <div className="border-t border-stone-100 pt-4">
        <Label hint="optional">Label shoppers see</Label>
        <input
          value={labelOverride}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={resolved?.sizeLabel || "Size"}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50 placeholder:text-stone-400"
        />
        <p className="mt-1.5 text-[12px] text-stone-400">
          Shows as “Select {effectiveLabel}:” on the product page.
        </p>
      </div>

      <div className="border-t border-stone-100 pt-4">
        <Label hint="optional · overrides the guide's">Size chart</Label>
        <textarea
          value={chartOverride}
          onChange={(e) => onChartChange(e.target.value)}
          rows={5}
          spellCheck
          placeholder={
            resolved?.chart
              ? "Leave blank to use the guide's chart."
              : "| Size | Chest | Length |\n| --- | --- | --- |\n| **M** | 40\" | 27\" |"
          }
          className="block w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 font-spline-mono text-[12.5px] leading-[1.7] text-stone-800 outline-none transition focus:border-brand-500 placeholder:text-stone-300"
        />
        {effectiveChart ? (
          <details className="mt-2 rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2">
            <summary className="cursor-pointer text-[12px] font-semibold text-stone-500">
              Preview the chart shoppers will see
            </summary>
            <div
              className="prose prose-sm mt-2 max-w-none prose-table:text-[12.5px] prose-th:text-left prose-td:align-top"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(effectiveChart) }}
            />
          </details>
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-stone-400">
            <Icon name="info" size={12} />
            No chart — the “Size Chart” link stays hidden.
          </p>
        )}
      </div>
    </div>
  );
}
