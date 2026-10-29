import "server-only";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, asc, count, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Role } from "@/lib/db/schema";
import { recordAudit } from "@/lib/dal/audit";
import { asSystem } from "@/lib/dal/tenant";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, ROLE_ADMIN, ROLE_MANAGER, ROLE_USER } from "@/lib/roles";

/**
 * Most tożsamości między modułami:
 * - PostgreSQL (`user`, `account`, `session` — Better Auth) jest źródłem prawdy o kontach,
 *   hasłach, 2FA, passkeyach i roli systemowej,
 * - MongoDB (`User`) przechowuje profil używany przez moduł projektów (zadania, komentarze,
 *   czas pracy) — z tym samym `id`, więc relacje projektów działają bez zmian.
 */

export type SystemRole = typeof ROLE_USER | typeof ROLE_MANAGER | typeof ROLE_ADMIN;

type AuthUser = { id: string; email: string; name: string; image?: string | null; role?: string | null };

// --- Hasła: Better Auth (scrypt) + zgodność ze skrótami bcrypt sprzed migracji ---------------

const isBcrypt = (hash: string) => /^\$2[aby]\$/.test(hash);

export function hashAccountPassword(password: string) {
  return hashPassword(password);
}

export async function verifyAccountPassword({ hash, password }: { hash: string; password: string }) {
  return isBcrypt(hash) ? bcrypt.compare(password, hash) : verifyPassword({ hash, password });
}

/** Po udanym logowaniu przepisuje skrót bcrypt na scrypt (przejrzysta migracja haseł). */
export async function upgradeLegacyPasswordHash(email: string, password: string) {
  const [row] = await db
    .select({ accountId: schema.account.id, hash: schema.account.password })
    .from(schema.account)
    .innerJoin(schema.user, eq(schema.user.id, schema.account.userId))
    .where(and(eq(schema.user.email, email.toLowerCase()), eq(schema.account.providerId, "credential")));
  if (!row?.hash || !isBcrypt(row.hash)) return;
  await db.update(schema.account).set({ password: await hashPassword(password) }).where(eq(schema.account.id, row.accountId));
}

// --- Profil w module projektów ------------------------------------------------------------------

/** Tworzy lub aktualizuje profil w MongoDB dla konta z PostgreSQL (to samo `id`). */
export async function ensureProfile(u: AuthUser) {
  const existing = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true } });
  if (existing) {
    await prisma.user.update({ where: { id: u.id }, data: { email: u.email, name: u.name } });
    return;
  }
  // Pola opcjonalne zapisujemy jawnie jako null — filtry `pole: null` w Mongo nie pasują do braku pola.
  await prisma.user.create({
    data: {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.image ?? null,
      role: u.role ?? ROLE_USER,
      password: null,
      phone: null,
      location: null,
      bio: null,
      jobTitle: null,
      company: null,
      website: null,
    },
  });
}

/** Synchronizacja nazwy, adresu e-mail i awatara po zmianie konta w Better Auth. */
export async function syncProfileFromAuth(u: AuthUser) {
  await prisma.user.updateMany({ where: { id: u.id }, data: { email: u.email, name: u.name, ...(u.image !== undefined ? { avatarUrl: u.image } : {}) } });
}

export async function setDisplayName(userId: string, name: string) {
  await db.update(schema.user).set({ name }).where(eq(schema.user.id, userId));
  await prisma.user.updateMany({ where: { id: userId }, data: { name } });
}

export async function setAvatar(userId: string, url: string | null) {
  await db.update(schema.user).set({ image: url }).where(eq(schema.user.id, userId));
  await prisma.user.updateMany({ where: { id: userId }, data: { avatarUrl: url } });
}

export async function setEmail(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const [taken] = await db.select({ id: schema.user.id }).from(schema.user).where(and(eq(schema.user.email, normalized), ne(schema.user.id, userId)));
  if (taken) throw new Error("EMAIL_TAKEN");
  await db.update(schema.user).set({ email: normalized }).where(eq(schema.user.id, userId));
  await prisma.user.updateMany({ where: { id: userId }, data: { email: normalized } });
}

