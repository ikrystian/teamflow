import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { schema, type Tx } from "@/lib/db";
import type { ReminderKind } from "@/lib/db/schema";
import { workspaceSettings } from "@/lib/dal/account";
import { notifyUsers, postWorkspaceWebhooks } from "@/lib/dal/notifications";
import { purgeExpiredShares } from "@/lib/dal/shares";
import { asSystem } from "@/lib/dal/tenant";
import { checkSsl } from "@/lib/integrations/ssl";
import { logger } from "@/lib/logger";

/**
 * Zadania cykliczne (rozdział 4.8): przypomnienia o wygasających domenach, hostingu, SSL,
 * kluczach API i starych hasłach; retencja dziennika; przypomnienia RODO; sprzątanie.
 * Treść przypomnień nigdy nie zawiera sekretów.
 */
type NewReminder = {
  workspaceId: string;
  kind: ReminderKind;
  targetType: string;
  targetId: string;
  clientId: string | null;
  assigneeUserId: string | null;
  title: string;
  dueAt: Date;
  dedupeKey: string;
};

async function insertReminders(tx: Tx, rows: NewReminder[]) {
  if (!rows.length) return [];
  return tx.insert(schema.reminders).values(rows).onConflictDoNothing().returning({ id: schema.reminders.id, workspaceId: schema.reminders.workspaceId, title: schema.reminders.title, assigneeUserId: schema.reminders.assigneeUserId, clientId: schema.reminders.clientId, kind: schema.reminders.kind });
}

const daysUntil = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86_400_000);
/** Próg przypomnienia, w który wpada data (np. 30/14/7/1 dzień) — część klucza deduplikacji. */
function bucket(days: number, thresholds: number[]): number | null {
  const sorted = [...thresholds].sort((a, b) => a - b);
  if (days < 0) return -1;
  return sorted.find((t) => days <= t) ?? null;
}

