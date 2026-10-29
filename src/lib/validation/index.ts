/**
 * Schematy Zod wspólne dla przeglądarki i serwera (rozdział 6.5).
 * Każda Server Action i każdy Route Handler waliduje dane wejściowe tymi schematami.
 */
import { z } from "zod";
import { CREDENTIAL_TYPES } from "@/lib/vault/types";

// --- Wspólne ------------------------------------------------------------------

export const uuid = z.uuid({ message: "Nieprawidłowy identyfikator" });
/** Szyfrogram base64url z limitem rozmiaru (domyślnie 256 KB). */
export const ciphertext = (max = 350_000) =>
  z
    .string()
    .min(16)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+$/, "Nieprawidłowy szyfrogram");
export const b64key = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Nieprawidłowy klucz");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data w formacie RRRR-MM-DD");
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const email = z.email({ message: "Nieprawidłowy adres e-mail" }).trim().toLowerCase().max(254);

// --- Konto i sejf ----------------------------------------------------------------

export const ACCOUNT_PASSWORD_MIN = 12;
export const MASTER_PASSWORD_MIN = 12;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Podaj imię i nazwisko").max(100),
  email,
  password: z.string().min(ACCOUNT_PASSWORD_MIN, `Hasło konta musi mieć co najmniej ${ACCOUNT_PASSWORD_MIN} znaków`).max(256),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Podaj hasło").max(256),
});

export const kdfParamsSchema = z.object({
  alg: z.literal("argon2id13"),
  opsLimit: z.number().int().min(2).max(20),
  memLimit: z.number().int().min(32 * 1024 * 1024).max(1024 * 1024 * 1024),
});

export const vaultSetupSchema = z.object({
  publicKey: b64key,
  encryptedPrivateKey: ciphertext(1000),
  recoveryEncryptedPrivateKey: ciphertext(1000),
  kdfSalt: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  kdfParams: kdfParamsSchema,
  authKey: b64key,
});

export const masterRewrapSchema = z.object({
  encryptedPrivateKey: ciphertext(1000),
  kdfSalt: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  kdfParams: kdfParamsSchema,
  authKey: b64key,
  recoveryEncryptedPrivateKey: ciphertext(1000).optional(),
});

export const preferencesSchema = z.object({
  autoLockMinutes: z.number().int().min(1).max(240).optional(),
  clipboardClearSeconds: z.number().int().min(5).max(600).optional(),
  revealSeconds: z.number().int().min(5).max(300).optional(),
  showFavicons: z.boolean().optional(),
  vaultView: z.enum(["table", "cards"]).optional(),
  clientsView: z.enum(["table", "cards"]).optional(),
  emailNotifications: z.boolean().optional(),
  locale: z.enum(["pl"]).optional(),
});

// --- Przestrzeń i zespół -------------------------------------------------------

export const roleSchema = z.enum(["owner", "admin", "member", "viewer"]);

export const workspaceCreateSchema = z.object({
  id: uuid,
  name: z.string().trim().min(2, "Podaj nazwę przestrzeni").max(100),
  intakePublicKey: b64key,
  /** Kopia klucza skrzynki „Do przejrzenia” dla twórcy. */
  intakeGrant: ciphertext(1000),
});

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), "Adres musi zaczynać się od https://");

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  membersCanShareExternally: z.boolean(),
  auditRetentionMonths: z.number().int().min(1).max(120),
  archivedClientCleanupDays: z.number().int().min(7).max(3650),
  maxShareHours: z.number().int().min(1).max(168),
  massCopyThreshold: z.number().int().min(3).max(1000),
  passwordMaxAgeDays: z.number().int().min(30).max(3650),
  expiryReminderDays: z.array(z.number().int().min(0).max(365)).min(1).max(6),
  slackWebhookUrl: httpsUrl.optional(),
  teamsWebhookUrl: httpsUrl.optional(),
});

export const inviteSchema = z.object({
  email,
  role: z.enum(["admin", "member", "viewer"]),
  clientIds: z.array(uuid).max(500).default([]),
});

// --- Klienci (CRM) ---------------------------------------------------------------

/** NIP: 10 cyfr, suma kontrolna z wagami 6,5,7,2,3,4,5,6,7. */
export function isValidNip(input: string): boolean {
  const d = input.replace(/[\s-]/g, "").replace(/^PL/i, "");
  if (!/^\d{10}$/.test(d)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((s, wi, i) => s + wi * Number(d[i]), 0);
  const check = sum % 11;
  return check !== 10 && check === Number(d[9]);
}

export const normalizeNip = (v: string) => v.replace(/[\s-]/g, "").replace(/^PL/i, "");

export const SERVICES = [
  { value: "website", label: "Strona" },
  { value: "seo", label: "SEO" },
  { value: "social", label: "Social media" },
  { value: "ads", label: "Kampanie" },
  { value: "hosting", label: "Hosting i opieka" },
] as const;

export const CLIENT_STATUSES = [
  { value: "lead", label: "Potencjalny" },
  { value: "active", label: "Aktywny" },
  { value: "paused", label: "Wstrzymany" },
  { value: "ended", label: "Zakończony" },
] as const;

const tag = z.string().trim().min(1).max(40);

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę klienta").max(200),
  taxId: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? normalizeNip(v) : null))
    .refine((v) => v === null || isValidNip(v), "Nieprawidłowy NIP (błędna suma kontrolna)"),
  status: z.enum(["lead", "active", "paused", "ended"]),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null))
    .refine((v) => v === null || URL.canParse(v), "Nieprawidłowy adres strony"),
  industry: optionalText(100),
  address: z
    .object({
      street: z.string().trim().max(200).optional(),
      postalCode: z.string().trim().max(20).optional(),
      city: z.string().trim().max(100).optional(),
      country: z.string().trim().max(100).optional(),
    })
    .default({}),
  ownerUserId: z.string().max(100).optional().nullable(),
  tags: z.array(tag).max(30).default([]),
  services: z.array(z.enum(["website", "seo", "social", "ads", "hosting"])).default([]),
});

