import "server-only";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import type { z } from "zod";
import { hashAuthKey } from "@/lib/crypto/master";
import { db, schema } from "@/lib/db";
import type { UserPreferences, WorkspaceSettings } from "@/lib/db/schema";
import { canManageBilling, canManageWorkspaceSettings } from "@/lib/permissions";
import type { masterRewrapSchema, vaultSetupSchema, workspaceCreateSchema, workspaceSettingsSchema } from "@/lib/validation";
import { recordAudit, recordUserAudit } from "./audit";
import { ConflictError, ForbiddenError, StepUpRequiredError, UnauthorizedError, ValidationError } from "./errors";
import { notifyManagers } from "./notifications";
import type { AuthState, WorkspaceContext } from "./session";
import { hasFreshStepUp, requireStepUp } from "./step-up";
import { asSystem, withTenant } from "./tenant";
import { requestMeta } from "@/lib/request-meta";

type State = NonNullable<AuthState>;

export const DEFAULT_WORKSPACE_SETTINGS: Required<Omit<WorkspaceSettings, "slackWebhookUrl" | "teamsWebhookUrl">> = {
  membersCanShareExternally: false,
  auditRetentionMonths: 12,
  archivedClientCleanupDays: 90,
  maxShareHours: 168,
  massCopyThreshold: 20,
  expiryReminderDays: [30, 14, 7, 1],
  passwordMaxAgeDays: 180,
};

export function workspaceSettings(s: WorkspaceSettings) {
  return { ...DEFAULT_WORKSPACE_SETTINGS, ...s };
}

/** Zapis kluczy sejfu przy rejestracji (wyłącznie zaszyfrowane kopie + skrót klucza uwierzytelniającego). */
export async function setupVault(state: State, input: z.infer<typeof vaultSetupSchema>) {
  if (state.needsMfa) throw new UnauthorizedError("Najpierw potwierdź logowanie kodem 2FA");
  if (state.hasVault) throw new ConflictError("Sejf jest już skonfigurowany");
  const masterAuthHash = await hashAuthKey(input.authKey);
  const res = await db
    .update(schema.user)
    .set({
      publicKey: input.publicKey,
      encryptedPrivateKey: input.encryptedPrivateKey,
      recoveryEncryptedPrivateKey: input.recoveryEncryptedPrivateKey,
      kdfSalt: input.kdfSalt,
      kdfParams: input.kdfParams,
      masterAuthHash,
      vaultCreatedAt: new Date(),
    })
    .where(and(eq(schema.user.id, state.user.id)))
    .returning({ id: schema.user.id });
  if (!res.length) throw new UnauthorizedError();
  await recordUserAudit(state.user.id, "vault.setup", {}, await requestMeta(), state.user.name);
}

