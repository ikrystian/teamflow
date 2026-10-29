"use client";

import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchVault, useVault, type VaultItem } from "@/lib/vault/store";
import { openableUrl } from "@/lib/vault/types";
import { TypeIcon } from "./category";
import { useCredentialActions } from "./use-credential-actions";

function QuickRow({ item }: { item: VaultItem }) {
  const { copyLogin, copyPassword, openUrl } = useCredentialActions();
  if (!item.overview) return null;
  const href = item.direct ? `/dashboard/vault?open=${item.id}` : `/dashboard/clients/${item.clientId}/credentials?open=${item.id}`;
  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <TypeIcon type={item.type} className="size-7" />
      <Link href={href} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.overview.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.clientName}
          {item.overview.login ? ` · ${item.overview.login}` : ""}
        </span>
      </Link>
      {item.overview.login ? (
        <Button size="sm" variant="ghost" onClick={() => copyLogin(item)} aria-label={`Kopiuj login: ${item.overview.name}`}>
          Login
        </Button>
      ) : null}
      {item.type !== "secure_note" ? (
        <Button size="sm" variant="secondary" onClick={() => copyPassword(item)} aria-label={`Kopiuj hasło: ${item.overview.name}`}>
          <Copy aria-hidden /> Hasło
        </Button>
      ) : null}
      {openableUrl(item.type, item.overview) ? (
        <Button size="icon" variant="ghost" className="size-8" onClick={() => openUrl(item)} aria-label="Otwórz adres">
          <ExternalLink aria-hidden />
        </Button>
      ) : null}
    </li>
  );
}

/** Pole szybkiego wyszukiwania na pulpicie — hasło jest „trzy kliknięcia od pulpitu” albo bliżej. */
export function DashboardSearch({ autoFocus = true }: { autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const indexSize = useVault((s) => s.index.length);
  const results = useMemo(() => (q.trim() ? searchVault(q).slice(0, 8) : []), [q, indexSize]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szybkie wyszukiwanie: klient, dostęp, login, adres…" aria-label="Szybkie wyszukiwanie dostępów" className="h-11 text-base" autoFocus={autoFocus} />
      {q.trim() ? (
        <ul className="rounded-lg border p-1" aria-live="polite">
          {results.length ? results.map((r) => <QuickRow key={r.id} item={r} />) : <li className="px-2 py-3 text-sm text-muted-foreground">Brak wyników</li>}
        </ul>
      ) : null}
    </div>
  );
}

export function DashboardRecent({ ids }: { ids: string[] }) {
  const items = useVault((s) => s.items);
  const unlocked = useVault((s) => s.status === "unlocked");
  const recent = useMemo(() => ids.map((id) => items.find((i) => i.id === id)).filter((x): x is VaultItem => Boolean(x)), [ids, items]);
  if (!unlocked) {
    return (
      <p className="text-sm text-muted-foreground">
        Sejf jest zablokowany.{" "}
        <Link href="/auth/unlock?next=/dashboard" className="underline">Odblokuj</Link>, aby zobaczyć ostatnio używane dostępy.
      </p>
    );
  }
  if (!recent.length) return <p className="text-sm text-muted-foreground">Tu pojawią się dostępy, których ostatnio używałeś(-aś).</p>;
  return <ul className="space-y-0.5">{recent.map((r) => <QuickRow key={r.id} item={r} />)}</ul>;
}

/** Szybkie wyszukiwanie na panelu głównym — tylko przy odblokowanym sejfie (indeks żyje w pamięci karty). */
export function DashboardSearchWhenUnlocked() {
  const unlocked = useVault((s) => s.status === "unlocked");
  return unlocked ? <DashboardSearch autoFocus={false} /> : null;
}
