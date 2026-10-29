"use client";

import { LayoutGrid, List, Plus, Star, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/vault/badges";
import type { ClientListItem } from "@/lib/dal/clients";
import { normalize } from "@/lib/vault/search";
import { CLIENT_STATUSES, SERVICES } from "@/lib/validation";
import { toggleFavoriteAction } from "@/server/actions/clients";
import { updatePreferencesAction } from "@/server/actions/account";
import { ClientFormDialog, emptyClient } from "./client-form";
import { ClientLogo, ClientStatusBadge, serviceLabel } from "./client-status";

function Warnings({ c }: { c: ClientListItem }) {
  const w: { text: string; variant: "danger" | "warn" | "info" }[] = [];
  if (c.weakCount) w.push({ text: `${c.weakCount} ${c.weakCount === 1 ? "słabe hasło" : c.weakCount < 5 ? "słabe hasła" : "słabych haseł"}`, variant: "warn" });
  if (c.nextDomainExpiry && c.nextDomainExpiry.days <= 30) w.push({ text: c.nextDomainExpiry.days < 0 ? `domena ${c.nextDomainExpiry.name} wygasła` : `domena wygasa za ${c.nextDomainExpiry.days} dni`, variant: c.nextDomainExpiry.days <= 7 ? "danger" : "warn" });
  if (c.nextSslExpiry && c.nextSslExpiry.days <= 21) w.push({ text: c.nextSslExpiry.days < 0 ? "SSL wygasł" : `SSL wygasa za ${c.nextSslExpiry.days} dni`, variant: c.nextSslExpiry.days <= 7 ? "danger" : "warn" });
  if (c.oldCount) w.push({ text: `${c.oldCount} ponad 180 dni`, variant: "info" });
  if (c.rotationCount) w.push({ text: `${c.rotationCount} do zmiany`, variant: "warn" });
  if (!w.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {w.map((x) => (
        <StatusBadge key={x.text} variant={x.variant}>
          <TriangleAlert className="size-3" aria-hidden /> {x.text}
        </StatusBadge>
      ))}
    </span>
  );
}

export function ClientsList({ clients, members, canCreate, me, initialView }: { clients: ClientListItem[]; members: { userId: string; name: string }[]; canCreate: boolean; me: string; initialView: "table" | "cards" }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [view, setView] = useState(initialView);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("active+");
  const [service, setService] = useState("all");
  const [owner, setOwner] = useState("all");
  const [tag, setTag] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [, startTransition] = useTransition();
  const creating = search.get("new") === "1";

  const tags = useMemo(() => [...new Set(clients.flatMap((c) => c.tags))].sort(), [clients]);
  const list = useMemo(() => {
    const n = normalize(q.trim());
    return clients
      .filter((c) => !n || normalize([c.name, c.website ?? "", c.industry ?? "", c.tags.join(" ")].join(" ")).includes(n))
      .filter((c) => (status === "all" ? true : status === "active+" ? c.status !== "ended" : c.status === status))
      .filter((c) => service === "all" || c.services.includes(service))
      .filter((c) => owner === "all" || c.ownerUserId === owner)
      .filter((c) => tag === "all" || c.tags.includes(tag))
      .filter((c) => !favOnly || c.favorite)
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "pl"));
  }, [clients, q, status, service, owner, tag, favOnly]);

  function fav(id: string) {
    startTransition(async () => {
      const r = await toggleFavoriteAction(id);
      if (!r.ok) toast.error(r.error);
      router.refresh();
    });
  }

  const FavButton = ({ c }: { c: ClientListItem }) => (
    <Button variant="ghost" size="icon" className="size-8" onClick={() => fav(c.id)} aria-label={c.favorite ? `Odepnij ${c.name}` : `Przypnij ${c.name}`} aria-pressed={c.favorite}>
      <Star className={c.favorite ? "fill-amber-400 text-amber-500" : ""} aria-hidden />
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj klienta…" aria-label="Szukaj klienta" className="lg:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active+">Bez archiwum</SelectItem>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              {CLIENT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger className="w-40" aria-label="Usługa">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Każda usługa</SelectItem>
              {SERVICES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-40" aria-label="Opiekun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Każdy opiekun</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tags.length ? (
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="w-36" aria-label="Tag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Każdy tag</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button variant={favOnly ? "secondary" : "ghost"} size="sm" onClick={() => setFavOnly(!favOnly)} aria-pressed={favOnly}>
            <Star aria-hidden /> Przypięte
          </Button>
          <ToggleGroup
            type="single"
            variant="outline"
            value={view}
            onValueChange={(v) => {
              if (!v) return;
              setView(v as typeof view);
              void updatePreferencesAction({ clientsView: v });
            }}
            aria-label="Widok"
          >
            <ToggleGroupItem value="table" aria-label="Tabela">
              <List aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Karty">
              <LayoutGrid aria-hidden />
            </ToggleGroupItem>
          </ToggleGroup>
          {canCreate ? (
            <Button onClick={() => router.push(`${pathname}?new=1`)}>
              <Plus aria-hidden /> Nowy klient
            </Button>
          ) : null}
        </div>
      </div>

      {!clients.length ? (
        <EmptyState
          title="Brak klientów"
          description={canCreate ? "Dodaj pierwszego klienta — każdy ma własny zaszyfrowany sejf dostępów." : "Nie jesteś jeszcze przypisany(-a) do żadnego klienta. Poproś administratora o dostęp."}
          action={canCreate ? <Button onClick={() => router.push(`${pathname}?new=1`)}><Plus aria-hidden /> Dodaj klienta</Button> : null}
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Lista klientów</caption>
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-2 py-2">
                  <span className="sr-only">Przypięty</span>
                </th>
                <th className="px-2 py-2 font-medium">Klient</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Usługi</th>
                <th className="px-2 py-2 font-medium">Opiekun</th>
                <th className="px-2 py-2 text-right font-medium">Dostępy</th>
                <th className="px-2 py-2 font-medium">Ostrzeżenia</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-2 py-2">
                    <FavButton c={c} />
                  </td>
                  <td className="px-2 py-2">
                    <Link href={`/dashboard/clients/${c.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
                      <ClientLogo logo={c.logo} name={c.name} />
                      <span className="min-w-0">
                        <span className="block truncate">{c.name}</span>
                        {c.website ? <span className="block truncate text-xs font-normal text-muted-foreground">{c.website.replace(/^https?:\/\//, "")}</span> : null}
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <ClientStatusBadge status={c.status} />
                  </td>
                  <td className="px-2 py-2">
                    <span className="flex flex-wrap gap-1">
                      {c.services.map((s) => (
                        <StatusBadge key={s}>{serviceLabel(s)}</StatusBadge>
                      ))}
                    </span>
                  </td>
                  <td className="px-2 py-2">{c.ownerUserId === me ? "Ty" : (c.ownerName ?? "—")}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    <Link href={`/dashboard/clients/${c.id}/credentials`} className="hover:underline">
                      {c.credentialCount}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <Warnings c={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length ? <p className="py-6 text-center text-sm text-muted-foreground">Brak klientów spełniających kryteria.</p> : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <ClientLogo logo={c.logo} name={c.name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/clients/${c.id}`} className="block truncate font-medium hover:underline">
                    {c.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{c.industry ?? c.website ?? "—"}</p>
                </div>
                <FavButton c={c} />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <ClientStatusBadge status={c.status} />
                {c.services.map((s) => (
                  <StatusBadge key={s}>{serviceLabel(s)}</StatusBadge>
                ))}
              </div>
              <Warnings c={c} />
              <div className="mt-auto flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Opiekun: {c.ownerUserId === me ? "Ty" : (c.ownerName ?? "—")}</span>
                <Link href={`/dashboard/clients/${c.id}/credentials`} className="font-medium hover:underline">
                  {c.credentialCount} dostępów
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating ? <ClientFormDialog open onOpenChange={(o) => !o && router.replace(pathname)} initial={emptyClient(me)} members={members} /> : null}
    </div>
  );
}