export async function generateReminders() {
  return asSystem(async (tx) => {
    const workspaces = await tx.select({ id: schema.workspaces.id, settings: schema.workspaces.settings }).from(schema.workspaces);
    const created: Awaited<ReturnType<typeof insertReminders>> = [];
    for (const ws of workspaces) {
      const s = workspaceSettings(ws.settings);
      const maxDays = Math.max(...s.expiryReminderDays);
      const horizon = new Date(Date.now() + maxDays * 86_400_000);
      const rows: NewReminder[] = [];
      const clients = await tx.select({ id: schema.clients.id, name: schema.clients.name, ownerUserId: schema.clients.ownerUserId }).from(schema.clients).where(eq(schema.clients.workspaceId, ws.id));
      const clientById = new Map(clients.map((c) => [c.id, c]));

      const domains = await tx.select().from(schema.domains).where(eq(schema.domains.workspaceId, ws.id));
      for (const d of domains) {
        const c = clientById.get(d.clientId);
        const checks: [ReminderKind, Date | null, string][] = [
          ["domain_expiry", d.expiresAt ? new Date(d.expiresAt) : null, `Domena ${d.name} wygasa`],
          ["ssl_expiry", d.sslExpiresAt, `Certyfikat SSL ${d.name} wygasa`],
          ["hosting_renewal", d.hostingRenewsAt ? new Date(d.hostingRenewsAt) : null, `Odnowienie hostingu ${d.hosting ?? d.name}`],
        ];
        for (const [kind, date, title] of checks) {
          if (!date || date > horizon) continue;
          const b = bucket(daysUntil(date), s.expiryReminderDays);
          if (b === null) continue;
          rows.push({ workspaceId: ws.id, kind, targetType: "domain", targetId: d.id, clientId: d.clientId, assigneeUserId: c?.ownerUserId ?? null, title: `${title} (${c?.name ?? ""}) — ${date.toLocaleDateString("pl-PL")}`, dueAt: date, dedupeKey: `${kind}:${d.id}:${date.toISOString().slice(0, 10)}:${b}` });
        }
      }

      const expiring = await tx
        .select({ id: schema.credentials.id, clientId: schema.credentials.clientId, type: schema.credentials.type, expiresAt: schema.credentials.expiresAt })
        .from(schema.credentials)
        .where(and(eq(schema.credentials.workspaceId, ws.id), isNull(schema.credentials.deletedAt), isNotNull(schema.credentials.expiresAt), lte(schema.credentials.expiresAt, horizon.toISOString().slice(0, 10))));
      const label: Record<string, string> = { api: "Klucz API", hosting: "Hosting", domain: "Domena" };
      for (const cr of expiring) {
        const date = new Date(cr.expiresAt!);
        const b = bucket(daysUntil(date), s.expiryReminderDays);
        if (b === null) continue;
        const c = clientById.get(cr.clientId);
        rows.push({ workspaceId: ws.id, kind: "credential_expiry", targetType: "credential", targetId: cr.id, clientId: cr.clientId, assigneeUserId: c?.ownerUserId ?? null, title: `${label[cr.type] ?? "Dostęp"} wygasa (${c?.name ?? ""}) — ${date.toLocaleDateString("pl-PL")}`, dueAt: date, dedupeKey: `credential_expiry:${cr.id}:${cr.expiresAt}:${b}` });
      }

      const old = await tx
        .select({ id: schema.credentials.id, clientId: schema.credentials.clientId, passwordChangedAt: schema.credentials.passwordChangedAt })
        .from(schema.credentials)
        .where(and(eq(schema.credentials.workspaceId, ws.id), isNull(schema.credentials.deletedAt), lt(schema.credentials.passwordChangedAt, new Date(Date.now() - s.passwordMaxAgeDays * 86_400_000))));
      for (const cr of old) {
        const c = clientById.get(cr.clientId);
        rows.push({ workspaceId: ws.id, kind: "password_old", targetType: "credential", targetId: cr.id, clientId: cr.clientId, assigneeUserId: c?.ownerUserId ?? null, title: `Hasło starsze niż ${s.passwordMaxAgeDays} dni (${c?.name ?? ""})`, dueAt: new Date(), dedupeKey: `password_old:${cr.id}:${cr.passwordChangedAt!.toISOString().slice(0, 10)}` });
      }

      // RODO: po zakończeniu współpracy przypomnienie o usunięciu dostępów i zmianie haseł przez klienta.
      const ended = await tx
        .select({ id: schema.clients.id, name: schema.clients.name, ownerUserId: schema.clients.ownerUserId, endedAt: schema.clients.endedAt })
        .from(schema.clients)
        .where(and(eq(schema.clients.workspaceId, ws.id), eq(schema.clients.status, "ended"), lt(schema.clients.endedAt, new Date(Date.now() - s.archivedClientCleanupDays * 86_400_000))));
      for (const c of ended) {
        rows.push({ workspaceId: ws.id, kind: "client_cleanup", targetType: "client", targetId: c.id, clientId: c.id, assigneeUserId: c.ownerUserId, title: `Usuń dostępy zakończonego klienta ${c.name} i zarekomenduj mu zmianę haseł`, dueAt: new Date(), dedupeKey: `client_cleanup:${c.id}:${c.endedAt!.toISOString().slice(0, 10)}` });
      }
      created.push(...(await insertReminders(tx, rows)));
    }
    return created;
  });
}

/** Powiadamia o nowych przypomnieniach (opiekun klienta lub zarządzający). */
async function deliverReminders(created: Awaited<ReturnType<typeof generateReminders>>) {
  const byWs = new Map<string, typeof created>();
  for (const r of created) byWs.set(r.workspaceId, [...(byWs.get(r.workspaceId) ?? []), r]);
  for (const [workspaceId, items] of byWs) {
    const managers = await asSystem((tx) =>
      tx.select({ userId: schema.workspaceMembers.userId }).from(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), inArray(schema.workspaceMembers.role, ["owner", "admin"]))),
    );
    for (const r of items) {
      const recipients = r.assigneeUserId ? [r.assigneeUserId] : managers.map((m) => m.userId);
      await notifyUsers(recipients, { workspaceId, type: "reminder", title: r.title, link: r.clientId ? `/dashboard/clients/${r.clientId}` : "/dashboard/security?tab=tasks", email: true });
    }
    if (items.length) await postWorkspaceWebhooks(workspaceId, `Nexus: ${items.length} nowych przypomnień`, items.slice(0, 10).map((i) => `• ${i.title}`).join("\n"), "/dashboard/security?tab=tasks");
  }
}

