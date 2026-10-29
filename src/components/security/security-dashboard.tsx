"use client";

import { Check, Loader2, ShieldCheck, ShieldX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/vault/badges";
import { TypeIcon } from "@/components/vault/category";
import { PasswordGenerator } from "@/components/vault/password-generator";
import { Input } from "@/components/ui/input";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { analyzeHealth, FLAG_LABELS, scoreLabel, type HealthFlag } from "@/lib/vault/health";
import { checkBreaches, syncVault, useVault } from "@/lib/vault/store";
import { markRotationAction } from "@/server/actions/vault";
import { setReminderStatusAction } from "@/server/actions/workspace";

type Reminder = { id: string; kind: string; targetType: string; targetId: string; clientId: string | null; clientName: string | null; assigneeName: string | null; title: string; dueAt: string; status: string };

const KIND_LABEL: Record<string, string> = {
  domain_expiry: "Domena",
  ssl_expiry: "SSL",
  hosting_renewal: "Hosting",
  credential_expiry: "Wygasanie",
  password_old: "Stare hasło",
  password_breached: "Wyciek",
  password_rotate: "Zmień hasło",
  client_cleanup: "RODO",
};

function ScoreRing({ score }: { score: number | null }) {
  const l = scoreLabel(score);
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("text-4xl font-semibold tabular-nums", l.tone === "good" && "text-emerald-700 dark:text-emerald-400", l.tone === "ok" && "text-amber-700 dark:text-amber-400", l.tone === "bad" && "text-red-700 dark:text-red-400")}>{score ?? "—"}</span>
      <span className="text-sm text-muted-foreground">/ 100 · {l.label}</span>
    </div>
  );
}

