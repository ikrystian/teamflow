import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import type { Role } from "@/lib/db/schema";
import { appUrl, sendEmail } from "@/lib/email";
import { canAssignRole, canManageMembers, ROLE_LABELS } from "@/lib/permissions";
import { recordAudit } from "./audit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "./errors";
import { notifyUsers } from "./notifications";
import type { WorkspaceContext } from "./session";
import { requireStepUp } from "./step-up";
import { asSystem, withTenant } from "./tenant";

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(b).toString("base64url");
}

export async function listMembers(ctx: WorkspaceContext) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const rows = await tx
      .select({
        userId: schema.workspaceMembers.userId,
        role: schema.workspaceMembers.role,
        status: schema.workspaceMembers.status,
        canExport: schema.workspaceMembers.canExport,
        pendingKeyApproval: schema.workspaceMembers.pendingKeyApproval,
        joinedAt: schema.workspaceMembers.createdAt,
        name: schema.user.name,
        email: schema.user.email,
        publicKey: schema.user.publicKey,
        twoFactorEnabled: schema.user.twoFactorEnabled,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId))
      .orderBy(asc(schema.user.name));
    const assignments = await tx
      .select({ userId: schema.clientMembers.userId, clientId: schema.clientMembers.clientId, canViewCritical: schema.clientMembers.canViewCritical, clientName: schema.clients.name })
      .from(schema.clientMembers)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.clientMembers.clientId))
      .where(eq(schema.clientMembers.workspaceId, ctx.workspaceId));
    return rows.map((r) => ({
      ...r,
      joinedAt: r.joinedAt.toISOString(),
      clients: assignments.filter((a) => a.userId === r.userId).map((a) => ({ id: a.clientId, name: a.clientName, canViewCritical: a.canViewCritical })),
    }));
  });
}

export type MemberRow = Awaited<ReturnType<typeof listMembers>>[number];

export async function listInvitations(ctx: WorkspaceContext) {
  if (!canManageMembers(ctx.member)) return [];
  return withTenant(ctx.workspaceId, async (tx) => {
    const rows = await tx
      .select({ id: schema.invitations.id, email: schema.invitations.email, role: schema.invitations.role, expiresAt: schema.invitations.expiresAt, createdAt: schema.invitations.createdAt, invitedByName: schema.user.name })
      .from(schema.invitations)
      .leftJoin(schema.user, eq(schema.user.id, schema.invitations.invitedBy))
      .where(and(eq(schema.invitations.workspaceId, ctx.workspaceId), isNull(schema.invitations.acceptedAt), isNull(schema.invitations.revokedAt), gt(schema.invitations.expiresAt, new Date())))
      .orderBy(desc(schema.invitations.createdAt));
    return rows.map((r) => ({ ...r, expiresAt: r.expiresAt.toISOString(), createdAt: r.createdAt.toISOString() }));
  });
}

export async function invite(ctx: WorkspaceContext, input: { email: string; role: Role; clientIds: string[] }) {
  if (!canManageMembers(ctx.member) || !canAssignRole(ctx.member.role, null, input.role)) throw new ForbiddenError();
  const token = randomToken();
  await withTenant(ctx.workspaceId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.workspaceMembers.id })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.user.email, input.email)));
    if (existing) throw new ConflictError("Ta osoba już należy do przestrzeni");
    if (input.clientIds.length) {
      const valid = await tx.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.workspaceId, ctx.workspaceId), inArray(schema.clients.id, input.clientIds)));
      if (valid.length !== input.clientIds.length) throw new ValidationError("Nieprawidłowa lista klientów");
    }
    await tx
      .update(schema.invitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.invitations.workspaceId, ctx.workspaceId), eq(schema.invitations.email, input.email), isNull(schema.invitations.acceptedAt), isNull(schema.invitations.revokedAt)));
    await tx.insert(schema.invitations).values({
      workspaceId: ctx.workspaceId,
      email: input.email,
      role: input.role,
      tokenHash: await sha256Hex(token),
      clientIds: input.clientIds,
      invitedBy: ctx.userId,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    });
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "member.invite", targetType: "invitation", targetId: input.email, metadata: { role: input.role, clients: input.clientIds.length } }, tx);
  });
  await sendEmail(input.email, `Zaproszenie do przestrzeni ${ctx.workspaceName}`, {
    preview: `${ctx.userName} zaprasza Cię do Nexusa`,
    title: `Dołącz do przestrzeni „${ctx.workspaceName}”`,
    paragraphs: [
      `${ctx.userName} zaprasza Cię do przestrzeni „${ctx.workspaceName}” w roli: ${ROLE_LABELS[input.role]}.`,
      "Po dołączeniu skonfigurujesz 2FA i własne hasło główne sejfu. Dostęp do klientów nada Ci administrator.",
      "Zaproszenie jest ważne 7 dni.",
    ],
    action: { href: appUrl(`/invite/${token}`), label: "Przyjmij zaproszenie" },
  });
  // Zaproszenie istniejącego użytkownika: powiadomienie w aplikacji.
  const [u] = await asSystem((tx) => tx.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, input.email)));
  if (u) await notifyUsers([u.id], { workspaceId: null, type: "invitation", title: `Zaproszenie do przestrzeni „${ctx.workspaceName}”`, link: `/invite/${token}` });
}

