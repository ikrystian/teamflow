import "server-only";
import { and, count, eq, gt, inArray } from "drizzle-orm";
import { schema, type Tx } from "@/lib/db";
import { redact } from "@/lib/logger";
import { requestMeta, type RequestMeta } from "@/lib/request-meta";
import { notifyManagers } from "./notifications";
import { asSystem } from "./tenant";

/**
 * Dziennik zdarzeń (rozdział 4.7): kto, co, kiedy, na jakim obiekcie, adres IP, urządzenie.
 * Tabela jest tylko do dopisywania (trigger w bazie). Zdarzenia nigdy nie zawierają sekretów —
 * metadane przechodzą przez redakcję kluczy wskazujących na sekrety.
 */
export type AuditInput = {
  workspaceId: string | null;
  actorId: string | null;
  actorName?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  clientId?: string | null;
  metadata?: Record<string, unknown>;
  meta?: RequestMeta;
};

export const SENSITIVE_ACCESS_ACTIONS = [
  "credential.reveal_password",
  "credential.copy_password",
  "credential.copy_totp",
  "credential.reveal_totp",
  "credential.reveal_field",
  "credential.copy_field",
  "credential.reveal_critical",
  "attachment.download",
] as const;

export async function recordAudit(input: AuditInput, tx?: Tx) {
  const meta = input.meta ?? (await requestMeta());
  const row = {
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    actorName: input.actorName ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    clientId: input.clientId ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
    country: meta.country,
    metadata: (redact(input.metadata ?? {}) as Record<string, unknown>) ?? {},
  };
  if (tx) await tx.insert(schema.auditEvents).values(row);
  else await asSystem((t) => t.insert(schema.auditEvents).values(row));

  if (input.workspaceId && input.actorId && (SENSITIVE_ACCESS_ACTIONS as readonly string[]).includes(input.action)) {
    await detectMassCopy(input.workspaceId, input.actorId, input.actorName ?? null).catch(() => {});
  }
}

/** Zapis jednego zdarzenia w każdej przestrzeni użytkownika (np. logowanie). */
export async function recordUserAudit(userId: string | null, action: string, metadata: Record<string, unknown>, meta: RequestMeta, actorName?: string | null) {
  await asSystem(async (tx) => {
    const memberships = userId
      ? await tx.select({ workspaceId: schema.workspaceMembers.workspaceId }).from(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, userId))
      : [];
    const targets = memberships.length ? memberships.map((m) => m.workspaceId) : [null];
    await tx.insert(schema.auditEvents).values(
      targets.map((workspaceId) => ({
        workspaceId,
        actorId: userId,
        actorName: actorName ?? null,
        action,
        targetType: "user",
        targetId: userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        country: meta.country,
        metadata: redact(metadata) as Record<string, unknown>,
      })),
    );
  });
}

/** Alert: nietypowa aktywność — masowe kopiowanie haseł (rozdział 4.7). */
async function detectMassCopy(workspaceId: string, actorId: string, actorName: string | null) {
  const { threshold, total } = await asSystem(async (tx) => {
    const [ws] = await tx.select({ settings: schema.workspaces.settings }).from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
    const since = new Date(Date.now() - 10 * 60_000);
    const [row] = await tx
      .select({ n: count() })
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.workspaceId, workspaceId),
          eq(schema.auditEvents.actorId, actorId),
          inArray(schema.auditEvents.action, [...SENSITIVE_ACCESS_ACTIONS]),
          gt(schema.auditEvents.createdAt, since),
        ),
      );
    return { threshold: ws?.settings.massCopyThreshold ?? 20, total: row?.n ?? 0 };
  });
  if (total < threshold) return;
  await recordAudit({
    workspaceId,
    actorId,
    actorName,
    action: "alert.mass_copy",
    targetType: "user",
    targetId: actorId,
    metadata: { count: total, windowMinutes: 10 },
  });
  await notifyManagers(workspaceId, {
    type: "alert",
    title: `Nietypowa aktywność: ${actorName ?? "użytkownik"} skopiował(a) lub wyświetlił(a) ${total} sekretów w 10 minut`,
    body: "Sprawdź dziennik zdarzeń. Jeśli to nie było zamierzone, zablokuj dostęp tej osoby i zmień hasła.",
    link: `/dashboard/activity?actor=${encodeURIComponent(actorId)}`,
    email: true,
    webhook: true,
    dedupeMinutes: 30,
  });
}
