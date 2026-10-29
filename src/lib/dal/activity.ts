import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import { auditScope } from "@/lib/permissions";
import { recordAudit } from "./audit";
import { ForbiddenError } from "./errors";
import type { WorkspaceContext } from "./session";
import { withTenant } from "./tenant";

export type ActivityFilter = {
  actor?: string;
  action?: string;
  clientId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
};

export const PAGE_SIZE = 50;

function whereFor(ctx: WorkspaceContext, f: ActivityFilter) {
  const scope = auditScope(ctx.member);
  if (scope === "none") throw new ForbiddenError("Rola „tylko odczyt” nie ma dostępu do dziennika zdarzeń");
  return and(
    eq(schema.auditEvents.workspaceId, ctx.workspaceId),
    scope === "own" ? eq(schema.auditEvents.actorId, ctx.userId) : f.actor ? eq(schema.auditEvents.actorId, f.actor) : undefined,
    f.action ? ilike(schema.auditEvents.action, `${f.action.replace(/[%_]/g, "")}%`) : undefined,
    f.clientId ? eq(schema.auditEvents.clientId, f.clientId) : undefined,
    f.from ? gte(schema.auditEvents.createdAt, new Date(`${f.from}T00:00:00`)) : undefined,
    f.to ? lte(schema.auditEvents.createdAt, new Date(`${f.to}T23:59:59`)) : undefined,
    f.q ? or(ilike(schema.auditEvents.actorName, `%${f.q}%`), ilike(schema.auditEvents.ip, `%${f.q}%`), ilike(schema.auditEvents.targetId, `%${f.q}%`)) : undefined,
  );
}

export async function listActivity(ctx: WorkspaceContext, f: ActivityFilter) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const where = whereFor(ctx, f);
    const page = Math.max(1, f.page ?? 1);
    const rows = await tx
      .select({
        id: schema.auditEvents.id,
        action: schema.auditEvents.action,
        actorId: schema.auditEvents.actorId,
        actorName: schema.auditEvents.actorName,
        targetType: schema.auditEvents.targetType,
        targetId: schema.auditEvents.targetId,
        clientId: schema.auditEvents.clientId,
        clientName: schema.clients.name,
        ip: schema.auditEvents.ip,
        userAgent: schema.auditEvents.userAgent,
        country: schema.auditEvents.country,
        metadata: schema.auditEvents.metadata,
        createdAt: schema.auditEvents.createdAt,
      })
      .from(schema.auditEvents)
      .leftJoin(schema.clients, eq(schema.clients.id, schema.auditEvents.clientId))
      .where(where)
      .orderBy(desc(schema.auditEvents.createdAt), desc(schema.auditEvents.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    const [{ n }] = await tx.select({ n: count() }).from(schema.auditEvents).where(where);
    const actors =
      auditScope(ctx.member) === "workspace"
        ? await tx
            .select({ id: schema.user.id, name: schema.user.name })
            .from(schema.workspaceMembers)
            .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
            .where(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId))
            .orderBy(asc(schema.user.name))
        : [];
    return { rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), total: n, page, pageSize: PAGE_SIZE, actors };
  });
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Ochrona przed wstrzyknięciem formuł w arkuszach kalkulacyjnych.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function exportActivityCsv(ctx: WorkspaceContext, f: ActivityFilter) {
  const csv = await withTenant(ctx.workspaceId, async (tx) => {
    const rows = await tx
      .select({
        createdAt: schema.auditEvents.createdAt,
        actorName: schema.auditEvents.actorName,
        action: schema.auditEvents.action,
        targetType: schema.auditEvents.targetType,
        targetId: schema.auditEvents.targetId,
        clientName: schema.clients.name,
        ip: schema.auditEvents.ip,
        country: schema.auditEvents.country,
        userAgent: schema.auditEvents.userAgent,
        metadata: schema.auditEvents.metadata,
      })
      .from(schema.auditEvents)
      .leftJoin(schema.clients, eq(schema.clients.id, schema.auditEvents.clientId))
      .where(whereFor(ctx, f))
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(100_000);
    const header = ["czas", "kto", "akcja", "typ obiektu", "obiekt", "klient", "IP", "kraj", "urządzenie", "szczegóły"];
    return [header.map(csvCell).join(";"), ...rows.map((r) => [r.createdAt.toISOString(), r.actorName, r.action, r.targetType, r.targetId, r.clientName, r.ip, r.country, r.userAgent, r.metadata].map(csvCell).join(";"))].join("\r\n");
  });
  await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "export.audit_csv", targetType: "workspace", targetId: ctx.workspaceId, metadata: { filters: Object.keys(f).length } });
  return csv;
}

