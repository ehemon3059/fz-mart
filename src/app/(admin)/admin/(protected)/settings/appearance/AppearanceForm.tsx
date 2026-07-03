"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  THEME_PRESETS,
  derivePalette,
  normalizeHex,
  type BrandPalette,
} from "@/lib/theme-colors";
import { saveTheme } from "./actions";

function paletteMatches(a: BrandPalette, b: BrandPalette): boolean {
  return (
    a.brand === b.brand &&
    a.brandDark === b.brandDark &&
    a.brandTint === b.brandTint &&
    a.brandTint2 === b.brandTint2
  );
}

export default function AppearanceForm({ initial }: { initial: BrandPalette }) {
  const [palette, setPalette] = useState<BrandPalette>(initial);
  const [custom, setCustom] = useState(initial.brand);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  // Which preset (if any) is currently active — drives the selected ring.
  const activePresetId = useMemo(
    () => THEME_PRESETS.find((p) => paletteMatches(p.palette, palette))?.id ?? null,
    [palette],
  );

  function pickPreset(p: BrandPalette) {
    setPalette(p);
    setCustom(p.brand);
    setSuccess(false);
  }

  function pickCustom(hex: string) {
    setCustom(hex);
    setSuccess(false);
    const normalized = normalizeHex(hex);
    if (normalized) setPalette(derivePalette(normalized));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveTheme(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {/* Presets */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
          <h2 className="text-[15px] font-bold text-stone-900">Theme presets</h2>
          <p className="mt-0.5 text-[13px] text-stone-500">Pick a ready-made palette for the storefront.</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEME_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => pickPreset(preset.palette)}
                  className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                    active ? "border-stone-900 ring-2 ring-stone-900/10" : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <span
                    className="block h-12 w-full rounded-lg"
                    style={{ backgroundColor: preset.palette.brand }}
                  />
                  <span className="mt-2 flex gap-1">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.palette.brandDark }} />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.palette.brandTint2 }} />
                    <span className="h-3 w-3 rounded-full border border-stone-200" style={{ backgroundColor: preset.palette.brandTint }} />
                  </span>
                  <span className="mt-2 block text-[12.5px] font-semibold text-stone-800">{preset.name}</span>
                  {active && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white">
                      <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom colour */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
          <h2 className="text-[15px] font-bold text-stone-900">Custom colour</h2>
          <p className="mt-0.5 text-[13px] text-stone-500">
            Pick any colour — we derive the darker shade and tints automatically.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <input
              type="color"
              value={normalizeHex(custom) ?? "#000000"}
              onChange={(e) => pickCustom(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
              aria-label="Pick a custom colour"
            />
            <input
              type="text"
              value={custom}
              onChange={(e) => pickCustom(e.target.value)}
              placeholder="#c026d3"
              className="w-40 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] font-mono text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-stone-400 focus:outline-none"
            />
            {!normalizeHex(custom) && (
              <span className="text-[12.5px] font-medium text-amber-600">Enter a hex like #c026d3</span>
            )}
          </div>
        </div>

        {/* Hidden inputs carry the resolved palette to the server */}
        <input type="hidden" name="brand" value={palette.brand} />
        <input type="hidden" name="brandDark" value={palette.brandDark} />
        <input type="hidden" name="brandTint" value={palette.brandTint} />
        <input type="hidden" name="brandTint2" value={palette.brandTint2} />

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-700">
            <Icon name="check" size={16} strokeWidth={2.4} /> Saved. The storefront now uses this colour.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-stone-900 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & apply to storefront"}
        </button>
      </div>

      {/* Live preview */}
      <aside className="lg:self-start">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft">
          <p className="text-[13px] font-semibold text-stone-800">Live preview</p>
          <div className="mt-4 rounded-xl border border-stone-100 bg-[#fafaf9] p-4">
            {/* button */}
            <button
              type="button"
              className="w-full rounded-xl px-4 py-2.5 text-[14px] font-bold text-white"
              style={{ backgroundColor: palette.brand }}
            >
              Add to cart
            </button>
            {/* badges + tint chip */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md px-2 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: palette.brand }}>
                NEW
              </span>
              <span
                className="rounded-md px-2.5 py-1 text-[12px] font-bold"
                style={{ backgroundColor: palette.brandTint, color: palette.brandDark, border: `1px solid ${palette.brandTint2}` }}
              >
                Free shipping
              </span>
              <span className="text-[13px] font-bold" style={{ color: palette.brandDark }}>
                Shop now →
              </span>
            </div>
            {/* swatches */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {([
                ["brand", palette.brand],
                ["dark", palette.brandDark],
                ["tint-2", palette.brandTint2],
                ["tint", palette.brandTint],
              ] as const).map(([label, value]) => (
                <div key={label} className="text-center">
                  <span className="block h-9 w-full rounded-lg border border-stone-200" style={{ backgroundColor: value }} />
                  <span className="mt-1 block font-mono text-[10px] text-stone-500">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-stone-500">
            Applies to storefront buttons, badges, links, focus rings and tints. The sale/discount red stays
            the same so offers always stand out.
          </p>
        </div>
      </aside>
    </form>
  );
}
