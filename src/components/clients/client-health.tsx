"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeHealth, FLAG_LABELS, scoreLabel, type HealthFlag } from "@/lib/vault/health";
import { useVault } from "@/lib/vault/store";
import { cn } from "@/lib/utils";

/** Wskaźnik kondycji haseł klienta (rozdział 4.5) — liczony w przeglądarce. */
export function ClientHealthCard({ clientId, maxAgeDays }: { clientId: string; maxAgeDays: number }) {
  const all = useVault((s) => s.items);
  const breached = useVault((s) => s.breached);
  const items = useMemo(() => all.filter((i) => i.clientId === clientId), [all, clientId]);
  const h = useMemo(() => analyzeHealth(items, { maxAgeDays, breached }), [items, maxAgeDays, breached]);
  const l = scoreLabel(h.score);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kondycja haseł</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-semibold tabular-nums", l.tone === "good" && "text-emerald-700 dark:text-emerald-400", l.tone === "ok" && "text-amber-700 dark:text-amber-400", l.tone === "bad" && "text-red-700 dark:text-red-400")}>
            {h.score ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground">/ 100 · {l.label}</span>
        </p>
        <ul className="space-y-1 text-sm">
          {(Object.keys(FLAG_LABELS) as HealthFlag[])
            .filter((f) => h.lists[f].length)
            .map((f) => (
              <li key={f} className="flex justify-between">
                <Link href={`/dashboard/clients/${clientId}/credentials?filter=${f}`} className="hover:underline">
                  {FLAG_LABELS[f]}
                </Link>
                <span className="tabular-nums">{h.lists[f].length}</span>
              </li>
            ))}
        </ul>
        <p className="text-xs text-muted-foreground">{items.length} dostępów · analiza w przeglądarce</p>
      </CardContent>
    </Card>
  );
}
