"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { syncVault } from "@/lib/vault/store";
import { setClientTeamAction } from "@/server/actions/clients";

/**
 * Przypisanie osób do klienta (rozdział 4.2). Członek bez przypisania nie widzi klienta.
 * Po zapisaniu przeglądarka nadaje nowym osobom kopię klucza sejfu (bez udziału serwera).
 */
export function ClientTeamDialog({ clientId, members, team, onClose }: { clientId: string; members: { userId: string; name: string; role: Role }[]; team: { userId: string; canViewCritical: boolean }[]; onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState(() => new Map(team.map((t) => [t.userId, t.canViewCritical])));
  const [busy, setBusy] = useState(false);
  const assignable = members.filter((m) => m.role === "member" || m.role === "viewer");
  const managers = members.filter((m) => m.role === "owner" || m.role === "admin");

  async function save() {
    setBusy(true);
    const r = await setClientTeamAction(
      clientId,
      [...state.entries()].map(([userId, canViewCritical]) => ({ userId, canViewCritical })),
    );
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Zapisano zespół klienta");
    await syncVault().catch(() => {});
    router.refresh();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zespół klienta</DialogTitle>
          <DialogDescription>Przypisane osoby widzą cały sejf klienta. Wpisy krytyczne — tylko po indywidualnym nadaniu.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {assignable.length === 0 ? <p className="text-sm text-muted-foreground">Brak członków do przypisania. Zaproś osoby w Ustawieniach → Zespół.</p> : null}
          {assignable.map((m) => {
            const assigned = state.has(m.userId);
            return (
              <div key={m.userId} className="flex items-center gap-3 rounded-md border p-2">
                <Checkbox
                  id={`tm-${m.userId}`}
                  checked={assigned}
                  onCheckedChange={(v) => {
                    const s = new Map(state);
                    if (v) s.set(m.userId, false);
                    else s.delete(m.userId);
                    setState(s);
                  }}
                />
                <Label htmlFor={`tm-${m.userId}`} className="flex-1 font-normal">
                  {m.name} <span className="text-xs text-muted-foreground">· {ROLE_LABELS[m.role]}</span>
                </Label>
                {m.role === "member" ? (
                  <span className="flex items-center gap-2 text-xs">
                    <Label htmlFor={`crit-${m.userId}`} className="text-xs font-normal">
                      Wpisy krytyczne
                    </Label>
                    <Switch id={`crit-${m.userId}`} disabled={!assigned} checked={state.get(m.userId) ?? false} onCheckedChange={(v) => setState(new Map(state).set(m.userId, v))} />
                  </span>
                ) : null}
              </div>
            );
          })}
          <p className="pt-2 text-xs text-muted-foreground">Zawsze mają dostęp: {managers.map((m) => m.name).join(", ")} (właściciel i administratorzy).</p>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
