import { expect, test, type Browser, type Page } from "@playwright/test";
import { addFtp, closeSheet, createClient, enableTotp, latestMailTo, login, newUser, openApp, pgDump, register, sql, uid, unlock, unlockTo, type TestUser } from "./helpers";

/**
 * Kryteria akceptacji z rozdziału 13 dokumentacji. Testy działają na prawdziwej aplikacji
 * (przeglądarka + serwer + PostgreSQL) i wykonują się po kolei, współdzieląc konto właściciela.
 */
test.describe.serial("kryteria akceptacji", () => {
  const owner = newUser("owner");
  const marker = `ZNACZNIK${uid()}`;
  const secret = `Haslo-${marker}-!Q7`;
  let clientId = "";
  let page: Page;
  const requests: string[] = [];

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage();
    page.on("request", (r) => requests.push(`${r.method()} ${r.url()}\n${r.postData() ?? ""}`));
  });

  test("rejestracja: konto → hasło główne + zestaw ratunkowy → przestrzeń → odblokowanie (bez 2FA)", async () => {
    await register(page, owner, { workspace: `Agencja ${uid()}` });
    await expect(page).toHaveURL(/\/dashboard/);
    expect(owner.recoveryKey).toMatch(/^[0-9A-Z-]{60,}$/);
  });

  test("nowy użytkownik dodaje kompletny dostęp FTP w mniej niż 30 s", async () => {
    clientId = await createClient(page, `Klient ${marker}`, owner);
    const start = Date.now();
    await addFtp(page, { name: `FTP ${marker}`, host: `ftp.${marker.toLowerCase()}.pl`, login: `login-${marker}`, password: secret });
    const elapsed = Date.now() - start;
    console.log(`Dodanie dostępu FTP: ${elapsed} ms`);
    expect(elapsed).toBeLessThan(30_000);
    await expect(page.getByTitle("Kliknij, aby skopiować login").filter({ hasText: `login-${marker}` })).toBeVisible();
  });

  test("skopiowanie hasła tworzy zdarzenie w dzienniku z użytkownikiem, czasem i adresem IP", async () => {
    await page.getByRole("button", { name: "Kopiuj hasło" }).first().click();
    await expect(page.getByText(/Skopiowano hasło/)).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(secret);
    const db = sql();
    let rows: { actor_name: string; ip: string | null; created_at: Date }[] = [];
    for (let i = 0; i < 20 && !rows.length; i++) {
      rows = await db`select actor_name, ip, created_at from audit_events where action = 'credential.copy_password' and actor_name = ${owner.name} order by id desc limit 1`;
      if (!rows.length) await new Promise((r) => setTimeout(r, 500));
    }
    await db.end();
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_name).toBe(owner.name);
    expect(rows[0].ip).toBeTruthy();
    expect(Date.now() - rows[0].created_at.getTime()).toBeLessThan(60_000);
  });

  test("hasło da się skopiować w mniej niż 10 s od wejścia na pulpit", async () => {
    await unlockTo(page, "/dashboard", owner);
    const start = Date.now();
    await page.getByLabel("Szybkie wyszukiwanie dostępów").fill(marker);
    await page.locator(`ul[aria-live="polite"]`).getByRole("button", { name: `Kopiuj hasło: FTP ${marker}` }).click();
    await expect(page.getByText(/Skopiowano hasło/)).toBeVisible();
    const elapsed = Date.now() - start;
    console.log(`Skopiowanie hasła z pulpitu: ${elapsed} ms`);
    expect(elapsed).toBeLessThan(10_000);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(secret);
  });

  test("w zrzucie bazy danych nie ma jawnego hasła, loginu ani adresu URL wpisu", async () => {
    const dump = pgDump();
    expect(dump.length).toBeGreaterThan(1000);
    expect(dump).toContain(`Klient ${marker}`); // dane CRM są jawne dla serwera (kontrola, że zrzut zawiera dane)
    expect(dump).not.toContain(secret);
    expect(dump).not.toContain(`login-${marker}`);
    expect(dump).not.toContain(`ftp.${marker.toLowerCase()}.pl`);
    expect(dump).not.toContain(`FTP ${marker}`);
  });

  test("hasło nie pojawia się w postaci jawnej w ruchu sieciowym", async () => {
    const all = requests.join("\n");
    expect(all.length).toBeGreaterThan(0);
    expect(all).not.toContain(secret);
    expect(all).not.toContain(encodeURIComponent(secret));
    expect(all).not.toContain(`login-${marker}`);
    expect(all).not.toContain(owner.master);
  });

  test("hasło nie pojawia się w logach serwera", async () => {
    const file = process.env.SERVER_LOG_FILE;
    test.skip(!file, "Ustaw SERVER_LOG_FILE na plik z logami serwera, aby uruchomić ten test");
    const { readFileSync } = await import("node:fs");
    const logs = readFileSync(file!, "utf8");
    expect(logs).not.toContain(secret);
    expect(logs).not.toContain(owner.master);
  });

  test("link jednorazowy przestaje działać po pierwszym wyświetleniu", async ({ browser }) => {
    await openApp(page, `/dashboard/clients/${clientId}/credentials`, owner);
    await page.getByRole("button", { name: `Więcej akcji: FTP ${marker}` }).click();
    await page.getByRole("menuitem", { name: "Udostępnij linkiem" }).click();
    await page.getByRole("button", { name: "Utwórz link" }).click();
    const link = await page.getByLabel("Link do udostępnienia").inputValue();
    expect(link).toMatch(/\/share\/[0-9a-f-]{36}#k=/);
    await page.getByRole("button", { name: "Gotowe" }).click();

    const outsider = await (await browser.newContext()).newPage();
    await outsider.goto(link);
    await outsider.getByRole("button", { name: "Pokaż dane" }).click();
    await expect(outsider.getByText("Udostępniony dostęp")).toBeVisible();
    await outsider.getByRole("button", { name: "Pokaż: Hasło" }).click();
    await expect(outsider.getByText(secret)).toBeVisible();

    const second = await (await browser.newContext()).newPage();
    await second.goto(link);
    await expect(second.getByText("Link nie jest już aktywny")).toBeVisible();
    const id = link.match(/share\/([0-9a-f-]{36})/)![1];
    const res = await second.request.post(`/api/share/${id}`, { data: { accessKey: "A".repeat(43) } });
    expect(res.status()).toBe(410);
  });

  test("link jednorazowy przestaje działać po upływie ważności", async ({ browser }) => {
    await page.getByRole("button", { name: `Więcej akcji: FTP ${marker}` }).click();
    await page.getByRole("menuitem", { name: "Udostępnij linkiem" }).click();
    await page.getByRole("button", { name: "Utwórz link" }).click();
    const link = await page.getByLabel("Link do udostępnienia").inputValue();
    await page.getByRole("button", { name: "Gotowe" }).click();
    const id = link.match(/share\/([0-9a-f-]{36})/)![1];
    const db = sql();
    await db`update shares set expires_at = now() - interval '1 minute' where id = ${id}`;
    await db.end();
    const p = await (await browser.newContext()).newPage();
    await p.goto(link);
    await expect(p.getByText("Link nie jest już aktywny")).toBeVisible();
  });

  test("odsłonięcie wpisu krytycznego bez ponownego potwierdzenia tożsamości jest niemożliwe", async () => {
    await openApp(page, `/dashboard/clients/${clientId}/credentials?new=website`, owner);
    await page.locator("#c-name").fill(`Krytyczny ${marker}`);
    await page.locator("#c-login").fill("admin");
    await page.locator("#c-password").fill(`Kryt-${secret}`);
    await page.getByLabel(/Wpis krytyczny/).click();
    await page.getByRole("button", { name: "Dodaj dostęp" }).click();
    await expect(page.getByText("Dodano dostęp")).toBeVisible();
    await closeSheet(page);

    // Serwer nie wydaje sekretów wpisu krytycznego w liście ani bez step-up.
    const list = await page.request.get(`/api/clients/${clientId}/credentials`);
    const records = (await list.json()) as { id: string; sensitivity: string; encryptedSecrets: string | null }[];
    const crit = records.find((r) => r.sensitivity === "critical")!;
    expect(crit.encryptedSecrets).toBeNull();
    const denied = await page.request.post(`/api/credentials/${crit.id}/secrets`, { data: { purpose: "reveal" } });
    expect(denied.status()).toBe(403);
    expect((await denied.json()).code).toBe("STEP_UP_REQUIRED");

    // Interfejs prosi o potwierdzenie; po podaniu hasła głównego kopiuje hasło.
    await openApp(page, `/dashboard/clients/${clientId}/credentials`, owner);
    await page.getByRole("row", { name: `Krytyczny ${marker}` }).getByRole("button", { name: "Kopiuj hasło" }).click();
    await expect(page.getByRole("dialog", { name: "Potwierdź tożsamość" })).toBeVisible();
    await page.locator("#stepup-master").fill(owner.master);
    await page.getByRole("button", { name: "Potwierdź", exact: true }).click();
    await expect(page.getByText(/Skopiowano hasło/)).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`Kryt-${secret}`);
    const db = sql();
    const ev = await db`select 1 from audit_events where action = 'credential.reveal_critical' and target_id = ${crit.id}`;
    await db.end();
    expect(ev.length).toBeGreaterThan(0);
  });

  test("członek zespołu nieprzypisany do klienta dostaje 404", async ({ browser }) => {
    const member = newUser("member");
    await openApp(page, "/dashboard/settings/team", owner);
    await page.getByLabel("E-mail").fill(member.email);
    await page.getByRole("button", { name: "Zaproś" }).click();
    await expect(page.getByText(`Wysłano zaproszenie do ${member.email}`)).toBeVisible();
    const mail = await latestMailTo(member.email, "Zaproszenie");
    const invite = mail.match(/https?:\/\/[^\s"<>]+\/invite\/[A-Za-z0-9_-]+/)![0];

    const mp = await (await browser.newContext()).newPage();
    await mp.goto(invite);
    await mp.getByRole("link", { name: "Załóż konto" }).click();
    await mp.waitForURL(/\/auth\/signup\?/);
    await register(mp, member, { startUrl: mp.url() });
    await mp.waitForURL(/\/invite\//);
    await mp.getByRole("button", { name: "Przyjmij zaproszenie" }).click();
    await unlock(mp, member);

    const api = await mp.request.get(`/api/clients/${clientId}/credentials`);
    expect(api.status()).toBe(404);
    // Strona: odpowiedź jest strumieniowana, więc status HTTP jest już wysłany — liczy się widok 404 bez danych klienta.
    await openApp(mp, `/dashboard/clients/${clientId}`, member);
    await expect(mp.getByRole("heading", { name: "Nie znaleziono strony" })).toBeVisible();
    await expect(mp.getByText(`Klient ${marker}`)).toHaveCount(0);
    const sync = (await (await mp.request.get("/api/vault/sync")).json()) as { clients: unknown[]; credentials: unknown[] };
    expect(sync.clients).toHaveLength(0);
    expect(sync.credentials).toHaveLength(0);
  });

  test("logowanie bez 2FA; po opcjonalnym włączeniu TOTP logowanie wymaga kodu", async ({ browser }) => {
    const p1 = await (await browser.newContext()).newPage();
    await login(p1, owner);
    await expect(p1).not.toHaveURL(/two-factor/);
    await enableTotp(p1, owner);
    const p2 = await (await browser.newContext()).newPage();
    await p2.goto("/auth/signin");
    await p2.getByLabel("Adres e-mail").fill(owner.email);
    await p2.getByLabel("Hasło konta").fill(owner.password);
    await p2.getByRole("button", { name: "Zaloguj się", exact: true }).click();
    await p2.waitForURL(/\/auth\/signin\/two-factor/);
  });

  test("po zadanym czasie bezczynności sejf się blokuje, a klucze znikają z pamięci", async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.clock.install();
    await login(p, owner);
    await openApp(p, `/dashboard/clients/${clientId}/credentials`, owner);
    await expect(p.getByTitle("Kliknij, aby skopiować login").filter({ hasText: `login-${marker}` })).toBeVisible();
    const before = await p.evaluate(() => (window as unknown as { __vaultKeyMaterial: () => Record<string, number> }).__vaultKeyMaterial());
    expect(before.keyPair).toBe(1);
    expect(before.vaultKeys).toBeGreaterThan(0);
    await p.clock.fastForward("16:00");
    await p.waitForURL(/\/auth\/unlock/);
    const after = await p.evaluate(() => (window as unknown as { __vaultKeyMaterial?: () => Record<string, number> }).__vaultKeyMaterial?.() ?? null);
    if (after) expect(Object.values(after).every((v) => v === 0)).toBe(true);
    await expect(p.getByTitle("Kliknij, aby skopiować login")).toHaveCount(0);
  });
});

export async function unused(_b: Browser, _u: TestUser) {}