export async function revokeInvitation(ctx: WorkspaceContext, invitationId: string) {
  if (!canManageMembers(ctx.member)) throw new ForbiddenError();
  return withTenant(ctx.workspaceId, async (tx) => {
    const res = await tx
      .update(schema.invitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.invitations.id, invitationId), eq(schema.invitations.workspaceId, ctx.workspaceId)))
      .returning({ email: schema.invitations.email });
    if (!res.length) throw new NotFoundError();
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "member.invite_revoked", targetType: "invitation", targetId: res[0].email }, tx);
  });
}

/** Odczyt zaproszenia po tokenie (strona /invite/[token]). */
export async function findInvitation(token: string) {
  const hash = await sha256Hex(token);
  const [inv] = await asSystem((tx) =>
    tx
      .select({
        id: schema.invitations.id,
        workspaceId: schema.invitations.workspaceId,
        workspaceName: schema.workspaces.name,
        email: schema.invitations.email,
        role: schema.invitations.role,
        clientIds: schema.invitations.clientIds,
        expiresAt: schema.invitations.expiresAt,
        acceptedAt: schema.invitations.acceptedAt,
        revokedAt: schema.invitations.revokedAt,
        invitedByName: schema.user.name,
      })
      .from(schema.invitations)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invitations.workspaceId))
      .leftJoin(schema.user, eq(schema.user.id, schema.invitations.invitedBy))
      .where(eq(schema.invitations.tokenHash, hash)),
  );
  if (!inv || inv.revokedAt || inv.acceptedAt || inv.expiresAt < new Date()) return null;
  return inv;
}

export async function acceptInvitation(token: string, user: { id: string; email: string; name: string }) {
  const inv = await findInvitation(token);
  if (!inv) throw new NotFoundError("Zaproszenie wygasło lub zostało już wykorzystane");
  if (inv.email.toLowerCase() !== user.email.toLowerCase()) throw new ForbiddenError(`Zaproszenie jest dla adresu ${inv.email}. Zaloguj się na to konto.`);
  await withTenant(inv.workspaceId, async (tx) => {
    await tx
      .insert(schema.workspaceMembers)
      .values({ workspaceId: inv.workspaceId, userId: user.id, role: inv.role })
      .onConflictDoNothing();
    for (const clientId of inv.clientIds) {
      await tx.insert(schema.clientMembers).values({ workspaceId: inv.workspaceId, clientId, userId: user.id }).onConflictDoNothing();
    }
    await tx.update(schema.invitations).set({ acceptedAt: new Date() }).where(eq(schema.invitations.id, inv.id));
    await recordAudit({ workspaceId: inv.workspaceId, actorId: user.id, actorName: user.name, action: "member.join", targetType: "user", targetId: user.id, metadata: { role: inv.role } }, tx);
  });
  const managers = await asSystem((tx) =>
    tx
      .select({ userId: schema.workspaceMembers.userId })
      .from(schema.workspaceMembers)
      .where(and(eq(schema.workspaceMembers.workspaceId, inv.workspaceId), inArray(schema.workspaceMembers.role, ["owner", "admin"]))),
  );
  await notifyUsers(
    managers.map((m) => m.userId),
    {
      workspaceId: inv.workspaceId,
      type: "member",
      title: `${user.name} dołączył(a) do przestrzeni`,
      body: "Kopie kluczy sejfów zostaną nadane automatycznie, gdy ktoś z dostępem odblokuje sejf.",
      link: "/dashboard/settings/team",
    },
  );
  return { workspaceId: inv.workspaceId };
}

