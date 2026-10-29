/**
 * Schemat bazy PostgreSQL Nexusa: konta i sesje (Better Auth), moduł klientów (CRM),
 * sejf dostępów E2E, dziennik zdarzeń, przypomnienia i powiadomienia.
 * Projekty, zadania i czas pracy są w MongoDB (prisma/schema.prisma) — dokument
 * `User` w Mongo ma to samo `id` co wiersz `user` tutaj (lib/identity.ts).
 *
 * Zasady (rozdział 6 i 10 dokumentacji modułu):
 * - każda tabela z danymi klientów ma `workspaceId` (izolacja przestrzeni + RLS),
 * - sekrety trafiają do bazy wyłącznie jako szyfrogramy (kolumny `encrypted*`, `ciphertext`),
 * - jawne dla serwera są tylko metadane: typ, wrażliwość, powiązania, daty, ocena siły 0–4.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Better Auth: użytkownicy, sesje, konta, weryfikacje, 2FA, passkeys
// ---------------------------------------------------------------------------

export type KdfParams = { alg: "argon2id13"; opsLimit: number; memLimit: number };

export type UserPreferences = {
  autoLockMinutes?: number;
  clipboardClearSeconds?: number;
  revealSeconds?: number;
  showFavicons?: boolean;
  vaultView?: "table" | "cards";
  clientsView?: "table" | "cards";
  emailNotifications?: boolean;
  locale?: string;
};

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  twoFactorEnabled: boolean().default(false),
  /** Rola systemowa nexusa: user | manager | admin (uprawnienia modułu projektów i administracji). */
  role: text().notNull().default("user"),
  // --- klucze sejfu (rozdział 6.3) — wyłącznie zaszyfrowane kopie ---
  publicKey: text(),
  encryptedPrivateKey: text(),
  recoveryEncryptedPrivateKey: text(),
  kdfSalt: text(),
  kdfParams: jsonb().$type<KdfParams>(),
  /** Skrót Argon2id klucza uwierzytelniającego wyprowadzonego z hasła głównego (do step-up). Samo hasło nigdy nie trafia na serwer. */
  masterAuthHash: text(),
  vaultCreatedAt: timestamp({ withTimezone: true }),
  /** Zwiększany przy resecie kluczy (odzyskiwanie przez administratora). */
  keysVersion: integer().notNull().default(1),
  preferences: jsonb().$type<UserPreferences>().notNull().default({}),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Czy sesja przeszła drugi składnik (TOTP / kod zapasowy / passkey). */
    mfaVerified: boolean().notNull().default(false),
    country: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text().primaryKey(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean().default(true),
    failedVerificationCount: integer().default(0),
    lockedUntil: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId), index().on(t.secret)],
);

export const passkey = pgTable(
  "passkey",
  {
    id: text().primaryKey(),
    name: text(),
    publicKey: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text().notNull(),
    counter: integer().notNull(),
    deviceType: text().notNull(),
    backedUp: boolean().notNull(),
    transports: text(),
    createdAt: timestamp({ withTimezone: true }),
    aaguid: text(),
  },
  (t) => [index().on(t.userId), index().on(t.credentialID)],
);

// ---------------------------------------------------------------------------
// Przestrzenie i zespół
// ---------------------------------------------------------------------------

export const memberRole = pgEnum("member_role", ["owner", "admin", "member", "viewer"]);
export const memberStatus = pgEnum("member_status", ["active", "suspended"]);

export type WorkspaceSettings = {
  /** Czy członkowie mogą tworzyć linki jednorazowe na zewnątrz (rozdział 3). */
  membersCanShareExternally?: boolean;
  /** Retencja dziennika zdarzeń w miesiącach (domyślnie 12). */
  auditRetentionMonths?: number;
  /** Po ilu dniach od zakończenia współpracy przypomnieć o usunięciu dostępów (RODO). */
  archivedClientCleanupDays?: number;
  /** Maksymalna ważność linku jednorazowego w godzinach (1–168). */
  maxShareHours?: number;
  /** Próg alertu „masowe kopiowanie”: liczba odsłonięć/kopii w oknie 10 min. */
  massCopyThreshold?: number;
  /** Ile dni przed wygaśnięciem przypominać (domeny, SSL, hosting, klucze API). */
  expiryReminderDays?: number[];
  /** Hasła starsze niż N dni oznaczane jako „ponad 180 dni”. */
  passwordMaxAgeDays?: number;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
};

