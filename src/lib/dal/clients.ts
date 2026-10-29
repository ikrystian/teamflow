import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { schema } from "@/lib/db";
import { canAssignClientMembers, canDeleteClients, canEditClients, seesAllClients } from "@/lib/permissions";
import type { clientSchema, contactSchema, domainSchema } from "@/lib/validation";
import { getClientAccess, requireClientCrmEdit, visibleClientIds } from "./access";
import { recordAudit } from "./audit";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";
import type { WorkspaceContext } from "./session";
import { requireStepUp } from "./step-up";
import { withTenant } from "./tenant";

export type ClientListItem = {
  id: string;
  name: string;
  status: "lead" | "active" | "paused" | "ended";
  website: string | null;
  industry: string | null;
  logo: string | null;
  tags: string[];
  services: string[];
  ownerUserId: string | null;
  ownerName: string | null;
  credentialCount: number;
  weakCount: number;
  oldCount: number;
  rotationCount: number;
  nextDomainExpiry: { name: string; date: string; days: number } | null;
  nextSslExpiry: { name: string; date: string; days: number } | null;
  favorite: boolean;
  archivedAt: string | null;
  updatedAt: string;
};

const daysUntil = (d: string | Date) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

/** Lista klientów z liczbą dostępów i ostrzeżeniami (rozdział 4.3). */
export async function listClients(ctx: WorkspaceContext): Promise<ClientListItem[]> {
  return withTenant(ctx.workspaceId, async (tx) => {
    const visible = await visibleClientIds(tx, ctx);
    if (visible !== "all" && visible.length === 0) return [];
    const where = and(eq(schema.clients.workspaceId, ctx.workspaceId), visible === "all" ? undefined : inArray(schema.clients.id, visible));
    const rows = await tx
      .select({
        id: schema.clients.id,
        name: schema.clients.name,
        status: schema.clients.status,
        website: schema.clients.website,
        industry: schema.clients.industry,
        logo: schema.clients.logo,
        tags: schema.clients.tags,
        services: schema.clients.services,
        ownerUserId: schema.clients.ownerUserId,
        ownerName: schema.user.name,
        archivedAt: schema.clients.archivedAt,
        updatedAt: schema.clients.updatedAt,
      })
      .from(schema.clients)
      .leftJoin(schema.user, eq(schema.user.id, schema.clients.ownerUserId))
      .where(where)
      .orderBy(asc(schema.clients.name));
    const ids = rows.map((r) => r.id);
    if (!ids.length) return [];
    const maxAge = ctx.settings.passwordMaxAgeDays ?? 180;
    const stats = await tx
      .select({
        clientId: schema.credentials.clientId,
        total: count(),
        weak: sql<number>`count(*) filter (where ${schema.credentials.strengthScore} <= 1)`.mapWith(Number),
        old: sql<number>`count(*) filter (where ${schema.credentials.passwordChangedAt} < now() - make_interval(days => ${maxAge}))`.mapWith(Number),
        rotation: sql<number>`count(*) filter (where ${schema.credentials.needsRotation})`.mapWith(Number),
      })
      .from(schema.credentials)
      .where(and(inArray(schema.credentials.clientId, ids), isNull(schema.credentials.deletedAt)))
      .groupBy(schema.credentials.clientId);
    const statMap = new Map(stats.map((s) => [s.clientId, s]));
    const domains = await tx
      .select({ clientId: schema.domains.clientId, name: schema.domains.name, expiresAt: schema.domains.expiresAt, sslExpiresAt: schema.domains.sslExpiresAt })
      .from(schema.domains)
      .where(inArray(schema.domains.clientId, ids));
    const favs = await tx.select({ clientId: schema.favorites.clientId }).from(schema.favorites).where(eq(schema.favorites.userId, ctx.userId));
    const favSet = new Set(favs.map((f) => f.clientId));
    return rows.map((r) => {
      const s = statMap.get(r.id);
      const ds = domains.filter((d) => d.clientId === r.id);
      const nextDomain = ds
        .filter((d) => d.expiresAt)
        .map((d) => ({ name: d.name, date: d.expiresAt!, days: daysUntil(d.expiresAt!) }))
        .sort((a, b) => a.days - b.days)[0];
      const nextSsl = ds
        .filter((d) => d.sslExpiresAt)
        .map((d) => ({ name: d.name, date: d.sslExpiresAt!.toISOString(), days: daysUntil(d.sslExpiresAt!) }))
        .sort((a, b) => a.days - b.days)[0];
      return {
        ...r,
        credentialCount: s?.total ?? 0,
        weakCount: s?.weak ?? 0,
        oldCount: s?.old ?? 0,
        rotationCount: s?.rotation ?? 0,
        nextDomainExpiry: nextDomain ?? null,
        nextSslExpiry: nextSsl ?? null,
        favorite: favSet.has(r.id),
        archivedAt: r.archivedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  });
}

export async function getClient(ctx: WorkspaceContext, clientId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const access = await getClientAccess(tx, ctx, clientId);
    const team = await tx
      .select({ userId: schema.clientMembers.userId, name: schema.user.name, email: schema.user.email, canViewCritical: schema.clientMembers.canViewCritical, role: schema.workspaceMembers.role })
      .from(schema.clientMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.clientMembers.userId))
      .innerJoin(schema.workspaceMembers, and(eq(schema.workspaceMembers.userId, schema.clientMembers.userId), eq(schema.workspaceMembers.workspaceId, ctx.workspaceId)))
      .where(eq(schema.clientMembers.clientId, clientId));
    const [owner] = access.client.ownerUserId
      ? await tx.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, access.client.ownerUserId))
      : [];
    const [fav] = await tx.select({ x: schema.favorites.clientId }).from(schema.favorites).where(and(eq(schema.favorites.userId, ctx.userId), eq(schema.favorites.clientId, clientId)));
    const [{ n: credentialCount }] = await tx.select({ n: count() }).from(schema.credentials).where(and(eq(schema.credentials.clientId, clientId), isNull(schema.credentials.deletedAt)));
    const [{ n: contactCount }] = await tx.select({ n: count() }).from(schema.clientContacts).where(eq(schema.clientContacts.clientId, clientId));
    const [{ n: domainCount }] = await tx.select({ n: count() }).from(schema.domains).where(eq(schema.domains.clientId, clientId));
    const [{ n: pendingRequests }] = await tx
      .select({ n: count() })
      .from(schema.accessRequests)
      .where(and(eq(schema.accessRequests.clientId, clientId), eq(schema.accessRequests.status, "submitted")));
    return {
      ...access.client,
      owner: owner ?? null,
      team,
      favorite: Boolean(fav),
      counts: { credentials: credentialCount, contacts: contactCount, domains: domainCount, pendingRequests },
      permissions: {
        canEdit: access.canEdit,
        canEditCrm: access.canEditCrm,
        canViewCritical: access.canViewCritical,
        canDelete: canDeleteClients(ctx.member),
        canAssign: canAssignClientMembers(ctx.member),
      },
    };
  });
}