export async function refreshSslCertificates(limit = 100) {
  const due = await asSystem((tx) =>
    tx
      .select({ id: schema.domains.id, name: schema.domains.name })
      .from(schema.domains)
      .where(and(eq(schema.domains.autoCheckSsl, true), sql`(${schema.domains.sslCheckedAt} is null or ${schema.domains.sslCheckedAt} < now() - interval '20 hours')`))
      .limit(limit),
  );
  for (const d of due) {
    const r = await checkSsl(d.name);
    await asSystem((tx) => tx.update(schema.domains).set({ sslExpiresAt: r.expiresAt, sslIssuer: r.issuer, sslError: r.error, sslCheckedAt: new Date() }).where(eq(schema.domains.id, d.id)));
  }
  return due.length;
}

/** Retencja dziennika zdarzeń (domyślnie 12 miesięcy) — jedyne dozwolone usuwanie wpisów. */
export async function applyAuditRetention() {
  return asSystem(
    async (tx) => {
      const workspaces = await tx.select({ id: schema.workspaces.id, settings: schema.workspaces.settings }).from(schema.workspaces);
      let removed = 0;
      for (const ws of workspaces) {
        const months = workspaceSettings(ws.settings).auditRetentionMonths;
        const res = await tx
          .delete(schema.auditEvents)
          .where(and(eq(schema.auditEvents.workspaceId, ws.id), lt(schema.auditEvents.createdAt, sql`now() - make_interval(months => ${months})`)))
          .returning({ id: schema.auditEvents.id });
        removed += res.length;
      }
      const res = await tx.delete(schema.auditEvents).where(and(isNull(schema.auditEvents.workspaceId), lt(schema.auditEvents.createdAt, sql`now() - interval '12 months'`))).returning({ id: schema.auditEvents.id });
      return removed + res.length;
    },
    { auditMaintenance: true },
  );
}

export async function cleanupEphemeral() {
  return asSystem(async (tx) => {
    await tx.delete(schema.stepUps).where(lt(schema.stepUps.expiresAt, new Date()));
    await tx.delete(schema.webauthnChallenges).where(lt(schema.webauthnChallenges.expiresAt, new Date()));
    await tx.delete(schema.notifications).where(and(isNotNull(schema.notifications.readAt), lt(schema.notifications.createdAt, new Date(Date.now() - 90 * 86_400_000))));
    await tx.delete(schema.session).where(lt(schema.session.expiresAt, new Date()));
    await tx.delete(schema.invitations).where(and(lt(schema.invitations.expiresAt, new Date(Date.now() - 30 * 86_400_000)), isNull(schema.invitations.acceptedAt)));
    await tx.update(schema.accessRequests).set({ status: "revoked" }).where(and(eq(schema.accessRequests.status, "pending"), lt(schema.accessRequests.expiresAt, new Date(Date.now() - 86_400_000))));
  });
}

export async function runDailyJobs() {
  const started = Date.now();
  const ssl = await refreshSslCertificates().catch((e) => (logger.error("job.ssl_failed", { error: e }), 0));
  const created = await generateReminders();
  await deliverReminders(created);
  const retention = await applyAuditRetention();
  const shares = await purgeExpiredShares();
  await cleanupEphemeral();
  const summary = { ssl, reminders: created.length, auditRemoved: retention, sharesPurged: shares, ms: Date.now() - started };
  logger.info("jobs.daily", summary);
  return summary;
}