export const workspaces = pgTable("workspaces", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  plan: text().notNull().default("free"),
  settings: jsonb().$type<WorkspaceSettings>().notNull().default({}),
  /** Klucz publiczny skrzynki „Do przejrzenia” (prośby o dostęp od klientów). */
  intakePublicKey: text().notNull(),
  intakeKeyVersion: integer().notNull().default(1),
  intakeRotationRequired: boolean().notNull().default(false),
  createdBy: text().references(() => user.id, { onDelete: "set null" }),
  ...timestamps,
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole().notNull().default("member"),
    status: memberStatus().notNull().default("active"),
    /** Uprawnienie eksportu nadane administratorowi przez właściciela. */
    canExport: boolean().notNull().default(false),
    /**
     * Po resecie kluczy (zapomniane hasło główne bez klucza odzyskiwania) kopie kluczy są
     * nadawane ponownie dopiero po zatwierdzeniu przez administratora — chroni to przed
     * przejęciem sejfu przez kogoś, kto przejął tylko skrzynkę e-mail.
     */
    pendingKeyApproval: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.workspaceId, t.userId), index().on(t.userId)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text().notNull(),
    role: memberRole().notNull().default("member"),
    tokenHash: text().notNull().unique(),
    /** Klienci, do których osoba zostanie przypisana po dołączeniu. */
    clientIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    invitedBy: text().references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    acceptedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.workspaceId), index().on(t.email)],
);

// ---------------------------------------------------------------------------
// Klienci (CRM) — baza szyfrowana w spoczynku, dostępne dla serwera
// ---------------------------------------------------------------------------

export const clientStatus = pgEnum("client_status", ["lead", "active", "paused", "ended"]);
export const contactMethod = pgEnum("contact_method", ["email", "phone", "sms", "messenger", "whatsapp", "other"]);
export const accountOwnerEnum = pgEnum("account_owner", ["client", "agency", "unknown"]);

export type ClientAddress = { street?: string; postalCode?: string; city?: string; country?: string };

export const clients = pgTable(
  "clients",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text().notNull(),
    taxId: text(),
    status: clientStatus().notNull().default("active"),
    website: text(),
    industry: text(),
    address: jsonb().$type<ClientAddress>().notNull().default({}),
    /** Logo jako data URL (PNG/JPEG/WebP/SVG zablokowane), maks. ~200 KB. */
    logo: text(),
    /** Opiekun po stronie agencji. */
    ownerUserId: text().references(() => user.id, { onDelete: "set null" }),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    services: text().array().notNull().default(sql`'{}'::text[]`),
    /** Notatki ogólne — NIE są objęte szyfrowaniem end-to-end. */
    notes: text().notNull().default(""),
    /** Wersja klucza sejfu klienta (rośnie przy rotacji). */
    vaultKeyVersion: integer().notNull().default(1),
    /** Ustawiane przy odejściu osoby z dostępem — klucz sejfu musi zostać zrotowany w przeglądarce. */
    rotationRequired: boolean().notNull().default(false),
    /** Identyfikator klienta z poprzedniego modułu projektów (MongoDB) — import jest idempotentny. */
    externalRef: text(),
    archivedAt: timestamp({ withTimezone: true }),
    endedAt: timestamp({ withTimezone: true }),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index().on(t.workspaceId), index().on(t.workspaceId, t.status), uniqueIndex().on(t.workspaceId, t.externalRef)],
);

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text().notNull(),
    role: text(),
    email: text(),
    phone: text(),
    preferredContact: contactMethod().notNull().default("email"),
    notes: text(),
    ...timestamps,
  },
  (t) => [index().on(t.clientId), index().on(t.workspaceId)],
);

export const clientMembers = pgTable(
  "client_members",
  {
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Indywidualne nadanie dostępu do wpisów krytycznych (dla roli „członek”). */
    canViewCritical: boolean().notNull().default(false),
    assignedBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.userId] }), index().on(t.userId), index().on(t.workspaceId)],
);

export const favorites = pgTable(
  "favorites",
  {
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.clientId] }), index().on(t.workspaceId)],
);