export async function changeRole(ctx: WorkspaceContext, userId: string, role: Role) {
  await requireStepUp(ctx.sessionId);
  return withTenant(ctx.workspaceId, async (tx) => {
    const [m] = await tx.select().from(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
    if (!m) throw new NotFoundError();
    if (userId === ctx.userId) throw new ValidationError("Nie możesz zmienić własnej roli");
    if (!canAssignRole(ctx.member.role, m.role, role)) throw new ForbiddenError();
    await tx.update(schema.workspaceMembers).set({ role, canExport: role === "admin" ? m.canExport : false }).where(eq(schema.workspaceMembers.id, m.id));
    // Degradacja do członka/odczytu: odbieramy kopie kluczy klientów, do których osoba nie jest przypisana.
    if (role === "member" || role === "viewer") {
      const assigned = (await tx.select({ id: schema.clientMembers.clientId }).from(schema.clientMembers).where(and(eq(schema.clientMembers.workspaceId, ctx.workspaceId), eq(schema.clientMembers.userId, userId)))).map((a) => a.id);
      await tx
        .delete(schema.keyGrants)
        .where(
          and(
            eq(schema.keyGrants.workspaceId, ctx.workspaceId),
            eq(schema.keyGrants.userId, userId),
            eq(schema.keyGrants.scopeType, "client"),
            assigned.length ? sql`${schema.keyGrants.scopeId} not in (${sql.join(assigned.map((a) => sql`${a}`), sql`, `)})` : undefined,
          ),
        );
      if (role === "viewer") {
        await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.workspaceId, ctx.workspaceId), eq(schema.keyGrants.userId, userId), eq(schema.keyGrants.scopeType, "intake")));
        await tx.update(schema.clientMembers).set({ canViewCritical: false }).where(and(eq(schema.clientMembers.workspaceId, ctx.workspaceId), eq(schema.clientMembers.userId, userId)));
      }
    }
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "member.role_change", targetType: "user", targetId: userId, metadata: { from: m.role, to: role } }, tx);
  });
}

export async function setExportPermission(ctx: WorkspaceContext, userId: string, value: boolean) {
  if (ctx.member.role !== "owner") throw new ForbiddenError("Uprawnienie eksportu nadaje właściciel");
  await requireStepUp(ctx.sessionId);
  return withTenant(ctx.workspaceId, async (tx) => {
    const [m] = await tx.select().from(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
    if (!m || m.role !== "admin") throw new ValidationError("Uprawnienie eksportu można nadać tylko administratorowi");
    await tx.update(schema.workspaceMembers).set({ canExport: value }).where(eq(schema.workspaceMembers.id, m.id));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: value ? "member.export_granted" : "member.export_revoked", targetType: "user", targetId: userId }, tx);
  });
}

export async function setMemberSuspended(ctx: WorkspaceContext, userId: string, suspended: boolean) {
  if (!canManageMembers(ctx.member)) throw new ForbiddenError();
  return withTenant(ctx.workspaceId, async (tx) => {
    const [m] = await tx.select().from(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
    if (!m || m.role === "owner" || userId === ctx.userId) throw new ForbiddenError();
    await tx.update(schema.workspaceMembers).set({ status: suspended ? "suspended" : "active" }).where(eq(schema.workspaceMembers.id, m.id));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: suspended ? "member.suspend" : "member.unsuspend", targetType: "user", targetId: userId }, tx);
  });
}

export async function transferOwnership(ctx: WorkspaceContext, userId: string) {
  if (ctx.member.role !== "owner") throw new ForbiddenError();
  await requireStepUp(ctx.sessionId);
  return withTenant(ctx.workspaceId, async (tx) => {
    const [m] = await tx.select().from(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
    if (!m || m.status !== "active") throw new NotFoundError();
    await tx.update(schema.workspaceMembers).set({ role: "owner", canExport: false }).where(eq(schema.workspaceMembers.id, m.id));
    await tx.update(schema.workspaceMembers).set({ role: "admin", canExport: true }).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, ctx.userId)));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "workspace.ownership_transfer", targetType: "user", targetId: userId }, tx);
  });
}

