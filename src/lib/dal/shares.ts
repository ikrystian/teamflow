import "server-only";
import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { verifyShareAccessKey } from "@/lib/crypto/share";
import { schema } from "@/lib/db";
import { canShareExternally } from "@/lib/permissions";
import { hit } from "@/lib/security/rate-limit";
import type { shareCreateSchema } from "@/lib/validation";
import { getClientAccess, getCredentialAccess } from "./access";
import { recordAudit } from "./audit";
import { ForbiddenError, GoneError, NotFoundError, ValidationError } from "./errors";
import { notifyUsers } from "./notifications";
import type { WorkspaceContext } from "./session";
import { requireStepUp } from "./step-up";
import { asSystem, withTenant } from "./tenant";

/**
 * Linki jednorazowe i pakiety przekazania (rozdział 4.6). Serwer przechowuje tylko
 * szyfrogram i skrót klucza dostępu — klucz jest we fragmencie adresu po #.
 */
export async function createShare(ctx: WorkspaceContext, input: z.infer<typeof shareCreateSchema>) {
  if (!canShareExternally(ctx.member, ctx.settings)) throw new ForbiddenError("Tworzenie linków na zewnątrz jest wyłączone dla Twojej roli");
  const maxHours = ctx.settings.maxShareHours ?? 168;
  if (input.expiresInHours > maxHours) throw new ValidationError(`Maksymalna ważność linku w tej przestrzeni to ${maxHours} h`);
  return withTenant(ctx.workspaceId, async (tx) => {
    if (input.kind === "credential") {
      if (!input.credentialId) throw new ValidationError("Brak wpisu");
      const { cred, access } = await getCredentialAccess(tx, ctx, input.credentialId);
      if (!access || cred.clientId !== input.clientId) throw new NotFoundError();
      if (cred.sensitivity === "critical") {
        if (!access.canViewCritical) throw new NotFoundError();
        await requireStepUp(ctx.sessionId);
      }
    } else {
      // Pakiet przekazania zawiera wszystkie dostępy klienta, także krytyczne.
      const access = await getClientAccess(tx, ctx, input.clientId);
      if (!access.canEdit || !access.canViewCritical) throw new ForbiddenError("Pakiet przekazania wymaga pełnego dostępu do sejfu klienta");
      await requireStepUp(ctx.sessionId);
    }
    await tx.insert(schema.shares).values({
      id: input.id,
      workspaceId: ctx.workspaceId,
      kind: input.kind,
      credentialId: input.credentialId,
      clientId: input.clientId,
      ciphertext: input.ciphertext,
      authHash: input.authHash,
      hasPassword: Boolean(input.passwordSalt),
      passwordSalt: input.passwordSalt,
      label: input.label,
      expiresAt: new Date(Date.now() + input.expiresInHours * 3_600_000),
      maxViews: input.maxViews,
      createdBy: ctx.userId,
    });
    await recordAudit(
      {
        workspaceId: ctx.workspaceId,
        actorId: ctx.userId,
        actorName: ctx.userName,
        action: input.kind === "handover" ? "share.handover_create" : "share.create",
        targetType: input.kind === "handover" ? "client" : "credential",
        targetId: input.credentialId ?? input.clientId,
        clientId: input.clientId,
        metadata: { shareId: input.id, hours: input.expiresInHours, maxViews: input.maxViews, password: Boolean(input.passwordSalt) },
      },
      tx,
    );
    return { id: input.id };
  });
}

