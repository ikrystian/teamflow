import Link from "next/link";
import { ClientHealthCard } from "@/components/clients/client-health";
import { serviceLabel } from "@/components/clients/client-status";
import { StatusBadge } from "@/components/vault/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceSettings } from "@/lib/dal/account";
import { getClient, listContacts, listDomains } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireWorkspace } from "@/lib/dal/session";
import { listAccessRequests } from "@/lib/dal/requests";
import { formatDate, daysUntil } from "@/lib/format";
import { ROLE_LABELS, seesAllClients } from "@/lib/permissions";
import { isAdmin } from "@/lib/admin";
import { projectsForClient } from "@/lib/crm/projects";

export default async function ClientOverviewPage({ params }: PageProps<"/dashboard/clients/[clientId]">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  const client = await orNotFound(getClient(ctx, clientId));
  const [contacts, domains, requests, projects] = await Promise.all([
    listContacts(ctx, clientId),
    listDomains(ctx, clientId),
    listAccessRequests(ctx, { clientId }),
    projectsForClient(clientId, { userId: ctx.userId, seesAll: seesAllClients(ctx.member) || (await isAdmin()) }),
  ]);
  const activeProjects = projects.filter((p) => !p.archived);
  const a = client.address;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Dane firmy</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nazwa</dt>
              <dd className="font-medium">{client.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">NIP</dt>
              <dd>{client.taxId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Adres</dt>
              <dd>{[a.street, [a.postalCode, a.city].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Branża</dt>
              <dd>{client.industry ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Opiekun</dt>
              <dd>{client.owner?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Usługi</dt>
              <dd className="flex flex-wrap gap-1">{client.services.length ? client.services.map((s) => <StatusBadge key={s}>{serviceLabel(s)}</StatusBadge>) : "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Tagi</dt>
              <dd className="flex flex-wrap gap-1">{client.tags.length ? client.tags.map((t) => <StatusBadge key={t}>{t}</StatusBadge>) : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <ClientHealthCard clientId={clientId} maxAgeDays={workspaceSettings(ctx.settings).passwordMaxAgeDays} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zespół</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {client.team.length ? (
            client.team.map((t) => (
              <p key={t.userId} className="flex justify-between">
                <span>{t.name}</span>
                <span className="text-muted-foreground">
                  {ROLE_LABELS[t.role]}
                  {t.canViewCritical ? " · krytyczne" : ""}
                </span>
              </p>
            ))
          ) : (
            <p className="text-muted-foreground">Tylko właściciel i administratorzy.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontakty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {contacts.slice(0, 4).map((c) => (
            <p key={c.id}>
              <span className="font-medium">{c.name}</span>
              {c.role ? <span className="text-muted-foreground"> · {c.role}</span> : null}
              <br />
              <span className="text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</span>
            </p>
          ))}
          <Link href={`/dashboard/clients/${clientId}/contacts`} className="text-sm underline-offset-4 hover:underline">
            {contacts.length ? "Wszystkie kontakty" : "Dodaj kontakt"}
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domeny i hosting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {domains.slice(0, 5).map((d) => (
            <p key={d.id} className="flex justify-between gap-2">
              <span>{d.name}</span>
              <span className={d.expiresAt && daysUntil(d.expiresAt) <= 30 ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>{d.expiresAt ? `wygasa ${formatDate(d.expiresAt)}` : "—"}</span>
            </p>
          ))}
          <Link href={`/dashboard/clients/${clientId}/domains`} className="text-sm underline-offset-4 hover:underline">
            {domains.length ? "Wszystkie domeny" : "Dodaj domenę"}
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projekty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {activeProjects.slice(0, 5).map((p) => (
            <p key={p.id} className="flex items-center justify-between gap-2">
              <Link href={`/dashboard/projects/${p.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden />
                <span className="truncate">{p.name}</span>
              </Link>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {p.doneTasks}/{p.totalTasks}
                {p.overdueTasks ? <span className="ml-1 text-amber-700 dark:text-amber-400">· {p.overdueTasks} po terminie</span> : null}
              </span>
            </p>
          ))}
          <Link href={`/dashboard/clients/${clientId}/projects`} className="text-sm underline-offset-4 hover:underline">
            {activeProjects.length ? "Wszystkie projekty" : "Utwórz projekt"}
          </Link>
        </CardContent>
      </Card>
      {requests.length ? (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Prośby o dostęp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {requests.slice(0, 5).map((r) => (
              <p key={r.id} className="flex justify-between">
                <span>
                  {formatDate(r.createdAt)} · {r.requestedTypes.length} rodzajów dostępu · {r.createdByName}
                </span>
                <span className="text-muted-foreground">{r.status === "submitted" ? "do przejrzenia" : r.expired ? "wygasła" : r.status}</span>
              </p>
            ))}
            <Link href="/dashboard/inbox" className="underline-offset-4 hover:underline">
              Skrzynka „Do przejrzenia”
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
