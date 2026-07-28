"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  SURFACE_PRESETS,
  SURFACE_PRESET_VARS,
  SURFACE_PRESET_LABELS,
  SURFACE_COLOR_SLOTS,
  normalizeHex,
  type SurfaceColorKey,
  type ThemeLayout,
} from "@/lib/theme-colors";
import { saveLayout } from "./actions";

export default function LayoutForm({ initial }: { initial: ThemeLayout }) {
  const [preset, setPreset] = useState(initial.preset);
  const [bg, setBg] = useState(initial.customBgColor ?? "");
  const [surfaces, setSurfaces] = useState<Record<SurfaceColorKey, string>>({
    catnavBg: initial.surfaceColors.catnavBg ?? "",
    cardBg: initial.surfaceColors.cardBg ?? "",
    trustBg: initial.surfaceColors.trustBg ?? "",
    newsBg: initial.surfaceColors.newsBg ?? "",
  });
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

  const vars = SURFACE_PRESET_VARS[preset];
  const bgValid = bg.trim() === "" || normalizeHex(bg) !== null;
  const surfacesValid = SURFACE_COLOR_SLOTS.every(
    (s) => surfaces[s.key].trim() === "" || normalizeHex(surfaces[s.key]) !== null,
  );

  // What the storefront will actually paint, resolved the same way the browser
  // resolves the `var(--x, …)` fallbacks: an override wins, else the preset.
  const pageBg = normalizeHex(bg) ?? vars.bg;
  const resolved = (key: SurfaceColorKey, fallback: string) =>
    normalizeHex(surfaces[key]) ?? fallback;
  const cardBg = resolved("cardBg", vars.card);
  const catnavBg = resolved("catnavBg", vars.card);
  const trustBg = resolved("trustBg", vars.card);
  const newsBg = resolved("newsBg", vars.ink);

  const setSurface = (key: SurfaceColorKey, value: string) => {
    setSurfaces((s) => ({ ...s, [key]: value }));
    setSuccess(false);
  };

  // Anything actually overriding the preset right now.
  const hasOverrides =
    bg.trim() !== "" || SURFACE_COLOR_SLOTS.some((s) => surfaces[s.key].trim() !== "");

  // Drop every custom colour so all surfaces follow the selected preset again.
  // Form-only: nothing is persisted until Save, so this is reversible by
  // navigating away. The preset choice itself is deliberately kept.
  const resetToPreset = () => {
    setBg("");
    setSurfaces({ catnavBg: "", cardBg: "", trustBg: "", newsBg: "" });
    setError(null);
    setSuccess(false);
  };

  return (
    <form action={handleSubmit} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-900">Theme &amp; layout</h2>
      <p className="mt-0.5 text-[13px] text-stone-500">
        Set the storefront background theme and re-colour individual surfaces. Changes apply to every page instantly
        after saving.
      </p>

      {/* Surface preset */}
      <fieldset className="mt-5">
        <legend className="text-[13px] font-semibold text-stone-800">Theme preset</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SURFACE_PRESETS.map((id) => {
            const pv = SURFACE_PRESET_VARS[id];
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
                  style={{ backgroundColor: pv.bg, borderColor: pv.line }}
                >
                  <span className="h-6 w-8 rounded" style={{ backgroundColor: pv.card, border: `1px solid ${pv.line}` }} />
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

      {/* Custom page background override */}
      <div className="mt-6">
        <label className="text-[13px] font-semibold text-stone-800" htmlFor="customBgColor">
          Page background <span className="font-normal text-stone-400">(optional — overrides the preset)</span>
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="color"
            value={pageBg}
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

      {/* Per-surface background overrides */}
      <fieldset className="mt-6">
        <legend className="text-[13px] font-semibold text-stone-800">Section colours</legend>
        <p className="mt-0.5 text-[12px] text-stone-400">
          Leave a colour empty to follow the theme preset.
        </p>
        <div className="mt-3 space-y-3">
          {SURFACE_COLOR_SLOTS.map((slot) => {
            const value = surfaces[slot.key];
            const valid = value.trim() === "" || normalizeHex(value) !== null;
            return (
              <div key={slot.key} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={resolved(slot.key, slot.fallback(vars))}
                  onChange={(e) => setSurface(slot.key, e.target.value)}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
                  aria-label={`Pick a colour for ${slot.label}`}
                />
                <div className="min-w-[180px] flex-1">
                  <label className="block text-[13px] font-semibold text-stone-800" htmlFor={slot.key}>
                    {slot.label}
                  </label>
                  <p className="text-[12px] text-stone-400">{slot.help}</p>
                </div>
                <input
                  id={slot.key}
                  name={slot.key}
                  type="text"
                  value={value}
                  onChange={(e) => setSurface(slot.key, e.target.value)}
                  placeholder={slot.fallback(vars)}
                  className="w-40 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] font-mono text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-stone-400 focus:outline-none"
                />
                {value.trim() !== "" && (
                  <button
                    type="button"
                    onClick={() => setSurface(slot.key, "")}
                    className="text-[13px] font-medium text-stone-500 underline hover:text-stone-700"
                    aria-label={`Clear ${slot.label}`}
                  >
                    Clear
                  </button>
                )}
                {!valid && <span className="text-[12.5px] font-medium text-amber-600">Enter a hex like #0b1220</span>}
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Live preview — a miniature storefront painted with the current picks */}
      <div className="mt-6">
        <span className="text-[13px] font-semibold text-stone-800">Live preview</span>
        <div
          className="mt-2 overflow-hidden rounded-xl border"
          style={{ backgroundColor: pageBg, borderColor: vars.line }}
        >
          {/* category bar */}
          <div
            className="flex items-center gap-2 border-b px-3 py-2.5"
            style={{ backgroundColor: catnavBg, borderColor: vars.line }}
          >
            {["All", "Men", "Women", "Kids"].map((c) => (
              <span key={c} className="text-[11.5px] font-medium" style={{ color: vars.inkSoft }}>
                {c}
              </span>
            ))}
          </div>

          {/* trust bar */}
          <div className="px-3 pt-3">
            <div
              className="grid grid-cols-4 rounded-lg border p-1.5"
              style={{ backgroundColor: trustBg, borderColor: vars.line }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-1.5 px-1.5 py-1">
                  <span
                    className="h-4 w-4 shrink-0 rounded"
                    style={{ backgroundColor: vars.line }}
                  />
                  <span
                    className="h-1.5 w-full rounded-full"
                    style={{ backgroundColor: vars.inkMute }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* product cards */}
          <div className="grid grid-cols-3 gap-2.5 p-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg border"
                style={{ backgroundColor: cardBg, borderColor: vars.line }}
              >
                <div className="h-10 w-full" style={{ backgroundColor: vars.line }} />
                <div className="p-2">
                  <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: vars.inkMute }} />
                  <div className="mt-1.5 h-1.5 w-1/2 rounded-full" style={{ backgroundColor: vars.line }} />
                </div>
              </div>
            ))}
          </div>

          {/* newsletter band */}
          <div className="px-3 pb-3">
            <div className="rounded-lg px-3 py-3" style={{ backgroundColor: newsBg }}>
              <PreviewNewsText bg={newsBg} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-700">
          <Icon name="check" size={16} strokeWidth={2.4} /> Saved. The storefront now uses this theme.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !bgValid || !surfacesValid}
          className="rounded-xl bg-stone-900 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & apply to storefront"}
        </button>
        <button
          type="button"
          onClick={resetToPreset}
          disabled={pending || !hasOverrides}
          className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-[14.5px] font-semibold text-stone-700 shadow-soft hover:bg-stone-50 disabled:opacity-40"
        >
          Reset to default colours
        </button>
        {hasOverrides && (
          <span className="text-[12.5px] text-stone-400">
            Clears every custom colour — press Save to apply.
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * The newsletter band's text in the preview. Mirrors what `surfaceColorVars`
 * derives on the storefront, so a pale pick shows dark text here too rather
 * than the white-on-white the admin would otherwise not notice until saving.
 */
function PreviewNewsText({ bg }: { bg: string }) {
  const light = isLight(bg);
  return (
    <>
      <div
        className="h-1.5 w-24 rounded-full"
        style={{ backgroundColor: light ? "rgba(0,0,0,.72)" : "rgba(255,255,255,.92)" }}
      />
      <div
        className="mt-1.5 h-1.5 w-36 rounded-full"
        style={{ backgroundColor: light ? "rgba(0,0,0,.38)" : "rgba(255,255,255,.5)" }}
      />
    </>
  );
}

/** Rough perceived-brightness check — good enough to flip preview text. */
function isLight(hex: string): boolean {
  const h = normalizeHex(hex);
  if (!h) return false;
  const n = parseInt(h.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}
