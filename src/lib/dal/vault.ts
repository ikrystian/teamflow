import "server-only";
import { and, count, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { schema, type Tx } from "@/lib/db";
import { canViewCritical, needsIntakeKey, seesAllClients } from "@/lib/permissions";
import type { attachmentSchema, credentialMoveSchema, credentialWriteSchema, keyGrantSchema } from "@/lib/validation";
import { getClientAccess, getCredentialAccess, requireClientEdit, visibleClientIds } from "./access";
import { recordAudit } from "./audit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "./errors";
import type { WorkspaceContext } from "./session";
import { requireStepUp } from "./step-up";
import { withTenant } from "./tenant";

export type CredentialRecord = {
  id: string;
  clientId: string;
  type: (typeof schema.credentialType.enumValues)[number];
  sensitivity: "standard" | "critical";
  encryptedItemKey: string;
  vaultKeyVersion: number;
  encryptedData: string;
  /** Null dla wpisów krytycznych — sekrety wydaje osobny endpoint po step-up. */
  encryptedSecrets: string | null;
  passwordChangedAt: string | null;
  strengthScore: number | null;
  expiresAt: string | null;
  needsRotation: boolean;
  createdAt: string;
  updatedAt: string;
  updatedByName: string | null;
  attachments: number;
  /** Wpis udostępniony bezpośrednio (klucz wpisu z key_grants, scope „credential”). */
  direct: boolean;
  canEdit: boolean;
};

const credentialColumns = {
  id: schema.credentials.id,
  clientId: schema.credentials.clientId,
  type: schema.credentials.type,
  sensitivity: schema.credentials.sensitivity,
  encryptedItemKey: schema.credentials.encryptedItemKey,
  vaultKeyVersion: schema.credentials.vaultKeyVersion,
  encryptedData: schema.credentials.encryptedData,
  encryptedSecrets: schema.credentials.encryptedSecrets,
  passwordChangedAt: schema.credentials.passwordChangedAt,
  strengthScore: schema.credentials.strengthScore,
  expiresAt: schema.credentials.expiresAt,
  needsRotation: schema.credentials.needsRotation,
  createdAt: schema.credentials.createdAt,
  updatedAt: schema.credentials.updatedAt,
  updatedByName: schema.user.name,
};

type Row = {
  [K in keyof typeof credentialColumns]: unknown;
};

function toRecord(r: Row, opts: { direct: boolean; canEdit: boolean; attachments: number }): CredentialRecord {
  const critical = r.sensitivity === "critical";
  return {
    id: r.id as string,
    clientId: r.clientId as string,
    type: r.type as CredentialRecord["type"],
    sensitivity: r.sensitivity as CredentialRecord["sensitivity"],
    encryptedItemKey: r.encryptedItemKey as string,
    vaultKeyVersion: r.vaultKeyVersion as number,
    encryptedData: r.encryptedData as string,
    encryptedSecrets: critical ? null : (r.encryptedSecrets as string),
    passwordChangedAt: r.passwordChangedAt ? (r.passwordChangedAt as Date).toISOString() : null,
    strengthScore: (r.strengthScore as number | null) ?? null,
    expiresAt: (r.expiresAt as string | null) ?? null,
    needsRotation: Boolean(r.needsRotation),
    createdAt: (r.createdAt as Date).toISOString(),
    updatedAt: (r.updatedAt as Date).toISOString(),
    updatedByName: (r.updatedByName as string | null) ?? null,
    attachments: opts.attachments,
    direct: opts.direct,
    canEdit: opts.canEdit,
  };
}

async function attachmentCounts(tx: Tx, ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await tx
    .select({ id: schema.credentialAttachments.credentialId, n: count() })
    .from(schema.credentialAttachments)
    .where(inArray(schema.credentialAttachments.credentialId, ids))
    .groupBy(schema.credentialAttachments.credentialId);
  return new Map(rows.map((r) => [r.id, r.n]));
}

export type VaultClient = {
  id: string;
  name: string;
  status: string;
  vaultKeyVersion: number;
  rotationRequired: boolean;
  canEdit: boolean;
  canViewCritical: boolean;
  logo: string | null;
};

export type VaultSync = {
  grants: { scopeType: "client" | "intake" | "credential"; scopeId: string; encryptedKey: string; keyVersion: number }[];
  clients: VaultClient[];
  credentials: CredentialRecord[];
  intake: { publicKey: string; keyVersion: number; rotationRequired: boolean };
};

/**
 * Wszystkie szyfrogramy, do których osoba ma dostęp — do odszyfrowania w przeglądarce
 * i zbudowania lokalnego indeksu wyszukiwania (rozdział 4.9).
 */
export async function syncVault(ctx: WorkspaceContext): Promise<VaultSync> {
  return withTenant(ctx.workspaceId, async (tx) => {
    const visible = await visibleClientIds(tx, ctx);
    const clientRows = await tx
      .select({
        id: schema.clients.id,
        name: schema.clients.name,
        status: schema.clients.status,
        vaultKeyVersion: schema.clients.vaultKeyVersion,
        rotationRequired: schema.clients.rotationRequired,
        logo: schema.clients.logo,
      })
      .from(schema.clients)
      .where(
        and(
          eq(schema.clients.workspaceId, ctx.workspaceId),
          visible === "all" ? undefined : visible.length ? inArray(schema.clients.id, visible) : sql`false`,
        ),
      );
    const assignments = await tx
      .select({ clientId: schema.clientMembers.clientId, canViewCritical: schema.clientMembers.canViewCritical })
      .from(schema.clientMembers)
      .where(and(eq(schema.clientMembers.workspaceId, ctx.workspaceId), eq(schema.clientMembers.userId, ctx.userId)));
    const byClient = new Map(assignments.map((a) => [a.clientId, a]));
    const clients: VaultClient[] = clientRows.map((c) => {
      const a = byClient.get(c.id) ?? null;
      const assignment = a ? { canViewCritical: a.canViewCritical } : null;
      return {
        ...c,
        canEdit: seesAllClients(ctx.member) || (ctx.member.role === "member" && assignment !== null),
        canViewCritical: canViewCritical(ctx.member, assignment),
      };
    });
    const clientIds = clients.map((c) => c.id);
    const critAllowed = new Map(clients.map((c) => [c.id, c.canViewCritical]));
    const editAllowed = new Map(clients.map((c) => [c.id, c.canEdit]));

    const rows = clientIds.length
      ? await tx
          .select(credentialColumns)
          .from(schema.credentials)
          .leftJoin(schema.user, eq(schema.user.id, schema.credentials.updatedBy))
          .where(and(eq(schema.credentials.workspaceId, ctx.workspaceId), inArray(schema.credentials.clientId, clientIds), isNull(schema.credentials.deletedAt)))
      : [];

    // Wpisy udostępnione bezpośrednio (spoza przypisanych klientów).
    const directRows = await tx
      .select(credentialColumns)
      .from(schema.credentialAccess)
      .innerJoin(schema.credentials, eq(schema.credentials.id, schema.credentialAccess.credentialId))
      .leftJoin(schema.user, eq(schema.user.id, schema.credentials.updatedBy))
      .where(and(eq(schema.credentialAccess.userId, ctx.userId), eq(schema.credentialAccess.workspaceId, ctx.workspaceId), isNull(schema.credentials.deletedAt)));

    const counts = await attachmentCounts(tx, [...rows, ...directRows].map((r) => r.id));
    const credentials: CredentialRecord[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      // Wpisy krytyczne bez uprawnienia nie są nawet wysyłane (członek bez indywidualnego nadania).
      if (r.sensitivity === "critical" && !critAllowed.get(r.clientId)) continue;
      seen.add(r.id);
      credentials.push(toRecord(r, { direct: false, canEdit: editAllowed.get(r.clientId) ?? false, attachments: counts.get(r.id) ?? 0 }));
    }
    for (const r of directRows) {
      if (seen.has(r.id)) continue;
      if (r.sensitivity === "critical" && !seesAllClients(ctx.member) && ctx.member.role !== "member") continue;
      credentials.push(toRecord(r, { direct: true, canEdit: false, attachments: counts.get(r.id) ?? 0 }));
    }

    const grants = await tx
      .select({
        scopeType: schema.keyGrants.scopeType,
        scopeId: schema.keyGrants.scopeId,
        encryptedKey: schema.keyGrants.encryptedKey,
        keyVersion: schema.keyGrants.keyVersion,
      })
      .from(schema.keyGrants)
      .where(
        and(
          eq(schema.keyGrants.workspaceId, ctx.workspaceId),
          eq(schema.keyGrants.userId, ctx.userId),
          eq(schema.keyGrants.userKeysVersion, ctx.keysVersion),
        ),
      );
    const [ws] = await tx
      .select({ intakeRotationRequired: schema.workspaces.intakeRotationRequired })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, ctx.workspaceId));
    return {
      grants,
      clients,
      credentials,
      intake: { publicKey: ctx.intakePublicKey, keyVersion: ctx.intakeKeyVersion, rotationRequired: Boolean(ws?.intakeRotationRequired) },
    };
  });
}