export async function setSystemRole(userId: string, role: SystemRole) {
  await db.update(schema.user).set({ role }).where(eq(schema.user.id, userId));
  await prisma.user.updateMany({ where: { id: userId }, data: { role } });
  // Administrator systemu zarządza też przestrzenią CRM (bez odbierania roli właściciela).
  const org = await orgWorkspaceId();
  if (org && role === ROLE_ADMIN) {
    await asSystem((tx) =>
      tx
        .update(schema.workspaceMembers)
        .set({ role: "admin" })
        .where(and(eq(schema.workspaceMembers.workspaceId, org), eq(schema.workspaceMembers.userId, userId), inArray(schema.workspaceMembers.role, ["member", "viewer"]))),
    );
  }
}

/** Ustawienie hasła przez administratora: skrót scrypt i unieważnienie sesji tej osoby. */
export async function setPasswordByAdmin(userId: string, password: string) {
  const hash = await hashPassword(password);
  const [acc] = await db.select({ id: schema.account.id }).from(schema.account).where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential")));
  if (acc) await db.update(schema.account).set({ password: hash }).where(eq(schema.account.id, acc.id));
  else await db.insert(schema.account).values({ id: randomUUID(), accountId: userId, providerId: "credential", userId, password: hash });
  await db.delete(schema.session).where(eq(schema.session.userId, userId));
}

// --- Migracja kont sprzed scalenia (MongoDB + bcrypt) ------------------------------------------

/** Konto nexusa zapisane tylko w MongoDB (sprzed migracji na Better Auth). */
async function legacyUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true, email: true, name: true, password: true, avatarUrl: true, role: true, createdAt: true },
  });
}

/**
 * Przenosi konto z MongoDB do Better Auth przy pierwszym logowaniu: ten sam identyfikator,
 * skrót bcrypt trafia do tabeli `account` (weryfikowany przez `verifyAccountPassword`).
 */
export async function migrateLegacyUser(email: string): Promise<"exists" | "migrated" | "none"> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "none";
  const [existing] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, normalized));
  if (existing) return "exists";
  const legacy = await legacyUserByEmail(normalized);
  if (!legacy) return "none";
  const [byId] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, legacy.id));
  if (byId) return "exists";
  await db.transaction(async (tx) => {
    await tx.insert(schema.user).values({
      id: legacy.id,
      email: normalized,
      name: legacy.name?.trim() || normalized.split("@")[0],
      emailVerified: true,
      image: legacy.avatarUrl,
      role: legacy.role || ROLE_USER,
      createdAt: legacy.createdAt,
    });
    if (legacy.password) {
      await tx.insert(schema.account).values({ id: randomUUID(), accountId: legacy.id, providerId: "credential", userId: legacy.id, password: legacy.password });
    }
  });
  if (legacy.email !== normalized) await prisma.user.update({ where: { id: legacy.id }, data: { email: normalized } });
  logger.info("identity.legacy_user_migrated", { userId: legacy.id });
  await ensureOrgMembership(legacy.id, legacy.role || ROLE_USER).catch((error) => logger.error("identity.org_membership_failed", { error }));
  return "migrated";
}

/** Czy adres należy do konta sprzed migracji (blokuje rejestrację „na cudzy” adres). */
export async function isLegacyEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const [existing] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, normalized));
  if (existing) return false;
  return Boolean(await legacyUserByEmail(normalized));
}

/** Identyfikator konta sprzed migracji o danym adresie (logowanie Google/Microsoft — adres zweryfikowany). */
export async function legacyIdForVerifiedEmail(email: string) {
  return (await legacyUserByEmail(email))?.id ?? null;
}

// --- Organizacja (jedna przestrzeń CRM w trybie single) ----------------------------------------

export async function orgWorkspaceId(): Promise<string | null> {
  const { env } = await import("@/lib/env");
  if (env.DEPLOYMENT_MODE !== "single") return null;
  const [ws] = await asSystem((tx) => tx.select({ id: schema.workspaces.id }).from(schema.workspaces).orderBy(asc(schema.workspaces.createdAt)).limit(1));
  return ws?.id ?? null;
}

/** Rola w przestrzeni CRM wynikająca z roli systemowej (manager = osoba z zewnątrz → bez dostępu). */
export function workspaceRoleFor(systemRole: string | null | undefined, email?: string | null): Role | null {
  if (isSystemAdmin(systemRole, email)) return "admin";
  if (systemRole === ROLE_MANAGER) return null;
  return "member";
}

