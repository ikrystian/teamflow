import { expect, test, type Page } from "@playwright/test";
import { closeSheet, openApp, unlock, type TestUser } from "./helpers";

/**
 * Scalenie modułu projektów z modułem klientów i sejfu na danych sprzed migracji.
 * Wymaga: DEPLOYMENT_MODE=single, pustej bazy PostgreSQL oraz bazy MongoDB z kontem
 * administratora (bcrypt) i klientem przypisanym do projektów.
 *
 *   E2E_MERGE=1 E2E_LEGACY_EMAIL=… E2E_LEGACY_PASSWORD=… E2E_LEGACY_CLIENT=… E2E_LEGACY_PROJECT=… bun run test:e2e merge
 */
test.describe.serial("scalenie: konto, klienci i projekty sprzed migracji", () => {
  test.skip(!process.env.E2E_MERGE, "Ustaw E2E_MERGE=1 i dane konta sprzed migracji (zob. opis testu)");

  const admin: TestUser = {
    name: "",
    email: process.env.E2E_LEGACY_EMAIL ?? "",
    password: process.env.E2E_LEGACY_PASSWORD ?? "",
    master: "Haslo glowne sejfu organizacji 2026 zielony kot",
  };
  const clientName = process.env.E2E_LEGACY_CLIENT ?? "";
  const projectName = process.env.E2E_LEGACY_PROJECT ?? "";
  let page: Page;
  let clientId = "";

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage();
  });

  test("konto sprzed migracji loguje się dotychczasowym hasłem", async () => {
    await page.goto("/auth/signin");
    await page.getByLabel("Adres e-mail").fill(admin.email);
    await page.getByLabel("Hasło konta").fill(admin.password);
    await page.getByRole("button", { name: "Zaloguj się", exact: true }).click();
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText("Klienci i dostępy").first()).toBeVisible();
  });

  test("projekt sprzed importu pokazuje nazwę klienta", async () => {
    await page.goto("/dashboard/projects");
    await expect(page.getByText(clientName).first()).toBeVisible();
  });

  test("administrator konfiguruje sejf organizacji, a klienci z projektów trafiają do CRM", async () => {
    await page.goto("/dashboard/clients");
    await page.waitForURL(/\/auth\/signup\/vault/);
    await page.locator("#master").fill(admin.master);
    await page.locator("#master2").fill(admin.master);
    await page.getByRole("button", { name: "Utwórz sejf" }).click();
    await expect(page.getByTestId("recovery-key")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel(/Wydrukowałem/).check();
    await page.getByRole("button", { name: "Dalej" }).click();

    await page.waitForURL(/\/auth\/signup\/workspace/);
    await expect(page.getByText(/z modułu projektów trafi do CRM/)).toBeVisible();
    await page.getByLabel("Nazwa przestrzeni").fill("Organizacja e2e");
    await page.getByRole("button", { name: "Utwórz przestrzeń" }).click();
    await unlock(page, admin);
    await page.waitForURL(/\/dashboard\/clients/);
    const row = page.getByRole("link", { name: clientName }).first();
    await expect(row).toBeVisible();
    clientId = (await row.getAttribute("href"))!.match(/clients\/([0-9a-f-]{36})/)![1];
  });

  test("karta klienta pokazuje projekty z modułu projektów", async () => {
    // Pełne przeładowanie zeruje klucze sejfu — moduł klientów prosi o ponowne odblokowanie.
    await openApp(page, `/dashboard/clients/${clientId}/projects`, admin);
    await expect(page.getByRole("main").getByRole("link", { name: new RegExp(projectName) }).first()).toBeVisible();
    await page.getByRole("navigation", { name: "Sekcje karty klienta" }).getByRole("link", { name: "Przegląd" }).click();
    await expect(page.getByRole("main").getByText(projectName).first()).toBeVisible();
  });

  test("klucz sejfu zaimportowanego klienta tworzy się w przeglądarce, wpis trafia do projektu", async () => {
    await openApp(page, `/dashboard/clients/${clientId}/credentials?new=secure_note`, admin);
    await page.locator("#c-name").fill("Notatka e2e");
    await page.getByRole("button", { name: "Dodaj dostęp" }).click();
    await expect(page.getByText("Dodano dostęp")).toBeVisible();
    await closeSheet(page);

    // Nawigacja w aplikacji (bez przeładowania) — klucze sejfu zostają w pamięci karty.
    await page.getByRole("navigation", { name: "Sekcje karty klienta" }).getByRole("link", { name: /Projekty/ }).click();
    await page.getByRole("main").getByRole("link", { name: new RegExp(projectName) }).first().click();
    await page.waitForURL(/\/dashboard\/projects\/[^/]+$/);
    await page.locator('a[href$="/info"]').first().click();
    await page.waitForURL(/\/info$/);
    await expect(page.getByRole("link", { name: clientName })).toBeVisible();
    await expect(page.getByText("Notatka e2e")).toBeVisible();
  });
});