/** Wpisy jednego klienta (404, gdy osoba nie ma do niego dostępu). */
export async function clientCredentials(ctx: WorkspaceContext, clientId: string): Promise<CredentialRecord[]> {
  return withTenant(ctx.workspaceId, async (tx) => {
    const access = await getClientAccess(tx, ctx, clientId);
    const rows = await tx
      .select(credentialColumns)
      .from(schema.credentials)
      .leftJoin(schema.user, eq(schema.user.id, schema.credentials.updatedBy))
      .where(and(eq(schema.credentials.workspaceId, ctx.workspaceId), eq(schema.credentials.clientId, clientId), isNull(schema.credentials.deletedAt)))
      .orderBy(desc(schema.credentials.updatedAt));
    const counts = await attachmentCounts(tx, rows.map((r) => r.id));
    return rows
      .filter((r) => r.sensitivity !== "critical" || access.canViewCritical)
      .map((r) => toRecord(r, { direct: false, canEdit: access.canEdit, attachments: counts.get(r.id) ?? 0 }));
  });
}

/**
 * Sekrety wpisu. Dla wpisów krytycznych wymagany jest świeży step-up, a wydanie
 * jest zapisywane w dzienniku (rozdział 4.4 i kryterium akceptacji 7).
 */
export async function revealSecrets(ctx: WorkspaceContext, credentialId: string, purpose: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const { cred, access, direct } = await getCredentialAccess(tx, ctx, credentialId);
    const allowedCritical = direct ? ctx.member.role !== "viewer" : (access?.canViewCritical ?? false);
    if (cred.sensitivity === "critical") {
      if (!allowedCritical) throw new NotFoundError("Nie znaleziono wpisu");
      await requireStepUp(ctx.sessionId);
      await recordAudit(
        {
          workspaceId: ctx.workspaceId,
          actorId: ctx.userId,
          actorName: ctx.userName,
          action: "credential.reveal_critical",
          targetType: "credential",
          targetId: cred.id,
          clientId: cred.clientId,
          metadata: { purpose },
        },
        tx,
      );
    }
    return { encryptedSecrets: cred.encryptedSecrets };
  });
}