export async function getKeyBundle(userId: string) {
  const [u] = await db
    .select({
      userId: schema.user.id,
      publicKey: schema.user.publicKey,
      encryptedPrivateKey: schema.user.encryptedPrivateKey,
      recoveryEncryptedPrivateKey: schema.user.recoveryEncryptedPrivateKey,
      kdfSalt: schema.user.kdfSalt,
      kdfParams: schema.user.kdfParams,
      keysVersion: schema.user.keysVersion,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (!u?.publicKey) return null;
  return u as { [K in keyof typeof u]: NonNullable<(typeof u)[K]> };
}

/** Sesja jest „świeża”, jeśli powstała niedawno po pełnym logowaniu z 2FA. */
function isFreshSession(state: State, maxAgeMs = 15 * 60_000) {
  const created = new Date(state.session.createdAt).getTime();
  return !state.needsMfa && Date.now() - created < maxAgeMs;
}

/**
 * Zmiana hasła głównego / ustawienie nowego po odzyskaniu kluczem odzyskiwania.
 * Wymaga step-up (zna stare hasło lub passkey) albo świeżego logowania z 2FA —
 * chroni przed nadpisaniem kluczy przez kogoś z przejętą sesją.
 */
export async function rewrapMasterPassword(state: State, input: z.infer<typeof masterRewrapSchema>, reason: "change" | "recovery") {
  if (!(await hasFreshStepUp(state.session.id)) && !isFreshSession(state)) throw new StepUpRequiredError("Potwierdź tożsamość, aby zmienić hasło główne");
  const masterAuthHash = await hashAuthKey(input.authKey);
  await db
    .update(schema.user)
    .set({
      encryptedPrivateKey: input.encryptedPrivateKey,
      kdfSalt: input.kdfSalt,
      kdfParams: input.kdfParams,
      masterAuthHash,
      ...(input.recoveryEncryptedPrivateKey ? { recoveryEncryptedPrivateKey: input.recoveryEncryptedPrivateKey } : {}),
    })
    .where(eq(schema.user.id, state.user.id));
  await recordUserAudit(state.user.id, reason === "recovery" ? "vault.recovered" : "vault.master_changed", { newRecoveryKey: Boolean(input.recoveryEncryptedPrivateKey) }, await requestMeta(), state.user.name);
}

/**
 * Odzyskiwanie w zespole (rozdział 6.3): użytkownik bez hasła głównego i klucza odzyskiwania
 * tworzy nowe klucze; administrator po weryfikacji tożsamości zatwierdza ponowne nadanie kopii.
 */
export async function resetUserKeys(state: State, input: z.infer<typeof vaultSetupSchema>) {
  if (!isFreshSession(state, 10 * 60_000)) throw new ForbiddenError("Zaloguj się ponownie (hasło konta + 2FA), aby zresetować klucze");
  const masterAuthHash = await hashAuthKey(input.authKey);
  const newVersion = state.user.keysVersion + 1;
  await asSystem(async (tx) => {
    await tx
      .update(schema.user)
      .set({
        publicKey: input.publicKey,
        encryptedPrivateKey: input.encryptedPrivateKey,
        recoveryEncryptedPrivateKey: input.recoveryEncryptedPrivateKey,
        kdfSalt: input.kdfSalt,
        kdfParams: input.kdfParams,
        masterAuthHash,
        keysVersion: newVersion,
      })
      .where(eq(schema.user.id, state.user.id));
    await tx.delete(schema.keyGrants).where(eq(schema.keyGrants.userId, state.user.id));
    await tx.delete(schema.vaultUnlockKeys).where(eq(schema.vaultUnlockKeys.userId, state.user.id));
    // Członkowie zespołu dostaną kopie po zatwierdzeniu przez administratora;
    // właściciel jedynej przestrzeni (freelancer) — nie ma kto ich nadać: dane są nie do odzyskania.
    await tx.update(schema.workspaceMembers).set({ pendingKeyApproval: true }).where(eq(schema.workspaceMembers.userId, state.user.id));
  });
  await recordUserAudit(state.user.id, "vault.keys_reset", { keysVersion: newVersion }, await requestMeta(), state.user.name);
  for (const m of state.memberships) {
    await notifyManagers(m.workspaceId, {
      type: "keys",
      title: `${state.user.name} zresetował(a) klucze sejfu — potwierdź tożsamość i zatwierdź`,
      body: "Przed zatwierdzeniem skontaktuj się z tą osobą innym kanałem (np. telefonicznie) i porównaj odcisk klucza.",
      link: "/dashboard/settings/team",
      email: true,
    });
  }
}

export async function updatePreferences(userId: string, prefs: UserPreferences) {
  const [u] = await db.select({ preferences: schema.user.preferences }).from(schema.user).where(eq(schema.user.id, userId));
  await db
    .update(schema.user)
    .set({ preferences: { ...(u?.preferences ?? {}), ...prefs } })
    .where(eq(schema.user.id, userId));
}

export async function updateProfile(userId: string, name: string) {
  // Nazwa jest też w profilu modułu projektów (MongoDB) — aktualizacja w obu miejscach.
  const { setDisplayName } = await import("@/lib/identity");
  await setDisplayName(userId, name);
}

// --- Przestrzeń ------------------------------------------------------------------------

export async function createWorkspace(state: State, input: z.infer<typeof workspaceCreateSchema>) {
  if (!state.hasVault) throw new UnauthorizedError("Najpierw skonfiguruj sejf");
  const { env } = await import("@/lib/env");
  if (env.DEPLOYMENT_MODE === "single") {
    const [{ n }] = await asSystem((tx) => tx.select({ n: count() }).from(schema.workspaces));
    if (n > 0) throw new ForbiddenError("Ta instancja obsługuje jedną firmę — poproś o zaproszenie");
  }
  await withTenant(input.id, async (tx) => {
    await tx.insert(schema.workspaces).values({
      id: input.id,
      name: input.name,
      intakePublicKey: input.intakePublicKey,
      settings: DEFAULT_WORKSPACE_SETTINGS,
      createdBy: state.user.id,
    });
    await tx.insert(schema.workspaceMembers).values({ workspaceId: input.id, userId: state.user.id, role: "owner" });
    await tx.insert(schema.keyGrants).values({
      workspaceId: input.id,
      scopeType: "intake",
      scopeId: input.id,
      userId: state.user.id,
      encryptedKey: input.intakeGrant,
      keyVersion: 1,
      userKeysVersion: state.user.keysVersion,
      grantedBy: state.user.id,
    });
    await recordAudit({ workspaceId: input.id, actorId: state.user.id, actorName: state.user.name, action: "workspace.create", targetType: "workspace", targetId: input.id, metadata: { name: input.name } }, tx);
  });
  return { id: input.id };
}

export async function updateWorkspaceSettings(ctx: WorkspaceContext, input: z.infer<typeof workspaceSettingsSchema>) {
  if (!canManageWorkspaceSettings(ctx.member)) throw new ForbiddenError("Ustawienia przestrzeni zmienia właściciel");
  const { name, ...settings } = input;
  return withTenant(ctx.workspaceId, async (tx) => {
    await tx
      .update(schema.workspaces)
      .set({ name, settings: { ...ctx.settings, ...settings, slackWebhookUrl: settings.slackWebhookUrl || undefined, teamsWebhookUrl: settings.teamsWebhookUrl || undefined } })
      .where(eq(schema.workspaces.id, ctx.workspaceId));
    await recordAudit(
      {
        workspaceId: ctx.workspaceId,
        actorId: ctx.userId,
        actorName: ctx.userName,
        action: "workspace.settings",
        targetType: "workspace",
        targetId: ctx.workspaceId,
        metadata: { membersCanShareExternally: settings.membersCanShareExternally, auditRetentionMonths: settings.auditRetentionMonths, webhooks: Boolean(settings.slackWebhookUrl || settings.teamsWebhookUrl) },
      },
      tx,
    );
  });
}

export const PLANS = [
  { id: "free", name: "Free", price: "0 zł", limits: "1 osoba, do 25 klientów" },
  { id: "team", name: "Team", price: "39 zł / os. / mies.", limits: "zespół, bez limitu klientów, Slack/Teams" },
  { id: "agency", name: "Agency", price: "wycena indywidualna", limits: "SSO, umowa powierzenia, wsparcie priorytetowe" },
] as const;

/** Płatności: integracja z operatorem płatności jest decyzją do potwierdzenia (rozdział 14). */
export async function changePlan(ctx: WorkspaceContext, plan: string) {
  if (!canManageBilling(ctx.member)) throw new ForbiddenError();
  if (!PLANS.some((p) => p.id === plan)) throw new ValidationError("Nieznany plan");
  return withTenant(ctx.workspaceId, async (tx) => {
    await tx.update(schema.workspaces).set({ plan }).where(eq(schema.workspaces.id, ctx.workspaceId));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "workspace.plan", targetType: "workspace", targetId: ctx.workspaceId, metadata: { plan } }, tx);
  });
}

