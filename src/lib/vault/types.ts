/**
 * Model wpisu sejfu (rozdział 4.4) — wspólny dla przeglądarki i serwera.
 * Serwer widzi tylko typ, wrażliwość, powiązanie z klientem, daty i ocenę siły;
 * reszta jest szyfrowana w przeglądarce (część przeglądowa i sekrety osobno).
 */
import type { CredentialType, Sensitivity } from "@/lib/db/schema";

export type { CredentialType, Sensitivity };

export const CREDENTIAL_TYPES = [
  "website",
  "hosting",
  "ftp",
  "ssh",
  "database",
  "domain",
  "email",
  "social",
  "ads",
  "api",
  "secure_note",
  "other",
] as const satisfies readonly CredentialType[];

export type Environment = "production" | "staging" | "dev";
export type AccountOwner = "client" | "agency" | "unknown";

export type CustomFieldKind = "text" | "hidden" | "url" | "date";
export type CustomField = { id: string; label: string; kind: CustomFieldKind; value: string };

/** Część przeglądowa (encryptedData): potrzebna do list, wyszukiwania i odznak. */
export type CredentialOverview = {
  name: string;
  url: string;
  login: string;
  notes: string;
  tags: string[];
  environment: Environment;
  accountOwner: AccountOwner;
  /** Pola specyficzne dla typu, które nie są sekretami. */
  fields: Record<string, string>;
  /** Pola własne niebędące ukrytymi. */
  custom: CustomField[];
  /** Czy wpis ma sekret 2FA (bez ujawniania sekretu) — do odznaki „2FA”. */
  hasTotp: boolean;
  /** Konto agencji z nadanymi uprawnieniami (dostęp partnerski Google/Meta). */
  partnerAccess?: string;
};

/** Sekrety (encryptedSecrets): dla wpisów krytycznych wydawane dopiero po step-up. */
export type CredentialSecrets = {
  password: string;
  totp: string;
  fields: Record<string, string>;
  custom: CustomField[];
};

export type FieldKind = "text" | "url" | "email" | "tel" | "number" | "date" | "select" | "textarea" | "host" | "port";
export type FieldSection = "login" | "connection" | "details";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  secret?: boolean;
  multiline?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  section: FieldSection;
  /** Pole daty kopiowane do jawnej kolumny `expiresAt` (źródło przypomnień). */
  expiry?: boolean;
};

export type CategoryId = "web" | "hosting" | "domains" | "email" | "social" | "ads" | "api" | "notes" | "other";

/** Stałe kategorie sejfu (rozdział 5.1). Kolor nigdy nie jest jedynym nośnikiem — zawsze z ikoną i nazwą. */
export const CATEGORIES: { id: CategoryId; label: string; types: CredentialType[] }[] = [
  { id: "web", label: "WWW", types: ["website"] },
  { id: "hosting", label: "Hosting i serwer", types: ["hosting", "ftp", "ssh", "database"] },
  { id: "domains", label: "Domeny", types: ["domain"] },
  { id: "email", label: "Poczta", types: ["email"] },
  { id: "social", label: "Social media", types: ["social"] },
  { id: "ads", label: "Reklama i analityka", types: ["ads"] },
  { id: "api", label: "API", types: ["api"] },
  { id: "notes", label: "Notatki", types: ["secure_note"] },
  { id: "other", label: "Inne", types: ["other"] },
];

export function categoryOf(type: CredentialType): CategoryId {
  return CATEGORIES.find((c) => c.types.includes(type))!.id;
}

const opt = (...values: string[]) => values.map((v) => ({ value: v, label: v }));
const SECURITY = [
  { value: "ssl", label: "SSL/TLS" },
  { value: "starttls", label: "STARTTLS" },
  { value: "none", label: "Brak" },
];

export type TypeDef = {
  type: CredentialType;
  label: string;
  description: string;
  examples: string;
  /** Czy typ używa wspólnych pól logowania (login, hasło). */
  hasLogin: boolean;
  loginLabel?: string;
  urlLabel?: string;
  fields: FieldDef[];
  defaults?: Record<string, string>;
};