type CredentialWrite = z.infer<typeof credentialWriteSchema>;

export async function saveCredential(ctx: WorkspaceContext, input: CredentialWrite) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const access = await requireClientEdit(tx, ctx, input.clientId);
    if (input.sensitivity === "critical" && !access.canViewCritical) throw new ForbiddenError("Nie masz uprawnień do wpisów krytycznych");
    if (input.vaultKeyVersion !== access.client.vaultKeyVersion) {
      throw new ConflictError("Klucz sejfu klienta został zmieniony — odśwież sejf i spróbuj ponownie", "STALE_VAULT_KEY");
    }
    const [existing] = await tx.select().from(schema.credentials).where(eq(schema.credentials.id, input.id));
    const now = new Date();
    if (existing) {
      if (existing.workspaceId !== ctx.workspaceId || existing.deletedAt) throw new NotFoundError("Nie znaleziono wpisu");
      if (existing.clientId !== input.clientId) throw new ValidationError("Do przeniesienia wpisu użyj operacji „Przenieś”");
      if (existing.sensitivity === "critical" && !access.canViewCritical) throw new NotFoundError("Nie znaleziono wpisu");
      // Historia wersji: poprzednia wersja trafia do credential_versions.
      await tx.insert(schema.credentialVersions).values({
        workspaceId: ctx.workspaceId,
        credentialId: existing.id,
        encryptedData: existing.encryptedData,
        encryptedSecrets: existing.encryptedSecrets,
        formatVersion: existing.formatVersion,
        type: existing.type,
        sensitivity: existing.sensitivity,
        passwordChangedAt: existing.passwordChangedAt,
        createdBy: existing.updatedBy ?? existing.createdBy,
        createdAt: existing.updatedAt,
      });
      await tx
        .update(schema.credentials)
        .set({
          type: input.type,
          sensitivity: input.sensitivity,
          encryptedItemKey: input.encryptedItemKey,
          encryptedData: input.encryptedData,
          encryptedSecrets: input.encryptedSecrets,
          formatVersion: input.formatVersion,
          strengthScore: input.strengthScore,
          expiresAt: input.expiresAt,
          passwordChangedAt: input.passwordChanged ? now : existing.passwordChangedAt,
          needsRotation: input.passwordChanged ? false : existing.needsRotation,
          updatedBy: ctx.userId,
        })
        .where(eq(schema.credentials.id, input.id));
      if (input.passwordChanged) {
        await tx
          .update(schema.reminders)
          .set({ status: "done", completedAt: now })
          .where(and(eq(schema.reminders.targetType, "credential"), eq(schema.reminders.targetId, input.id), eq(schema.reminders.status, "open"), inArray(schema.reminders.kind, ["password_old", "password_breached", "password_rotate"])));
      }
    } else {
      await tx.insert(schema.credentials).values({
        id: input.id,
        workspaceId: ctx.workspaceId,
        clientId: input.clientId,
        type: input.type,
        sensitivity: input.sensitivity,
        encryptedItemKey: input.encryptedItemKey,
        vaultKeyVersion: input.vaultKeyVersion,
        encryptedData: input.encryptedData,
        encryptedSecrets: input.encryptedSecrets,
        formatVersion: input.formatVersion,
        strengthScore: input.strengthScore,
        expiresAt: input.expiresAt,
        passwordChangedAt: input.passwordChanged ? now : null,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      });
    }
    await recordAudit(
      {
        workspaceId: ctx.workspaceId,
        actorId: ctx.userId,
        actorName: ctx.userName,
        action: existing ? "credential.update" : "credential.create",
        targetType: "credential",
        targetId: input.id,
        clientId: input.clientId,
        metadata: { type: input.type, sensitivity: input.sensitivity, passwordChanged: input.passwordChanged },
      },
      tx,
    );
    return { id: input.id, created: !existing };
  });
}

export async function deleteCredential(ctx: WorkspaceContext, credentialId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const { cred, access } = await getCredentialAccess(tx, ctx, credentialId);
    if (!access?.canEdit) throw new ForbiddenError();
    if (cred.sensitivity === "critical" && !access.canViewCritical) throw new NotFoundError();
    await tx.update(schema.credentials).set({ deletedAt: new Date(), updatedBy: ctx.userId }).where(eq(schema.credentials.id, credentialId));
    await tx.delete(schema.shares).where(and(eq(schema.shares.credentialId, credentialId), isNull(schema.shares.revokedAt)));
    await recordAudit(
      { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "credential.delete", targetType: "credential", targetId: credentialId, clientId: cred.clientId },
      tx,
    );
  });
}

