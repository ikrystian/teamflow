import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

/**
 * Konfiguracja modułu klientów i sejfu (PostgreSQL, Better Auth) oraz wspólnych usług.
 * Moduł projektów (MongoDB/Prisma) czyta `DATABASE_URL` bezpośrednio przez Prisma.
 *
 * Zmienne z poprzedniej konfiguracji nexusa (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
 * `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`) są nadal honorowane jako wartości zapasowe.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET (lub NEXTAUTH_SECRET) musi mieć min. 32 znaki"),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  CAPTCHA_SECRET: z.string().min(16),
  POSTGRES_URL: z.string().min(1, "Brak POSTGRES_URL (baza modułu klientów i sejfu)"),
  POSTGRES_SSL: z.enum(["disable", "require"]).default("disable"),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.string().default("Nexus <no-reply@nexus.local>"),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_SECURE: z.preprocess((v) => v === "true", z.boolean()).default(false),
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  MICROSOFT_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  MICROSOFT_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  MICROSOFT_TENANT_ID: z.preprocess(emptyToUndefined, z.string().default("common")),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().optional()),
  /** single = jedna organizacja (domyślnie): wszyscy użytkownicy nexusa należą do jednej przestrzeni CRM. */
  DEPLOYMENT_MODE: z.enum(["saas", "single"]).default("single"),
  /** Nazwa organizacji proponowana przy konfiguracji przestrzeni CRM. */
  ORG_NAME: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  /** Adres do zgłaszania podatności (security.txt, strona „Bezpieczeństwo”); domyślnie security@<domena APP_URL>. */
  SECURITY_CONTACT_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
});

export type Env = z.infer<typeof schema>;

function fromLegacy(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const authSecret = source.BETTER_AUTH_SECRET || source.NEXTAUTH_SECRET;
  const smtpFrom = source.SMTP_FROM_EMAIL ? `${source.SMTP_FROM_NAME || "Nexus"} <${source.SMTP_FROM_EMAIL}>` : undefined;
  return {
    ...source,
    BETTER_AUTH_SECRET: authSecret,
    APP_URL: source.APP_URL || source.NEXTAUTH_URL || undefined,
    // Sekret CAPTCHA wyprowadzany z sekretu uwierzytelniania, gdy nie podano osobnego.
    CAPTCHA_SECRET: source.CAPTCHA_SECRET || (authSecret ? createHmac("sha256", authSecret).update("nexus:captcha").digest("base64url") : undefined),
    EMAIL_FROM: source.EMAIL_FROM || smtpFrom,
  };
}

function loadEnv(): Env {
  const parsed = schema.safeParse(fromLegacy(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Nieprawidłowa konfiguracja środowiska:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const securityContact = env.SECURITY_CONTACT_EMAIL ?? `security@${new URL(env.APP_URL).hostname}`;

export const socialProviders = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  microsoft: Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
};
