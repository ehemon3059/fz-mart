import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#e6f6ef",
          100: "#cdeede",
          200: "#a6e0c5",
          300: "#6fcca3",
          400: "#2fb381",
          500: "#0d9f6e",
          600: "#0a7d57",
          700: "#086847",
          800: "#075539",
        },
        stone: {
          50: "#fafaf9",
          100: "#f3f2ef",
          200: "#e7e5e1",
          300: "#d6d3cd",
          400: "#a8a39b",
          500: "#76716a",
          600: "#5c5852",
          700: "#44413c",
          800: "#2d2b27",
          900: "#23211e",
        },
        // ── Semantic design tokens ─────────────────────────────────────
        // Single source of truth for the admin UI. Pages reference these
        // roles, not raw hexes, so the palette stays consistent everywhere.
        ink: "#1c1a17", // warm near-black — sidebar surface
        accent: {
          DEFAULT: "#0a7d57", // = brand-600; primary actions, active nav, focus
          hover: "#086847", // = brand-700
          soft: "#e6f6ef", // = brand-50; active-nav tint, KPI highlight
        },
        success: { DEFAULT: "#0a7d57", soft: "#e6f6ef", fg: "#075539" },
        warning: { DEFAULT: "#b45309", soft: "#fffbeb", fg: "#92400e" },
        danger: { DEFAULT: "#dc2626", soft: "#fef2f2", fg: "#b91c1c" },
      },
      fontFamily: {
        manrope: ["var(--font-manrope)", "system-ui", "-apple-system", "sans-serif"],
        "spline-mono": ["var(--font-spline-mono)", "monospace"],
      },
      borderRadius: {
        // One radius scale for the whole panel. md = default control/field,
        // lg = cards/dialogs, full = pills/badges. Retires stray 4px `rounded`.
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,18,14,.04), 0 6px 18px -10px rgba(20,18,14,.12)",
        card: "0 1px 2px rgba(20,18,14,.05), 0 1px 3px rgba(20,18,14,.06)",
        pop: "0 10px 30px -12px rgba(20,18,14,.28)",
      },
      keyframes: {
        "fz-pop": {
          from: { opacity: "0", transform: "translate(-50%, 12px)" },
          to: { opacity: "1", transform: "translate(-50%, 0)" },
        },
        "fz-fade-img": {
          from: { opacity: "0", transform: "scale(1.04)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fz-pop": "fz-pop .25s ease",
        "fz-fade-img": "fz-fade-img .35s ease",
      },
    },
  },
  plugins: [typography],
};

export default config;