// --- Powiadomienia i zadania -------------------------------------------------------------

export async function listNotifications(userId: string, limit = 50) {
  const { db } = await import("@/lib/db");
  const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt)).limit(limit);
  const [{ n }] = await db.select({ n: count() }).from(schema.notifications).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return { items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), readAt: r.readAt?.toISOString() ?? null })), unread: n };
}

export async function markNotificationsRead(userId: string, ids: string[] | "all") {
  const { db } = await import("@/lib/db");
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt), ids === "all" ? undefined : inArray(schema.notifications.id, ids)));
}

export async function listReminders(ctx: WorkspaceContext, opts: { mine?: boolean; status?: "open" | "done" | "dismissed" } = {}) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const { visibleClientIds } = await import("./access");
    const visible = await visibleClientIds(tx, ctx);
    const rows = await tx
      .select({
        id: schema.reminders.id,
        kind: schema.reminders.kind,
        targetType: schema.reminders.targetType,
        targetId: schema.reminders.targetId,
        clientId: schema.reminders.clientId,
        clientName: schema.clients.name,
        assigneeUserId: schema.reminders.assigneeUserId,
        assigneeName: schema.user.name,
        title: schema.reminders.title,
        dueAt: schema.reminders.dueAt,
        status: schema.reminders.status,
        createdAt: schema.reminders.createdAt,
      })
      .from(schema.reminders)
      .leftJoin(schema.clients, eq(schema.clients.id, schema.reminders.clientId))
      .leftJoin(schema.user, eq(schema.user.id, schema.reminders.assigneeUserId))
      .where(
        and(
          eq(schema.reminders.workspaceId, ctx.workspaceId),
          eq(schema.reminders.status, opts.status ?? "open"),
          opts.mine ? eq(schema.reminders.assigneeUserId, ctx.userId) : undefined,
          visible === "all" ? undefined : or(eq(schema.reminders.assigneeUserId, ctx.userId), visible.length ? inArray(schema.reminders.clientId, visible) : sql`false`),
        ),
      )
      .orderBy(asc(schema.reminders.dueAt))
      .limit(500);
    return rows.map((r) => ({ ...r, dueAt: r.dueAt.toISOString(), createdAt: r.createdAt.toISOString() }));
  });
}

export async function setReminderStatus(ctx: WorkspaceContext, id: string, status: "done" | "dismissed" | "open") {
  return withTenant(ctx.workspaceId, async (tx) => {
    const [r] = await tx.select().from(schema.reminders).where(and(eq(schema.reminders.id, id), eq(schema.reminders.workspaceId, ctx.workspaceId)));
    if (!r) throw new ForbiddenError();
    if (r.clientId && r.assigneeUserId !== ctx.userId) {
      const { getClientAccess } = await import("./access");
      await getClientAccess(tx, ctx, r.clientId);
    }
    await tx.update(schema.reminders).set({ status, completedAt: status === "open" ? null : new Date() }).where(eq(schema.reminders.id, id));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: `reminder.${status}`, targetType: r.targetType, targetId: r.targetId, clientId: r.clientId, metadata: { kind: r.kind } }, tx);
  });
}