// --- RODO: eksport i usunięcie danych na żądanie ---------------------------------------------

/** Eksport danych przestrzeni (CRM, zespół, dziennik). Szyfrogramy sejfu eksportuje przeglądarka. */
export async function exportWorkspaceData(ctx: WorkspaceContext) {
  if (ctx.member.role !== "owner") throw new ForbiddenError();
  await requireStepUp(ctx.sessionId);
  return withTenant(ctx.workspaceId, async (tx) => {
    const [workspace] = await tx.select({ id: schema.workspaces.id, name: schema.workspaces.name, plan: schema.workspaces.plan, settings: schema.workspaces.settings, createdAt: schema.workspaces.createdAt }).from(schema.workspaces).where(eq(schema.workspaces.id, ctx.workspaceId));
    const data = {
      exportedAt: new Date().toISOString(),
      workspace,
      members: await tx
        .select({ name: schema.user.name, email: schema.user.email, role: schema.workspaceMembers.role, joinedAt: schema.workspaceMembers.createdAt })
        .from(schema.workspaceMembers)
        .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
        .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId)),
      clients: await tx.select().from(schema.clients).where(eq(schema.clients.workspaceId, ctx.workspaceId)),
      contacts: await tx.select().from(schema.clientContacts).where(eq(schema.clientContacts.workspaceId, ctx.workspaceId)),
      domains: await tx.select().from(schema.domains).where(eq(schema.domains.workspaceId, ctx.workspaceId)),
      auditEvents: await tx.select().from(schema.auditEvents).where(eq(schema.auditEvents.workspaceId, ctx.workspaceId)),
    };
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "export.gdpr", targetType: "workspace", targetId: ctx.workspaceId }, tx);
    return data;
  });
}

