"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { api } from "@/lib/vault/api";
import { revokeShareAction } from "@/server/actions/sharing";
import { StatusBadge } from "./badges";

type Share = { id: string; kind: "credential" | "handover"; label: string | null; clientName: string; status: string; expiresAt: string; viewCount: number; maxViews: number; createdByName: string | null; hasPassword: boolean; lastViewedAt: string | null };

const STATUS: Record<string, { label: string; variant: "ok" | "muted" | "warn" | "danger" }> = {
  active: { label: "aktywny", variant: "ok" },
  used: { label: "wykorzystany", variant: "muted" },
  expired: { label: "wygasł", variant: "muted" },
  revoked: { label: "unieważniony", variant: "danger" },
};

export function SharesPanel({ clientId }: { clientId?: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["shares-all", clientId], queryFn: () => api<Share[]>(`/api/vault/shares${clientId ? `?client=${clientId}` : ""}`) });
  if (isLoading) return <p className="text-sm text-muted-foreground">Ładowanie…</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">Brak linków jednorazowych.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Wpis</th>
            <th className="px-3 py-2 font-medium">Klient</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Wyświetlenia</th>
            <th className="px-3 py-2 font-medium">Ważny do</th>
            <th className="px-3 py-2 font-medium">Utworzył(a)</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.id} className="border-b last:border-0">
              <td className="px-3 py-2">
                <span className="flex items-center gap-2">
                  {s.kind === "handover" ? <Package className="size-4" aria-label="Pakiet przekazania" /> : <Link2 className="size-4" aria-label="Link" />}
                  {s.label ?? "—"} {s.hasPassword ? <StatusBadge>hasło</StatusBadge> : null}
                </span>
              </td>
              <td className="px-3 py-2">{s.clientName}</td>
              <td className="px-3 py-2">
                <StatusBadge variant={STATUS[s.status]?.variant}>{STATUS[s.status]?.label ?? s.status}</StatusBadge>
              </td>
              <td className="px-3 py-2 tabular-nums">
                {s.viewCount}/{s.maxViews}
              </td>
              <td className="px-3 py-2">{formatDateTime(s.expiresAt)}</td>
              <td className="px-3 py-2">{s.createdByName ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                {s.status === "active" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const r = await revokeShareAction(s.id);
                      if (!r.ok) return toast.error(r.error);
                      toast.success("Unieważniono link");
                      await qc.invalidateQueries({ queryKey: ["shares-all"] });
                    }}
                  >
                    Unieważnij
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