export async function credentialVersions(ctx: WorkspaceContext, credentialId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const { cred, access, direct } = await getCredentialAccess(tx, ctx, credentialId);
    if (direct) throw new NotFoundError();
    const critical = cred.sensitivity === "critical";
    if (critical && !access?.canViewCritical) throw new NotFoundError();
    const rows = await tx
      .select({
        id: schema.credentialVersions.id,
        encryptedData: schema.credentialVersions.encryptedData,
        encryptedSecrets: schema.credentialVersions.encryptedSecrets,
        type: schema.credentialVersions.type,
        sensitivity: schema.credentialVersions.sensitivity,
        passwordChangedAt: schema.credentialVersions.passwordChangedAt,
        createdAt: schema.credentialVersions.createdAt,
        createdByName: schema.user.name,
      })
      .from(schema.credentialVersions)
      .leftJoin(schema.user, eq(schema.user.id, schema.credentialVersions.createdBy))
      .where(eq(schema.credentialVersions.credentialId, credentialId))
      .orderBy(desc(schema.credentialVersions.createdAt))
      .limit(50);
    if (critical) await requireStepUp(ctx.sessionId);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), passwordChangedAt: r.passwordChangedAt?.toISOString() ?? null }));
  });
}

export async function markNeedsRotation(ctx: WorkspaceContext, ids: string[], value: boolean) {
  return withTenant(ctx.workspaceId, async (tx) => {
    for (const id of ids) {
      const { cred, access } = await getCredentialAccess(tx, ctx, id);
      if (!access?.canEdit) throw new ForbiddenError();
      await tx.update(schema.credentials).set({ needsRotation: value }).where(eq(schema.credentials.id, id));
      if (value) {
        await tx
          .insert(schema.reminders)
          .values({
            workspaceId: ctx.workspaceId,
            kind: "password_rotate",
            targetType: "credential",
            targetId: id,
            clientId: cred.clientId,
            assigneeUserId: ctx.userId,
            title: "Zmień hasło oznaczone „do zmiany”",
            dueAt: new Date(Date.now() + 7 * 86_400_000),
            dedupeKey: `password_rotate:${id}:manual`,
          })
          .onConflictDoNothing();
      }
      await recordAudit(
        { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: value ? "credential.mark_rotation" : "credential.unmark_rotation", targetType: "credential", targetId: id, clientId: cred.clientId },
        tx,
      );
    }
  });
}

export async function moveCredentials(ctx: WorkspaceContext, moves: z.infer<typeof credentialMoveSchema>[]) {
  return withTenant(ctx.workspaceId, async (tx) => {
    for (const m of moves) {
      const { cred, access } = await getCredentialAccess(tx, ctx, m.id);
      if (!access?.canEdit) throw new ForbiddenError();
      const target = await requireClientEdit(tx, ctx, m.toClientId);
      if (cred.sensitivity === "critical" && !target.canViewCritical) throw new ForbiddenError("Brak uprawnień do wpisów krytycznych w kliencie docelowym");
      if (m.vaultKeyVersion !== target.client.vaultKeyVersion) throw new ConflictError("Klucz sejfu klienta docelowego został zmieniony", "STALE_VAULT_KEY");
      await tx
        .update(schema.credentials)
        .set({ clientId: m.toClientId, encryptedItemKey: m.encryptedItemKey, vaultKeyVersion: m.vaultKeyVersion, updatedBy: ctx.userId })
        .where(eq(schema.credentials.id, m.id));
      await tx.update(schema.shares).set({ clientId: m.toClientId }).where(eq(schema.shares.credentialId, m.id));
      await tx.update(schema.reminders).set({ clientId: m.toClientId }).where(and(eq(schema.reminders.targetType, "credential"), eq(schema.reminders.targetId, m.id)));
      await recordAudit(
        {
          workspaceId: ctx.workspaceId,
          actorId: ctx.userId,
          actorName: ctx.userName,
          action: "credential.move",
          targetType: "credential",
          targetId: m.id,
          clientId: m.toClientId,
          metadata: { fromClientId: cred.clientId, toClientId: m.toClientId },
        },
        tx,
      );
    }
  });
}

// --- Załączniki -------------------------------------------------------------------

export async function addAttachment(ctx: WorkspaceContext, input: z.infer<typeof attachmentSchema>) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const { cred, access } = await getCredentialAccess(tx, ctx, input.credentialId);
    if (!access?.canEdit) throw new ForbiddenError();
    if (cred.sensitivity === "critical" && !access.canViewCritical) throw new NotFoundError();
    const [{ n }] = await tx.select({ n: count() }).from(schema.credentialAttachments).where(eq(schema.credentialAttachments.credentialId, cred.id));
    if (n >= 20) throw new ValidationError("Maksymalnie 20 załączników na wpis");
    await tx.insert(schema.credentialAttachments).values({ ...input, workspaceId: ctx.workspaceId, createdBy: ctx.userId });
    await recordAudit(
      { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "attachment.create", targetType: "credential", targetId: cred.id, clientId: cred.clientId, metadata: { size: input.size } },
      tx,
    );
  });
}

