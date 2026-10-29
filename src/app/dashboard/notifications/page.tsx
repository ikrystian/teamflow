import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MarkAllRead } from "@/components/security/mark-all-read";
import { listNotifications } from "@/lib/dal/activity";
import { getAuthState } from "@/lib/dal/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Powiadomienia" };

export default async function NotificationsPage() {
  const state = await getAuthState();
  if (!state) redirect("/auth/signin?next=/dashboard/notifications");
  const { items, unread } = await listNotifications(state.user.id, 200);
  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <PageHeader title="Powiadomienia" description="Treść powiadomień nigdy nie zawiera sekretów." actions={unread ? <MarkAllRead /> : null} />
      {items.length ? (
        <ul className="divide-y rounded-lg border">
          {items.map((n) => (
            <li key={n.id} className={`p-3 ${n.readAt ? "" : "bg-muted/50"}`}>
              {n.link ? (
                <Link href={n.link} className="text-sm font-medium hover:underline">
                  {n.title}
                </Link>
              ) : (
                <p className="text-sm font-medium">{n.title}</p>
              )}
              {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
              <p className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Brak powiadomień.</p>
      )}
    </div>
  );
}
