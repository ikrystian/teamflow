"use server";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  createWorkspace,
  deleteAccount,
  resetUserKeys,
  rewrapMasterPassword,
  setupVault,
  updatePreferences,
  updateProfile,
} from "@/lib/dal/account";
import { recordAudit, recordUserAudit } from "@/lib/dal/audit";
import { ForbiddenError, ValidationError } from "@/lib/dal/errors";
import { getAuthState, setupContext, WORKSPACE_COOKIE } from "@/lib/dal/session";
import { stepUpPasskeyOptions, stepUpPasskeyVerify, stepUpWithMasterKey } from "@/lib/dal/step-up";
import { acceptInvitation } from "@/lib/dal/team";
import { env } from "@/lib/env";
import { provisionOrganization } from "@/lib/identity";
import { requestMeta } from "@/lib/request-meta";
import { hit } from "@/lib/security/rate-limit";
import { b64key, clientEventSchema, masterRewrapSchema, preferencesSchema, vaultSetupSchema, workspaceCreateSchema } from "@/lib/validation";
import { run } from "./_run";

export async function setupVaultAction(input: unknown) {
  return run("account.setupVault", async () => setupVault(await setupContext(), vaultSetupSchema.parse(input)));
}

export async function createWorkspaceAction(input: unknown) {
  return run("account.createWorkspace", async () => {
    const state = await setupContext();
    const res = await createWorkspace(state, workspaceCreateSchema.parse(input));
    (await cookies()).set(WORKSPACE_COOKIE, res.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    // Tryb jednej organizacji: wszyscy użytkownicy Nexusa dołączają do przestrzeni, a klienci
    // z modułu projektów trafiają do CRM (projekty zostają przepięte na nowych klientów).
    if (env.DEPLOYMENT_MODE === "single") {
      const provisioned = await provisionOrganization(res.id, { id: state.user.id, name: state.user.name });
      return { ...res, ...provisioned };
    }
    return res;
  });
}

export async function switchWorkspaceAction(workspaceId: string) {
  return run("account.switchWorkspace", async () => {
    const state = await setupContext();
    if (!state.memberships.some((m) => m.workspaceId === workspaceId)) throw new ForbiddenError();
    (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return null;
  });
}

export async function acceptInvitationAction(token: string) {
  return run("account.acceptInvitation", async () => {
    const state = await setupContext();
    if (!state.hasVault) throw new ValidationError("Najpierw skonfiguruj sejf");
    const res = await acceptInvitation(z.string().min(20).max(200).parse(token), { id: state.user.id, email: state.user.email, name: state.user.name });
    (await cookies()).set(WORKSPACE_COOKIE, res.workspaceId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  });
}

/** Drugi składnik dla sesji z logowania Google/Microsoft (Better Auth wymusza 2FA tylko dla hasła). */
export async function verifySessionTotpAction(code: string) {
  return run("account.verifySessionTotp", async () => {
    const state = await setupContext();
    if (!state.needsMfa) return null;
    if (!(await hit(`session-totp:${state.session.id}`, 5, 15 * 60)).allowed) throw new ForbiddenError("Zbyt wiele prób — zaloguj się ponownie");
    const parsed = z.string().regex(/^\d{6}$|^[A-Za-z0-9-]{8,20}$/).parse(code.trim());
    try {
      if (/^\d{6}$/.test(parsed)) await auth.api.verifyTOTP({ headers: await headers(), body: { code: parsed } });
      else await auth.api.verifyBackupCode({ headers: await headers(), body: { code: parsed } });
    } catch {
      await recordUserAudit(state.user.id, "auth.2fa_failed", { method: "session" }, await requestMeta(), state.user.name);
      throw new ForbiddenError("Nieprawidłowy kod");
    }
    await db.update(schema.session).set({ mfaVerified: true }).where(eq(schema.session.id, state.session.id));
    await recordUserAudit(state.user.id, "auth.login", { method: "social+2fa" }, await requestMeta(), state.user.name);
    return null;
  });
}

export async function rewrapMasterAction(input: unknown, reason: "change" | "recovery") {
  return run("account.rewrapMaster", async () => rewrapMasterPassword(await setupContext(), masterRewrapSchema.parse(input), reason === "recovery" ? "recovery" : "change"));
}

export async function resetKeysAction(input: unknown) {
  return run("account.resetKeys", async () => resetUserKeys(await setupContext(), vaultSetupSchema.parse(input)));
}

export async function updatePreferencesAction(input: unknown) {
  return run("account.preferences", async () => {
    const state = await setupContext();
    await updatePreferences(state.user.id, preferencesSchema.parse(input));
    return null;
  });
}

export async function updateProfileAction(name: string) {
  return run("account.profile", async () => {
    const state = await setupContext();
    await updateProfile(state.user.id, z.string().trim().min(2).max(100).parse(name));
    return null;
  });
}

export async function deleteAccountAction() {
  return run("account.delete", async () => {
    const state = await setupContext();
    await deleteAccount(state);
    (await cookies()).delete(WORKSPACE_COOKIE);
    return null;
  });
}

// --- Step-up --------------------------------------------------------------------------

export async function stepUpMasterAction(authKey: string) {
  return run("stepup.master", async () => {
    const state = await getAuthState();
    await stepUpWithMasterKey(b64key.parse(authKey), currentWorkspace(state));
    return null;
  });
}

export async function stepUpPasskeyOptionsAction() {
  return run("stepup.passkeyOptions", async () => stepUpPasskeyOptions());
}

export async function stepUpPasskeyVerifyAction(response: unknown) {
  return run("stepup.passkeyVerify", async () => {
    const state = await getAuthState();
    await stepUpPasskeyVerify(response as Parameters<typeof stepUpPasskeyVerify>[0], currentWorkspace(state));
    return null;
  });
}

function currentWorkspace(state: Awaited<ReturnType<typeof getAuthState>>) {
  return state?.memberships[0]?.workspaceId ?? null;
}

// --- Zdarzenia zgłaszane przez przeglądarkę ---------------------------------------------------

/**
 * Wyświetlenie i skopiowanie hasła zgłasza przeglądarka (rozdział 4.7) — zapis z użytkownikiem,
 * czasem, IP i urządzeniem. Serwer sprawdza, czy osoba ma dostęp do wpisu.
 */
export async function logClientEventAction(input: unknown) {
  return run("events.client", async () => {
    const e = clientEventSchema.parse(input);
    const state = await getAuthState();
    if (!state) throw new ForbiddenError();
    const jar = await cookies();
    const wsId = jar.get(WORKSPACE_COOKIE)?.value;
    const m = state.memberships.find((x) => x.workspaceId === wsId) ?? state.memberships[0];
    if (!m) return null;
    let clientId: string | null = null;
    if (e.credentialId) {
      const { workspaceContext } = await import("@/lib/dal/session");
      const ctx = await workspaceContext();
      const { withTenant } = await import("@/lib/dal/tenant");
      const { getCredentialAccess } = await import("@/lib/dal/access");
      clientId = await withTenant(ctx.workspaceId, async (tx) => (await getCredentialAccess(tx, ctx, e.credentialId!)).cred.clientId);
    }
    await recordAudit({
      workspaceId: m.workspaceId,
      actorId: state.user.id,
      actorName: state.user.name,
      action: e.action,
      targetType: e.credentialId ? "credential" : "vault",
      targetId: e.credentialId ?? state.user.id,
      clientId,
      metadata: e.metadata ?? {},
    });
    return null;
  });
}

export async function addUnlockKeyAction(input: unknown) {
  return run("account.addUnlockKey", async () => {
    const { addUnlockKey } = await import("@/lib/dal/account");
    const parsed = z
      .object({ credentialId: z.string().min(10).max(500), label: z.string().trim().min(1).max(60), prfSalt: z.string().regex(/^[A-Za-z0-9_-]{43}$/), wrappedPrivateKey: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/) })
      .parse(input);
    await addUnlockKey(await setupContext(), parsed);
    return null;
  });
}

export async function removeUnlockKeyAction(id: string) {
  return run("account.removeUnlockKey", async () => {
    const { removeUnlockKey } = await import("@/lib/dal/account");
    await removeUnlockKey(await setupContext(), z.uuid().parse(id));
    return null;
  });
}

export async function touchUnlockKeyAction(id: string) {
  return run("account.touchUnlockKey", async () => {
    const { touchUnlockKey } = await import("@/lib/dal/account");
    const s = await setupContext();
    await touchUnlockKey(s.user.id, z.uuid().parse(id));
    return null;
  });
}
