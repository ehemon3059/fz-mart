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
      },
      fontFamily: {
        manrope: ["var(--font-manrope)", "system-ui", "-apple-system", "sans-serif"],
        "spline-mono": ["var(--font-spline-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,18,14,.04), 0 6px 18px -10px rgba(20,18,14,.12)",
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
