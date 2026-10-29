import "server-only";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { recordUserAudit } from "@/lib/dal/audit";
import { appUrl, sendEmail } from "@/lib/email";
import { env, socialProviders } from "@/lib/env";
import {
  canSelfRegister,
  ensureOrgMembership,
  ensureProfile,
  hashAccountPassword,
  isLegacyEmail,
  legacyIdForVerifiedEmail,
  migrateLegacyUser,
  syncProfileFromAuth,
  upgradeLegacyPasswordHash,
  verifyAccountPassword,
} from "@/lib/identity";
import { logger } from "@/lib/logger";
import { describeDevice, metaFromHeaders } from "@/lib/request-meta";
import { verifySolution, type CaptchaSolution } from "@/lib/security/captcha";
import { clearLoginFailures, hit, loginState, recordLoginFailure } from "@/lib/security/rate-limit";

const appHost = new URL(env.APP_URL).hostname;
/** Limity produkcyjne; w środowisku deweloperskim i testach e2e luźniejsze (wiele rejestracji z jednego IP). */
const limitFactor = env.NODE_ENV === "production" ? 1 : 100;

/** Ścieżki, po których sesja przeszła drugi składnik uwierzytelniania. */
const MFA_PATHS = new Set(["/two-factor/verify-totp", "/two-factor/verify-backup-code", "/passkey/verify-authentication"]);
/** Logowanie przez zaufanego dostawcę (adres e-mail zweryfikowany po jego stronie). */
const SOCIAL_CALLBACK = /^\/callback\//;

/**
 * Better Auth — jedno logowanie dla całego Nexusa: moduł projektów i moduł klientów/sejfu.
 * Sesje, 2FA i passkeys (rozdział 6.4 dokumentacji modułu). Hasło główne sejfu nie
 * przechodzi przez tę bibliotekę ani przez serwer.
 */
