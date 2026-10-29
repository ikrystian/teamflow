import "server-only";
import { and, count, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { Role, WorkspaceSettings } from "@/lib/db/schema";
import type { MemberContext } from "@/lib/permissions";
import { UnauthorizedError } from "./errors";
import { asSystem } from "./tenant";

export const WORKSPACE_COOKIE = "nexus_ws";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type AuthState = Awaited<ReturnType<typeof loadAuthState>>;

const loadAuthState = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const [u] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      image: schema.user.image,
      role: schema.user.role,
      twoFactorEnabled: schema.user.twoFactorEnabled,
      publicKey: schema.user.publicKey,
      keysVersion: schema.user.keysVersion,
      preferences: schema.user.preferences,
    })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id));
  if (!u) return null;
  const [{ n: passkeys }] = await db.select({ n: count() }).from(schema.passkey).where(eq(schema.passkey.userId, u.id));
  const loadMemberships = () => asSystem((tx) =>
    tx
      .select({
        workspaceId: schema.workspaces.id,
        name: schema.workspaces.name,
        plan: schema.workspaces.plan,
        role: schema.workspaceMembers.role,
        status: schema.workspaceMembers.status,
        canExport: schema.workspaceMembers.canExport,
        settings: schema.workspaces.settings,
        intakePublicKey: schema.workspaces.intakePublicKey,
        intakeKeyVersion: schema.workspaces.intakeKeyVersion,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.workspaceMembers.workspaceId))
      .where(and(eq(schema.workspaceMembers.userId, u.id), eq(schema.workspaceMembers.status, "active"))),
  );
  let memberships = await loadMemberships();
  // Tryb jednej organizacji: konto bez przynależności dołącza do przestrzeni firmy (rola wg roli systemowej).
  if (!memberships.length) {
    const { ensureOrgMembership } = await import("@/lib/identity");
    if (await ensureOrgMembership(u.id, u.role)) memberships = await loadMemberships();
  }
  const has2fa = Boolean(u.twoFactorEnabled) || passkeys > 0;
  const sessionMfa = Boolean((session.session as { mfaVerified?: boolean }).mfaVerified);
  return {
    session: session.session,
    user: u,
    has2fa,
    hasTotp: Boolean(u.twoFactorEnabled),
    passkeyCount: passkeys,
    /** Konto ma włączone TOTP, ale ta sesja nie przeszła drugiego składnika (np. logowanie Google). Passkey jest tylko alternatywnym logowaniem. */
    needsMfa: Boolean(u.twoFactorEnabled) && !sessionMfa,
    hasVault: Boolean(u.publicKey),
    memberships,
  };
});

export async function getAuthState() {
  return loadAuthState();
}

/** Ścieżka kolejnego kroku konfiguracji konta albo null, gdy konto jest gotowe. */
export function nextSetupStep(state: NonNullable<AuthState>, next?: string): string | null {
  const q = next && next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : "";
  // 2FA jest opcjonalne — ale jeśli konto ma je włączone, sesja musi przejść drugi składnik.
  if (state.needsMfa) return `/auth/signin/two-factor${q}`;
  if (!state.hasVault) return `/auth/signup/vault${q}`;
  if (!state.memberships.length) return `/auth/signup/workspace${q}`;
  return null;
}

/** Ścieżka bieżącego żądania (ustawiana przez proxy) — do powrotu po konfiguracji lub odblokowaniu. */
export async function currentPath() {
  return (await headers()).get("x-pathname") ?? "/dashboard";
}

/** Strony modułu klientów i sejfu: wymaga sesji i ukończonej konfiguracji (2FA, sejf, przestrzeń). */
export async function requireUser() {
  const state = await getAuthState();
  if (!state) redirect(`/auth/signin?next=${encodeURIComponent(await currentPath())}`);
  const step = nextSetupStep(state, await currentPath());
  if (step) redirect(step);
  return state;
}

export type WorkspaceContext = {
  userId: string;
  userName: string;
  userEmail: string;
  sessionId: string;
  workspaceId: string;
  workspaceName: string;
  plan: string;
  settings: WorkspaceSettings;
  intakePublicKey: string;
  intakeKeyVersion: number;
  member: MemberContext & { role: Role };
  keysVersion: number;
};

async function resolveWorkspace(state: NonNullable<AuthState>): Promise<WorkspaceContext | null> {
  const jar = await cookies();
  const wanted = jar.get(WORKSPACE_COOKIE)?.value;
  const m = state.memberships.find((x) => x.workspaceId === wanted) ?? state.memberships[0];
  if (!m) return null;
  return {
    userId: state.user.id,
    userName: state.user.name,
    userEmail: state.user.email,
    sessionId: state.session.id,
    workspaceId: m.workspaceId,
    workspaceName: m.name,
    plan: m.plan,
    settings: m.settings,
    intakePublicKey: m.intakePublicKey,
    intakeKeyVersion: m.intakeKeyVersion,
    member: { role: m.role, canExport: m.canExport },
    keysVersion: state.user.keysVersion,
  };
}

/** Strony: pełny kontekst przestrzeni albo przekierowanie. */
export const requireWorkspace = cache(async (): Promise<WorkspaceContext> => {
  const state = await requireUser();
  const ctx = await resolveWorkspace(state);
  if (!ctx) redirect("/auth/signup/workspace");
  return ctx;
});

/** Powłoka panelu: kontekst przestrzeni CRM, jeśli osoba do niej należy (bez przekierowań i bez wymogu sejfu). */
export async function optionalWorkspace(state: NonNullable<AuthState>): Promise<WorkspaceContext | null> {
  return resolveWorkspace(state);
}

/** Server Actions i Route Handlers: kontekst przestrzeni albo wyjątek 401 (bez przekierowań). */
export async function workspaceContext(): Promise<WorkspaceContext> {
  const state = await getAuthState();
  if (!state || nextSetupStep(state)) throw new UnauthorizedError();
  const ctx = await resolveWorkspace(state);
  if (!ctx) throw new UnauthorizedError("Brak przestrzeni roboczej");
  return ctx;
}

/** Server Actions w trakcie konfiguracji konta (2FA, sejf, przestrzeń). */
export async function setupContext() {
  const state = await getAuthState();
  if (!state) throw new UnauthorizedError();
  return state;
}