export async function listAttachments(ctx: WorkspaceContext, credentialId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const { cred, access, direct } = await getCredentialAccess(tx, ctx, credentialId);
    if (cred.sensitivity === "critical" && !direct && !access?.canViewCritical) throw new NotFoundError();
    const rows = await tx
      .select({ id: schema.credentialAttachments.id, encryptedMeta: schema.credentialAttachments.encryptedMeta, size: schema.credentialAttachments.size, createdAt: schema.credentialAttachments.createdAt })
      .from(schema.credentialAttachments)
      .where(eq(schema.credentialAttachments.credentialId, credentialId))
      .orderBy(desc(schema.credentialAttachments.createdAt));
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  });
}

export async function getAttachment(ctx: WorkspaceContext, attachmentId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const [att] = await tx
      .select()
      .from(schema.credentialAttachments)
      .where(and(eq(schema.credentialAttachments.id, attachmentId), eq(schema.credentialAttachments.workspaceId, ctx.workspaceId)));
    if (!att) throw new NotFoundError();
    const { cred, access, direct } = await getCredentialAccess(tx, ctx, att.credentialId);
    if (cred.sensitivity === "critical") {
      if (!direct && !access?.canViewCritical) throw new NotFoundError();
      await requireStepUp(ctx.sessionId);
    }
    await recordAudit(
      { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "attachment.download", targetType: "credential", targetId: cred.id, clientId: cred.clientId },
      tx,
    );
    return { id: att.id, credentialId: att.credentialId, ciphertext: att.ciphertext, encryptedMeta: att.encryptedMeta };
  });
}

export async function deleteAttachment(ctx: WorkspaceContext, attachmentId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const [att] = await tx.select().from(schema.credentialAttachments).where(eq(schema.credentialAttachments.id, attachmentId));
    if (!att || att.workspaceId !== ctx.workspaceId) throw new NotFoundError();
    const { cred, access } = await getCredentialAccess(tx, ctx, att.credentialId);
    if (!access?.canEdit) throw new ForbiddenError();
    await tx.delete(schema.credentialAttachments).where(eq(schema.credentialAttachments.id, attachmentId));
    await recordAudit(
      { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "attachment.delete", targetType: "credential", targetId: cred.id, clientId: cred.clientId },
      tx,
    );
  });
}

// --- Kopie kluczy ------------------------------------------------------------------

type Grant = z.infer<typeof keyGrantSchema>;

/** Czy użytkownik powinien mieć kopię danego klucza (serwer pilnuje, komu wolno nadać). */
async function grantAllowed(tx: Tx, ctx: WorkspaceContext, g: Grant): Promise<boolean> {
  const [member] = await tx
    .select({ role: schema.workspaceMembers.role, status: schema.workspaceMembers.status, pending: schema.workspaceMembers.pendingKeyApproval })
    .from(schema.workspaceMembers)
    .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.userId, g.userId)));
  if (!member || member.status !== "active") return false;
  const [u] = await tx.select({ keysVersion: schema.user.keysVersion }).from(schema.user).where(eq(schema.user.id, g.userId));
  if (!u || u.keysVersion !== g.userKeysVersion) return false;
  // Po resecie kluczy kopie są nadawane dopiero po zatwierdzeniu (z wyjątkiem własnych kopii).
  if (member.pending && g.userId !== ctx.userId) return false;
  if (g.scopeType === "client") {
    const [client] = await tx.select({ v: schema.clients.vaultKeyVersion }).from(schema.clients).where(and(eq(schema.clients.id, g.scopeId), eq(schema.clients.workspaceId, ctx.workspaceId)));
    if (!client || client.v !== g.keyVersion) return false;
    if (member.role === "owner" || member.role === "admin") return true;
    const [a] = await tx.select({ x: schema.clientMembers.userId }).from(schema.clientMembers).where(and(eq(schema.clientMembers.clientId, g.scopeId), eq(schema.clientMembers.userId, g.userId)));
    return Boolean(a);
  }
  if (g.scopeType === "intake") {
    return g.scopeId === ctx.workspaceId && g.keyVersion === ctx.intakeKeyVersion && needsIntakeKey({ role: member.role });
  }
  const [a] = await tx.select({ x: schema.credentialAccess.userId }).from(schema.credentialAccess).where(and(eq(schema.credentialAccess.credentialId, g.scopeId), eq(schema.credentialAccess.userId, g.userId)));
  return Boolean(a) && g.keyVersion === 1;
}

/** Czy nadający sam posiada ten klucz (musiał go odszyfrować, żeby zrobić kopię). */
async function granterHoldsKey(tx: Tx, ctx: WorkspaceContext, g: Grant): Promise<boolean> {
  if (g.scopeType === "credential") {
    const { access } = await getCredentialAccess(tx, ctx, g.scopeId);
    return Boolean(access?.canEdit);
  }
  const [own] = await tx
    .select({ id: schema.keyGrants.id })
    .from(schema.keyGrants)
    .where(
      and(
        eq(schema.keyGrants.scopeType, g.scopeType),
        eq(schema.keyGrants.scopeId, g.scopeId),
        eq(schema.keyGrants.userId, ctx.userId),
        eq(schema.keyGrants.keyVersion, g.keyVersion),
        eq(schema.keyGrants.userKeysVersion, ctx.keysVersion),
      ),
    );
  return Boolean(own);
}

