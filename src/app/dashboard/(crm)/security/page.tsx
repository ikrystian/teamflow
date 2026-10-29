import { PageHeader } from "@/components/layout/page-header";
import { SecurityDashboard } from "@/components/security/security-dashboard";
import { workspaceSettings } from "@/lib/dal/account";
import { listReminders } from "@/lib/dal/activity";
import { requireWorkspace } from "@/lib/dal/session";

export const metadata = { title: "Kondycja haseł" };

export default async function SecurityPage({ searchParams }: PageProps<"/dashboard/security">) {
  const ctx = await requireWorkspace();
  const sp = await searchParams;
  const [reminders, mine] = await Promise.all([listReminders(ctx), listReminders(ctx, { mine: true })]);
  return (
    <>
      <PageHeader title="Kondycja haseł" description="Analiza działa w przeglądarce po odblokowaniu sejfu. Serwer zna tylko ocenę siły (0–4) i datę zmiany hasła." />
      <SecurityDashboard
        maxAgeDays={workspaceSettings(ctx.settings).passwordMaxAgeDays}
        reminders={reminders}
        myTaskIds={mine.map((m) => m.id)}
        initialTab={typeof sp.tab === "string" ? sp.tab : "overview"}
        initialList={typeof sp.list === "string" ? sp.list : undefined}
        me={ctx.userId}
      />
    </>
  );
}
