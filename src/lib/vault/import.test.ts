import { describe, expect, it } from "vitest";
import { autoMapping, detectSource, matchClient, parseCsv, rowsToDrafts, toCsv } from "./import";
import { emptySecrets } from "./types";

const BITWARDEN = `folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp
Piekarnia Łódź,,login,WP admin,,,0,https://piekarnia.pl/wp-admin,admin,S3cret!,JBSWY3DPEHPK3PXP
,,note,Kody odzyskiwania,"kod1 kod2",,0,,,,
Kwiaciarnia,,login,FTP,,,0,sftp://kwiaty@ftp.kwiaty.pl,kwiaty,pass,`;

const CHROME = `name,url,username,password,note
facebook.com,https://www.facebook.com/,jan@x.pl,haslo123,`;

const FIREFOX = `"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"
"https://ads.google.com","jan","pw","","https://ads.google.com","{x}","1","1","1"`;

const KEEPASS = `"Group","Title","Username","Password","URL","Notes","TOTP"
"Root/Klient A","Panel","u","p","https://klient-a.pl:2083","",""`;

const ONEPASSWORD = `Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes
Shopify,https://sklep.myshopify.com/admin,owner,pw,,false,false,"sklep,ecommerce",`;

describe("import CSV", () => {
  it("wykrywa źródło po nagłówkach", () => {
    expect(detectSource(parseCsv(BITWARDEN).headers)).toBe("bitwarden");
    expect(detectSource(parseCsv(CHROME).headers)).toBe("chrome");
    expect(detectSource(parseCsv(FIREFOX).headers)).toBe("firefox");
    expect(detectSource(parseCsv(KEEPASS).headers)).toBe("keepass");
    expect(detectSource(parseCsv(ONEPASSWORD).headers)).toBe("1password");
    expect(detectSource(["a", "b"])).toBe("generic");
  });

  it("Bitwarden: mapowanie, typy, foldery i notatki", () => {
    const { headers, rows } = parseCsv(BITWARDEN);
    const drafts = rowsToDrafts(rows, autoMapping(headers));
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toMatchObject({ type: "website", group: "Piekarnia Łódź" });
    expect(drafts[0].overview.fields.cms).toBe("WordPress");
    expect(drafts[0].secrets).toMatchObject({ password: "S3cret!", totp: "JBSWY3DPEHPK3PXP" });
    expect(drafts[1].type).toBe("secure_note");
    expect(drafts[1].secrets.fields.content).toBe("kod1 kod2");
    expect(drafts[2].type).toBe("ftp");
    expect(drafts[2].overview.fields).toMatchObject({ protocol: "sftp", host: "ftp.kwiaty.pl", port: "22" });
  });

  it("przeglądarki, KeePass i 1Password", () => {
    const c = rowsToDrafts(parseCsv(CHROME).rows, autoMapping(parseCsv(CHROME).headers));
    expect(c[0]).toMatchObject({ type: "social" });
    expect(c[0].overview.login).toBe("jan@x.pl");
    const f = rowsToDrafts(parseCsv(FIREFOX).rows, autoMapping(parseCsv(FIREFOX).headers));
    expect(f[0].type).toBe("ads");
    expect(f[0].overview.name).toBe("Google Ads");
    const k = rowsToDrafts(parseCsv(KEEPASS).rows, autoMapping(parseCsv(KEEPASS).headers));
    expect(k[0]).toMatchObject({ type: "hosting", group: "Root/Klient A" });
    const o = rowsToDrafts(parseCsv(ONEPASSWORD).rows, autoMapping(parseCsv(ONEPASSWORD).headers));
    expect(o[0].overview.tags).toEqual(["import", "sklep", "ecommerce"]);
  });

  it("dopasowuje grupę do klienta bez wielkości liter i polskich znaków", () => {
    const clients = [
      { id: "1", name: "Piekarnia Łódź" },
      { id: "2", name: "Klient A" },
    ];
    expect(matchClient("piekarnia lodz", clients)).toBe("1");
    expect(matchClient("Root/Klient A", clients)).toBe("2");
    expect(matchClient("Nieznany", clients)).toBeNull();
    expect(matchClient("", clients)).toBeNull();
  });

  it("eksport CSV chroni przed wstrzyknięciem formuł i jest zgodny z formatem Bitwardena", () => {
    const { headers, rows } = parseCsv(BITWARDEN);
    const drafts = rowsToDrafts(rows, autoMapping(headers));
    const csv = toCsv([
      ...drafts.map((d) => ({ client: d.group, type: d.type, sensitivity: "standard", overview: d.overview, secrets: d.secrets })),
      { client: "X", type: "website", sensitivity: "standard", overview: { ...drafts[0].overview, name: "=HYPERLINK(1)" }, secrets: emptySecrets("website") },
    ]);
    expect(csv.split("\r\n")[0]).toBe("folder,type,name,notes,login_uri,login_username,login_password,login_totp,sensitivity,tags");
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    const back = parseCsv(csv);
    expect(detectSource(back.headers)).toBe("bitwarden");
    expect(back.rows).toHaveLength(4);
  });
});
