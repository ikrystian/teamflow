import "server-only";
import { and, eq, gt, inArray } from "drizzle-orm";
import { schema, type Tx } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { asSystem } from "./tenant";

export type NotificationInput = {
  workspaceId: string | null;
  type: string;
  /** Tytuł i treść nigdy nie zawierają sekretów. */
  title: string;
  body?: string;
  link?: string;
  /** Wysłać także e-mail (z poszanowaniem preferencji użytkownika). */
  email?: boolean;
  /** Wysłać na webhook Slack/Teams przestrzeni. */
  webhook?: boolean;
  /** Nie twórz drugiego takiego samego powiadomienia w tym oknie (minuty). */
  dedupeMinutes?: number;
};

export async function notifyUsers(userIds: string[], n: NotificationInput) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return;
  const recipients = await asSystem(async (tx) => {
    let targets = unique;
    if (n.dedupeMinutes) {
      const since = new Date(Date.now() - n.dedupeMinutes * 60_000);
      const existing = await tx
        .select({ userId: schema.notifications.userId })
        .from(schema.notifications)
        .where(and(inArray(schema.notifications.userId, unique), eq(schema.notifications.type, n.type), eq(schema.notifications.title, n.title), gt(schema.notifications.createdAt, since)));
      const skip = new Set(existing.map((e) => e.userId));
      targets = unique.filter((u) => !skip.has(u));
    }
    if (!targets.length) return [];
    await tx.insert(schema.notifications).values(
      targets.map((userId) => ({ workspaceId: n.workspaceId, userId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null })),
    );
    return tx
      .select({ id: schema.user.id, email: schema.user.email, preferences: schema.user.preferences })
      .from(schema.user)
      .where(inArray(schema.user.id, targets));
  });

  if (n.email) {
    await Promise.all(
      recipients
        .filter((r) => r.preferences?.emailNotifications !== false)
        .map((r) =>
          sendEmail(r.email, n.title, {
            preview: n.title,
            title: n.title,
            paragraphs: n.body ? [n.body] : [],
            action: n.link ? { href: appUrl(n.link), label: "Otwórz w Nexusie" } : undefined,
          }),
        ),
    );
  }
  if (n.webhook && n.workspaceId && recipients.length) await postWorkspaceWebhooks(n.workspaceId, n.title, n.body, n.link);
  // Powiadomienia push przeglądarki (te same subskrypcje co przypomnienia o zadaniach) — bez sekretów.
  if (recipients.length) {
    const { sendPushToUser } = await import("@/lib/push");
    await Promise.all(
      recipients.map((r) => sendPushToUser(r.id, { title: n.title, body: n.body, url: n.link ?? "/dashboard/notifications", tag: n.type }).catch((error) => logger.warn("notifications.push_failed", { error }))),
    );
  }
}

/** Powiadamia właściciela i administratorów przestrzeni. */
export async function notifyManagers(workspaceId: string, n: Omit<NotificationInput, "workspaceId">, tx?: Tx) {
  const run = async (t: Tx) =>
    t
      .select({ userId: schema.workspaceMembers.userId })
      .from(schema.workspaceMembers)
      .where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), inArray(schema.workspaceMembers.role, ["owner", "admin"]), eq(schema.workspaceMembers.status, "active")));
  const rows = tx ? await run(tx) : await asSystem(run);
  await notifyUsers(
    rows.map((r) => r.userId),
    { ...n, workspaceId },
  );
}

/** Slack / Teams (rozdział 4.8). Wysyłany jest wyłącznie tytuł, opis i link — nigdy sekrety. */
export async function postWorkspaceWebhooks(workspaceId: string, title: string, body?: string, link?: string) {
  const ws = await asSystem((tx) =>
    tx.select({ settings: schema.workspaces.settings }).from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)),
  );
  const settings = ws[0]?.settings;
  if (!settings) return;
  const url = link ? appUrl(link) : undefined;
  const text = [title, body, url].filter(Boolean).join("\n");
  const tasks: Promise<unknown>[] = [];
  if (settings.slackWebhookUrl) {
    tasks.push(fetch(settings.slackWebhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }));
  }
  if (settings.teamsWebhookUrl) {
    tasks.push(
      fetch(settings.teamsWebhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "@type": "MessageCard", "@context": "https://schema.org/extensions", summary: title, title, text: [body, url].filter(Boolean).join("<br>") }),
      }),
    );
  }
  const results = await Promise.allSettled(tasks);
  for (const r of results) if (r.status === "rejected") logger.warn("webhook.failed", { error: r.reason });
}