export const domains = pgTable(
  "domains",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text().notNull(),
    registrar: text(),
    expiresAt: date({ mode: "string" }),
    hosting: text(),
    hostingRenewsAt: date({ mode: "string" }),
    sslExpiresAt: timestamp({ withTimezone: true }),
    sslIssuer: text(),
    sslCheckedAt: timestamp({ withTimezone: true }),
    sslError: text(),
    autoCheckSsl: boolean().notNull().default(true),
    /** Na kogo zarejestrowana domena — wychwytuje domenę zarejestrowaną na agencję. */
    accountOwner: accountOwnerEnum().notNull().default("client"),
    notes: text(),
    ...timestamps,
  },
  (t) => [index().on(t.clientId), index().on(t.workspaceId), index().on(t.expiresAt)],
);

// ---------------------------------------------------------------------------
// Sejf (end-to-end)
// ---------------------------------------------------------------------------

export const keyScope = pgEnum("key_scope", ["client", "intake", "credential"]);

/**
 * Kopia klucza (sejfu klienta, skrzynki „Do przejrzenia” lub pojedynczego wpisu)
 * zaszyfrowana kluczem publicznym konkretnej osoby (crypto_box_seal).
 */
export const keyGrants = pgTable(
  "key_grants",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    scopeType: keyScope().notNull(),
    scopeId: uuid().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    encryptedKey: text().notNull(),
    keyVersion: integer().notNull(),
    /** Wersja kluczy użytkownika, którymi zaszyfrowano kopię (po resecie kopia jest nieważna). */
    userKeysVersion: integer().notNull().default(1),
    grantedBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex().on(t.scopeType, t.scopeId, t.userId, t.keyVersion),
    index().on(t.userId),
    index().on(t.workspaceId),
  ],
);

export const credentialType = pgEnum("credential_type", [
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
]);
export const sensitivity = pgEnum("sensitivity", ["standard", "critical"]);

export const credentials = pgTable(
  "credentials",
  {
    /** UUID generowany w przeglądarce — jest częścią danych uwierzytelnianych szyfrogramu. */
    id: uuid().primaryKey(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: credentialType().notNull(),
    sensitivity: sensitivity().notNull().default("standard"),
    /** Klucz wpisu zaszyfrowany kluczem sejfu klienta (AD: id wpisu + id sejfu + wersja). */
    encryptedItemKey: text().notNull(),
    vaultKeyVersion: integer().notNull(),
    /** Część przeglądowa: nazwa, login, URL, notatka, tagi, środowisko, pola jawne. */
    encryptedData: text().notNull(),
    /** Sekrety: hasło, sekret 2FA, klucze, kody zapasowe, ukryte pola. Dla wpisów krytycznych wydawane dopiero po step-up. */
    encryptedSecrets: text().notNull(),
    formatVersion: smallint().notNull().default(1),
    passwordChangedAt: timestamp({ withTimezone: true }),
    /** Ocena siły hasła 0–4 (zxcvbn) — jedyna informacja o haśle znana serwerowi. */
    strengthScore: smallint(),
    expiresAt: date({ mode: "string" }),
    needsRotation: boolean().notNull().default(false),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    updatedBy: text().references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.workspaceId), index().on(t.clientId), index().on(t.expiresAt)],
);

export const credentialVersions = pgTable(
  "credential_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    credentialId: uuid()
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    encryptedData: text().notNull(),
    encryptedSecrets: text().notNull(),
    formatVersion: smallint().notNull().default(1),
    type: credentialType().notNull(),
    sensitivity: sensitivity().notNull(),
    passwordChangedAt: timestamp({ withTimezone: true }),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.credentialId)],
);

export const credentialAttachments = pgTable(
  "credential_attachments",
  {
    id: uuid().primaryKey(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    credentialId: uuid()
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    /** Zaszyfrowane: nazwa pliku i typ MIME. */
    encryptedMeta: text().notNull(),
    /** Zaszyfrowana zawartość (base64). */
    ciphertext: text().notNull(),
    size: integer().notNull(),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.credentialId)],
);

/** Udostępnienie pojedynczego wpisu osobie z zespołu (klucz wpisu w key_grants, scope „credential”). */
export const credentialAccess = pgTable(
  "credential_access",
  {
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    credentialId: uuid()
      .notNull()
      .references(() => credentials.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    grantedBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.credentialId, t.userId] }), index().on(t.userId)],
);

// ---------------------------------------------------------------------------
// Udostępnianie na zewnątrz i prośby o dostęp
// ---------------------------------------------------------------------------

export const shareKind = pgEnum("share_kind", ["credential", "handover"]);