export type ClientDetail = Awaited<ReturnType<typeof getClient>>;

/**
 * Tworzy klienta razem z kopią klucza nowego sejfu dla twórcy (klucz wygenerowany w przeglądarce).
 * Pozostałym uprawnionym osobom kopie nadaje przeglądarka (oczekujące nadania kluczy).
 */
export async function createClient(ctx: WorkspaceContext, input: z.infer<typeof clientSchema> & { id: string; vaultGrant: string }) {
  if (!canEditClients(ctx.member)) throw new ForbiddenError();
  return withTenant(ctx.workspaceId, async (tx) => {
    const ownerUserId = input.ownerUserId || ctx.userId;
    await assertMember(tx, ctx, ownerUserId);
    await tx.insert(schema.clients).values({
      id: input.id,
      workspaceId: ctx.workspaceId,
      name: input.name,
      taxId: input.taxId,
      status: input.status,
      website: input.website,
      industry: input.industry,
      address: input.address,
      ownerUserId,
      tags: input.tags,
      services: input.services,
      archivedAt: input.status === "ended" ? new Date() : null,
      endedAt: input.status === "ended" ? new Date() : null,
      createdBy: ctx.userId,
    });
    // Twórca-członek zostaje przypisany do klienta, inaczej nie widziałby go po utworzeniu.
    if (!seesAllClients(ctx.member)) {
      await tx.insert(schema.clientMembers).values({ workspaceId: ctx.workspaceId, clientId: input.id, userId: ctx.userId, assignedBy: ctx.userId });
    }
    await tx.insert(schema.keyGrants).values({
      workspaceId: ctx.workspaceId,
      scopeType: "client",
      scopeId: input.id,
      userId: ctx.userId,
      encryptedKey: input.vaultGrant,
      keyVersion: 1,
      userKeysVersion: ctx.keysVersion,
      grantedBy: ctx.userId,
    });
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "client.create", targetType: "client", targetId: input.id, clientId: input.id, metadata: { name: input.name } }, tx);
    return { id: input.id };
  });
}

