// eslint-config-next ships native flat configs since v15, so they are imported
// directly — the previous FlatCompat/eslintrc bridge crashes on ESLint 10.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["src/lib/auth.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Plain Node CJS utility scripts (run via `node scripts/...`).
    files: ["scripts/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // The strict react-hooks v7 rules flag long-standing patterns across the
    // codebase (setState inside effects etc.). Downgraded to warnings so lint
    // stays actionable; clean these up incrementally.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];

export default eslintConfig;