export const TYPE_DEFS: Record<CredentialType, TypeDef> = {
  website: {
    type: "website",
    label: "Strona WWW / CMS",
    description: "Panel administracyjny strony lub sklepu",
    examples: "WordPress, WooCommerce, PrestaShop, Shopify",
    hasLogin: true,
    urlLabel: "Adres panelu logowania",
    fields: [
      { key: "cms", label: "Rodzaj CMS", kind: "select", section: "details", options: opt("WordPress", "WooCommerce", "PrestaShop", "Shopify", "Joomla", "Drupal", "Magento", "Webflow", "Wix", "Inny") },
      { key: "accountRole", label: "Rola konta", kind: "text", section: "login", placeholder: "np. Administrator" },
    ],
  },
  hosting: {
    type: "hosting",
    label: "Hosting / panel serwera",
    description: "Panel hostingu lub serwera",
    examples: "cPanel, DirectAdmin, Plesk",
    hasLogin: true,
    urlLabel: "Adres panelu",
    fields: [
      { key: "panel", label: "Panel", kind: "select", section: "details", options: opt("cPanel", "DirectAdmin", "Plesk", "Inny") },
      { key: "providerClientId", label: "ID klienta u dostawcy", kind: "text", section: "details" },
      { key: "supportPin", label: "PIN do pomocy technicznej", kind: "text", section: "details", secret: true },
      { key: "plan", label: "Pakiet", kind: "text", section: "details" },
      { key: "renewsAt", label: "Data odnowienia", kind: "date", section: "details", expiry: true },
    ],
  },
  ftp: {
    type: "ftp",
    label: "FTP / SFTP / FTPS",
    description: "Dostęp do plików serwera",
    examples: "FileZilla, WinSCP",
    hasLogin: true,
    loginLabel: "Użytkownik",
    fields: [
      { key: "protocol", label: "Protokół", kind: "select", section: "connection", options: [
        { value: "ftp", label: "FTP" },
        { value: "sftp", label: "SFTP" },
        { value: "ftps", label: "FTPS" },
      ] },
      { key: "host", label: "Host", kind: "host", section: "connection", placeholder: "ftp.example.com" },
      { key: "port", label: "Port", kind: "port", section: "connection", help: "Podpowiadany: 21 (FTP), 22 (SFTP), 990 (FTPS)" },
      { key: "authMethod", label: "Uwierzytelnianie", kind: "select", section: "connection", options: [
        { value: "password", label: "Hasło" },
        { value: "key", label: "Klucz prywatny" },
      ] },
      { key: "privateKey", label: "Klucz prywatny", kind: "textarea", section: "connection", secret: true, multiline: true },
      { key: "keyPassphrase", label: "Hasło klucza", kind: "text", section: "connection", secret: true },
      { key: "rootDir", label: "Katalog startowy", kind: "text", section: "connection", placeholder: "/public_html" },
    ],
    defaults: { protocol: "sftp", port: "22", authMethod: "password" },
  },
  ssh: {
    type: "ssh",
    label: "SSH / serwer",
    description: "Dostęp do serwera przez SSH",
    examples: "VPS, serwer dedykowany",
    hasLogin: true,
    loginLabel: "Użytkownik",
    fields: [
      { key: "host", label: "Host", kind: "host", section: "connection" },
      { key: "port", label: "Port", kind: "port", section: "connection" },
      { key: "privateKey", label: "Klucz prywatny", kind: "textarea", section: "connection", secret: true, multiline: true },
      { key: "keyPassphrase", label: "Hasło klucza", kind: "text", section: "connection", secret: true },
      { key: "hostKeyFingerprint", label: "Odcisk klucza serwera", kind: "text", section: "connection", placeholder: "SHA256:…" },
    ],
    defaults: { port: "22" },
  },
  database: {
    type: "database",
    label: "Baza danych",
    description: "Serwer bazy danych",
    examples: "MySQL, MariaDB, PostgreSQL",
    hasLogin: true,
    loginLabel: "Użytkownik",
    urlLabel: "Adres phpMyAdmin lub Adminera",
    fields: [
      { key: "engine", label: "Silnik", kind: "select", section: "connection", options: [
        { value: "mysql", label: "MySQL" },
        { value: "mariadb", label: "MariaDB" },
        { value: "postgresql", label: "PostgreSQL" },
        { value: "mssql", label: "SQL Server" },
        { value: "mongodb", label: "MongoDB" },
        { value: "other", label: "Inny" },
      ] },
      { key: "host", label: "Host", kind: "host", section: "connection" },
      { key: "port", label: "Port", kind: "port", section: "connection" },
      { key: "databaseName", label: "Nazwa bazy", kind: "text", section: "connection" },
    ],
    defaults: { engine: "mysql", port: "3306", host: "localhost" },
  },
  domain: {
    type: "domain",
    label: "Domena / DNS",
    description: "Panel rejestratora lub DNS",
    examples: "domeny .pl, .com, .eu",
    hasLogin: true,
    urlLabel: "Adres panelu rejestratora",
    fields: [
      { key: "domain", label: "Domena", kind: "text", section: "details", placeholder: "example.pl" },
      { key: "registrar", label: "Rejestrator", kind: "text", section: "details" },
      { key: "authInfo", label: "Kod AuthInfo", kind: "text", section: "details", secret: true },
      { key: "expiresAt", label: "Data wygaśnięcia", kind: "date", section: "details", expiry: true },
      { key: "nameservers", label: "Serwery DNS", kind: "textarea", section: "details", multiline: true, placeholder: "ns1.example.com\nns2.example.com" },
      { key: "registrant", label: "Abonent", kind: "text", section: "details", help: "Na kogo zarejestrowana jest domena" },
    ],
  },
  email: {
    type: "email",
    label: "Poczta e-mail",
    description: "Skrzynka pocztowa",
    examples: "skrzynki firmowe, Google Workspace, Microsoft 365",
    hasLogin: true,
    loginLabel: "Adres e-mail",
    urlLabel: "Adres webmaila",
    fields: [
      { key: "provider", label: "Dostawca", kind: "select", section: "details", options: opt("Skrzynka na hostingu", "Google Workspace", "Microsoft 365", "Inny") },
      { key: "imapHost", label: "Serwer IMAP", kind: "host", section: "connection" },
      { key: "imapPort", label: "Port IMAP", kind: "port", section: "connection" },
      { key: "imapSecurity", label: "Szyfrowanie IMAP", kind: "select", section: "connection", options: SECURITY },
      { key: "pop3Host", label: "Serwer POP3", kind: "host", section: "connection" },
      { key: "pop3Port", label: "Port POP3", kind: "port", section: "connection" },
      { key: "pop3Security", label: "Szyfrowanie POP3", kind: "select", section: "connection", options: SECURITY },
      { key: "smtpHost", label: "Serwer SMTP", kind: "host", section: "connection" },
      { key: "smtpPort", label: "Port SMTP", kind: "port", section: "connection" },
      { key: "smtpSecurity", label: "Szyfrowanie SMTP", kind: "select", section: "connection", options: SECURITY },
    ],
    defaults: { imapPort: "993", imapSecurity: "ssl", pop3Port: "995", pop3Security: "ssl", smtpPort: "465", smtpSecurity: "ssl" },
  },
  social: {
    type: "social",
    label: "Social media",
    description: "Konto w serwisie społecznościowym",
    examples: "Facebook, Instagram, LinkedIn, TikTok, YouTube, X",
    hasLogin: true,
    fields: [
      { key: "platform", label: "Platforma", kind: "select", section: "details", options: opt("Facebook", "Instagram", "LinkedIn", "TikTok", "YouTube", "X", "Pinterest", "Inna") },
      { key: "recoveryEmail", label: "E-mail do odzyskiwania", kind: "email", section: "details" },
      { key: "recoveryPhone", label: "Telefon do odzyskiwania", kind: "tel", section: "details" },
      { key: "backupCodes", label: "Kody zapasowe", kind: "textarea", section: "details", secret: true, multiline: true },
      { key: "agencyRole", label: "Rola agencji", kind: "text", section: "details", placeholder: "np. Administrator strony, Redaktor" },
      { key: "pageId", label: "ID strony lub konta firmowego", kind: "text", section: "details" },
    ],
  },
  ads: {
    type: "ads",
    label: "Reklama i analityka",
    description: "Konto reklamowe lub analityczne",
    examples: "Google Ads, Analytics, Search Console, Tag Manager, Meta Ads",
    hasLogin: true,
    fields: [
      { key: "platform", label: "Platforma", kind: "select", section: "details", options: opt("Google Ads", "Google Analytics", "Google Search Console", "Google Tag Manager", "Google Merchant Center", "Meta Ads", "LinkedIn Ads", "TikTok Ads", "Inna") },
      { key: "accountId", label: "ID konta", kind: "text", section: "details" },
      { key: "accessMethod", label: "Sposób dostępu", kind: "select", section: "details", options: [
        { value: "partner", label: "Uprawnienia dla konta agencji" },
        { value: "client_login", label: "Login klienta" },
      ] },
      { key: "permissionLevel", label: "Poziom uprawnień", kind: "text", section: "details", placeholder: "np. Administrator, Standardowy" },
    ],
    defaults: { accessMethod: "partner" },
  },
  api: {
    type: "api",
    label: "Klucz API / token",
    description: "Klucz lub token usługi",
    examples: "bramki płatności, newslettery, API przewoźników",
    hasLogin: false,
    urlLabel: "Adres panelu usługi",
    fields: [
      { key: "service", label: "Usługa", kind: "text", section: "details", placeholder: "np. Stripe, Przelewy24, InPost" },
      { key: "apiKey", label: "Klucz", kind: "text", section: "login", secret: true },
      { key: "apiSecret", label: "Sekret", kind: "text", section: "login", secret: true },
      { key: "scopes", label: "Zakres uprawnień", kind: "text", section: "details" },
      { key: "expiresAt", label: "Data wygaśnięcia", kind: "date", section: "details", expiry: true },
    ],
  },
  secure_note: {
    type: "secure_note",
    label: "Bezpieczna notatka",
    description: "Szyfrowana treść",
    examples: "dane do odzyskiwania kont, informacje poufne",
    hasLogin: false,
    fields: [{ key: "content", label: "Treść", kind: "textarea", section: "details", secret: true, multiline: true }],
  },
  other: {
    type: "other",
    label: "Inny",
    description: "Pola własne: tekst, ukryte, adres, data",
    examples: "nietypowe systemy klienta",
    hasLogin: true,
    fields: [],
  },
};