export const auth = betterAuth({
  appName: "Nexus",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      passkey: schema.passkey,
    },
  }),
  user: {
    additionalFields: {
      // Rola systemowa nexusa (user | manager | admin) — nadawana wyłącznie przez administratora.
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Skróty bcrypt kont sprzed migracji są nadal akceptowane i przepisywane na scrypt po zalogowaniu.
    password: { hash: hashAccountPassword, verify: verifyAccountPassword },
    minPasswordLength: 12,
    maxPasswordLength: 256,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    async sendResetPassword({ user, url }) {
      await sendEmail(user.email, "Reset hasła konta", {
        preview: "Reset hasła konta Nexus",
        title: "Reset hasła konta",
        paragraphs: [
          "Otrzymaliśmy prośbę o reset hasła do konta. Link jest ważny 30 minut.",
          "Reset hasła konta NIE zmienia hasła głównego sejfu — dane w sejfie odszyfrujesz dalej tym samym hasłem głównym albo kluczem odzyskiwania.",
          "Jeśli to nie Ty, zignoruj tę wiadomość.",
        ],
        action: { href: url, label: "Ustaw nowe hasło konta" },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    async sendVerificationEmail({ user, url }) {
      await sendEmail(user.email, "Potwierdź adres e-mail", {
        preview: "Witaj w Nexusie — potwierdź adres e-mail",
        title: "Witaj w Nexusie!",
        paragraphs: [
          `Cześć ${user.name}, Twoje konto jest gotowe — projekty, zadania i baza klientów czekają.`,
          "Potwierdź swój adres e-mail, aby dokończyć konfigurację konta.",
        ],
        action: { href: url, label: "Potwierdź adres" },
      });
    },
  },
  socialProviders: {
    ...(socialProviders.google ? { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" as const } } : {}),
    ...(socialProviders.microsoft
      ? { microsoft: { clientId: env.MICROSOFT_CLIENT_ID!, clientSecret: env.MICROSOFT_CLIENT_SECRET!, tenantId: env.MICROSOFT_TENANT_ID, prompt: "select_account" as const } }
      : {}),
  },
  account: { accountLinking: { enabled: true, trustedProviders: ["google", "microsoft"] } },
  session: {
    // Krótki czas życia z odświeżaniem (rozdział 6.4).
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 30,
    freshAge: 60 * 10,
    cookieCache: { enabled: false },
    additionalFields: {
      mfaVerified: { type: "boolean", required: false, defaultValue: false, input: false },
      country: { type: "string", required: false, input: false },
    },
  },
  advanced: {
    cookiePrefix: "nexus",
    useSecureCookies: env.APP_URL.startsWith("https://"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: env.APP_URL.startsWith("https://") },
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"] },
    database: { generateId: () => crypto.randomUUID() },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 * limitFactor },
      "/sign-up/email": { window: 3600, max: 10 * limitFactor },
      "/two-factor/verify-totp": { window: 60, max: 10 * limitFactor },
      "/two-factor/verify-backup-code": { window: 60, max: 10 * limitFactor },
      "/request-password-reset": { window: 3600, max: 5 * limitFactor },
      "/passkey/verify-authentication": { window: 60, max: 20 * limitFactor },
    },
    customStorage: {
      async consume(key, rule) {
        const r = await hit(`ba:${key}`, rule.max, rule.window);
        return { allowed: r.allowed, retryAfter: r.allowed ? null : rule.window };
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: "Nexus",
      backupCodeOptions: { amount: 10, length: 10 },
      accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 900 },
      // Konta z logowaniem Google/Microsoft (bez hasła konta) też muszą mieć 2FA.
      allowPasswordless: true,
    }),
    passkey({ rpID: appHost, rpName: "Nexus", origin: env.APP_URL }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        async before(user, ctx) {
          // Konto sprzed migracji (MongoDB) z tym samym adresem: przy logowaniu Google/Microsoft
          // przejmujemy jego identyfikator, żeby zadania i projekty zostały przy tej osobie.
          if (ctx?.path && SOCIAL_CALLBACK.test(ctx.path)) {
            const legacyId = await legacyIdForVerifiedEmail(user.email);
            if (legacyId) return { data: { ...user, id: legacyId } };
            if (!(await canSelfRegister(user.email))) {
              throw new APIError("FORBIDDEN", { code: "INVITE_REQUIRED", message: "Konto założysz z linku w zaproszeniu od administratora." });
            }
          }
          return { data: user };
        },
        async after(user) {
          const role = (user as { role?: string }).role ?? "user";
          await ensureProfile({ id: user.id, email: user.email, name: user.name, image: user.image, role }).catch((error) => logger.error("auth.profile_sync_failed", { error }));
          await ensureOrgMembership(user.id, role).catch((error) => logger.error("auth.org_membership_failed", { error }));
        },
      },
      update: {
        async after(user) {
          await syncProfileFromAuth({ id: user.id, email: user.email, name: user.name, image: user.image }).catch((error) => logger.error("auth.profile_sync_failed", { error }));
        },
      },
    },
    session: {
      create: {
        async before(session, ctx) {
          const meta = ctx?.headers ? metaFromHeaders(ctx.headers) : null;
          return { data: { ...session, mfaVerified: ctx?.path ? MFA_PATHS.has(ctx.path) : false, country: meta?.country ?? null } };
        },
        async after(session, ctx) {
          const meta = ctx?.headers ? metaFromHeaders(ctx.headers) : { ip: null, userAgent: null, country: null };
          await onSessionCreated(session.userId, session.id, ctx?.path ?? null, meta).catch((error) => logger.error("auth.session_hook_failed", { error }));
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Rejestracja na adres konta sprzed migracji przejęłaby jego projekty — takie konto loguje się hasłem.
      if (ctx.path === "/sign-up/email") {
        const email = String((ctx.body as { email?: string })?.email ?? "");
        if (email && (await isLegacyEmail(email))) {
          throw new APIError("UNPROCESSABLE_ENTITY", { code: "USER_ALREADY_EXISTS", message: "Konto z tym adresem już istnieje — zaloguj się." });
        }
        // Jedna organizacja: rejestracja z zaproszenia (lub pierwsze konto nowej instalacji).
        if (!(await canSelfRegister(email))) {
          throw new APIError("FORBIDDEN", { code: "INVITE_REQUIRED", message: "Konto założysz z linku w zaproszeniu od administratora." });
        }
      }
      // Limit prób logowania na konto i adres IP, blokada czasowa, CAPTCHA po kilku próbach.
      if (ctx.path === "/sign-in/email") {
        const email = String((ctx.body as { email?: string })?.email ?? "").toLowerCase();
        // Konto nexusa sprzed migracji (MongoDB + bcrypt) jest przenoszone przy pierwszym logowaniu.
        await migrateLegacyUser(email).catch((error) => logger.error("auth.legacy_migration_failed", { error }));
        const meta = metaFromHeaders(ctx.headers ?? new Headers());
        const state = await loginState(email, meta.ip);
        if (state.locked) {
          throw new APIError("TOO_MANY_REQUESTS", { code: "ACCOUNT_LOCKED", message: "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut." });
        }
        if (state.captchaRequired) {
          const raw = ctx.headers?.get("x-captcha-solution");
          let ok = false;
          try {
            ok = raw ? await verifySolution(env.CAPTCHA_SECRET, JSON.parse(raw) as CaptchaSolution) : false;
            // Rozwiązanie jest jednorazowe.
            if (ok) ok = (await hit(`captcha-used:${JSON.parse(raw!).salt}`, 1, 600)).allowed;
          } catch {
            ok = false;
          }
          if (!ok) throw new APIError("BAD_REQUEST", { code: "CAPTCHA_REQUIRED", message: "Potwierdź, że nie jesteś robotem." });
        }
      }
      // Zmiana hasła konta zawsze unieważnia pozostałe sesje (rozdział 6.4).
      if (ctx.path === "/change-password" && ctx.body && typeof ctx.body === "object") {
        (ctx.body as { revokeOtherSessions?: boolean }).revokeOtherSessions = true;
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const meta = metaFromHeaders(ctx.headers ?? new Headers());
      const returned = ctx.context.returned;
      const failed = returned instanceof APIError;
      if (ctx.path === "/sign-in/email") {
        const email = String((ctx.body as { email?: string })?.email ?? "").toLowerCase();
        if (failed) {
          const code = (returned as APIError).body?.code;
          if (code !== "CAPTCHA_REQUIRED" && code !== "ACCOUNT_LOCKED") await recordLoginFailure(email, meta.ip);
          const [u] = await db.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(eq(schema.user.email, email));
          await recordUserAudit(u?.id ?? null, "auth.login_failed", { method: "password", reason: code ?? "invalid_credentials" }, meta, u?.name);
        } else {
          await clearLoginFailures(email);
          const password = String((ctx.body as { password?: string })?.password ?? "");
          if (password) await upgradeLegacyPasswordHash(email, password).catch((error) => logger.error("auth.password_upgrade_failed", { error }));
        }
      }
      if ((ctx.path === "/two-factor/verify-totp" || ctx.path === "/two-factor/verify-backup-code") && failed) {
        await recordUserAudit(null, "auth.2fa_failed", { method: ctx.path.endsWith("totp") ? "totp" : "backup_code" }, meta);
      }
      if (ctx.path === "/change-password" && !failed && ctx.context.session) {
        await recordUserAudit(ctx.context.session.user.id, "auth.password_changed", {}, meta, ctx.context.session.user.name);
      }
      if (ctx.path === "/reset-password" && !failed) {
        await recordUserAudit(null, "auth.password_reset", {}, meta);
      }
      if (ctx.path === "/two-factor/enable" && !failed && ctx.context.session) {
        await recordUserAudit(ctx.context.session.user.id, "auth.2fa_setup_started", {}, meta, ctx.context.session.user.name);
      }
      if (ctx.path === "/two-factor/disable" && !failed && ctx.context.session) {
        await recordUserAudit(ctx.context.session.user.id, "auth.2fa_disabled", {}, meta, ctx.context.session.user.name);
      }
      if (ctx.path === "/passkey/verify-registration" && !failed && ctx.context.session) {
        await recordUserAudit(ctx.context.session.user.id, "auth.passkey_added", {}, meta, ctx.context.session.user.name);
      }
      if (ctx.path === "/sign-out" && ctx.context.session) {
        await recordUserAudit(ctx.context.session.user.id, "auth.logout", {}, meta, ctx.context.session.user.name);
      }
      if ((ctx.path === "/revoke-session" || ctx.path === "/revoke-other-sessions" || ctx.path === "/revoke-sessions") && !failed && ctx.context.session) {
        await recordUserAudit(ctx.context.session.user.id, "auth.session_revoked", { scope: ctx.path.replace("/", "") }, meta, ctx.context.session.user.name);
      }
    }),
  },
});

/** Logowanie udane: dziennik, e-mail o nowym urządzeniu, alert o nowym kraju. */
async function onSessionCreated(userId: string, sessionId: string, path: string | null, meta: ReturnType<typeof metaFromHeaders>) {
  const [u] = await db
    .select({ name: schema.user.name, email: schema.user.email, twoFactorEnabled: schema.user.twoFactorEnabled })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (!u) return;
  // Przy włączonym 2FA sesja z /sign-in/email jest tymczasowa — prawdziwe logowanie następuje po weryfikacji kodu.
  if (path === "/sign-in/email" && u.twoFactorEnabled) return;
  const method = path?.startsWith("/passkey") ? "passkey" : path?.includes("two-factor") ? "password+2fa" : path?.startsWith("/callback") ? "social" : path?.startsWith("/sign-up") ? "sign_up" : "password";
  await recordUserAudit(userId, "auth.login", { method, device: describeDevice(meta.userAgent) }, meta, u.name);

  const previous = await db
    .select({ userAgent: schema.session.userAgent, ipAddress: schema.session.ipAddress, country: schema.session.country })
    .from(schema.session)
    .where(and(eq(schema.session.userId, userId), ne(schema.session.id, sessionId)))
    .orderBy(desc(schema.session.createdAt))
    .limit(50);
  if (!previous.length || path?.startsWith("/sign-up")) return;

  const device = describeDevice(meta.userAgent);
  const knownDevice = previous.some((p) => describeDevice(p.userAgent) === device);
  if (!knownDevice) {
    await sendEmail(u.email, "Logowanie z nowego urządzenia", {
      preview: "Wykryliśmy logowanie z nowego urządzenia",
      title: "Logowanie z nowego urządzenia",
      paragraphs: ["Na Twoje konto zalogowano się z urządzenia, którego wcześniej nie używałeś(-aś).", "Jeśli to nie Ty, natychmiast zmień hasło konta i wyloguj pozostałe sesje."],
      details: [`Urządzenie: ${device}`, `Adres IP: ${meta.ip ?? "nieznany"}`, `Kraj: ${meta.country ?? "nieznany"}`, `Czas: ${new Date().toLocaleString("pl-PL")}`],
      action: { href: appUrl("/dashboard/settings/security"), label: "Przejrzyj sesje" },
    });
  }
  const knownCountries = new Set(previous.map((p) => p.country).filter(Boolean));
  if (meta.country && knownCountries.size > 0 && !knownCountries.has(meta.country)) {
    const { notifyManagers } = await import("@/lib/dal/notifications");
    const memberships = await db.select({ workspaceId: schema.workspaceMembers.workspaceId }).from(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, userId));
    await recordUserAudit(userId, "alert.new_country", { country: meta.country }, meta, u.name);
    for (const m of memberships) {
      await notifyManagers(m.workspaceId, {
        type: "alert",
        title: `Logowanie z nowego kraju (${meta.country}): ${u.name}`,
        body: "Jeśli to nieoczekiwane, zablokuj dostęp tej osoby i sprawdź dziennik zdarzeń.",
        link: `/dashboard/activity?actor=${encodeURIComponent(userId)}`,
        email: true,
        webhook: true,
      });
    }
  }
}

export type Session = typeof auth.$Infer.Session;
