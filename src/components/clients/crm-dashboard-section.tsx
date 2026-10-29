import { ArrowRight, Star, Users } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardRecent, DashboardSearchWhenUnlocked } from "@/components/vault/dashboard-widgets";
import { dashboardData } from "@/lib/dal/dashboard";
import type { WorkspaceContext } from "@/lib/dal/session";
import { cn } from "@/lib/utils";

const severity = {
  danger: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-sky-500",
};

/** Sekcja panelu głównego z modułu klientów: alerty (domeny, SSL, hasła), przypięci klienci, ostatnio używane dostępy. */
export async function CrmDashboardSection({ ctx }: { ctx: WorkspaceContext }) {
  const data = await dashboardData(ctx);
  return (
    <section className="space-y-3" aria-labelledby="crm-dashboard-heading">
      <SectionHeading
        icon={<Users />}
        title={<span id="crm-dashboard-heading">Klienci i dostępy</span>}
        actions={
          <Link href="/dashboard/clients" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Wszyscy klienci
          </Link>
        }
      />
      <DashboardSearchWhenUnlocked />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Alerty</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alerts.length ? (
              <ul className="grid gap-2 md:grid-cols-2">
                {data.alerts.slice(0, 8).map((a, i) => (
                  <li key={i}>
                    <Link href={a.href} className={cn("flex items-center justify-between gap-2 rounded-md border border-l-4 px-3 py-2 text-sm hover:bg-muted", severity[a.severity])}>
                      <span>
                        <span className="sr-only">{a.severity === "danger" ? "Pilne: " : a.severity === "warning" ? "Ostrzeżenie: " : "Informacja: "}</span>
                        {a.title}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Brak alertów — domeny, certyfikaty i hasła w porządku.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="size-4" aria-hidden /> Przypięci klienci
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.favorites.length ? (
              <ul className="space-y-1">
                {data.favorites.map((f) => (
                  <li key={f.id}>
                    <Link href={`/dashboard/clients/${f.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                      {f.name} <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Przypnij klientów gwiazdką na <Link href="/dashboard/clients" className="underline">liście klientów</Link>.
              </p>
            )}
          </CardContent>
        </Card>
        {data.recentCredentialIds.length ? (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm">Ostatnio używane dostępy</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardRecent ids={data.recentCredentialIds} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
