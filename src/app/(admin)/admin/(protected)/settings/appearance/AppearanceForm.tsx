"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  ELEMENT_COLOR_SLOTS,
  THEME_PRESETS,
  coerceElementColors,
  derivePalette,
  elementColorVars,
  isGlossyPalette,
  normalizeHex,
  type BrandPalette,
  type ElementColorKey,
  type ElementColors,
} from "@/lib/theme-colors";
import { saveElementColors, saveTheme } from "./actions";

function paletteMatches(a: BrandPalette, b: BrandPalette): boolean {
  return (
    a.brand === b.brand &&
    a.brandDark === b.brandDark &&
    a.brandTint === b.brandTint &&
    a.brandTint2 === b.brandTint2
  );
}

export default function AppearanceForm({
  initial,
  initialElementColors,
}: {
  initial: BrandPalette;
  initialElementColors: ElementColors;
}) {
  const [palette, setPalette] = useState<BrandPalette>(initial);
  const [custom, setCustom] = useState(initial.brand);
  // Per-element overrides. "" means "inherit the brand palette" — the same
  // thing null means server-side, but text inputs need a string.
  const [elements, setElements] = useState<Record<ElementColorKey, string>>(() =>
    Object.fromEntries(
      ELEMENT_COLOR_SLOTS.map((s) => [s.key, initialElementColors[s.key] ?? ""]),
    ) as Record<ElementColorKey, string>,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  // Which preset (if any) is currently active — drives the selected ring.
  const activePresetId = useMemo(
    () => THEME_PRESETS.find((p) => paletteMatches(p.palette, palette))?.id ?? null,
    [palette],
  );

  // Glossy presets (Golden Elegance) preview primary brand fills with the exact
  // Golden UI Kit gold gradient, double-ring border and inset sheen — mirrors
  // the storefront's `.fz[data-brand-gloss="on"]` rules so the preview stays
  // truthful. Badges use the softer two-stop gold.
  const glossy = useMemo(() => isGlossyPalette(palette), [palette]);
  // Same derivation the storefront runs, so the preview can't drift from it
  // (this is where the chip's text colour comes from).
  const overrideVars = useMemo(
    () => elementColorVars(coerceElementColors(elements)),
    [elements],
  );
  const chipInk = overrideVars["--chip-ink"] ?? palette.brandDark;
  // Footer companions, derived server-side style so the preview matches exactly.
  // The `??` values mirror the CSS fallbacks for an unset footer.
  const footerInk = overrideVars["--footer-ink"] ?? "#23211e";
  const footerSoft = overrideVars["--footer-soft"] ?? "#8a857d";
  const footerLine = overrideVars["--footer-line"] ?? "#ecebe8";
  const footerChip = overrideVars["--footer-chip"] ?? "#fafaf9";
  const brandFill = glossy
    ? "linear-gradient(180deg,#f6e08d 0%,#ecc85f 38%,#d9a83f 58%,#b3842a 100%)"
    : effective("btnPrimary");
  const badgeFill = glossy ? "linear-gradient(180deg,#d7b45f,#a97f2a)" : effective("badgeNew");
  const glossShadow = glossy
    ? "0 2px 2px rgba(255,255,255,.55) inset, 0 -4px 8px rgba(110,78,16,.35) inset, 0 0 0 2px #ecd07d, 0 0 0 3px rgba(120,86,20,.5), 0 8px 16px rgba(120,86,20,.4)"
    : undefined;

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

  function setElement(key: ElementColorKey, value: string) {
    setElements((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  /** The colour an element actually renders with: its override, else the palette. */
  function effective(key: ElementColorKey): string {
    const slot = ELEMENT_COLOR_SLOTS.find((s) => s.key === key)!;
    return normalizeHex(elements[key]) ?? slot.fallback(palette);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      // Palette first, then the per-element overrides layered on top. Both read
      // from the same FormData — the field names don't collide.
      const result = await saveTheme(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      const elementResult = await saveElementColors(formData);
      if (elementResult?.error) setError(elementResult.error);
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

        {/* Per-element colours */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
          <h2 className="text-[15px] font-bold text-stone-900">Element colours</h2>
          <p className="mt-0.5 text-[13px] text-stone-500">
            Override individual pieces of the storefront. Leave a field empty to follow the brand colour above.
          </p>

          <div className="mt-5 space-y-3">
            {ELEMENT_COLOR_SLOTS.map((slot) => {
              const value = elements[slot.key];
              const overridden = value !== "";
              const invalid = overridden && !normalizeHex(value);
              return (
                <div
                  key={slot.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3"
                >
                  <input
                    type="color"
                    value={effective(slot.key)}
                    onChange={(e) => setElement(slot.key, e.target.value)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
                    aria-label={slot.label}
                  />
                  <div className="min-w-[190px] flex-1">
                    <p className="text-[13.5px] font-semibold text-stone-800">{slot.label}</p>
                    <p className="text-[12px] leading-snug text-stone-500">{slot.help}</p>
                  </div>
                  <input
                    type="text"
                    name={slot.key}
                    value={value}
                    onChange={(e) => setElement(slot.key, e.target.value)}
                    placeholder={`${slot.fallback(palette)} (inherited)`}
                    className="w-40 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13.5px] font-mono text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setElement(slot.key, "")}
                    disabled={!overridden}
                    className="text-[12.5px] font-semibold text-stone-500 underline-offset-2 hover:underline disabled:opacity-35 disabled:no-underline"
                  >
                    Reset
                  </button>
                  {invalid && (
                    <span className="w-full text-[12.5px] font-medium text-amber-600">
                      Enter a hex like #0d0625, or clear the field to inherit.
                    </span>
                  )}
                </div>
              );
            })}
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
          {/* masthead: top bar + header, each independently overridable */}
          <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
            <div
              className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-white"
              style={{
                backgroundColor: effective("utilBg"),
                borderBottom: "1px solid rgba(255,255,255,.25)",
              }}
            >
              <span>Track Order</span>
              <span>Help Center</span>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-3"
              style={{ backgroundColor: effective("headerBg") }}
            >
              <span className="text-[13px] font-extrabold text-white">
                FZ<span style={{ color: palette.brand }}>Mart</span>
              </span>
              <span className="h-6 flex-1 rounded-full bg-white" />
              <span className="text-[10px] font-semibold text-white">Cart</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-stone-100 bg-[#fafaf9] p-4">
            {/* button */}
            <button
              type="button"
              className="w-full rounded-xl px-4 py-2.5 text-[14px] font-bold text-white"
              style={{ background: brandFill, border: glossy ? "1px solid transparent" : undefined, boxShadow: glossShadow, textShadow: glossy ? "0 1px 1px rgba(120,88,20,.45)" : undefined }}
            >
              Add to cart
            </button>
            {/* badges + tint chip */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md px-2 py-1 text-[11px] font-bold text-white" style={{ background: badgeFill }}>
                NEW
              </span>
              <span
                className="rounded-md px-2.5 py-1 text-[12px] font-bold"
                style={{ backgroundColor: effective("chipBg"), color: chipInk, border: `1px solid ${palette.brandTint2}` }}
              >
                Free shipping
              </span>
              <span className="text-[13px] font-bold" style={{ color: effective("linkAccent") }}>
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

          {/* mobile-only chrome: the search band under the logo and the fixed
              bottom tab bar. Both are hidden above 760px on the storefront, so
              they get their own preview strip here. */}
          <div className="mt-3 overflow-hidden rounded-xl border border-stone-200">
            <p className="bg-stone-50 px-3 py-1.5 text-[10px] font-semibold text-stone-500">
              Mobile only
            </p>
            <div className="px-3 py-3" style={{ backgroundColor: effective("mobileSearchBg") }}>
              <div className="flex items-center gap-2 rounded-full bg-white p-1 pl-3">
                <span className="flex-1 text-[10px] text-stone-400">Search for products</span>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: effective("mobileSearchBtn") }}
                >
                  <Icon name="search" size={12} strokeWidth={2.4} />
                </span>
              </div>
            </div>
            <div
              className="flex items-center justify-around px-3 py-2 text-[9px] font-semibold text-white"
              style={{
                backgroundColor: effective("mobileTabBg"),
                borderTop: `1px solid ${overrideVars["--mtab-line"] ?? palette.brandDark}`,
              }}
            >
              <span>Home</span>
              <span>Menu</span>
              <span>Cart</span>
              <span>Account</span>
            </div>
          </div>

          {/* footer — text, links and borders are derived from the chosen
              background, exactly as the storefront derives them */}
          <div
            className="mt-3 overflow-hidden rounded-xl border"
            style={{ backgroundColor: effective("footerBg"), borderColor: footerLine }}
          >
            <div className="grid grid-cols-2 gap-3 p-3">
              <div>
                <p className="text-[10px] font-bold" style={{ color: footerInk }}>
                  Shop
                </p>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: footerSoft }}>
                  Electronics
                  <br />
                  Fashion
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold" style={{ color: footerInk }}>
                  Company
                </p>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: footerSoft }}>
                  About Us
                  <br />
                  Contact Us
                </p>
              </div>
            </div>
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: `1px solid ${footerLine}` }}
            >
              <span className="text-[9px]" style={{ color: footerSoft }}>
                © 2026 FZ Mart BD.
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ backgroundColor: footerChip, color: footerSoft, border: `1px solid ${footerLine}` }}
              >
                bKash
              </span>
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-stone-500">
            The brand colour applies to storefront buttons, badges, links, focus rings and tints. Anything set
            under “Element colours” overrides it for that element only. The sale/discount red stays the same so
            offers always stand out.
          </p>
        </div>
      </aside>
    </form>
  );
}