async function assertMember(tx: Parameters<Parameters<typeof withTenant>[1]>[0], ctx: WorkspaceContext, userId: string) {
  const [m] = await tx
    .select({ id: schema.workspaceMembers.id })
    .from(schema.workspaceMembers)
    .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, userId)));
  if (!m) throw new ValidationError("Opiekun musi być członkiem przestrzeni");
}

export async function updateClient(ctx: WorkspaceContext, clientId: string, input: z.infer<typeof clientSchema>) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const { client } = await requireClientCrmEdit(tx, ctx, clientId);
    if (input.ownerUserId) await assertMember(tx, ctx, input.ownerUserId);
    const ended = input.status === "ended";
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of ["name", "taxId", "status", "website", "industry", "ownerUserId"] as const) {
      const before = client[key] ?? null;
      const after = (input[key] as unknown) ?? null;
      if (before !== after) changes[key] = { from: before, to: after };
    }
    await tx
      .update(schema.clients)
      .set({
        name: input.name,
        taxId: input.taxId,
        status: input.status,
        website: input.website,
        industry: input.industry,
        address: input.address,
        ownerUserId: input.ownerUserId ?? client.ownerUserId,
        tags: input.tags,
        services: input.services,
        archivedAt: ended ? (client.archivedAt ?? new Date()) : null,
        endedAt: ended ? (client.endedAt ?? new Date()) : null,
      })
      .where(eq(schema.clients.id, clientId));
    await recordAudit(
      {
        workspaceId: ctx.workspaceId,
        actorId: ctx.userId,
        actorName: ctx.userName,
        action: ended && client.status !== "ended" ? "client.archive" : "client.update",
        targetType: "client",
        targetId: clientId,
        clientId,
        metadata: { changes },
      },
      tx,
    );
  });
}

export async function setClientLogo(ctx: WorkspaceContext, clientId: string, logo: string | null) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await requireClientCrmEdit(tx, ctx, clientId);
    await tx.update(schema.clients).set({ logo }).where(eq(schema.clients.id, clientId));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "client.logo", targetType: "client", targetId: clientId, clientId }, tx);
  });
}

export async function updateClientNotes(ctx: WorkspaceContext, clientId: string, notes: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await requireClientCrmEdit(tx, ctx, clientId);
    await tx.update(schema.clients).set({ notes }).where(eq(schema.clients.id, clientId));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "client.notes", targetType: "client", targetId: clientId, clientId, metadata: { length: notes.length } }, tx);
  });
}

/** Usunięcie klienta — nieodwracalne, wymaga ponownego potwierdzenia tożsamości (rozdział 6.4). */
export async function deleteClient(ctx: WorkspaceContext, clientId: string) {
  if (!canDeleteClients(ctx.member)) throw new ForbiddenError();
  await requireStepUp(ctx.sessionId);
  return withTenant(ctx.workspaceId, async (tx) => {
    const { client } = await getClientAccess(tx, ctx, clientId);
    await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.scopeType, "client"), eq(schema.keyGrants.scopeId, clientId)));
    const credIds = (await tx.select({ id: schema.credentials.id }).from(schema.credentials).where(eq(schema.credentials.clientId, clientId))).map((c) => c.id);
    if (credIds.length) {
      await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.scopeType, "credential"), inArray(schema.keyGrants.scopeId, credIds)));
      await tx.delete(schema.reminders).where(and(eq(schema.reminders.targetType, "credential"), inArray(schema.reminders.targetId, credIds)));
    }
    await tx.delete(schema.clients).where(eq(schema.clients.id, clientId));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "client.delete", targetType: "client", targetId: clientId, clientId, metadata: { name: client.name, credentials: credIds.length } }, tx);
  });
  // Projekty klienta (moduł projektów) zostają — tracą tylko powiązanie z klientem.
  const { unlinkClientProjects } = await import("@/lib/crm/projects");
  await unlinkClientProjects(clientId);
}

export async function toggleFavorite(ctx: WorkspaceContext, clientId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await getClientAccess(tx, ctx, clientId);
    const [existing] = await tx.select().from(schema.favorites).where(and(eq(schema.favorites.userId, ctx.userId), eq(schema.favorites.clientId, clientId)));
    if (existing) await tx.delete(schema.favorites).where(and(eq(schema.favorites.userId, ctx.userId), eq(schema.favorites.clientId, clientId)));
    else await tx.insert(schema.favorites).values({ workspaceId: ctx.workspaceId, userId: ctx.userId, clientId });
    return { favorite: !existing };
  });
}

// --- Zespół klienta ----------------------------------------------------------------

