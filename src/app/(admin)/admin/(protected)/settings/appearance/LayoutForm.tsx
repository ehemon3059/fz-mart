"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  SURFACE_PRESETS,
  SURFACE_PRESET_VARS,
  SURFACE_PRESET_LABELS,
  CARD_STYLES,
  CARD_STYLE_LABELS,
  HOME_PRODUCT_MIN,
  HOME_PRODUCT_MAX,
  normalizeHex,
  type ThemeLayout,
} from "@/lib/theme-colors";
import { saveLayout } from "./actions";

export default function LayoutForm({ initial }: { initial: ThemeLayout }) {
  const [preset, setPreset] = useState(initial.preset);
  const [cardStyle, setCardStyle] = useState(initial.productCardStyle);
  const [count, setCount] = useState(String(initial.homeProductCount));
  const [bg, setBg] = useState(initial.customBgColor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveLayout(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  }

  const bgValid = bg.trim() === "" || normalizeHex(bg) !== null;

  return (
    <form action={handleSubmit} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-900">Theme &amp; layout</h2>
      <p className="mt-0.5 text-[13px] text-stone-500">
        Set the storefront background theme, product card style and how many products the home page shows. Changes
        apply to every page instantly after saving.
      </p>

      {/* Surface preset */}
      <fieldset className="mt-5">
        <legend className="text-[13px] font-semibold text-stone-800">Theme preset</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SURFACE_PRESETS.map((id) => {
            const vars = SURFACE_PRESET_VARS[id];
            const active = preset === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => {
                  setPreset(id);
                  setSuccess(false);
                }}
                className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                  active ? "border-stone-900 ring-2 ring-stone-900/10" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <span
                  className="flex h-12 w-full items-center justify-center rounded-lg border"
                  style={{ backgroundColor: vars.bg, borderColor: vars.line }}
                >
                  <span className="h-6 w-8 rounded" style={{ backgroundColor: vars.card, border: `1px solid ${vars.line}` }} />
                </span>
                <span className="mt-2 block text-[12.5px] font-semibold" style={{ color: "#1c1917" }}>
                  {SURFACE_PRESET_LABELS[id]}
                </span>
                {active && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white">
                    <Icon name="check" size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="preset" value={preset} />
      </fieldset>

      {/* Custom background override */}
      <div className="mt-6">
        <label className="text-[13px] font-semibold text-stone-800" htmlFor="customBgColor">
          Custom background <span className="font-normal text-stone-400">(optional — overrides the preset)</span>
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="color"
            value={normalizeHex(bg) ?? SURFACE_PRESET_VARS[preset].bg}
            onChange={(e) => {
              setBg(e.target.value);
              setSuccess(false);
            }}
            className="h-11 w-14 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
            aria-label="Pick a custom background colour"
          />
          <input
            id="customBgColor"
            name="customBgColor"
            type="text"
            value={bg}
            onChange={(e) => {
              setBg(e.target.value);
              setSuccess(false);
            }}
            placeholder="#0b1220"
            className="w-40 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] font-mono text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-stone-400 focus:outline-none"
          />
          {bg.trim() !== "" && (
            <button
              type="button"
              onClick={() => {
                setBg("");
                setSuccess(false);
              }}
              className="text-[13px] font-medium text-stone-500 underline hover:text-stone-700"
            >
              Clear / use preset
            </button>
          )}
          {!bgValid && <span className="text-[12.5px] font-medium text-amber-600">Enter a hex like #0b1220</span>}
        </div>
      </div>

      {/* Card style + product count */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-[13px] font-semibold text-stone-800" htmlFor="productCardStyle">
            Product card style
          </label>
          <select
            id="productCardStyle"
            name="productCardStyle"
            value={cardStyle}
            onChange={(e) => {
              setCardStyle(e.target.value as typeof cardStyle);
              setSuccess(false);
            }}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 shadow-soft focus:border-stone-400 focus:outline-none"
          >
            {CARD_STYLES.map((id) => (
              <option key={id} value={id}>
                {CARD_STYLE_LABELS[id]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-stone-800" htmlFor="homeProductCount">
            Home page product count
          </label>
          <input
            id="homeProductCount"
            name="homeProductCount"
            type="number"
            min={HOME_PRODUCT_MIN}
            max={HOME_PRODUCT_MAX}
            value={count}
            onChange={(e) => {
              setCount(e.target.value);
              setSuccess(false);
            }}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 shadow-soft focus:border-stone-400 focus:outline-none"
          />
          <p className="mt-1 text-[12px] text-stone-400">
            Between {HOME_PRODUCT_MIN} and {HOME_PRODUCT_MAX}. Controls the featured grid on the home page.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-700">
          <Icon name="check" size={16} strokeWidth={2.4} /> Saved. The storefront now uses this theme &amp; layout.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !bgValid}
        className="mt-5 rounded-xl bg-stone-900 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save & apply to storefront"}
      </button>
    </form>
  );
}