export const ENVIRONMENTS: { value: Environment; label: string }[] = [
  { value: "production", label: "Produkcja" },
  { value: "staging", label: "Staging" },
  { value: "dev", label: "Dev" },
];

export const ACCOUNT_OWNERS: { value: AccountOwner; label: string }[] = [
  { value: "client", label: "Klient" },
  { value: "agency", label: "Agencja" },
  { value: "unknown", label: "Nie wiadomo" },
];

/** Domyślne porty podpowiadane po wyborze protokołu / silnika. */
export const DEFAULT_PORTS: Record<string, string> = {
  ftp: "21",
  sftp: "22",
  ftps: "990",
  mysql: "3306",
  mariadb: "3306",
  postgresql: "5432",
  mssql: "1433",
  mongodb: "27017",
};

export function emptyOverview(type: CredentialType): CredentialOverview {
  const def = TYPE_DEFS[type];
  const fields: Record<string, string> = {};
  for (const f of def.fields) if (!f.secret) fields[f.key] = def.defaults?.[f.key] ?? "";
  return { name: "", url: "", login: "", notes: "", tags: [], environment: "production", accountOwner: "client", fields, custom: [], hasTotp: false };
}

export function emptySecrets(type: CredentialType): CredentialSecrets {
  const fields: Record<string, string> = {};
  for (const f of TYPE_DEFS[type].fields) if (f.secret) fields[f.key] = "";
  return { password: "", totp: "", fields, custom: [] };
}

