import { execSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import postgres from "postgres";
import { parseTotp, totp } from "../src/lib/crypto/totp";

export const DB_URL = process.env.POSTGRES_MIGRATION_URL ?? "postgres://nexus:nexus@127.0.0.1:5434/nexus";
export const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8028";

export const sql = () => postgres(DB_URL, { max: 1, onnotice: () => {} });

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export type TestUser = { name: string; email: string; password: string; master: string; totpSecret?: string; recoveryKey?: string };

export function newUser(prefix = "user"): TestUser {
  const id = uid();
  return { name: `Test ${prefix} ${id}`, email: `${prefix}-${id}@e2e.nexus.local`, password: `Konto-${id}-Haslo!2026`, master: `Glowne haslo sejfu ${id} zielony kot 7` };
}

export async function totpCode(secret: string) {
  // Unikamy kodu tuż przed zmianą okna.
  let r = await totp(parseTotp(secret));
  if (r.remaining < 3) {
    await new Promise((res) => setTimeout(res, (r.remaining + 1) * 1000));
    r = await totp(parseTotp(secret));
  }
  return r.code;
}

/**
 * Pełna rejestracja: konto → (panel Nexusa) → hasło główne sejfu + zestaw ratunkowy →
 * (opcjonalnie) przestrzeń klientów → odblokowanie. Sejf konfiguruje się przy pierwszym
 * wejściu do modułu klientów, a w zaproszeniu — z poziomu strony zaproszenia.
 */
export async function register(page: Page, u: TestUser, opts: { workspace?: string; startUrl?: string } = {}) {
  await page.goto(opts.startUrl ?? "/auth/signup");
  if (!opts.startUrl) {
    await page.getByLabel("Imię i nazwisko").fill(u.name);
    await page.getByLabel("Adres e-mail").fill(u.email);
  } else {
    await page.getByLabel("Imię i nazwisko").fill(u.name);
  }
  await page.getByLabel("Hasło konta").fill(u.password);
  await page.getByRole("button", { name: "Załóż konto" }).click();

  if (opts.startUrl) {
    await page.waitForURL(/\/invite\//);
    await page.getByRole("link", { name: "Dokończ konfigurację konta" }).click();
  } else {
    await page.waitForURL(/\/dashboard/);
    await page.goto("/dashboard/clients");
  }
  await page.waitForURL(/\/auth\/signup\/vault/);
  await page.locator("#master").fill(u.master);
  await page.locator("#master2").fill(u.master);
  await page.getByRole("button", { name: "Utwórz sejf" }).click();
  const key = page.getByTestId("recovery-key");
  await expect(key).toBeVisible({ timeout: 60_000 });
  u.recoveryKey = (await key.textContent())!.trim();
  await page.getByLabel(/Wydrukowałem/).check();
  await page.getByRole("button", { name: "Dalej" }).click();

  if (opts.workspace) {
    await page.waitForURL(/\/auth\/signup\/workspace/);
    await page.getByLabel("Nazwa przestrzeni").fill(opts.workspace);
    await page.getByRole("button", { name: "Utwórz przestrzeń" }).click();
    await unlock(page, u);
  }
}

export async function unlock(page: Page, u: TestUser) {
  await page.waitForURL(/\/auth\/unlock/);
  await page.locator("#master").fill(u.master);
  await page.getByRole("button", { name: "Odblokuj" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/unlock"), { timeout: 60_000 });
}

export async function login(page: Page, u: TestUser) {
  await page.goto("/auth/signin");
  await page.getByLabel("Adres e-mail").fill(u.email);
  await page.getByLabel("Hasło konta").fill(u.password);
  await page.getByRole("button", { name: "Zaloguj się", exact: true }).click();
  // 2FA jest opcjonalne — kod jest potrzebny tylko, gdy konto ma włączone TOTP.
  // Po zalogowaniu trafiamy do panelu; sejf odblokowuje się dopiero w module klientów.
  await page.waitForURL(/\/(dashboard|auth\/signin\/two-factor)/);
  if (page.url().includes("/auth/signin/two-factor")) {
    await page.getByLabel("Kod").fill(await totpCode(u.totpSecret!));
    await page.getByRole("button", { name: "Zweryfikuj" }).click();
    await page.waitForURL(/\/dashboard/);
  }
}

/** Opcjonalne włączenie TOTP z Ustawień → Bezpieczeństwo (sejf musi być odblokowany). */
export async function enableTotp(page: Page, u: TestUser) {
  await page.goto("/dashboard/settings/security");
  // Przycisk działa dopiero po hydratacji (nawigacja po stronie przeglądarki).
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Włącz", exact: true }).click();
  await page.waitForURL(/\/auth\/signup\/two-factor/);
  await page.getByLabel("Potwierdź hasło konta").fill(u.password);
  await page.getByRole("button", { name: "Wygeneruj kod QR" }).click();
  const secret = (await page.locator("details code").textContent())!.trim();
  u.totpSecret = secret;
  await page.getByLabel("Kod z aplikacji").fill(await totpCode(secret));
  await page.getByRole("button", { name: "Potwierdź" }).click();
  await expect(page.getByText("Kody zapasowe — każdy działa jeden raz")).toBeVisible();
  await page.getByRole("button", { name: "Dalej" }).click();
}

/**
 * Wejście na stronę modułu klientów i sejfu. Pełne przeładowanie czyści klucze z pamięci karty
 * (tak ma być), więc po przekierowaniu na /auth/unlock odblokowujemy sejf ponownie.
 */
export async function openApp(page: Page, path: string, u: TestUser) {
  await page.goto(path);
  // Bramka sejfu przekierowuje na /auth/unlock po stronie przeglądarki (klucze zniknęły przy przeładowaniu).
  await page.waitForURL(/\/auth\/unlock/, { timeout: 30_000 });
  await unlock(page, u);
  await page.waitForURL((url) => url.pathname + url.search === path || url.pathname === path.split("?")[0]);
}

/** Strona bez bramki sejfu (np. panel główny): odblokowanie z linku „Odblokuj” i powrót. */
export async function unlockTo(page: Page, path: string, u: TestUser) {
  await page.goto(`/auth/unlock?next=${encodeURIComponent(path)}`);
  await unlock(page, u);
  await page.waitForURL((url) => url.pathname === path.split("?")[0]);
}

export async function createClient(page: Page, name: string, u: TestUser): Promise<string> {
  await openApp(page, "/dashboard/clients?new=1", u);
  await page.locator("#cl-name").fill(name);
  await page.getByRole("button", { name: "Dodaj klienta" }).click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}\/credentials/);
  return page.url().match(/clients\/([0-9a-f-]{36})/)![1];
}

export async function addFtp(page: Page, data: { name: string; host: string; login: string; password: string }) {
  await page.getByRole("button", { name: "Dodaj pierwszy dostęp FTP" }).click();
  await page.locator("#c-name").fill(data.name);
  await page.locator("#f-host").fill(data.host);
  await page.locator("#c-login").fill(data.login);
  await page.locator("#c-password").fill(data.password);
  await page.getByRole("button", { name: "Dodaj dostęp" }).click();
  await expect(page.getByText("Dodano dostęp")).toBeVisible();
  // Po zapisie otwiera się panel szczegółów — zamykamy go, żeby wrócić do listy.
  await closeSheet(page);
}

export async function latestMailTo(email: string, subjectIncludes: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: { ID: string; Subject: string }[] };
    const m = list.messages?.find((x) => x.Subject.includes(subjectIncludes));
    if (m) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { HTML: string; Text: string };
      return msg.Text || msg.HTML;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Brak e-maila do ${email}`);
}

export function pgDump(): string {
  const container = process.env.E2E_PG_CONTAINER ?? "nexus-postgres-1";
  const database = new URL(DB_URL).pathname.slice(1) || "nexus";
  return execSync(`docker exec ${container} pg_dump -U nexus --data-only ${database}`, { maxBuffer: 512 * 1024 * 1024 }).toString("utf8");
}

/** Zamyka panel szczegółów wpisu (Sheet) otwierany po zapisie. */
export async function closeSheet(page: Page) {
  const sheet = page.locator('[data-slot="sheet-content"][data-state="open"]');
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('[role="dialog"][data-state="open"]')).toHaveCount(0);
}