export async function submitGrants(ctx: WorkspaceContext, grants: Grant[]) {
  return withTenant(ctx.workspaceId, async (tx) => {
    let accepted = 0;
    for (const g of grants) {
      if (!(await granterHoldsKey(tx, ctx, g))) continue;
      if (!(await grantAllowed(tx, ctx, g))) continue;
      await tx
        .insert(schema.keyGrants)
        .values({ ...g, workspaceId: ctx.workspaceId, grantedBy: ctx.userId })
        .onConflictDoUpdate({
          target: [schema.keyGrants.scopeType, schema.keyGrants.scopeId, schema.keyGrants.userId, schema.keyGrants.keyVersion],
          set: { encryptedKey: g.encryptedKey, userKeysVersion: g.userKeysVersion, grantedBy: ctx.userId, createdAt: new Date() },
        });
      if (g.userId !== ctx.userId) {
        await recordAudit(
          {
            workspaceId: ctx.workspaceId,
            actorId: ctx.userId,
            actorName: ctx.userName,
            action: "key.grant",
            targetType: g.scopeType,
            targetId: g.scopeId,
            clientId: g.scopeType === "client" ? g.scopeId : null,
            metadata: { recipient: g.userId, version: g.keyVersion },
          },
          tx,
        );
      }
      accepted++;
    }
    return { accepted };
  });
}

export type PendingGrant = { scopeType: "client" | "intake" | "credential"; scopeId: string; keyVersion: number; userId: string; userName: string; publicKey: string; userKeysVersion: number };

/** Brakujące kopie kluczy, które bieżąca osoba może nadać ze swojej przeglądarki. */
export async function pendingGrants(ctx: WorkspaceContext): Promise<PendingGrant[]> {
  return withTenant(ctx.workspaceId, async (tx) => {
    const members = await tx
      .select({ userId: schema.workspaceMembers.userId, role: schema.workspaceMembers.role, pending: schema.workspaceMembers.pendingKeyApproval, name: schema.user.name, publicKey: schema.user.publicKey, keysVersion: schema.user.keysVersion })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.status, "active"), isNotNull(schema.user.publicKey)));
    const eligible = members.filter((m) => !m.pending);
    const myGrants = await tx
      .select({ scopeType: schema.keyGrants.scopeType, scopeId: schema.keyGrants.scopeId, keyVersion: schema.keyGrants.keyVersion })
      .from(schema.keyGrants)
      .where(and(eq(schema.keyGrants.workspaceId, ctx.workspaceId), eq(schema.keyGrants.userId, ctx.userId), eq(schema.keyGrants.userKeysVersion, ctx.keysVersion)));
    const held = new Set(myGrants.map((g) => `${g.scopeType}:${g.scopeId}:${g.keyVersion}`));
    const all = await tx
      .select({ scopeType: schema.keyGrants.scopeType, scopeId: schema.keyGrants.scopeId, keyVersion: schema.keyGrants.keyVersion, userId: schema.keyGrants.userId, userKeysVersion: schema.keyGrants.userKeysVersion })
      .from(schema.keyGrants)
      .where(eq(schema.keyGrants.workspaceId, ctx.workspaceId));
    const existing = new Set(all.map((g) => `${g.scopeType}:${g.scopeId}:${g.keyVersion}:${g.userId}:${g.userKeysVersion}`));
    const out: PendingGrant[] = [];
    const push = (scopeType: PendingGrant["scopeType"], scopeId: string, keyVersion: number, m: (typeof members)[number]) => {
      if (!held.has(`${scopeType}:${scopeId}:${keyVersion}`)) return;
      if (existing.has(`${scopeType}:${scopeId}:${keyVersion}:${m.userId}:${m.keysVersion}`)) return;
      out.push({ scopeType, scopeId, keyVersion, userId: m.userId, userName: m.name, publicKey: m.publicKey!, userKeysVersion: m.keysVersion });
    };
    const clients = await tx.select({ id: schema.clients.id, v: schema.clients.vaultKeyVersion }).from(schema.clients).where(eq(schema.clients.workspaceId, ctx.workspaceId));
    const assignments = await tx.select({ clientId: schema.clientMembers.clientId, userId: schema.clientMembers.userId }).from(schema.clientMembers).where(eq(schema.clientMembers.workspaceId, ctx.workspaceId));
    const assigned = new Set(assignments.map((a) => `${a.clientId}:${a.userId}`));
    for (const c of clients) {
      for (const m of eligible) {
        if (m.role === "owner" || m.role === "admin" || assigned.has(`${c.id}:${m.userId}`)) push("client", c.id, c.v, m);
      }
    }
    for (const m of eligible) if (needsIntakeKey({ role: m.role })) push("intake", ctx.workspaceId, ctx.intakeKeyVersion, m);
    const direct = await tx.select({ credentialId: schema.credentialAccess.credentialId, userId: schema.credentialAccess.userId }).from(schema.credentialAccess).where(eq(schema.credentialAccess.workspaceId, ctx.workspaceId));
    for (const d of direct) {
      const m = eligible.find((x) => x.userId === d.userId);
      if (m) {
        // Kopię klucza wpisu nadaje osoba z dostępem do klienta (nie musi mieć grantu „credential”).
        if (!out.some((o) => o.scopeId === d.credentialId && o.userId === d.userId) && !existing.has(`credential:${d.credentialId}:1:${m.userId}:${m.keysVersion}`)) {
          const [cred] = await tx.select({ clientId: schema.credentials.clientId }).from(schema.credentials).where(eq(schema.credentials.id, d.credentialId));
          if (cred && held.has(`client:${cred.clientId}:${clients.find((c) => c.id === cred.clientId)?.v}`)) {
            out.push({ scopeType: "credential", scopeId: d.credentialId, keyVersion: 1, userId: m.userId, userName: m.name, publicKey: m.publicKey!, userKeysVersion: m.keysVersion });
          }
        }
      }
    }
    return out;
  });
}