/** Zatwierdzenie osoby po resecie kluczy — dopiero wtedy przeglądarki zespołu nadadzą jej kopie. */
export async function approveKeys(ctx: WorkspaceContext, userId: string) {
  if (!canManageMembers(ctx.member)) throw new ForbiddenError();
  await requireStepUp(ctx.sessionId);
  return withTenant(ctx.workspaceId, async (tx) => {
    await tx.update(schema.workspaceMembers).set({ pendingKeyApproval: false }).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "member.keys_approved", targetType: "user", targetId: userId }, tx);
  });
}

// --- Offboarding (rozdział 4.2) --------------------------------------------------------

export type OffboardingReport = {
  userId: string;
  name: string;
  clients: { id: string; name: string }[];
  accessed: { credentialId: string; clientId: string; clientName: string; actions: string[]; lastAt: string; ownerUserId: string | null }[];
};

/** Dostępy, które osoba wyświetlała lub kopiowała — kandydaci do zmiany hasła. */
export async function offboardingReport(ctx: WorkspaceContext, userId: string): Promise<OffboardingReport> {
  if (!canManageMembers(ctx.member)) throw new ForbiddenError();
  return withTenant(ctx.workspaceId, async (tx) => {
    const [m] = await tx
      .select({ name: schema.user.name, role: schema.workspaceMembers.role })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
    if (!m) throw new NotFoundError();
    const events = await tx
      .select({ targetId: schema.auditEvents.targetId, action: schema.auditEvents.action, createdAt: schema.auditEvents.createdAt })
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.workspaceId, ctx.workspaceId),
          eq(schema.auditEvents.actorId, userId),
          eq(schema.auditEvents.targetType, "credential"),
          inArray(schema.auditEvents.action, [
            "credential.reveal_password",
            "credential.copy_password",
            "credential.copy_totp",
            "credential.reveal_totp",
            "credential.reveal_field",
            "credential.copy_field",
            "credential.reveal_critical",
            "credential.create",
            "credential.update",
            "attachment.download",
          ]),
        ),
      );
    const byCred = new Map<string, { actions: Set<string>; lastAt: Date }>();
    for (const e of events) {
      if (!e.targetId) continue;
      const cur = byCred.get(e.targetId) ?? { actions: new Set<string>(), lastAt: e.createdAt };
      cur.actions.add(e.action);
      if (e.createdAt > cur.lastAt) cur.lastAt = e.createdAt;
      byCred.set(e.targetId, cur);
    }
    const ids = [...byCred.keys()];
    const creds = ids.length
      ? await tx
          .select({ id: schema.credentials.id, clientId: schema.credentials.clientId, clientName: schema.clients.name, ownerUserId: schema.clients.ownerUserId })
          .from(schema.credentials)
          .innerJoin(schema.clients, eq(schema.clients.id, schema.credentials.clientId))
          .where(and(inArray(schema.credentials.id, ids), isNull(schema.credentials.deletedAt)))
      : [];
    const clients =
      m.role === "owner" || m.role === "admin"
        ? await tx.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).where(eq(schema.clients.workspaceId, ctx.workspaceId))
        : await tx
            .select({ id: schema.clients.id, name: schema.clients.name })
            .from(schema.clientMembers)
            .innerJoin(schema.clients, eq(schema.clients.id, schema.clientMembers.clientId))
            .where(and(eq(schema.clientMembers.workspaceId, ctx.workspaceId), eq(schema.clientMembers.userId, userId)));
    return {
      userId,
      name: m.name,
      clients,
      accessed: creds.map((c) => ({
        credentialId: c.id,
        clientId: c.clientId,
        clientName: c.clientName,
        ownerUserId: c.ownerUserId,
        actions: [...byCred.get(c.id)!.actions],
        lastAt: byCred.get(c.id)!.lastAt.toISOString(),
      })),
    };
  });
}

/**
 * Usunięcie osoby: odebranie przynależności, przypisań i kopii kluczy, oznaczenie sejfów
 * do rotacji klucza oraz utworzenie zadań „zmień hasło” przypisanych do konkretnych osób.
 */
