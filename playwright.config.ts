import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Wyniki poza katalogiem projektu — inaczej serwer deweloperski obserwuje zapisywane ślady i przeładowuje strony.
const out = process.env.E2E_OUTPUT_DIR ?? join(tmpdir(), "nexus-e2e");
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Testy end-to-end kluczowych ścieżek i kryteriów akceptacji modułu klientów i sejfu (rozdział 13). */
export default defineConfig({
  testDir: "./e2e",
  outputDir: join(out, "test-results"),
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: join(out, "report") }]],
  use: {
    baseURL,
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    trace: "retain-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
    actionTimeout: 30_000,
    navigationTimeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