export async function listShares(ctx: WorkspaceContext, filter: { credentialId?: string; clientId?: string } = {}) {
  return withTenant(ctx.workspaceId, async (tx) => {
    if (filter.clientId) await getClientAccess(tx, ctx, filter.clientId);
    if (filter.credentialId) await getCredentialAccess(tx, ctx, filter.credentialId);
    const managers = ctx.member.role === "owner" || ctx.member.role === "admin";
    const rows = await tx
      .select({
        id: schema.shares.id,
        kind: schema.shares.kind,
        credentialId: schema.shares.credentialId,
        clientId: schema.shares.clientId,
        clientName: schema.clients.name,
        label: schema.shares.label,
        hasPassword: schema.shares.hasPassword,
        expiresAt: schema.shares.expiresAt,
        maxViews: schema.shares.maxViews,
        viewCount: schema.shares.viewCount,
        lastViewedAt: schema.shares.lastViewedAt,
        revokedAt: schema.shares.revokedAt,
        createdAt: schema.shares.createdAt,
        createdByName: schema.user.name,
        createdBy: schema.shares.createdBy,
      })
      .from(schema.shares)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.shares.clientId))
      .leftJoin(schema.user, eq(schema.user.id, schema.shares.createdBy))
      .where(
        and(
          eq(schema.shares.workspaceId, ctx.workspaceId),
          filter.credentialId ? eq(schema.shares.credentialId, filter.credentialId) : undefined,
          filter.clientId ? eq(schema.shares.clientId, filter.clientId) : undefined,
          managers || filter.credentialId || filter.clientId ? undefined : eq(schema.shares.createdBy, ctx.userId),
        ),
      )
      .orderBy(desc(schema.shares.createdAt))
      .limit(200);
    const now = Date.now();
    return rows.map((r) => ({
      ...r,
      status: r.revokedAt ? "revoked" : r.viewCount >= r.maxViews ? "used" : r.expiresAt.getTime() < now ? "expired" : "active",
      expiresAt: r.expiresAt.toISOString(),
      lastViewedAt: r.lastViewedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });
}

export async function revokeShare(ctx: WorkspaceContext, shareId: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const [s] = await tx.select().from(schema.shares).where(and(eq(schema.shares.id, shareId), eq(schema.shares.workspaceId, ctx.workspaceId)));
    if (!s) throw new NotFoundError();
    const managers = ctx.member.role === "owner" || ctx.member.role === "admin";
    if (!managers && s.createdBy !== ctx.userId) throw new ForbiddenError();
    // Unieważnienie usuwa też szyfrogram — nawet z kluczem nie da się go już odczytać.
    await tx.update(schema.shares).set({ revokedAt: new Date(), ciphertext: "revoked-ciphertext-removed" }).where(eq(schema.shares.id, shareId));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "share.revoke", targetType: s.kind === "handover" ? "client" : "credential", targetId: s.credentialId ?? s.clientId, clientId: s.clientId, metadata: { shareId } }, tx);
  });
}

// --- Strona publiczna /share/[id] -----------------------------------------------------

function shareStatus(s: { revokedAt: Date | null; viewCount: number; maxViews: number; expiresAt: Date }) {
  if (s.revokedAt) return "revoked" as const;
  if (s.viewCount >= s.maxViews) return "used" as const;
  if (s.expiresAt.getTime() < Date.now()) return "expired" as const;
  return "active" as const;
}

/** Metadane linku bez zużywania wyświetlenia (czy wymaga hasła, czy jest aktywny). */
export async function publicShareMeta(shareId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(shareId)) throw new NotFoundError("Link nie istnieje");
  const [s] = await asSystem((tx) =>
    tx
      .select({
        id: schema.shares.id,
        kind: schema.shares.kind,
        hasPassword: schema.shares.hasPassword,
        passwordSalt: schema.shares.passwordSalt,
        expiresAt: schema.shares.expiresAt,
        maxViews: schema.shares.maxViews,
        viewCount: schema.shares.viewCount,
        revokedAt: schema.shares.revokedAt,
        workspaceName: schema.workspaces.name,
      })
      .from(schema.shares)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.shares.workspaceId))
      .where(eq(schema.shares.id, shareId)),
  );
  if (!s) throw new NotFoundError("Link nie istnieje");
  return {
    id: s.id,
    kind: s.kind,
    hasPassword: s.hasPassword,
    passwordSalt: s.passwordSalt,
    expiresAt: s.expiresAt.toISOString(),
    remainingViews: Math.max(0, s.maxViews - s.viewCount),
    status: shareStatus(s),
    workspaceName: s.workspaceName,
  };
}