// --- Rotacja kluczy sejfu (odejście pracownika) ----------------------------------

export async function rotationPlan(ctx: WorkspaceContext, clientId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const access = await getClientAccess(tx, ctx, clientId);
    if (!seesAllClients(ctx.member)) throw new ForbiddenError("Rotację kluczy wykonuje właściciel lub administrator");
    const creds = await tx
      .select({ id: schema.credentials.id, encryptedItemKey: schema.credentials.encryptedItemKey, vaultKeyVersion: schema.credentials.vaultKeyVersion })
      .from(schema.credentials)
      .where(eq(schema.credentials.clientId, clientId));
    const recipients = await tx
      .select({ userId: schema.workspaceMembers.userId, role: schema.workspaceMembers.role, publicKey: schema.user.publicKey, keysVersion: schema.user.keysVersion, pending: schema.workspaceMembers.pendingKeyApproval })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .leftJoin(schema.clientMembers, and(eq(schema.clientMembers.userId, schema.workspaceMembers.userId), eq(schema.clientMembers.clientId, clientId)))
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, ctx.workspaceId),
          eq(schema.workspaceMembers.status, "active"),
          isNotNull(schema.user.publicKey),
          or(inArray(schema.workspaceMembers.role, ["owner", "admin"]), isNotNull(schema.clientMembers.userId)),
        ),
      );
    return {
      clientId,
      currentVersion: access.client.vaultKeyVersion,
      credentials: creds,
      recipients: recipients.filter((r) => !r.pending || r.userId === ctx.userId).map((r) => ({ userId: r.userId, publicKey: r.publicKey!, keysVersion: r.keysVersion })),
    };
  });
}

export async function rotateClientKey(
  ctx: WorkspaceContext,
  input: { clientId: string; fromVersion: number; items: { id: string; encryptedItemKey: string }[]; grants: Grant[] },
) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const access = await getClientAccess(tx, ctx, input.clientId);
    if (!seesAllClients(ctx.member)) throw new ForbiddenError();
    if (access.client.vaultKeyVersion !== input.fromVersion) throw new ConflictError("Klucz sejfu został już zrotowany", "STALE_VAULT_KEY");
    const newVersion = input.fromVersion + 1;
    const creds = await tx.select({ id: schema.credentials.id }).from(schema.credentials).where(eq(schema.credentials.clientId, input.clientId));
    const ids = new Set(input.items.map((i) => i.id));
    if (creds.length !== ids.size || creds.some((c) => !ids.has(c.id))) throw new ConflictError("Lista wpisów się zmieniła — ponów rotację", "ROTATION_MISMATCH");
    if (!input.grants.some((g) => g.userId === ctx.userId)) throw new ValidationError("Brak kopii nowego klucza dla osoby wykonującej rotację");
    for (const item of input.items) {
      await tx.update(schema.credentials).set({ encryptedItemKey: item.encryptedItemKey, vaultKeyVersion: newVersion }).where(eq(schema.credentials.id, item.id));
    }
    await tx.update(schema.clients).set({ vaultKeyVersion: newVersion, rotationRequired: false }).where(eq(schema.clients.id, input.clientId));
    // Stare kopie klucza są usuwane — odebranie dostępu (rozdział 6.3).
    await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.scopeType, "client"), eq(schema.keyGrants.scopeId, input.clientId)));
    for (const g of input.grants) {
      if (g.scopeType !== "client" || g.scopeId !== input.clientId || g.keyVersion !== newVersion) throw new ValidationError("Nieprawidłowa kopia klucza");
      const ok = await grantAllowed(tx, ctx, g);
      if (!ok) continue;
      await tx.insert(schema.keyGrants).values({ ...g, workspaceId: ctx.workspaceId, grantedBy: ctx.userId });
    }
    await recordAudit(
      { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "key.rotate", targetType: "client", targetId: input.clientId, clientId: input.clientId, metadata: { version: newVersion, items: input.items.length } },
      tx,
    );
    return { version: newVersion };
  });
}

