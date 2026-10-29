import "server-only";
import { and, count, desc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import { visibleClientIds } from "./access";
import type { WorkspaceContext } from "./session";
import { withTenant } from "./tenant";

export type DashboardAlert = {
  kind: "domain" | "ssl" | "credential_expiry" | "weak" | "old" | "request" | "task" | "rotation" | "keys";
  title: string;
  href: string;
  severity: "info" | "warning" | "danger";
  days?: number;
};

const daysUntil = (d: string | Date) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

/** Pulpit (rozdział 5.6): ostatnio używane dostępy, przypięci klienci, alerty. */
export async function dashboardData(ctx: WorkspaceContext) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const visible = await visibleClientIds(tx, ctx);
    const clientFilter = (col: typeof schema.domains.clientId | typeof schema.credentials.clientId) =>
      visible === "all" ? undefined : visible.length ? inArray(col, visible) : sql`false`;

    // Ostatnio używane: z dziennika własnych działań (kopiowanie, odsłanianie, otwieranie).
    const recent = await tx
      .select({ credentialId: schema.auditEvents.targetId, at: sql<Date>`max(${schema.auditEvents.createdAt})`.as("at") })
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.workspaceId, ctx.workspaceId),
          eq(schema.auditEvents.actorId, ctx.userId),
          eq(schema.auditEvents.targetType, "credential"),
          isNotNull(schema.auditEvents.targetId),
          sql`${schema.auditEvents.action} in ('credential.copy_password','credential.copy_login','credential.copy_totp','credential.reveal_password','credential.open_url','credential.view','credential.create','credential.update')`,
        ),
      )
      .groupBy(schema.auditEvents.targetId)
      .orderBy(desc(sql`at`))
      .limit(10);

    const favorites = await tx
      .select({ id: schema.clients.id, name: schema.clients.name, status: schema.clients.status, logo: schema.clients.logo })
      .from(schema.favorites)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.favorites.clientId))
      .where(and(eq(schema.favorites.userId, ctx.userId), eq(schema.favorites.workspaceId, ctx.workspaceId)));
    const visibleFavorites = visible === "all" ? favorites : favorites.filter((f) => visible.includes(f.id));

    const horizon = new Date(Date.now() + 30 * 86_400_000);
    const alerts: DashboardAlert[] = [];
    const domains = await tx
      .select({ id: schema.domains.id, name: schema.domains.name, clientId: schema.domains.clientId, expiresAt: schema.domains.expiresAt, sslExpiresAt: schema.domains.sslExpiresAt })
      .from(schema.domains)
      .where(and(eq(schema.domains.workspaceId, ctx.workspaceId), clientFilter(schema.domains.clientId)));
    for (const d of domains) {
      if (d.expiresAt && new Date(d.expiresAt) <= horizon) {
        const days = daysUntil(d.expiresAt);
        alerts.push({ kind: "domain", title: days < 0 ? `Domena ${d.name} wygasła` : `Domena ${d.name} wygasa za ${days} dni`, href: `/dashboard/clients/${d.clientId}/domains`, severity: days <= 7 ? "danger" : "warning", days });
      }
      if (d.sslExpiresAt && d.sslExpiresAt <= horizon) {
        const days = daysUntil(d.sslExpiresAt);
        alerts.push({ kind: "ssl", title: days < 0 ? `Certyfikat SSL ${d.name} wygasł` : `Certyfikat SSL ${d.name} wygasa za ${days} dni`, href: `/dashboard/clients/${d.clientId}/domains`, severity: days <= 7 ? "danger" : "warning", days });
      }
    }
    const expiring = await tx
      .select({ id: schema.credentials.id, clientId: schema.credentials.clientId, type: schema.credentials.type, expiresAt: schema.credentials.expiresAt, clientName: schema.clients.name })
      .from(schema.credentials)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.credentials.clientId))
      .where(
        and(
          eq(schema.credentials.workspaceId, ctx.workspaceId),
          isNull(schema.credentials.deletedAt),
          isNotNull(schema.credentials.expiresAt),
          lte(schema.credentials.expiresAt, horizon.toISOString().slice(0, 10)),
          clientFilter(schema.credentials.clientId),
        ),
      );
    const typeLabel: Record<string, string> = { api: "Klucz API", hosting: "Hosting", domain: "Domena" };
    for (const c of expiring) {
      const days = daysUntil(c.expiresAt!);
      alerts.push({ kind: "credential_expiry", title: `${typeLabel[c.type] ?? "Dostęp"} (${c.clientName}) ${days < 0 ? "wygasł" : `wygasa za ${days} dni`}`, href: `/dashboard/clients/${c.clientId}/credentials?open=${c.id}`, severity: days <= 7 ? "danger" : "warning", days });
    }
    const maxAge = ctx.settings.passwordMaxAgeDays ?? 180;
    const [health] = await tx
      .select({
        weak: sql<number>`count(*) filter (where ${schema.credentials.strengthScore} <= 1)`.mapWith(Number),
        old: sql<number>`count(*) filter (where ${schema.credentials.passwordChangedAt} < now() - make_interval(days => ${maxAge}))`.mapWith(Number),
        rotation: sql<number>`count(*) filter (where ${schema.credentials.needsRotation})`.mapWith(Number),
        total: count(),
      })
      .from(schema.credentials)
      .where(and(eq(schema.credentials.workspaceId, ctx.workspaceId), isNull(schema.credentials.deletedAt), clientFilter(schema.credentials.clientId)));
    if (health.weak) alerts.push({ kind: "weak", title: `${health.weak} słabych haseł`, href: "/dashboard/security?list=weak", severity: "warning" });
    if (health.old) alerts.push({ kind: "old", title: `${health.old} haseł starszych niż ${maxAge} dni`, href: "/dashboard/security?list=old", severity: "info" });
    if (health.rotation) alerts.push({ kind: "rotation", title: `${health.rotation} haseł oznaczonych „do zmiany”`, href: "/dashboard/security?list=rotation", severity: "warning" });
    const [{ n: submitted }] = await tx
      .select({ n: count() })
      .from(schema.accessRequests)
      .where(and(eq(schema.accessRequests.workspaceId, ctx.workspaceId), eq(schema.accessRequests.status, "submitted"), clientFilter(schema.accessRequests.clientId as never)));
    if (submitted) alerts.push({ kind: "request", title: `${submitted} wypełnionych próśb o dostęp do przejrzenia`, href: "/dashboard/inbox", severity: "info" });
    const [{ n: tasks }] = await tx
      .select({ n: count() })
      .from(schema.reminders)
      .where(and(eq(schema.reminders.workspaceId, ctx.workspaceId), eq(schema.reminders.assigneeUserId, ctx.userId), eq(schema.reminders.status, "open")));
    if (tasks) alerts.push({ kind: "task", title: `Masz ${tasks} zadań do wykonania`, href: "/dashboard/security?tab=tasks", severity: "warning" });
    if (ctx.member.role === "owner" || ctx.member.role === "admin") {
      const [{ n: pendingKeys }] = await tx
        .select({ n: count() })
        .from(schema.workspaceMembers)
        .where(and(eq(schema.workspaceMembers.workspaceId, ctx.workspaceId), eq(schema.workspaceMembers.pendingKeyApproval, true)));
      if (pendingKeys) alerts.push({ kind: "keys", title: `${pendingKeys} osób czeka na zatwierdzenie kluczy po resecie`, href: "/dashboard/settings/team", severity: "danger" });
    }
    alerts.sort((a, b) => (a.severity === b.severity ? (a.days ?? 999) - (b.days ?? 999) : a.severity === "danger" ? -1 : b.severity === "danger" ? 1 : a.severity === "warning" ? -1 : 1));
    return {
      recentCredentialIds: recent.map((r) => r.credentialId!).filter(Boolean),
      favorites: visibleFavorites,
      alerts,
      health: { total: health.total, weak: health.weak, old: health.old, rotation: health.rotation },
    };
  });
}
