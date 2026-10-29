import { describe, expect, it } from "vitest";
import { detectFromUrl } from "./detect";
import {
  CATEGORIES,
  categoryOf,
  connectionString,
  CREDENTIAL_TYPES,
  displayAddress,
  emptyOverview,
  emptySecrets,
  extractExpiry,
  openableUrl,
  primarySecret,
  suggestsPartnerAccess,
  TYPE_DEFS,
} from "./types";
import { clientSchema, credentialWriteSchema, domainSchema, isValidNip, shareCreateSchema, workspaceSettingsSchema } from "@/lib/validation";

describe("typy dostępów", () => {
  it("każdy z 12 typów ma definicję i należy do dokładnie jednej kategorii", () => {
    expect(CREDENTIAL_TYPES).toHaveLength(12);
    for (const t of CREDENTIAL_TYPES) {
      expect(TYPE_DEFS[t].type).toBe(t);
      expect(CATEGORIES.filter((c) => c.types.includes(t))).toHaveLength(1);
    }
    expect(categoryOf("ftp")).toBe("hosting");
    expect(categoryOf("secure_note")).toBe("notes");
  });

  it("puste wartości rozdzielają pola jawne i sekrety", () => {
    const o = emptyOverview("ftp");
    const s = emptySecrets("ftp");
    expect(o.fields.port).toBe("22");
    expect(o.fields.protocol).toBe("sftp");
    expect("privateKey" in o.fields).toBe(false);
    expect("privateKey" in s.fields).toBe(true);
  });

  it("data wygaśnięcia trafia do jawnej kolumny tylko z pola oznaczonego jako wygaśnięcie", () => {
    const o = emptyOverview("domain");
    o.fields.expiresAt = "2027-01-31";
    expect(extractExpiry("domain", o)).toBe("2027-01-31");
    o.fields.expiresAt = "jutro";
    expect(extractExpiry("domain", o)).toBeNull();
    expect(extractExpiry("website", emptyOverview("website"))).toBeNull();
  });

  it("hasło do oceny siły", () => {
    const s = emptySecrets("api");
    s.fields.apiKey = "sk_live_x";
    expect(primarySecret("api", s)).toBe("sk_live_x");
    expect(primarySecret("secure_note", emptySecrets("secure_note"))).toBe("");
    expect(primarySecret("ftp", { ...emptySecrets("ftp"), password: "p" })).toBe("p");
  });

  it("gotowe ciągi połączeń (rozdział 5.4)", () => {
    const ftp = { ...emptyOverview("ftp"), login: "jan" };
    ftp.fields = { ...ftp.fields, host: "ftp.example.pl", protocol: "sftp", port: "22" };
    expect(connectionString("ftp", ftp)).toBe("sftp://jan@ftp.example.pl:22");
    ftp.fields.rootDir = "public_html";
    expect(connectionString("ftp", ftp)).toBe("sftp://jan@ftp.example.pl:22/public_html");

    const ssh = { ...emptyOverview("ssh"), login: "root" };
    ssh.fields = { host: "1.2.3.4", port: "2222" };
    expect(connectionString("ssh", ssh)).toBe("ssh root@1.2.3.4 -p 2222");
    ssh.fields.port = "22";
    expect(connectionString("ssh", ssh)).toBe("ssh root@1.2.3.4");

    const db = { ...emptyOverview("database"), login: "app" };
    db.fields = { engine: "postgresql", host: "db.local", port: "", databaseName: "shop" };
    expect(connectionString("database", db)).toBe("postgresql://app@db.local:5432/shop");

    const mail = emptyOverview("email");
    mail.fields = { imapHost: "imap.x.pl", imapPort: "993", imapSecurity: "ssl", smtpHost: "smtp.x.pl", smtpPort: "587", smtpSecurity: "starttls" };
    expect(connectionString("email", mail)).toBe("IMAP imap.x.pl:993 (ssl) · SMTP smtp.x.pl:587 (starttls)");

    expect(connectionString("website", emptyOverview("website"))).toBeNull();
    expect(connectionString("ftp", emptyOverview("ftp"))).toBeNull();
  });

  it("adres do wyświetlenia i otwarcia (tylko http/https)", () => {
    const o = { ...emptyOverview("website"), url: "https://example.pl/wp-admin/" };
    expect(displayAddress("website", o)).toBe("example.pl/wp-admin/");
    expect(openableUrl("website", o)).toBe("https://example.pl/wp-admin/");
    expect(openableUrl("website", { ...o, url: "javascript:alert(1)" })).toBeNull();
    expect(openableUrl("website", { ...o, url: "example.pl" })).toBe("https://example.pl/");
    const ftp = emptyOverview("ftp");
    ftp.fields.host = "h";
    expect(displayAddress("ftp", ftp)).toBe("h:22");
  });

  it("podpowiedź dostępu partnerskiego dla Google i Meta", () => {
    const ads = emptyOverview("ads");
    ads.fields.platform = "Google Ads";
    ads.fields.accessMethod = "client_login";
    expect(suggestsPartnerAccess("ads", ads)).toBe(true);
    ads.fields.accessMethod = "partner";
    expect(suggestsPartnerAccess("ads", ads)).toBe(false);
    const fb = emptyOverview("social");
    fb.fields.platform = "Facebook";
    expect(suggestsPartnerAccess("social", fb)).toBe(true);
    expect(suggestsPartnerAccess("website", emptyOverview("website"))).toBe(false);
  });
});

