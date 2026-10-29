import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` rzuca wyjątek poza warstwą serwera React — w testach zastępujemy go pustym modułem.
      "server-only": fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/crypto/**", "src/lib/permissions.ts", "src/lib/vault/**", "src/lib/validation/**"],
      exclude: ["**/*.test.ts", "src/lib/crypto/index.ts"],
      thresholds: {
        "src/lib/crypto/**": { lines: 100, functions: 100, statements: 100, branches: 90 },
      },
    },
  },
});
