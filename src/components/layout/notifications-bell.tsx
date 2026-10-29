"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/vault/api";
import { cn } from "@/lib/utils";
import { markNotificationsReadAction } from "@/server/actions/workspace";
import { formatRelative } from "@/lib/format";

type Notifications = { items: { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }[]; unread: number };

export function NotificationsBell({ icon }: { icon: React.ReactNode }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => api<Notifications>("/api/notifications"), refetchInterval: 60_000 });
  const unread = data?.unread ?? 0;
  async function markAll() {
    await markNotificationsReadAction("all");
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <Popover onOpenChange={(o) => !o && unread && void markAll()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Powiadomienia (${unread} nowych)` : "Powiadomienia"}>
          {icon}
          {unread ? <span className="absolute top-1 right-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-white">{unread > 9 ? "9+" : unread}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Powiadomienia</p>
          <Link href="/dashboard/notifications" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Wszystkie
          </Link>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {data?.items.length ? (
            data.items.slice(0, 15).map((n) => (
              <li key={n.id} className={cn("border-b px-3 py-2 text-sm last:border-0", !n.readAt && "bg-muted/50")}>
                {n.link ? (
                  <Link href={n.link} className="block hover:underline">
                    {n.title}
                  </Link>
                ) : (
                  <p>{n.title}</p>
                )}
                {n.body ? <p className="text-xs text-muted-foreground">{n.body}</p> : null}
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</p>
              </li>
            ))
          ) : (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Brak powiadomień</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