export async function removeMember(ctx: WorkspaceContext, userId: string, tasks: { credentialId: string; assigneeUserId: string }[]) {
  if (!canManageMembers(ctx.member)) throw new ForbiddenError();
  await requireStepUp(ctx.sessionId);
  const report = await offboardingReport(ctx, userId);
  const result = await withTenant(ctx.workspaceId, async (tx) => {
    const [m] = await tx.select().from(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
    if (!m) throw new NotFoundError();
    if (m.role === "owner") throw new ForbiddenError("Najpierw przenieś własność przestrzeni");
    if (userId === ctx.userId) throw new ValidationError("Nie możesz usunąć siebie — opuść przestrzeń w ustawieniach");
    if (ctx.member.role === "admin" && m.role === "admin") {
      // administrator może usuwać innych administratorów — zgodnie z prawem nadawania ról
    }
    await tx.delete(schema.workspaceMembers).where(eq(schema.workspaceMembers.id, m.id));
    await tx.delete(schema.clientMembers).where(and(eq(schema.clientMembers.workspaceId, ctx.workspaceId), eq(schema.clientMembers.userId, userId)));
    await tx.delete(schema.credentialAccess).where(and(eq(schema.credentialAccess.workspaceId, ctx.workspaceId), eq(schema.credentialAccess.userId, userId)));
    await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.workspaceId, ctx.workspaceId), eq(schema.keyGrants.userId, userId)));
    await tx.delete(schema.favorites).where(and(eq(schema.favorites.workspaceId, ctx.workspaceId), eq(schema.favorites.userId, userId)));
    await tx.update(schema.reminders).set({ assigneeUserId: null }).where(and(eq(schema.reminders.workspaceId, ctx.workspaceId), eq(schema.reminders.assigneeUserId, userId)));
    const clientIds = report.clients.map((c) => c.id);
    if (clientIds.length) await tx.update(schema.clients).set({ rotationRequired: true }).where(inArray(schema.clients.id, clientIds));
    if (m.role !== "viewer") await tx.update(schema.workspaces).set({ intakeRotationRequired: true }).where(eq(schema.workspaces.id, ctx.workspaceId));
    const accessedIds = new Set(report.accessed.map((a) => a.credentialId));
    for (const t of tasks) {
      if (!accessedIds.has(t.credentialId)) continue;
      const cred = report.accessed.find((a) => a.credentialId === t.credentialId)!;
      await tx.update(schema.credentials).set({ needsRotation: true }).where(eq(schema.credentials.id, t.credentialId));
      await tx
        .insert(schema.reminders)
        .values({
          workspaceId: ctx.workspaceId,
          kind: "password_rotate",
          targetType: "credential",
          targetId: t.credentialId,
          clientId: cred.clientId,
          assigneeUserId: t.assigneeUserId,
          title: `Zmień hasło po odejściu: ${report.name} (${cred.clientName})`,
          dueAt: new Date(Date.now() + 3 * 86_400_000),
          dedupeKey: `password_rotate:${t.credentialId}:offboarding:${userId}`,
        })
        .onConflictDoNothing();
    }
    await recordAudit(
      { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "member.remove", targetType: "user", targetId: userId, metadata: { name: report.name, accessed: report.accessed.length, tasks: tasks.length, clients: clientIds.length } },
      tx,
    );
    return { rotateClientIds: clientIds };
  });
  // Unieważnienie sesji w tej przestrzeni nie jest potrzebne — przynależność została usunięta,
  // a każda operacja sprawdza ją w DAL. Powiadamiamy osoby z zadaniami.
  const byAssignee = new Map<string, number>();
  for (const t of tasks) byAssignee.set(t.assigneeUserId, (byAssignee.get(t.assigneeUserId) ?? 0) + 1);
  for (const [assignee, n] of byAssignee) {
    await notifyUsers([assignee], {
      workspaceId: ctx.workspaceId,
      type: "task",
      title: `Masz ${n} ${n === 1 ? "hasło" : "haseł"} do zmiany po odejściu: ${report.name}`,
      link: "/dashboard/security?tab=tasks",
      email: true,
    });
  }
  return result;
}

export async function leaveWorkspace(ctx: WorkspaceContext) {
  if (ctx.member.role === "owner") throw new ForbiddenError("Właściciel musi najpierw przenieść własność");
  return withTenant(ctx.workspaceId, async (tx) => {
    await tx.delete(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, ctx.userId)));
    await tx.delete(schema.clientMembers).where(and(eq(schema.clientMembers.workspaceId, ctx.workspaceId), eq(schema.clientMembers.userId, ctx.userId)));
    await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.workspaceId, ctx.workspaceId), eq(schema.keyGrants.userId, ctx.userId)));
    await tx.delete(schema.credentialAccess).where(and(eq(schema.credentialAccess.workspaceId, ctx.workspaceId), eq(schema.credentialAccess.userId, ctx.userId)));
    await tx.update(schema.clients).set({ rotationRequired: true }).where(eq(schema.clients.workspaceId, ctx.workspaceId));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "member.leave", targetType: "user", targetId: ctx.userId }, tx);
  });
}