export async function setClientTeam(ctx: WorkspaceContext, clientId: string, members: { userId: string; canViewCritical: boolean }[]) {
  if (!canAssignClientMembers(ctx.member)) throw new ForbiddenError();
  return withTenant(ctx.workspaceId, async (tx) => {
    await getClientAccess(tx, ctx, clientId);
    const wsMembers = await tx
      .select({ userId: schema.workspaceMembers.userId, role: schema.workspaceMembers.role })
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId));
    const roleOf = new Map(wsMembers.map((m) => [m.userId, m.role]));
    for (const m of members) if (!roleOf.has(m.userId)) throw new ValidationError("Osoba nie należy do przestrzeni");
    const before = await tx.select().from(schema.clientMembers).where(eq(schema.clientMembers.clientId, clientId));
    const wanted = new Map(members.map((m) => [m.userId, m]));
    const removed = before.filter((b) => !wanted.has(b.userId));
    for (const r of removed) {
      await tx.delete(schema.clientMembers).where(and(eq(schema.clientMembers.clientId, clientId), eq(schema.clientMembers.userId, r.userId)));
      const role = roleOf.get(r.userId);
      // Członek traci kopię klucza sejfu; zarządzający widzą wszystkich klientów i zachowują klucz.
      if (role === "member" || role === "viewer") {
        await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.scopeType, "client"), eq(schema.keyGrants.scopeId, clientId), eq(schema.keyGrants.userId, r.userId)));
      }
      await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "client.unassign", targetType: "user", targetId: r.userId, clientId }, tx);
    }
    for (const m of members) {
      const prev = before.find((b) => b.userId === m.userId);
      // „Tylko odczyt” nigdy nie dostaje wpisów krytycznych.
      const canViewCritical = roleOf.get(m.userId) === "member" ? m.canViewCritical : false;
      if (!prev) {
        await tx.insert(schema.clientMembers).values({ workspaceId: ctx.workspaceId, clientId, userId: m.userId, canViewCritical, assignedBy: ctx.userId });
        await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "client.assign", targetType: "user", targetId: m.userId, clientId, metadata: { canViewCritical } }, tx);
      } else if (prev.canViewCritical !== canViewCritical) {
        await tx.update(schema.clientMembers).set({ canViewCritical }).where(and(eq(schema.clientMembers.clientId, clientId), eq(schema.clientMembers.userId, m.userId)));
        await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: canViewCritical ? "client.grant_critical" : "client.revoke_critical", targetType: "user", targetId: m.userId, clientId }, tx);
      }
    }
    return { removed: removed.map((r) => r.userId) };
  });
}

// --- Kontakty ------------------------------------------------------------------------

export async function listContacts(ctx: WorkspaceContext, clientId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await getClientAccess(tx, ctx, clientId);
    return tx.select().from(schema.clientContacts).where(eq(schema.clientContacts.clientId, clientId)).orderBy(asc(schema.clientContacts.name));
  });
}

export async function saveContact(ctx: WorkspaceContext, clientId: string, contactId: string | null, input: z.infer<typeof contactSchema>) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await requireClientCrmEdit(tx, ctx, clientId);
    let id = contactId;
    if (contactId) {
      const res = await tx
        .update(schema.clientContacts)
        .set(input)
        .where(and(eq(schema.clientContacts.id, contactId), eq(schema.clientContacts.clientId, clientId)))
        .returning({ id: schema.clientContacts.id });
      if (!res.length) throw new NotFoundError();
    } else {
      [{ id }] = await tx.insert(schema.clientContacts).values({ ...input, clientId, workspaceId: ctx.workspaceId }).returning({ id: schema.clientContacts.id });
    }
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: contactId ? "contact.update" : "contact.create", targetType: "contact", targetId: id, clientId, metadata: { name: input.name } }, tx);
    return { id: id! };
  });
}

export async function deleteContact(ctx: WorkspaceContext, clientId: string, contactId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await requireClientCrmEdit(tx, ctx, clientId);
    const res = await tx.delete(schema.clientContacts).where(and(eq(schema.clientContacts.id, contactId), eq(schema.clientContacts.clientId, clientId))).returning({ name: schema.clientContacts.name });
    if (!res.length) throw new NotFoundError();
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "contact.delete", targetType: "contact", targetId: contactId, clientId, metadata: { name: res[0].name } }, tx);
  });
}

// --- Domeny i hosting -------------------------------------------------------------------

export async function listDomains(ctx: WorkspaceContext, clientId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await getClientAccess(tx, ctx, clientId);
    const rows = await tx.select().from(schema.domains).where(eq(schema.domains.clientId, clientId)).orderBy(asc(schema.domains.expiresAt), asc(schema.domains.name));
    return rows.map((d) => ({ ...d, sslExpiresAt: d.sslExpiresAt?.toISOString() ?? null, sslCheckedAt: d.sslCheckedAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() }));
  });
}

