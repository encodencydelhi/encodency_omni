import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships native flat configs. Loading them through the
 * legacy FlatCompat shim (the previous setup) crashed ESLint with a
 * "circular structure" error before any file was linted, so they are imported
 * directly. The project's own rules and ignores are unchanged.
 */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
    },
  },
  { ignores: [".next/**", ".next-*/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