// --- Udostępnienie pojedynczego wpisu w zespole --------------------------------------------

export async function shareCredentialInTeam(ctx: WorkspaceContext, credentialId: string, userId: string, encryptedKey: string, userKeysVersion: number) {
  const { getCredentialAccess } = await import("./access");
  return withTenant(ctx.workspaceId, async (tx) => {
    const { cred, access } = await getCredentialAccess(tx, ctx, credentialId);
    if (!access?.canEdit) throw new ForbiddenError();
    const [member] = await tx
      .select({ role: schema.workspaceMembers.role, keysVersion: schema.user.keysVersion, name: schema.user.name })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId), eq(schema.workspaceMembers.status, "active")));
    if (!member) throw new NotFoundError("Osoba nie należy do przestrzeni");
    if (member.keysVersion !== userKeysVersion) throw new ConflictError("Klucze tej osoby zmieniły się — odśwież", "STALE_USER_KEYS");
    if (cred.sensitivity === "critical" && member.role === "viewer") throw new ForbiddenError("Wpisu krytycznego nie można udostępnić osobie „tylko odczyt”");
    await tx.insert(schema.credentialAccess).values({ workspaceId: ctx.workspaceId, credentialId, userId, grantedBy: ctx.userId }).onConflictDoNothing();
    await tx
      .insert(schema.keyGrants)
      .values({ workspaceId: ctx.workspaceId, scopeType: "credential", scopeId: credentialId, userId, encryptedKey, keyVersion: 1, userKeysVersion, grantedBy: ctx.userId })
      .onConflictDoUpdate({
        target: [schema.keyGrants.scopeType, schema.keyGrants.scopeId, schema.keyGrants.userId, schema.keyGrants.keyVersion],
        set: { encryptedKey, userKeysVersion, grantedBy: ctx.userId },
      });
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "share.team", targetType: "credential", targetId: credentialId, clientId: cred.clientId, metadata: { recipient: userId, recipientName: member.name } }, tx);
    return { recipientName: member.name };
  }).then(async (r) => {
    await notifyUsers([userId], { workspaceId: ctx.workspaceId, type: "share", title: `${ctx.userName} udostępnił(a) Ci dostęp`, link: "/dashboard/vault?filter=shared" });
    return r;
  });
}

export async function unshareCredentialInTeam(ctx: WorkspaceContext, credentialId: string, userId: string) {
  const { getCredentialAccess } = await import("./access");
  return withTenant(ctx.workspaceId, async (tx) => {
    const { cred, access } = await getCredentialAccess(tx, ctx, credentialId);
    if (!access?.canEdit) throw new ForbiddenError();
    await tx.delete(schema.credentialAccess).where(and(eq(schema.credentialAccess.credentialId, credentialId), eq(schema.credentialAccess.userId, userId)));
    await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.scopeType, "credential"), eq(schema.keyGrants.scopeId, credentialId), eq(schema.keyGrants.userId, userId)));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "share.team_revoke", targetType: "credential", targetId: credentialId, clientId: cred.clientId, metadata: { recipient: userId } }, tx);
  });
}

export async function credentialTeamShares(ctx: WorkspaceContext, credentialId: string) {
  const { getCredentialAccess } = await import("./access");
  return withTenant(ctx.workspaceId, async (tx) => {
    const { access } = await getCredentialAccess(tx, ctx, credentialId);
    if (!access) return [];
    return tx
      .select({ userId: schema.credentialAccess.userId, name: schema.user.name, email: schema.user.email, createdAt: schema.credentialAccess.createdAt })
      .from(schema.credentialAccess)
      .innerJoin(schema.user, eq(schema.user.id, schema.credentialAccess.userId))
      .where(eq(schema.credentialAccess.credentialId, credentialId));
  });
}

/** Klucze publiczne członków przestrzeni (do udostępnienia wpisu i weryfikacji odcisków). */
export async function memberPublicKeys(ctx: WorkspaceContext) {
  return withTenant(ctx.workspaceId, async (tx) =>
    tx
      .select({ userId: schema.user.id, name: schema.user.name, email: schema.user.email, publicKey: schema.user.publicKey, keysVersion: schema.user.keysVersion, role: schema.workspaceMembers.role })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.status, "active"))),
  );
}
