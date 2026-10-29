import { expect, test } from "@playwright/test";
import { createClient, newUser, openApp, pgDump, register, uid } from "./helpers";

test("import CSV (Bitwarden): mapowanie, szyfrowanie w przeglądarce, wirtualizowana lista i wyszukiwanie", async ({ page }) => {
  const u = newUser("import");
  await register(page, u, { workspace: `Import ${uid()}` });
  const marker = `IMP${uid()}`;
  await createClient(page, `Klient ${marker}`, u);
  const rows = ["folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp"];
  for (let i = 0; i < 400; i++) rows.push(`,,login,Wpis ${marker} ${i},,,0,https://site${i}.example.pl/wp-admin,user${i}-${marker},Haslo-${marker}-${i}!,`);
  await openApp(page, "/dashboard/settings/data", u);
  await page.getByLabel("Plik CSV").setInputFiles({ name: "bitwarden.csv", mimeType: "text/csv", buffer: Buffer.from(rows.join("\n")) });
  await expect(page.getByText("Rozpoznano: Bitwarden")).toBeVisible();
  await page.getByRole("combobox", { name: "Klient dla wpisów bez dopasowania" }).click();
  await page.getByRole("option", { name: `Klient ${marker}` }).click();
  await page.getByRole("button", { name: /Zaszyfruj i importuj 400/ }).click();
  await expect(page.getByText("Zaimportowano 400 dostępów")).toBeVisible({ timeout: 120_000 });

  await openApp(page, "/dashboard/vault", u);
  const rendered = await page.locator("[data-credential-row]").count();
  expect(rendered).toBeGreaterThan(5);
  expect(rendered).toBeLessThan(120); // wirtualizacja: w DOM tylko widoczne wiersze
  await page.getByLabel("Szukaj dostępów").fill(`Wpis ${marker} 377`);
  await expect(page.locator("[data-credential-row]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: `Wpis ${marker} 377`, exact: true })).toBeVisible();

  const dump = pgDump();
  expect(dump).not.toContain(`Haslo-${marker}-1!`);
  expect(dump).not.toContain(`user1-${marker}`);
});