export async function deleteWorkspace(ctx: WorkspaceContext, confirmName: string) {
  if (ctx.member.role !== "owner") throw new ForbiddenError();
  await requireStepUp(ctx.sessionId);
  if (confirmName.trim() !== ctx.workspaceName) throw new ValidationError("Nazwa przestrzeni się nie zgadza");
  await asSystem(
    async (tx) => {
      await tx.delete(schema.auditEvents).where(eq(schema.auditEvents.workspaceId, ctx.workspaceId));
      await tx.delete(schema.workspaces).where(eq(schema.workspaces.id, ctx.workspaceId));
    },
    { auditMaintenance: true },
  );
  await recordUserAudit(ctx.userId, "workspace.delete", { name: ctx.workspaceName }, await requestMeta(), ctx.userName);
}

/** Usunięcie konta na żądanie (RODO). Właściciel przestrzeni z innymi członkami musi najpierw przenieść własność. */
export async function deleteAccount(state: State) {
  if (!(await hasFreshStepUp(state.session.id))) throw new StepUpRequiredError("Potwierdź tożsamość, aby usunąć konto");
  const owned = state.memberships.filter((m) => m.role === "owner");
  await asSystem(
    async (tx) => {
      for (const m of owned) {
        const [{ n }] = await tx
          .select({ n: count() })
          .from(schema.workspaceMembers)
          .where(and(eq(schema.workspaceMembers.workspaceId, m.workspaceId), ne(schema.workspaceMembers.userId, state.user.id)));
        if (n > 0) throw new ValidationError(`Przenieś własność przestrzeni „${m.name}” przed usunięciem konta`);
      }
      const ownedIds = owned.map((o) => o.workspaceId);
      if (ownedIds.length) {
        await tx.delete(schema.auditEvents).where(inArray(schema.auditEvents.workspaceId, ownedIds));
        await tx.delete(schema.workspaces).where(inArray(schema.workspaces.id, ownedIds));
      }
      // Wpisy dziennika w innych przestrzeniach zostają (rozliczalność), z zachowaną nazwą aktora.
      await tx.delete(schema.user).where(eq(schema.user.id, state.user.id));
    },
    { auditMaintenance: true },
  );
  // Historia projektów (zadania, komentarze, czas pracy) zostaje — bez danych osobowych.
  const { anonymizeProfile } = await import("@/lib/identity");
  await anonymizeProfile(state.user.id);
}

// --- Odblokowanie passkeyem (WebAuthn PRF, faza kolejna) ---------------------------------------

export async function listUnlockKeys(userId: string) {
  const rows = await db
    .select({ id: schema.vaultUnlockKeys.id, credentialId: schema.vaultUnlockKeys.credentialId, label: schema.vaultUnlockKeys.label, prfSalt: schema.vaultUnlockKeys.prfSalt, wrappedPrivateKey: schema.vaultUnlockKeys.wrappedPrivateKey, keysVersion: schema.vaultUnlockKeys.keysVersion, createdAt: schema.vaultUnlockKeys.createdAt, lastUsedAt: schema.vaultUnlockKeys.lastUsedAt })
    .from(schema.vaultUnlockKeys)
    .where(eq(schema.vaultUnlockKeys.userId, userId));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), lastUsedAt: r.lastUsedAt?.toISOString() ?? null }));
}

export async function addUnlockKey(state: State, input: { credentialId: string; label: string; prfSalt: string; wrappedPrivateKey: string }) {
  if (!(await hasFreshStepUp(state.session.id))) throw new StepUpRequiredError("Potwierdź tożsamość, aby dodać odblokowanie passkeyem");
  await db.insert(schema.vaultUnlockKeys).values({ ...input, userId: state.user.id, keysVersion: state.user.keysVersion });
  await recordUserAudit(state.user.id, "vault.prf_added", { label: input.label }, await requestMeta(), state.user.name);
}

export async function removeUnlockKey(state: State, id: string) {
  await db.delete(schema.vaultUnlockKeys).where(and(eq(schema.vaultUnlockKeys.id, id), eq(schema.vaultUnlockKeys.userId, state.user.id)));
  await recordUserAudit(state.user.id, "vault.prf_removed", {}, await requestMeta(), state.user.name);
}

export async function touchUnlockKey(userId: string, id: string) {
  await db.update(schema.vaultUnlockKeys).set({ lastUsedAt: new Date() }).where(and(eq(schema.vaultUnlockKeys.id, id), eq(schema.vaultUnlockKeys.userId, userId)));
}