export const MAX_LOGO_BYTES = 200 * 1024;
export const logoSchema = z
  .string()
  .max(Math.ceil((MAX_LOGO_BYTES * 4) / 3) + 100)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Logo musi być obrazem PNG, JPEG lub WebP");

export const clientNotesSchema = z.object({ notes: z.string().max(50_000) });

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Podaj imię i nazwisko").max(200),
  role: optionalText(100),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Nieprawidłowy adres e-mail"),
  phone: optionalText(40),
  preferredContact: z.enum(["email", "phone", "sms", "messenger", "whatsapp", "other"]),
  notes: optionalText(2000),
});

export const domainSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(253)
    .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Nieprawidłowa nazwa domeny"),
  registrar: optionalText(200),
  expiresAt: isoDate.optional().nullable().or(z.literal("").transform(() => null)),
  hosting: optionalText(200),
  hostingRenewsAt: isoDate.optional().nullable().or(z.literal("").transform(() => null)),
  autoCheckSsl: z.boolean().default(true),
  accountOwner: z.enum(["client", "agency", "unknown"]),
  notes: optionalText(2000),
});

// --- Sejf ----------------------------------------------------------------------

export const credentialTypeSchema = z.enum(CREDENTIAL_TYPES);
export const sensitivitySchema = z.enum(["standard", "critical"]);

export const credentialWriteSchema = z.object({
  id: uuid,
  clientId: uuid,
  type: credentialTypeSchema,
  sensitivity: sensitivitySchema,
  encryptedItemKey: ciphertext(1000),
  vaultKeyVersion: z.number().int().min(1),
  encryptedData: ciphertext(),
  encryptedSecrets: ciphertext(),
  formatVersion: z.literal(1),
  /** Czy zmieniło się hasło (serwer ustawia passwordChangedAt). */
  passwordChanged: z.boolean(),
  strengthScore: z.number().int().min(0).max(4).nullable(),
  expiresAt: isoDate.nullable(),
});

export const credentialMoveSchema = z.object({
  id: uuid,
  toClientId: uuid,
  encryptedItemKey: ciphertext(1000),
  vaultKeyVersion: z.number().int().min(1),
});

export const keyGrantSchema = z.object({
  scopeType: z.enum(["client", "intake", "credential"]),
  scopeId: uuid,
  userId: z.string().min(1).max(100),
  encryptedKey: ciphertext(1000),
  keyVersion: z.number().int().min(1),
  userKeysVersion: z.number().int().min(1),
});

export const attachmentSchema = z.object({
  id: uuid,
  credentialId: uuid,
  encryptedMeta: ciphertext(5000),
  ciphertext: ciphertext(14_000_000),
  size: z.number().int().min(0).max(10 * 1024 * 1024),
});

// --- Udostępnianie -----------------------------------------------------------------

export const shareCreateSchema = z.object({
  id: uuid,
  kind: z.enum(["credential", "handover"]),
  credentialId: uuid.nullable(),
  clientId: uuid,
  ciphertext: ciphertext(5_000_000),
  authHash: z.string().regex(/^[0-9a-f]{64}$/),
  passwordSalt: z.string().regex(/^[A-Za-z0-9_-]{22}$/).nullable(),
  expiresInHours: z.number().int().min(1).max(168),
  maxViews: z.number().int().min(1).max(20),
  label: optionalText(200),
});

export const shareViewSchema = z.object({ accessKey: b64key });

export const accessRequestCreateSchema = z.object({
  clientId: uuid,
  requestedTypes: z.array(credentialTypeSchema).min(1, "Wybierz co najmniej jeden rodzaj dostępu").max(20),
  message: optionalText(2000),
  recipientEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Nieprawidłowy adres e-mail"),
  expiresInDays: z.number().int().min(1).max(30),
});

export const intakeSubmitSchema = z.object({
  ciphertext: ciphertext(2_000_000),
  intakeKeyVersion: z.number().int().min(1),
  itemCount: z.number().int().min(1).max(50),
});

// --- Audyt ------------------------------------------------------------------------

/** Zdarzenia, które zgłasza przeglądarka (wyświetlenie i skopiowanie — rozdział 4.7). */
export const CLIENT_REPORTED_ACTIONS = [
  "credential.view",
  "credential.reveal_password",
  "credential.copy_password",
  "credential.copy_login",
  "credential.copy_totp",
  "credential.reveal_totp",
  "credential.copy_field",
  "credential.reveal_field",
  "credential.open_url",
  "credential.copy_connection",
  "attachment.download",
  "vault.unlock",
  "vault.unlock_failed",
  "vault.lock",
  "vault.recovery_used",
  "health.breach_check",
] as const;

export const clientEventSchema = z.object({
  action: z.enum(CLIENT_REPORTED_ACTIONS),
  credentialId: uuid.optional(),
  metadata: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});
