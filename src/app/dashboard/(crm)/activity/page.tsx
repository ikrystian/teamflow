import { notFound } from "next/navigation";
import { ActivityFilters } from "@/components/security/activity-filters";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listActivity } from "@/lib/dal/activity";
import { listClients } from "@/lib/dal/clients";
import { requireWorkspace } from "@/lib/dal/session";
import { actionLabel } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { auditScope } from "@/lib/permissions";
import { describeDevice } from "@/lib/request-meta";
import Link from "next/link";
import { Download } from "lucide-react";

export const metadata = { title: "Dziennik zdarzeń" };

const ALERT = /^alert\.|failed|denied/;

export default async function ActivityPage({ searchParams }: PageProps<"/dashboard/activity">) {
  const ctx = await requireWorkspace();
  const scope = auditScope(ctx.member);
  if (scope === "none") notFound();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { actor: str("actor"), action: str("action"), clientId: str("client"), from: str("from"), to: str("to"), q: str("q"), page: Number(str("page") ?? 1) };
  const [data, clients] = await Promise.all([listActivity(ctx, filters), listClients(ctx)]);
  const qs = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && k !== "page") as [string, string][]);
  if (filters.clientId) qs.set("client", filters.clientId);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <>
      <PageHeader
        title="Dziennik zdarzeń"
        description={scope === "own" ? "Twoje działania. Pełny dziennik przestrzeni widzi właściciel i administrator." : "Tylko dopisywanie — wpisów nie da się edytować ani usuwać. Retencja zgodna z ustawieniami przestrzeni."}
        actions={
          <Button asChild variant="outline">
            <a href={`/api/activity/export?${qs}`}>
              <Download aria-hidden /> Eksport CSV
            </a>
          </Button>
        }
      />
      <ActivityFilters actors={data.actors} clients={clients.map((c) => ({ id: c.id, name: c.name }))} current={{ ...filters, client: filters.clientId }} />
      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Zdarzenia</caption>
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Kiedy</th>
              <th className="px-3 py-2 font-medium">Kto</th>
              <th className="px-3 py-2 font-medium">Co</th>
              <th className="px-3 py-2 font-medium">Obiekt</th>
              <th className="px-3 py-2 font-medium">Adres IP</th>
              <th className="px-3 py-2 font-medium">Urządzenie</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className={`border-b last:border-0 ${ALERT.test(r.action) ? "bg-red-50/60 dark:bg-red-950/30" : ""}`}>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                <td className="px-3 py-2">{r.actorName ?? "—"}</td>
                <td className="px-3 py-2">
                  {actionLabel(r.action)}
                  <span className="block font-mono text-[11px] text-muted-foreground">{r.action}</span>
                </td>
                <td className="px-3 py-2">
                  {r.clientName ? (
                    <Link href={`/dashboard/clients/${r.clientId}`} className="hover:underline">
                      {r.clientName}
                    </Link>
                  ) : null}
                  {r.targetType ? <span className="block text-xs text-muted-foreground">{r.targetType}</span> : null}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.ip ?? "—"}
                  {r.country ? ` (${r.country})` : ""}
                </td>
                <td className="px-3 py-2 text-xs">{describeDevice(r.userAgent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">Brak zdarzeń dla wybranych filtrów.</p> : null}
      </div>
      <nav aria-label="Strony dziennika" className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {data.total} zdarzeń · strona {data.page} z {pages}
        </span>
        <span className="flex gap-2">
          {data.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/activity?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(data.page - 1) })}`}>Poprzednia</Link>
            </Button>
          ) : null}
          {data.page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/activity?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(data.page + 1) })}`}>Następna</Link>
            </Button>
          ) : null}
        </span>
      </nav>
    </>
  );
}