describe("wykrywanie typu z wklejonego adresu (rozdział 5.5)", () => {
  it.each([
    ["https://klient.pl/wp-admin", "website", "WordPress — panel admina"],
    ["klient.pl/wp-login.php", "website", "WordPress — panel admina"],
    ["https://sklep.myshopify.com/admin", "website", "Shopify — panel sklepu"],
    ["https://klient.pl/administrator", "website", "Joomla — panel admina"],
    ["https://serwer.hosting.pl:2083", "hosting", "cPanel — serwer.hosting.pl"],
    ["https://panel.host.pl:2222", "hosting", "DirectAdmin — panel.host.pl"],
    ["https://s1.host.pl:8443", "hosting", "Plesk — s1.host.pl"],
    ["https://pma.host.pl/phpmyadmin", "database", "Baza danych — pma.host.pl"],
    ["https://ads.google.com/aw/overview", "ads", "Google Ads"],
    ["https://analytics.google.com", "ads", "Google Analytics"],
    ["https://search.google.com/search-console", "ads", "Google Search Console"],
    ["https://tagmanager.google.com", "ads", "Google Tag Manager"],
    ["https://business.facebook.com/adsmanager", "ads", "Meta Ads"],
    ["https://www.facebook.com/firma", "social", "Facebook"],
    ["https://instagram.com/firma", "social", "Instagram"],
    ["https://www.linkedin.com/company/x", "social", "LinkedIn"],
    ["https://www.tiktok.com/@x", "social", "TikTok"],
    ["https://ads.tiktok.com", "ads", "TikTok Ads"],
    ["https://youtube.com/@x", "social", "YouTube"],
    ["https://x.com/firma", "social", "X"],
    ["https://webmail.klient.pl", "email", "Poczta — klient.pl"],
    ["https://outlook.office.com/mail", "email", "Microsoft 365 — poczta"],
    ["https://mail.google.com", "email", "Gmail / Google Workspace"],
    ["https://dash.cloudflare.com", "domain", "Cloudflare — DNS"],
    ["https://dashboard.stripe.com/apikeys", "api", "API — dashboard.stripe.com"],
  ])("%s → %s", (url, type, name) => {
    const d = detectFromUrl(url);
    expect(d?.type).toBe(type);
    expect(d?.name).toBe(name);
  });

  it("protokoły połączeń uzupełniają host, port i login", () => {
    expect(detectFromUrl("sftp://jan@ftp.klient.pl")).toMatchObject({
      type: "ftp",
      login: "jan",
      fields: { protocol: "sftp", host: "ftp.klient.pl", port: "22" },
    });
    expect(detectFromUrl("ftps://ftp.klient.pl/www")?.fields).toMatchObject({ port: "990", rootDir: "/www" });
    expect(detectFromUrl("ssh://root@10.0.0.1:2200")).toMatchObject({ type: "ssh", login: "root", fields: { host: "10.0.0.1", port: "2200" } });
    expect(detectFromUrl("postgres://app@db.klient.pl/sklep")).toMatchObject({
      type: "database",
      fields: { engine: "postgresql", port: "5432", databaseName: "sklep" },
    });
    expect(detectFromUrl("sftp://ftp.klient.pl")?.url).toBeUndefined();
  });

  it("zwraca null dla nierozpoznanych lub błędnych adresów", () => {
    expect(detectFromUrl("")).toBeNull();
    expect(detectFromUrl("https://klient.pl")).toBeNull();
    expect(detectFromUrl("nie adres")).toBeNull();
    expect(detectFromUrl("http://[::1")).toBeNull();
  });
});