export const shares = pgTable(
  "shares",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: shareKind().notNull().default("credential"),
    credentialId: uuid().references(() => credentials.id, { onDelete: "cascade" }),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Szyfrogram — klucz jest tylko we fragmencie adresu (#), serwer go nie zna. */
    ciphertext: text().notNull(),
    /** SHA-256 klucza dostępu wyprowadzonego z klucza linku (i hasła) — dowód posiadania linku. */
    authHash: text().notNull(),
    hasPassword: boolean().notNull().default(false),
    passwordSalt: text(),
    /** Jawny dla serwera opis (bez sekretów), np. „Pakiet przekazania — 12 dostępów”. */
    label: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    maxViews: integer().notNull().default(1),
    viewCount: integer().notNull().default(0),
    lastViewedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.workspaceId), index().on(t.credentialId)],
);

export const requestStatus = pgEnum("request_status", ["pending", "submitted", "accepted", "rejected", "revoked"]);

export const accessRequests = pgTable(
  "access_requests",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique(),
    requestedTypes: text().array().notNull(),
    message: text(),
    recipientEmail: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    status: requestStatus().notNull().default("pending"),
    /** Dane zaszyfrowane w przeglądarce klienta kluczem publicznym skrzynki „Do przejrzenia”. */
    submittedCiphertext: text(),
    intakeKeyVersion: integer(),
    submittedAt: timestamp({ withTimezone: true }),
    reviewedBy: text().references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp({ withTimezone: true }),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.workspaceId), index().on(t.clientId)],
);

// ---------------------------------------------------------------------------
// Dziennik zdarzeń (tylko dopisywanie), przypomnienia, powiadomienia
// ---------------------------------------------------------------------------

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    workspaceId: uuid().references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: text().references(() => user.id, { onDelete: "set null" }),
    actorName: text(),
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    clientId: uuid(),
    ip: text(),
    userAgent: text(),
    country: text(),
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.workspaceId, t.createdAt),
    index().on(t.actorId, t.createdAt),
    index().on(t.targetType, t.targetId),
    index().on(t.clientId),
  ],
);

export const reminderKind = pgEnum("reminder_kind", [
  "domain_expiry",
  "ssl_expiry",
  "hosting_renewal",
  "credential_expiry",
  "password_old",
  "password_breached",
  "password_rotate",
  "client_cleanup",
]);
export const reminderStatus = pgEnum("reminder_status", ["open", "done", "dismissed"]);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: reminderKind().notNull(),
    targetType: text().notNull(),
    targetId: text().notNull(),
    clientId: uuid().references(() => clients.id, { onDelete: "cascade" }),
    /** Osoba odpowiedzialna (np. zadanie „zmień hasło” po odejściu pracownika). */
    assigneeUserId: text().references(() => user.id, { onDelete: "set null" }),
    /** Tytuł bez sekretów. */
    title: text().notNull(),
    dueAt: timestamp({ withTimezone: true }).notNull(),
    status: reminderStatus().notNull().default("open"),
    /** Klucz deduplikacji (np. „domain_expiry:<id>:<data>”). */
    dedupeKey: text().notNull(),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.workspaceId, t.dedupeKey), index().on(t.workspaceId, t.status, t.dueAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text().notNull(),
    /** Treść powiadomień nigdy nie zawiera sekretów. */
    title: text().notNull(),
    body: text(),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.readAt)],
);

// ---------------------------------------------------------------------------
// Ponowne potwierdzenie tożsamości i odblokowanie passkeyem (PRF)
// ---------------------------------------------------------------------------

export const stepUps = pgTable(
  "step_ups",
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: text()
      .notNull()
      .references(() => session.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    method: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.sessionId)],
);

export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sessionId: text().notNull(),
  challenge: text().notNull(),
  purpose: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

/** Klucz prywatny opakowany wynikiem rozszerzenia WebAuthn PRF (odblokowanie sejfu passkeyem). */
export const vaultUnlockKeys = pgTable(
  "vault_unlock_keys",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialId: text().notNull(),
    label: text().notNull(),
    prfSalt: text().notNull(),
    wrappedPrivateKey: text().notNull(),
    keysVersion: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId)],
);

export type Role = (typeof memberRole.enumValues)[number];
export type ClientStatus = (typeof clientStatus.enumValues)[number];
export type CredentialType = (typeof credentialType.enumValues)[number];
export type Sensitivity = (typeof sensitivity.enumValues)[number];
export type ReminderKind = (typeof reminderKind.enumValues)[number];
