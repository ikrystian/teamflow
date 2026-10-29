/**
 * Dane demonstracyjne: bun run db:pg:seed (tryb DEPLOYMENT_MODE=saas albo świeża instalacja)
 * Tworzy konto demo (bez 2FA — włącza się je opcjonalnie w ustawieniach) z sejfem, przestrzenią, klientami, kontaktami, domenami
 * i zaszyfrowanymi dostępami różnych typów. Wypisuje dane logowania, sekret TOTP i klucz odzyskiwania.
 * Uruchamiane z warunkiem „react-server”, żeby moduły server-only dało się zaimportować w Node.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { eq } = await import("drizzle-orm");
  const { auth } = await import("../src/lib/auth");
  const { db, schema, sqlClient } = await import("../src/lib/db");
  const { asSystem, withTenant } = await import("../src/lib/dal/tenant");
  const { hashAuthKey } = await import("../src/lib/crypto/master");
  const c = await import("../src/lib/crypto");
  const DEFAULT_WORKSPACE_SETTINGS = { membersCanShareExternally: false, auditRetentionMonths: 12, archivedClientCleanupDays: 90, maxShareHours: 168, massCopyThreshold: 20, expiryReminderDays: [30, 14, 7, 1], passwordMaxAgeDays: 180 };
  const { emptyOverview, emptySecrets, extractExpiry, primarySecret } = await import("../src/lib/vault/types");
  const { evaluatePassword } = await import("../src/lib/crypto/strength");

  const email = process.env.SEED_EMAIL ?? "demo@nexus.local";
  const password = process.env.SEED_PASSWORD ?? "Demo-Konto-2026!";
  const master = process.env.SEED_MASTER ?? "demo haslo glowne sejfu zielony kot";

  const [exists] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
  if (exists) {
    console.log(`Użytkownik ${email} już istnieje — pomijam seed.`);
    await sqlClient.end();
    return;
  }

  // 1. Konto (Better Auth).
  const signUp = await auth.api.signUpEmail({ body: { name: "Anna Kowalska", email, password } });
  const userId = signUp.user.id;

  // 2. Klucze sejfu (jak w przeglądarce): Argon2id, X25519, klucz odzyskiwania.
  await c.ensureCrypto();
  const keys = await c.createUserKeys(userId, master);
  await db
    .update(schema.user)
    .set({
      publicKey: keys.bundle.publicKey,
      encryptedPrivateKey: keys.bundle.encryptedPrivateKey,
      recoveryEncryptedPrivateKey: keys.bundle.recoveryEncryptedPrivateKey,
      kdfSalt: keys.bundle.kdfSalt,
      kdfParams: keys.bundle.kdfParams,
      masterAuthHash: await hashAuthKey(keys.bundle.authKey),
      vaultCreatedAt: new Date(),
      emailVerified: true,
    })
    .where(eq(schema.user.id, userId));

  // 3. Przestrzeń + skrzynka „Do przejrzenia”.
  const wsId = crypto.randomUUID();
  const intake = c.generateIntakeKeyPair();
  await withTenant(wsId, async (tx) => {
    await tx.insert(schema.workspaces).values({ id: wsId, name: "Studio Kowalska", plan: "team", intakePublicKey: intake.publicKey, settings: DEFAULT_WORKSPACE_SETTINGS, createdBy: userId });
    await tx.insert(schema.workspaceMembers).values({ workspaceId: wsId, userId, role: "owner" });
    await tx.insert(schema.keyGrants).values({
      workspaceId: wsId,
      scopeType: "intake",
      scopeId: wsId,
      userId,
      encryptedKey: c.sealKeyFor(keys.bundle.publicKey, c.packIntakeKeyPair(intake.keyPair), "intake", wsId, 1),
      keyVersion: 1,
      grantedBy: userId,
    });
  });

  const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
  type Cred = { type: Parameters<typeof emptyOverview>[0]; name: string; url?: string; login?: string; password?: string; fields?: Record<string, string>; secretFields?: Record<string, string>; totp?: string; critical?: boolean; owner?: "client" | "agency" | "unknown"; tags?: string[]; notes?: string };

  const clients: { name: string; taxId?: string; website: string; industry: string; services: string[]; contacts: { name: string; role: string; email: string; phone: string }[]; domains: { name: string; expires: number; registrar: string; owner?: "client" | "agency" }[]; creds: Cred[] }[] = [
    {
      name: "Piekarnia Złoty Kłos",
      website: "https://zlotyklos.pl",
      industry: "Gastronomia",
      services: ["website", "social", "hosting"],
      contacts: [{ name: "Jan Nowak", role: "Właściciel", email: "jan@zlotyklos.pl", phone: "+48 600 100 200" }],
      domains: [{ name: "zlotyklos.pl", expires: 12, registrar: "nazwa.pl" }],
      creds: [
        { type: "website", name: "WordPress — panel admina", url: "https://zlotyklos.pl/wp-admin", login: "admin", password: "zlotyklos2019", fields: { cms: "WordPress", accountRole: "Administrator" }, tags: ["www"] },
        { type: "hosting", name: "cPanel — hosting", url: "https://s12.hosting.pl:2083", login: "zlotyklos", password: "Hx!82kq-Lm3#Wp0z", fields: { panel: "cPanel", plan: "Biznes", renewsAt: inDays(40) }, secretFields: { supportPin: "4821" } },
        { type: "ftp", name: "SFTP — pliki strony", login: "zlotyklos", password: "Hx!82kq-Lm3#Wp0z", fields: { protocol: "sftp", host: "s12.hosting.pl", port: "22", authMethod: "password", rootDir: "/public_html" } },
        { type: "social", name: "Facebook — fanpage", url: "https://facebook.com/zlotyklos", login: "jan@zlotyklos.pl", password: "piekarnia123", fields: { platform: "Facebook", agencyRole: "Redaktor" }, owner: "client" },
      ],
    },
    {
      name: "Kancelaria Lex Partners",
      taxId: "5260250995",
      website: "https://lexpartners.pl",
      industry: "Prawo",
      services: ["website", "seo", "ads"],
      contacts: [
        { name: "Maria Wiśniewska", role: "Partner zarządzający", email: "m.wisniewska@lexpartners.pl", phone: "+48 501 222 333" },
        { name: "Piotr Zieliński", role: "Marketing", email: "p.zielinski@lexpartners.pl", phone: "+48 502 444 555" },
      ],
      domains: [
        { name: "lexpartners.pl", expires: 200, registrar: "home.pl" },
        { name: "lex-partners.eu", expires: 25, registrar: "OVH", owner: "agency" },
      ],
      creds: [
        { type: "ads", name: "Google Ads", url: "https://ads.google.com", fields: { platform: "Google Ads", accountId: "123-456-7890", accessMethod: "partner", permissionLevel: "Administrator" }, tags: ["kampanie"], owner: "client" },
        { type: "ads", name: "Google Search Console", url: "https://search.google.com/search-console", fields: { platform: "Google Search Console", accessMethod: "partner" } },
        { type: "domain", name: "home.pl — domena", url: "https://panel.home.pl", login: "lexpartners", password: "V9#nQ2!sTr8@Lk4m", fields: { domain: "lexpartners.pl", registrar: "home.pl", expiresAt: inDays(200), nameservers: "dns.home.pl\ndns2.home.pl" }, secretFields: { authInfo: "A7#kQ2-9xLm" }, critical: true },
        { type: "email", name: "Microsoft 365 — biuro@", url: "https://outlook.office.com", login: "biuro@lexpartners.pl", password: "Biuro!2024-Lex", totp: "JBSWY3DPEHPK3PXP", fields: { provider: "Microsoft 365", imapHost: "outlook.office365.com", imapPort: "993", imapSecurity: "ssl", smtpHost: "smtp.office365.com", smtpPort: "587", smtpSecurity: "starttls" } },
        { type: "api", name: "Przelewy24 — klucz API", url: "https://panel.przelewy24.pl", fields: { service: "Przelewy24", scopes: "transakcje", expiresAt: inDays(9) }, secretFields: { apiKey: "p24_live_9f8e7d6c5b4a3f2e1d0c", apiSecret: "s3cr3t-9a8b7c6d" }, critical: true },
      ],
    },
    {
      name: "Sklep Ogrodowy Zielnik",
      website: "https://zielnik-sklep.pl",
      industry: "E-commerce",
      services: ["website", "ads", "social"],
      contacts: [{ name: "Katarzyna Lewandowska", role: "Właścicielka", email: "kasia@zielnik-sklep.pl", phone: "+48 503 666 777" }],
      domains: [{ name: "zielnik-sklep.pl", expires: 90, registrar: "Cloudflare" }],
      creds: [
        { type: "website", name: "Shopify — panel sklepu", url: "https://zielnik.myshopify.com/admin", login: "kasia@zielnik-sklep.pl", password: "Zielnik#Shop!2025xq", fields: { cms: "Shopify" } },
        { type: "database", name: "Baza analityczna", login: "analytics", password: "zielnik2019", fields: { engine: "postgresql", host: "db.zielnik-sklep.pl", port: "5432", databaseName: "analytics" }, owner: "agency" },
        { type: "ssh", name: "VPS — serwer integracji", login: "deploy", password: "", fields: { host: "203.0.113.10", port: "22", hostKeyFingerprint: "SHA256:Q2xpZW50IGRlbW8ga2V5" }, secretFields: { privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\n(demo — nieprawdziwy klucz)\n-----END OPENSSH PRIVATE KEY-----" } },
        { type: "secure_note", name: "Kody odzyskiwania Instagram", secretFields: { content: "1234 5678\n2345 6789\n3456 7890" } },
        { type: "social", name: "Instagram", url: "https://instagram.com/zielnik", login: "zielnik.sklep", password: "zielnik2019", fields: { platform: "Instagram" }, owner: "unknown" },
      ],
    },
  ];

  for (const cl of clients) {
    const clientId = crypto.randomUUID();
    const vaultKey = c.generateVaultKey();
    await withTenant(wsId, async (tx) => {
      await tx.insert(schema.clients).values({ id: clientId, workspaceId: wsId, name: cl.name, taxId: cl.taxId ?? null, website: cl.website, industry: cl.industry, services: cl.services, ownerUserId: userId, createdBy: userId, status: "active", notes: "Notatki ogólne (nieszyfrowane E2E): preferuje kontakt mailowy." });
      await tx.insert(schema.keyGrants).values({ workspaceId: wsId, scopeType: "client", scopeId: clientId, userId, encryptedKey: c.sealKeyFor(keys.bundle.publicKey, vaultKey, "client", clientId, 1), keyVersion: 1, grantedBy: userId });
      for (const ct of cl.contacts) await tx.insert(schema.clientContacts).values({ ...ct, clientId, workspaceId: wsId, preferredContact: "email" });
      for (const d of cl.domains) await tx.insert(schema.domains).values({ workspaceId: wsId, clientId, name: d.name, registrar: d.registrar, expiresAt: inDays(d.expires), accountOwner: d.owner ?? "client", hosting: "home.pl", sslExpiresAt: new Date(Date.now() + (d.expires + 30) * 86_400_000) });
      for (const cr of cl.creds) {
        const id = crypto.randomUUID();
        const itemKey = c.generateItemKey();
        const overview = { ...emptyOverview(cr.type), name: cr.name, url: cr.url ?? "", login: cr.login ?? "", notes: cr.notes ?? "", tags: cr.tags ?? [], accountOwner: cr.owner ?? "client", hasTotp: Boolean(cr.totp) };
        Object.assign(overview.fields, cr.fields ?? {});
        const secrets = { ...emptySecrets(cr.type), password: cr.password ?? "", totp: cr.totp ?? "" };
        Object.assign(secrets.fields, cr.secretFields ?? {});
        const payload = c.encryptCredentialPayload(itemKey, id, overview, secrets);
        const secret = primarySecret(cr.type, secrets);
        const changed = cr.password === "zielnik2019" || cr.password === "zlotyklos2019" ? new Date(Date.now() - 400 * 86_400_000) : new Date(Date.now() - 20 * 86_400_000);
        await tx.insert(schema.credentials).values({
          id,
          workspaceId: wsId,
          clientId,
          type: cr.type,
          sensitivity: cr.critical ? "critical" : "standard",
          encryptedItemKey: c.wrapItemKey(vaultKey, itemKey, id, clientId, 1),
          vaultKeyVersion: 1,
          encryptedData: payload.encryptedData,
          encryptedSecrets: payload.encryptedSecrets,
          strengthScore: secret ? (await evaluatePassword(secret)).score : null,
          passwordChangedAt: secret ? changed : null,
          expiresAt: extractExpiry(cr.type, overview),
          createdBy: userId,
          updatedBy: userId,
        });
      }
    });
  }
  await asSystem((tx) => tx.insert(schema.notifications).values({ userId, workspaceId: wsId, type: "info", title: "Witaj w module klientów Nexusa! To dane demonstracyjne.", link: "/dashboard/clients" }));

  console.log("\n=== Dane demonstracyjne gotowe ===");
  console.log(`Adres:            ${process.env.APP_URL ?? "http://localhost:3000"}/auth/signin`);
  console.log(`E-mail:           ${email}`);
  console.log(`Hasło konta:      ${password}`);
  console.log(`Hasło główne:     ${master}`);
  console.log(`Klucz odzyskiwania: ${keys.recoveryKey}`);
  await sqlClient.end();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
