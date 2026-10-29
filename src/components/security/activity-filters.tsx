"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACTION_GROUPS } from "@/lib/audit-labels";

type Current = { actor?: string; action?: string; client?: string; from?: string; to?: string; q?: string };

export function ActivityFilters({ actors, clients, current }: { actors: { id: string; name: string }[]; clients: { id: string; name: string }[]; current: Current }) {
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = useState<Current>(current);
  function apply(next: Current) {
    const p = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    router.push(`${pathname}${p.toString() ? `?${p}` : ""}`);
  }
  return (
    <form
      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        apply(f);
      }}
    >
      {actors.length ? (
        <div className="space-y-1">
          <Label htmlFor="af-actor" className="text-xs">Osoba</Label>
          <Select value={f.actor ?? "all"} onValueChange={(v) => setF({ ...f, actor: v === "all" ? undefined : v })}>
            <SelectTrigger id="af-actor" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {actors.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="af-action" className="text-xs">Rodzaj</Label>
        <Select value={f.action ?? "all"} onValueChange={(v) => setF({ ...f, action: v === "all" ? undefined : v })}>
          <SelectTrigger id="af-action" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {ACTION_GROUPS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="af-client" className="text-xs">Klient</Label>
        <Select value={f.client ?? "all"} onValueChange={(v) => setF({ ...f, client: v === "all" ? undefined : v })}>
          <SelectTrigger id="af-client" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="af-from" className="text-xs">Od</Label>
        <Input id="af-from" type="date" value={f.from ?? ""} onChange={(e) => setF({ ...f, from: e.target.value || undefined })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="af-to" className="text-xs">Do</Label>
        <Input id="af-to" type="date" value={f.to ?? ""} onChange={(e) => setF({ ...f, to: e.target.value || undefined })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="af-q" className="text-xs">IP / szukaj</Label>
        <Input id="af-q" value={f.q ?? ""} onChange={(e) => setF({ ...f, q: e.target.value || undefined })} />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
        <Button type="submit" size="sm">Filtruj</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => (setF({}), apply({}))}>
          Wyczyść
        </Button>
      </div>
    </form>
  );
}