export function SecurityDashboard({ maxAgeDays, reminders, myTaskIds, initialTab, initialList, me }: { maxAgeDays: number; reminders: Reminder[]; myTaskIds: string[]; initialTab: string; initialList?: string; me: string }) {
  const router = useRouter();
  const items = useVault((s) => s.items);
  const clients = useVault((s) => s.clients);
  const breached = useVault((s) => s.breached);
  const checkedAt = useVault((s) => s.breachCheckedAt);
  const [list, setList] = useState<HealthFlag>((initialList as HealthFlag) ?? "weak");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [gen, setGen] = useState("");
  const health = useMemo(() => analyzeHealth(items, { maxAgeDays, breached }), [items, maxAgeDays, breached]);
  const byClient = useMemo(
    () =>
      clients
        .map((c) => {
          const ci = items.filter((i) => i.clientId === c.id);
          const h = analyzeHealth(ci, { maxAgeDays, breached });
          return { client: c, score: h.score, count: ci.length, problems: [...h.flags.values()].filter((f) => f.size).length };
        })
        .filter((x) => x.count)
        .sort((a, b) => (a.score ?? 101) - (b.score ?? 101)),
    [clients, items, maxAgeDays, breached],
  );
  const byId = new Map(items.map((i) => [i.id, i]));
  const listItems = health.lists[list].map((id) => byId.get(id)!).filter(Boolean);
  const mine = new Set(myTaskIds);

  async function runBreachCheck() {
    setProgress({ done: 0, total: 0 });
    const r = await checkBreaches((done, total) => setProgress({ done, total }));
    setProgress(null);
    const n = Object.keys(r).length;
    if (n) toast.warning(`Znaleziono ${n} haseł w wyciekach`);
    else toast.success("Nie znaleziono haseł w znanych wyciekach");
  }

  async function markForRotation(ids: string[]) {
    const r = await markRotationAction(ids, true);
    if (!r.ok) return toast.error(r.error);
    await syncVault();
    toast.success("Oznaczono do zmiany i utworzono zadania");
    router.refresh();
  }

  async function setStatus(id: string, status: "done" | "dismissed") {
    const r = await setReminderStatusAction(id, status);
    if (!r.ok) return toast.error(r.error);
    router.refresh();
  }

  const href = (i: (typeof items)[number]) => (i.direct ? `/dashboard/vault?open=${i.id}` : `/dashboard/clients/${i.clientId}/credentials?open=${i.id}`);

  return (
    <Tabs defaultValue={initialTab}>
      <TabsList>
        <TabsTrigger value="overview">Przegląd</TabsTrigger>
        <TabsTrigger value="tasks">Zadania ({reminders.length})</TabsTrigger>
        <TabsTrigger value="generator">Generator</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 pt-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kondycja przestrzeni</CardTitle>
              <CardDescription>{items.length} dostępów, do których masz wgląd</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreRing score={health.score} />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Wycieki haseł (Pwned Passwords)</CardTitle>
              <CardDescription>Metoda k-anonimowości: do usługi trafia tylko 5 pierwszych znaków skrótu SHA-1 — nigdy hasło. Wynik zostaje w pamięci przeglądarki.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {progress ? <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} aria-label="Postęp sprawdzania" /> : null}
              <div className="flex items-center gap-3">
                <Button onClick={runBreachCheck} disabled={Boolean(progress)}>
                  {progress ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />} Sprawdź hasła
                </Button>
                <span className="text-sm text-muted-foreground">{checkedAt ? `Ostatnio: ${formatRelative(new Date(checkedAt))} · znaleziono: ${Object.keys(breached).length}` : "Jeszcze nie sprawdzano w tej sesji"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <nav aria-label="Listy do naprawy" className="space-y-1">
            {(Object.keys(FLAG_LABELS) as HealthFlag[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setList(f)}
                aria-current={list === f ? "true" : undefined}
                className={cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted", list === f && "bg-muted font-medium")}
              >
                {FLAG_LABELS[f]}
                <span className="tabular-nums">{health.lists[f].length}</span>
              </button>
            ))}
          </nav>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{FLAG_LABELS[list]}</h2>
              {listItems.length && ["weak", "reused", "old", "breached"].includes(list) ? (
                <Button size="sm" variant="outline" onClick={() => markForRotation(listItems.filter((i) => i.canEdit && !i.needsRotation).map((i) => i.id))}>
                  Oznacz wszystkie „do zmiany”
                </Button>
              ) : null}
            </div>
            {listItems.length ? (
              <ul className="divide-y rounded-lg border">
                {listItems.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 p-3">
                    <TypeIcon type={i.type} />
                    <Link href={href(i)} className="min-w-0 flex-1 hover:underline">
                      <span className="block truncate text-sm font-medium">{i.overview?.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {i.clientName}
                        {i.passwordChangedAt ? ` · hasło z ${formatDate(i.passwordChangedAt)}` : ""}
                        {breached[i.id] ? ` · w wyciekach: ${breached[i.id].toLocaleString("pl-PL")} razy` : ""}
                      </span>
                    </Link>
                    {i.needsRotation ? <StatusBadge variant="warn">do zmiany</StatusBadge> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Brak wpisów na tej liście.</p>
            )}
          </div>
        </div>

        {byClient.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kondycja według klientów</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {byClient.map((c) => (
                  <li key={c.client.id}>
                    <Link href={`/dashboard/clients/${c.client.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      <span className="truncate">{c.client.name}</span>
                      <span className="tabular-nums">
                        {c.score ?? "—"} <span className="text-xs text-muted-foreground">({c.count})</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      <TabsContent value="tasks" className="pt-4">
        {reminders.length ? (
          <ul className="divide-y rounded-lg border">
            {reminders.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <StatusBadge variant={r.kind === "password_rotate" || r.kind === "password_breached" ? "warn" : r.kind === "client_cleanup" ? "info" : "muted"}>{KIND_LABEL[r.kind] ?? r.kind}</StatusBadge>
                <div className="min-w-0 flex-1">
                  {r.targetType === "credential" && r.clientId ? (
                    <Link href={`/dashboard/clients/${r.clientId}/credentials?open=${r.targetId}`} className="text-sm font-medium hover:underline">
                      {r.title}
                    </Link>
                  ) : r.clientId ? (
                    <Link href={`/dashboard/clients/${r.clientId}${r.targetType === "domain" ? "/domains" : ""}`} className="text-sm font-medium hover:underline">
                      {r.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{r.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Termin: {formatDate(r.dueAt)} · {mine.has(r.id) ? "przypisane do Ciebie" : r.assigneeName ? `przypisane: ${r.assigneeName}` : "nieprzypisane"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "done")}>
                    <Check aria-hidden /> Zrobione
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "dismissed")} aria-label="Odrzuć zadanie">
                    <X aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <ShieldX className="mx-auto mb-2 size-6" aria-hidden />
            Brak otwartych zadań.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Zmiana hasła we wpisie automatycznie zamyka powiązane zadania „zmień hasło”. {me ? "" : ""}</p>
      </TabsContent>

      <TabsContent value="generator" className="pt-4">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">Generator haseł</CardTitle>
            <CardDescription>Losowość z crypto.getRandomValues, bez obciążenia rozkładu. Nic nie jest wysyłane.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input readOnly value={gen} className="secret" aria-label="Wygenerowane hasło" placeholder="Kliknij różdżkę" />
            <PasswordGenerator onUse={setGen} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