/** Rotacja klucza skrzynki „Do przejrzenia”: nowa para kluczy, ponownie zaszyfrowane oczekujące zgłoszenia. */
export async function intakeRotationPlan(ctx: WorkspaceContext) {
  return withTenant(ctx.workspaceId, async (tx) => {
    if (!seesAllClients(ctx.member)) throw new ForbiddenError();
    const pending = await tx
      .select({ id: schema.accessRequests.id, submittedCiphertext: schema.accessRequests.submittedCiphertext, intakeKeyVersion: schema.accessRequests.intakeKeyVersion })
      .from(schema.accessRequests)
      .where(and(eq(schema.accessRequests.workspaceId, ctx.workspaceId), eq(schema.accessRequests.status, "submitted")));
    const recipients = await tx
      .select({ userId: schema.workspaceMembers.userId, role: schema.workspaceMembers.role, publicKey: schema.user.publicKey, keysVersion: schema.user.keysVersion, pending: schema.workspaceMembers.pendingKeyApproval })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
      .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.status, "active"), isNotNull(schema.user.publicKey), ne(schema.workspaceMembers.role, "viewer")));
    return {
      currentVersion: ctx.intakeKeyVersion,
      submissions: pending,
      recipients: recipients.filter((r) => !r.pending || r.userId === ctx.userId).map((r) => ({ userId: r.userId, publicKey: r.publicKey!, keysVersion: r.keysVersion })),
    };
  });
}

export async function rotateIntakeKey(
  ctx: WorkspaceContext,
  input: { fromVersion: number; publicKey: string; submissions: { id: string; submittedCiphertext: string }[]; grants: Grant[] },
) {
  return withTenant(ctx.workspaceId, async (tx) => {
    if (!seesAllClients(ctx.member)) throw new ForbiddenError();
    if (ctx.intakeKeyVersion !== input.fromVersion) throw new ConflictError("Klucz skrzynki został już zrotowany", "STALE_INTAKE_KEY");
    const newVersion = input.fromVersion + 1;
    await tx.update(schema.workspaces).set({ intakePublicKey: input.publicKey, intakeKeyVersion: newVersion, intakeRotationRequired: false }).where(eq(schema.workspaces.id, ctx.workspaceId));
    for (const s of input.submissions) {
      await tx
        .update(schema.accessRequests)
        .set({ submittedCiphertext: s.submittedCiphertext, intakeKeyVersion: newVersion })
        .where(and(eq(schema.accessRequests.id, s.id), eq(schema.accessRequests.workspaceId, ctx.workspaceId)));
    }
    await tx.delete(schema.keyGrants).where(and(eq(schema.keyGrants.scopeType, "intake"), eq(schema.keyGrants.scopeId, ctx.workspaceId)));
    const rotatedCtx = { ...ctx, intakeKeyVersion: newVersion };
    for (const g of input.grants) {
      if (g.scopeType !== "intake" || g.keyVersion !== newVersion) throw new ValidationError("Nieprawidłowa kopia klucza");
      if (await grantAllowed(tx, rotatedCtx, g)) await tx.insert(schema.keyGrants).values({ ...g, workspaceId: ctx.workspaceId, grantedBy: ctx.userId });
    }
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "key.rotate_intake", targetType: "workspace", targetId: ctx.workspaceId, metadata: { version: newVersion } }, tx);
    return { version: newVersion };
  });
}

/**
 * Eksport sejfu (rozdział 3: właściciel; administrator po nadaniu). Wymaga step-up.
 * Serwer wydaje szyfrogramy (także sekrety wpisów krytycznych) — odszyfrowanie i zapis pliku
 * odbywają się w przeglądarce.
 */
export async function exportVaultBundle(ctx: WorkspaceContext) {
  const { canExport } = await import("@/lib/permissions");
  if (!canExport(ctx.member)) throw new ForbiddenError("Nie masz uprawnienia do eksportu danych");
  await requireStepUp(ctx.sessionId);
  const sync = await syncVault(ctx);
  return withTenant(ctx.workspaceId, async (tx) => {
    const critical = sync.credentials.filter((c) => c.sensitivity === "critical").map((c) => c.id);
    if (critical.length) {
      const rows = await tx.select({ id: schema.credentials.id, s: schema.credentials.encryptedSecrets }).from(schema.credentials).where(inArray(schema.credentials.id, critical));
      const byId = new Map(rows.map((r) => [r.id, r.s]));
      for (const c of sync.credentials) if (byId.has(c.id)) c.encryptedSecrets = byId.get(c.id)!;
    }
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "export.vault", targetType: "workspace", targetId: ctx.workspaceId, metadata: { credentials: sync.credentials.length } }, tx);
    return sync;
  });
}

/** Import CSV — zapis wielu zaszyfrowanych wpisów (dziennik: jedno zdarzenie importu). */
export async function importCredentials(ctx: WorkspaceContext, items: CredentialWrite[], source: string) {
  let created = 0;
  for (const item of items) {
    await saveCredential(ctx, item);
    created++;
  }
  await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "import.csv", targetType: "workspace", targetId: ctx.workspaceId, metadata: { source, count: created, clients: new Set(items.map((i) => i.clientId)).size } });
  return { created };
}
