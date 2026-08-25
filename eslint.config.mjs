import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Extra/ holds unused design references, dev scripts and backups
    // (already excluded from tsconfig) — not shipped code, so not linted.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "Extra/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
