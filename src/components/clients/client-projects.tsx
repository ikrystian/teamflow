"use client";

import { AlertTriangle, CheckCircle2, Clock, FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/layout/page-header";
import { CreateProjectSheet } from "@/components/projects/create-project-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ClientProject } from "@/lib/crm/projects";
import { formatRelative } from "@/lib/format";

/** Projekty klienta z modułu projektów: postęp zadań, zaległości i zalogowany czas. */
export function ClientProjects({ clientId, clientName, projects }: { clientId: string; clientName: string; projects: ClientProject[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const active = projects.filter((p) => !p.archived);
  const totals = active.reduce(
    (acc, p) => ({ tasks: acc.tasks + p.totalTasks, done: acc.done + p.doneTasks, overdue: acc.overdue + p.overdueTasks, hours: acc.hours + p.hoursLogged }),
    { tasks: 0, done: 0, overdue: 0, hours: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <dl className="grid grid-cols-2 gap-3 sm:flex sm:gap-6">
          <Stat icon={<FolderOpen className="size-4" aria-hidden />} label="Aktywne projekty" value={active.length} />
          <Stat icon={<CheckCircle2 className="size-4" aria-hidden />} label="Zadania ukończone" value={`${totals.done}/${totals.tasks}`} />
          <Stat icon={<AlertTriangle className="size-4" aria-hidden />} label="Po terminie" value={totals.overdue} />
          <Stat icon={<Clock className="size-4" aria-hidden />} label="Zalogowany czas" value={`${Math.round(totals.hours * 10) / 10} h`} />
        </dl>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden /> Nowy projekt
        </Button>
      </div>

      {projects.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const progress = p.totalTasks ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="group rounded-xl focus-visible:outline-none">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden />
                      <span className="truncate">{p.name}</span>
                      {p.archived ? <Badge variant="secondary">archiwum</Badge> : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {p.doneTasks} z {p.totalTasks} zadań
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} aria-label={`Postęp projektu ${p.name}`} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{p.hoursLogged} h</span>
                      {p.overdueTasks ? <span className="font-medium text-amber-700 dark:text-amber-400">{p.overdueTasks} po terminie</span> : null}
                      <span>aktywność {formatRelative(p.lastActivityAt)}</span>
                    </div>
                    {p.members.length ? (
                      <div className="flex -space-x-2">
                        {p.members.slice(0, 6).map((m) => (
                          <Avatar key={m.id} className="size-6 border-2 border-background">
                            <AvatarImage src={m.avatarUrl ?? undefined} alt={m.name ?? ""} />
                            <AvatarFallback className="text-[10px]">{(m.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen className="size-8" aria-hidden />}
          title="Brak projektów"
          description={`Utwórz projekt dla klienta ${clientName} albo przypisz istniejący projekt w jego ustawieniach.`}
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus aria-hidden /> Nowy projekt
            </Button>
          }
        />
      )}

      <CreateProjectSheet open={creating} onOpenChange={setCreating} onProjectCreated={() => (setCreating(false), router.refresh())} defaultClientId={clientId} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-semibold tabular-nums">{value}</dd>
      </div>
    </div>
  );
}