export async function saveDomain(ctx: WorkspaceContext, clientId: string, domainId: string | null, input: z.infer<typeof domainSchema>) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await requireClientCrmEdit(tx, ctx, clientId);
    const values = {
      name: input.name,
      registrar: input.registrar,
      expiresAt: input.expiresAt ?? null,
      hosting: input.hosting,
      hostingRenewsAt: input.hostingRenewsAt ?? null,
      autoCheckSsl: input.autoCheckSsl,
      accountOwner: input.accountOwner,
      notes: input.notes,
    };
    let id = domainId;
    if (domainId) {
      const res = await tx.update(schema.domains).set(values).where(and(eq(schema.domains.id, domainId), eq(schema.domains.clientId, clientId))).returning({ id: schema.domains.id });
      if (!res.length) throw new NotFoundError();
    } else {
      [{ id }] = await tx.insert(schema.domains).values({ ...values, clientId, workspaceId: ctx.workspaceId }).returning({ id: schema.domains.id });
    }
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: domainId ? "domain.update" : "domain.create", targetType: "domain", targetId: id, clientId, metadata: { name: input.name } }, tx);
    return { id: id! };
  });
}

export async function deleteDomain(ctx: WorkspaceContext, clientId: string, domainId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await requireClientCrmEdit(tx, ctx, clientId);
    const res = await tx.delete(schema.domains).where(and(eq(schema.domains.id, domainId), eq(schema.domains.clientId, clientId))).returning({ name: schema.domains.name });
    if (!res.length) throw new NotFoundError();
    await tx.delete(schema.reminders).where(and(eq(schema.reminders.targetType, "domain"), eq(schema.reminders.targetId, domainId)));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "domain.delete", targetType: "domain", targetId: domainId, clientId, metadata: { name: res[0].name } }, tx);
  });
}

export async function updateDomainSsl(ctx: WorkspaceContext, clientId: string, domainId: string, ssl: { expiresAt: Date | null; issuer: string | null; error: string | null }) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await getClientAccess(tx, ctx, clientId);
    await tx
      .update(schema.domains)
      .set({ sslExpiresAt: ssl.expiresAt, sslIssuer: ssl.issuer, sslError: ssl.error, sslCheckedAt: new Date() })
      .where(and(eq(schema.domains.id, domainId), eq(schema.domains.clientId, clientId)));
  });
}

export async function getDomain(ctx: WorkspaceContext, clientId: string, domainId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await getClientAccess(tx, ctx, clientId);
    const [d] = await tx.select().from(schema.domains).where(and(eq(schema.domains.id, domainId), eq(schema.domains.clientId, clientId)));
    if (!d) throw new NotFoundError();
    return d;
  });
}

// --- Oś czasu klienta -------------------------------------------------------------------

export async function clientTimeline(ctx: WorkspaceContext, clientId: string, limit = 200) {
  return withTenant(ctx.workspaceId, async (tx) => {
    await getClientAccess(tx, ctx, clientId);
    const own = ctx.member.role === "member" || ctx.member.role === "viewer";
    const rows = await tx
      .select({
        id: schema.auditEvents.id,
        action: schema.auditEvents.action,
        actorName: schema.auditEvents.actorName,
        actorId: schema.auditEvents.actorId,
        targetType: schema.auditEvents.targetType,
        targetId: schema.auditEvents.targetId,
        metadata: schema.auditEvents.metadata,
        createdAt: schema.auditEvents.createdAt,
      })
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.workspaceId, ctx.workspaceId),
          eq(schema.auditEvents.clientId, clientId),
          // Oś czasu pokazuje zmiany; odczyty sekretów widzi tylko zarządzający (dziennik zdarzeń).
          own ? sql`${schema.auditEvents.action} not like 'credential.copy%' and ${schema.auditEvents.action} not like 'credential.reveal%'` : undefined,
        ),
      )
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  });
}

/** Klienci zakończeni dawniej niż N dni (RODO: przypomnienie o usunięciu dostępów). */
export async function endedClientsOlderThan(tx: Parameters<Parameters<typeof withTenant>[1]>[0], workspaceId: string, days: number) {
  return tx
    .select({ id: schema.clients.id, name: schema.clients.name, ownerUserId: schema.clients.ownerUserId, endedAt: schema.clients.endedAt })
    .from(schema.clients)
    .where(and(eq(schema.clients.workspaceId, workspaceId), eq(schema.clients.status, "ended"), lte(schema.clients.endedAt, new Date(Date.now() - days * 86_400_000)), or(isNull(schema.clients.archivedAt), sql`true`)));
}