describe("walidacja", () => {
  it("NIP z sumą kontrolną", () => {
    expect(isValidNip("5260250995")).toBe(true);
    expect(isValidNip("526-025-09-95")).toBe(true);
    expect(isValidNip("PL5260250995")).toBe(true);
    expect(isValidNip("5260250996")).toBe(false);
    expect(isValidNip("123")).toBe(false);
  });

  it("klient: normalizacja NIP i adresu strony", () => {
    const c = clientSchema.parse({ name: "ACME", taxId: "526-025-09-95", status: "active", website: "acme.pl" });
    expect(c.taxId).toBe("5260250995");
    expect(c.website).toBe("https://acme.pl");
    expect(clientSchema.safeParse({ name: "X", taxId: "1234567890", status: "active" }).success).toBe(false);
  });

  it("domena", () => {
    expect(domainSchema.parse({ name: "Klient.PL", accountOwner: "client", expiresAt: "" }).expiresAt).toBeNull();
    expect(domainSchema.safeParse({ name: "nie domena", accountOwner: "client" }).success).toBe(false);
  });

  it("wpis sejfu przyjmuje wyłącznie szyfrogramy", () => {
    const base = {
      id: "0b0e4b4e-8a6a-4c8e-9d5e-2d9d7c9c1a11",
      clientId: "0b0e4b4e-8a6a-4c8e-9d5e-2d9d7c9c1a12",
      type: "ftp",
      sensitivity: "standard",
      encryptedItemKey: "A".repeat(80),
      vaultKeyVersion: 1,
      encryptedData: "A".repeat(80),
      encryptedSecrets: "A".repeat(80),
      formatVersion: 1,
      passwordChanged: true,
      strengthScore: 3,
      expiresAt: null,
    };
    expect(credentialWriteSchema.safeParse(base).success).toBe(true);
    expect(credentialWriteSchema.safeParse({ ...base, encryptedData: '{"password":"jawne hasło"}' }).success).toBe(false);
    expect(credentialWriteSchema.safeParse({ ...base, strengthScore: 7 }).success).toBe(false);
  });

  it("link jednorazowy: ważność 1 h – 7 dni", () => {
    const base = {
      id: "0b0e4b4e-8a6a-4c8e-9d5e-2d9d7c9c1a11",
      kind: "credential",
      credentialId: "0b0e4b4e-8a6a-4c8e-9d5e-2d9d7c9c1a12",
      clientId: "0b0e4b4e-8a6a-4c8e-9d5e-2d9d7c9c1a13",
      ciphertext: "A".repeat(80),
      authHash: "a".repeat(64),
      passwordSalt: null,
      expiresInHours: 24,
      maxViews: 1,
    };
    expect(shareCreateSchema.safeParse(base).success).toBe(true);
    expect(shareCreateSchema.safeParse({ ...base, expiresInHours: 0 }).success).toBe(false);
    expect(shareCreateSchema.safeParse({ ...base, expiresInHours: 169 }).success).toBe(false);
  });

  it("webhooki tylko przez https", () => {
    const s = {
      name: "Agencja",
      membersCanShareExternally: false,
      auditRetentionMonths: 12,
      archivedClientCleanupDays: 90,
      maxShareHours: 168,
      massCopyThreshold: 20,
      passwordMaxAgeDays: 180,
      expiryReminderDays: [30, 14, 7, 1],
    };
    expect(workspaceSettingsSchema.safeParse({ ...s, slackWebhookUrl: "https://hooks.slack.com/x" }).success).toBe(true);
    expect(workspaceSettingsSchema.safeParse({ ...s, slackWebhookUrl: "http://hooks.slack.com/x" }).success).toBe(false);
  });
});