/** Dodaje konto do przestrzeni organizacji (tryb single). Członek domyślnie nie widzi żadnego klienta. */
export async function ensureOrgMembership(userId: string, systemRole: string | null | undefined, workspaceId?: string) {
  const org = workspaceId ?? (await orgWorkspaceId());
  if (!org) return false;
  const [u] = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, userId));
  const role = workspaceRoleFor(systemRole, u?.email);
  if (!u || !role) return false;
  // Oczekujące zaproszenie określa rolę i przypisanych klientów — wtedy dołączenie następuje przy jego przyjęciu.
  if (await hasPendingInvitation(u.email, org)) return false;
  const inserted = await asSystem((tx) =>
    tx.insert(schema.workspaceMembers).values({ workspaceId: org, userId, role }).onConflictDoNothing().returning({ id: schema.workspaceMembers.id }),
  );
  return inserted.length > 0;
}

async function hasPendingInvitation(email: string, workspaceId?: string) {
  const [inv] = await asSystem((tx) =>
    tx
      .select({ id: schema.invitations.id })
      .from(schema.invitations)
      .where(
        and(
          sql`lower(${schema.invitations.email}) = ${email.trim().toLowerCase()}`,
          isNull(schema.invitations.acceptedAt),
          isNull(schema.invitations.revokedAt),
          gt(schema.invitations.expiresAt, new Date()),
          workspaceId ? eq(schema.invitations.workspaceId, workspaceId) : undefined,
        ),
      )
      .limit(1),
  );
  return Boolean(inv);
}

/**
 * Samodzielna rejestracja. W trybie jednej organizacji konto zakłada się z zaproszenia;
 * wyjątkiem jest pierwsze konto nowej instalacji (bez kont w obu bazach).
 */
export async function canSelfRegister(email: string) {
  const { env } = await import("@/lib/env");
  if (env.DEPLOYMENT_MODE !== "single") return true;
  if (email && (await hasPendingInvitation(email))) return true;
  return isFreshInstallation();
}

export async function isFreshInstallation() {
  const [{ n }] = await db.select({ n: count() }).from(schema.user);
  return n === 0 && (await prisma.user.count()) === 0;
}

/**
 * Po utworzeniu przestrzeni organizacji: członkostwo wszystkich kont oraz import klientów
 * z modułu projektów (MongoDB) do CRM. Operacja jest idempotentna.
 */
export async function provisionOrganization(workspaceId: string, actor: { id: string; name: string }) {
  await migrateAllLegacyUsers();
  const users = await db.select({ id: schema.user.id, role: schema.user.role }).from(schema.user);
  let members = 0;
  for (const u of users) if (u.id !== actor.id && (await ensureOrgMembership(u.id, u.role, workspaceId))) members++;
  const clients = await importLegacyClients(workspaceId, actor);
  return { members, ...clients };
}

/** Wszystkie konta z MongoDB → Better Auth (bez czekania na pierwsze logowanie). */
export async function migrateAllLegacyUsers() {
  const legacy = await prisma.user.findMany({ select: { email: true } });
  let migrated = 0;
  for (const u of legacy) if ((await migrateLegacyUser(u.email)) === "migrated") migrated++;
  return migrated;
}

type LegacyClientDoc = {
  _id: string | { $oid: string };
  name?: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  createdById?: string | null;
};

const legacyId = (id: LegacyClientDoc["_id"]) => (typeof id === "string" ? id : id.$oid);
const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** Klienci zapisani w kolekcji `Client` (MongoDB) przed scaleniem — tylko do importu. */
export async function legacyClients(): Promise<LegacyClientDoc[]> {
  const res = (await prisma.$runCommandRaw({ find: "Client", filter: {}, batchSize: 100_000 })) as { cursor?: { firstBatch?: LegacyClientDoc[] } };
  return res.cursor?.firstBatch ?? [];
}

/**
 * Import klientów z modułu projektów do CRM. Klienci dostają nowy UUID, a projekty są
 * przepinane na nowy identyfikator. Klucz sejfu takiego klienta nie istnieje — zostaje
 * zainicjalizowany w przeglądarce właściciela lub administratora (`rotationRequired`).
 */