/**
 * Wydaje szyfrogram po okazaniu klucza dostępu i atomowo zalicza wyświetlenie.
 * Po wyczerpaniu wyświetleń lub upływie ważności link przestaje działać (kryterium 6).
 */
export async function consumeShare(shareId: string, accessKey: string, meta: { ip: string | null; userAgent: string | null; country: string | null }) {
  if (!/^[0-9a-f-]{36}$/i.test(shareId)) throw new NotFoundError("Link nie istnieje");
  const limit = await hit(`share:${shareId}:${meta.ip ?? "?"}`, 10, 15 * 60);
  if (!limit.allowed) throw new ForbiddenError("Zbyt wiele prób. Spróbuj ponownie później.");
  const result = await asSystem(async (tx) => {
    const [s] = await tx.select().from(schema.shares).where(eq(schema.shares.id, shareId)).for("update");
    if (!s) throw new NotFoundError("Link nie istnieje");
    if (shareStatus(s) !== "active") throw new GoneError();
    if (!(await verifyShareAccessKey(accessKey, s.authHash))) {
      await recordAudit({ workspaceId: s.workspaceId, actorId: null, action: "share.view_denied", targetType: "share", targetId: shareId, clientId: s.clientId, meta }, tx);
      throw new ForbiddenError(s.hasPassword ? "Nieprawidłowe hasło linku" : "Link jest niekompletny lub uszkodzony");
    }
    const viewCount = s.viewCount + 1;
    const exhausted = viewCount >= s.maxViews;
    await tx
      .update(schema.shares)
      .set({ viewCount, lastViewedAt: new Date(), ...(exhausted ? { ciphertext: "consumed-ciphertext-removed" } : {}) })
      .where(and(eq(schema.shares.id, shareId), lt(schema.shares.viewCount, s.maxViews)));
    await recordAudit(
      { workspaceId: s.workspaceId, actorId: null, actorName: "Odbiorca linku", action: "share.view", targetType: s.kind === "handover" ? "client" : "credential", targetId: s.credentialId ?? s.clientId, clientId: s.clientId, metadata: { shareId, view: viewCount }, meta },
      tx,
    );
    return { ciphertext: s.ciphertext, kind: s.kind, createdBy: s.createdBy, workspaceId: s.workspaceId, label: s.label, remainingViews: s.maxViews - viewCount };
  });
  if (result.createdBy) {
    await notifyUsers([result.createdBy], { workspaceId: result.workspaceId, type: "share", title: `Link jednorazowy został otwarty${result.label ? `: ${result.label}` : ""}`, link: "/dashboard/vault?tab=shares" });
  }
  return { ciphertext: result.ciphertext, kind: result.kind, remainingViews: result.remainingViews };
}

/** Sprzątanie: szyfrogramy wygasłych linków są usuwane (zadanie cykliczne). */
export async function purgeExpiredShares() {
  return asSystem(async (tx) => {
    const res = await tx
      .update(schema.shares)
      .set({ ciphertext: "expired-ciphertext-removed" })
      .where(
        and(
          or(lt(schema.shares.expiresAt, new Date()), sql`${schema.shares.viewCount} >= ${schema.shares.maxViews}`, sql`${schema.shares.revokedAt} is not null`),
          sql`${schema.shares.ciphertext} not like '%-ciphertext-removed'`,
        ),
      )
      .returning({ id: schema.shares.id });
    return res.length;
  });
}

export const activeSharesFilter = (now = new Date()) => and(isNull(schema.shares.revokedAt), gt(schema.shares.expiresAt, now));