/** Data wygaśnięcia jawna dla serwera (przypomnienia) — z pola oznaczonego `expiry`. */
export function extractExpiry(type: CredentialType, overview: CredentialOverview): string | null {
  const f = TYPE_DEFS[type].fields.find((x) => x.expiry);
  const v = f ? overview.fields[f.key] : "";
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** Hasło, którego siłę oceniamy (dla API — klucz). */
export function primarySecret(type: CredentialType, secrets: CredentialSecrets): string {
  if (type === "api") return secrets.fields.apiKey ?? "";
  if (type === "secure_note") return "";
  return secrets.password;
}

/** Gotowy ciąg połączenia do skopiowania (rozdział 5.4), np. sftp://użytkownik@host:22 */
export function connectionString(type: CredentialType, o: CredentialOverview): string | null {
  const f = o.fields;
  const user = o.login ? `${encodeURIComponent(o.login)}@` : "";
  switch (type) {
    case "ftp": {
      if (!f.host) return null;
      const proto = f.protocol || "ftp";
      const port = f.port || DEFAULT_PORTS[proto];
      const dir = f.rootDir ? (f.rootDir.startsWith("/") ? f.rootDir : `/${f.rootDir}`) : "";
      return `${proto}://${user}${f.host}${port ? `:${port}` : ""}${dir}`;
    }
    case "ssh": {
      if (!f.host) return null;
      const port = f.port && f.port !== "22" ? ` -p ${f.port}` : "";
      return `ssh ${o.login ? `${o.login}@` : ""}${f.host}${port}`;
    }
    case "database": {
      if (!f.host) return null;
      const scheme = { mysql: "mysql", mariadb: "mariadb", postgresql: "postgresql", mssql: "sqlserver", mongodb: "mongodb" }[f.engine] ?? f.engine ?? "db";
      const port = f.port || DEFAULT_PORTS[f.engine] || "";
      return `${scheme}://${user}${f.host}${port ? `:${port}` : ""}${f.databaseName ? `/${f.databaseName}` : ""}`;
    }
    case "email": {
      if (!f.imapHost && !f.smtpHost) return null;
      const parts = [];
      if (f.imapHost) parts.push(`IMAP ${f.imapHost}:${f.imapPort || "993"} (${f.imapSecurity || "ssl"})`);
      if (f.smtpHost) parts.push(`SMTP ${f.smtpHost}:${f.smtpPort || "465"} (${f.smtpSecurity || "ssl"})`);
      return parts.join(" · ");
    }
    default:
      return null;
  }
}

/** Host do wyświetlenia w wierszu (skrócony adres lub host). */
export function displayAddress(type: CredentialType, o: CredentialOverview): string {
  if (["ftp", "ssh", "database"].includes(type) && o.fields.host) {
    return o.fields.port ? `${o.fields.host}:${o.fields.port}` : o.fields.host;
  }
  if (!o.url) return "";
  try {
    const u = new URL(o.url.includes("://") ? o.url : `https://${o.url}`);
    return u.host + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return o.url;
  }
}

/** Czy adres nadaje się do otwarcia w nowej karcie (tylko http/https). */
export function openableUrl(type: CredentialType, o: CredentialOverview): string | null {
  const raw = o.url?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Podpowiedź dostępu partnerskiego dla kont Google i Meta (rozdział 4.4 — dobre praktyki). */
export function suggestsPartnerAccess(type: CredentialType, o: CredentialOverview): boolean {
  const p = (o.fields.platform ?? "").toLowerCase();
  if (type === "ads") return o.fields.accessMethod !== "partner" && /(google|meta)/.test(p);
  if (type === "social") return /(facebook|instagram)/.test(p);
  return false;
}
