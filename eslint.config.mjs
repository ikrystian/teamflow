// eslint-config-next ships native flat configs since v15, so they are imported
// directly — the previous FlatCompat/eslintrc bridge crashes on ESLint 10.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Kod modułu klientów i sejfu: sekrety i szkice żyją wyłącznie w pamięci karty.
const VAULT_MODULE_FILES = [
  "src/lib/crypto/**",
  "src/lib/vault/**",
  "src/lib/dal/**",
  "src/server/**",
  "src/components/vault/**",
  "src/components/clients/**",
  "src/components/security/**",
  "src/components/public/**",
  "src/components/auth/**",
  "src/components/layout/**",
  "src/components/settings/account-security.tsx",
  "src/components/settings/vault-security.tsx",
  "src/components/settings/vault-preferences.tsx",
  "src/components/settings/data.tsx",
  "src/components/settings/team.tsx",
  "src/components/projects/project-access-card.tsx",
];

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // XSS jest zagrożeniem numer jeden — skrypt w zalogowanej karcie widzi odszyfrowany sejf.
      // Treści HTML od użytkowników renderuje wyłącznie components/ui/safe-html.tsx (DOMPurify).
      "react/no-danger": "error",
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Zakaz dangerouslySetInnerHTML — użyj <SafeHtml> (ochrona przed XSS)." },
        { selector: "MemberExpression[property.name='innerHTML']", message: "Zakaz innerHTML — używaj tekstu (ochrona przed XSS)." },
        { selector: "CallExpression[callee.name='eval']", message: "Zakaz eval." },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["**/lib/dal/*", "@/lib/dal/*"], importNames: ["default"], message: "DAL jest server-only." }],
        },
      ],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },
  {
    files: VAULT_MODULE_FILES,
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: "Zakaz localStorage — sekrety i szkice żyją tylko w pamięci." },
        { name: "sessionStorage", message: "Zakaz sessionStorage." },
      ],
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
