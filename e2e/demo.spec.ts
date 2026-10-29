import { expect, test } from "@playwright/test";
import { login, openApp } from "./helpers";

/** Sprawdzenie danych demonstracyjnych (bun run db:pg:seed). Uruchom: E2E_DEMO=1 bun run test:e2e demo */
test("konto demo: logowanie, odblokowanie, odszyfrowanie dostępów i kondycja haseł", async ({ page }) => {
  test.skip(!process.env.E2E_DEMO, "Ustaw E2E_DEMO=1 po uruchomieniu bun run db:pg:seed");
  const demo = { name: "Anna Kowalska", email: "demo@nexus.local", password: "Demo-Konto-2026!", master: "demo haslo glowne sejfu zielony kot" };
  await login(page, demo);
  await expect(page.getByRole("heading", { name: "Klienci i dostępy" })).toBeVisible();
  await openApp(page, "/dashboard/vault", demo);
  await expect(page.getByRole("button", { name: "WordPress — panel admina", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Przelewy24 — klucz API", exact: true })).toBeVisible();
  await openApp(page, "/dashboard/security", demo);
  await expect(page.getByRole("button", { name: /Powtórzone hasła/ })).toContainText("4"); // hosting+FTP i baza+Instagram
  await openApp(page, "/dashboard/clients", demo);
  await expect(page.getByText("domena wygasa za 12 dni")).toBeVisible();
});