export async function importLegacyClients(workspaceId: string, actor: { id: string; name: string }) {
  const docs = await legacyClients();
  if (!docs.length) return { imported: 0, relinkedProjects: 0 };
  const memberIds = new Set(
    (await asSystem((tx) => tx.select({ userId: schema.workspaceMembers.userId }).from(schema.workspaceMembers).where(eq(schema.workspaceMembers.workspaceId, workspaceId)))).map((m) => m.userId),
  );
  let imported = 0;
  let relinkedProjects = 0;
  for (const doc of docs) {
    const ref = legacyId(doc._id);
    const clientId = await asSystem(async (tx) => {
      const [done] = await tx.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.workspaceId, workspaceId), eq(schema.clients.externalRef, ref)));
      if (done) return done.id;
      const id = randomUUID();
      const owner = doc.createdById && memberIds.has(doc.createdById) ? doc.createdById : actor.id;
      await tx.insert(schema.clients).values({
        id,
        workspaceId,
        name: clean(doc.name) ?? "Klient bez nazwy",
        taxId: clean(doc.taxId),
        website: clean(doc.website),
        address: clean(doc.address) ? { street: clean(doc.address)! } : {},
        notes: clean(doc.notes) ?? "",
        ownerUserId: owner,
        status: "active",
        rotationRequired: true,
        externalRef: ref,
        createdBy: owner,
      });
      const contactName = clean(doc.contactPerson) ?? clean(doc.email) ?? clean(doc.phone);
      if (contactName) {
        await tx.insert(schema.clientContacts).values({
          workspaceId,
          clientId: id,
          name: contactName,
          email: clean(doc.email),
          phone: clean(doc.phone),
          preferredContact: clean(doc.email) ? "email" : "phone",
        });
      }
      await recordAudit({ workspaceId, actorId: actor.id, actorName: actor.name, action: "client.import", targetType: "client", targetId: id, clientId: id, metadata: { name: doc.name, source: "projects" } }, tx);
      imported++;
      return id;
    });
    const relinked = await prisma.project.updateMany({ where: { clientId: ref }, data: { clientId } });
    relinkedProjects += relinked.count;
  }
  logger.info("identity.legacy_clients_imported", { imported, relinkedProjects });
  return { imported, relinkedProjects };
}

// --- Usunięcie konta przez administratora --------------------------------------------------------

/**
 * Usuwa konto (PostgreSQL) i anonimizuje profil w module projektów. Jak przy usunięciu członka
 * zespołu: sejfy klientów, do których osoba miała klucze, oraz skrzynka „Do przejrzenia” są
 * oznaczane do rotacji klucza.
 */
export async function deleteUserEverywhere(userId: string, actor: { id: string; name: string }) {
  await asSystem(async (tx) => {
    const memberships = await tx.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, userId));
    if (memberships.some((m) => m.role === "owner")) throw new Error("OWNER");
    for (const m of memberships) {
      const grants = await tx
        .select({ scopeId: schema.keyGrants.scopeId })
        .from(schema.keyGrants)
        .where(and(eq(schema.keyGrants.workspaceId, m.workspaceId), eq(schema.keyGrants.userId, userId), eq(schema.keyGrants.scopeType, "client")));
      const clientIds = [...new Set(grants.map((g) => g.scopeId))];
      if (clientIds.length) await tx.update(schema.clients).set({ rotationRequired: true }).where(inArray(schema.clients.id, clientIds));
      if (m.role !== "viewer") await tx.update(schema.workspaces).set({ intakeRotationRequired: true }).where(eq(schema.workspaces.id, m.workspaceId));
      await recordAudit({ workspaceId: m.workspaceId, actorId: actor.id, actorName: actor.name, action: "member.remove", targetType: "user", targetId: userId, metadata: { reason: "account_deleted", clients: clientIds.length } }, tx);
    }
    await tx.delete(schema.user).where(eq(schema.user.id, userId));
  });
  await anonymizeProfile(userId);
}

/**
 * Profil w module projektów po usunięciu konta: zadania, komentarze i czas pracy zostają
 * (historia projektów), ale dane osobowe są usuwane.
 */
export async function anonymizeProfile(userId: string) {
  await prisma.user.updateMany({
    where: { id: userId },
    data: {
      name: "Usunięty użytkownik",
      email: `deleted+${userId}@nexus.invalid`,
      password: null,
      avatarUrl: null,
      phone: null,
      location: null,
      bio: null,
      jobTitle: null,
      company: null,
      website: null,
      role: ROLE_USER,
    },
  });
  await prisma.pushSubscription.deleteMany({ where: { userId } });
  await prisma.projectMember.deleteMany({ where: { userId } });
}
