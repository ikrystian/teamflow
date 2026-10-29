"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ensureCrypto, fingerprint } from "@/lib/crypto";
import { decodePublicKey } from "@/lib/crypto/user-keys";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { api } from "@/lib/vault/api";
import { sealItemKeyFor, useVault, type VaultItem } from "@/lib/vault/store";
import { shareInTeamAction } from "@/server/actions/team";

type Member = { userId: string; name: string; email: string; publicKey: string | null; keysVersion: number; role: Role };

/** Udostępnienie pojedynczego wpisu osobie z zespołu (kopia klucza wpisu jej kluczem publicznym). */
export function TeamShareDialog({ item, open, onOpenChange }: { item: VaultItem | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const me = useVault((s) => s.user?.userId);
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["member-keys"], queryFn: () => api<Member[]>("/api/members/keys"), enabled: open });
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const target = members.data?.find((m) => m.userId === userId);

  async function share() {
    if (!item || !target?.publicKey) return;
    setBusy(true);
    try {
      await ensureCrypto();
      const encryptedKey = sealItemKeyFor(item.id, target.publicKey);
      const r = await shareInTeamAction(item.id, target.userId, encryptedKey, target.keysVersion);
      if (!r.ok) throw new Error(r.error);
      toast.success(`Udostępniono: ${target.name}`);
      await qc.invalidateQueries({ queryKey: ["team-shares", item.id] });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  let fp = "";
  try {
    fp = target?.publicKey ? fingerprint(decodePublicKey(target.publicKey)) : "";
  } catch {
    fp = "";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" aria-hidden /> Udostępnij w zespole
          </DialogTitle>
          <DialogDescription>Osoba zobaczy tylko ten wpis ({item?.overview?.name}), bez dostępu do pozostałych danych klienta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="ts-user">Osoba</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="ts-user" className="w-full">
              <SelectValue placeholder="Wybierz osobę" />
            </SelectTrigger>
            <SelectContent>
              {members.data
                ?.filter((m) => m.userId !== me && m.publicKey && m.role !== "owner" && m.role !== "admin")
                .map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name} · {ROLE_LABELS[m.role]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Właściciel i administratorzy widzą wszystkie wpisy, więc nie ma potrzeby udostępniania im.</p>
          {fp ? <p className="text-xs text-muted-foreground">Odcisk klucza odbiorcy: <span className="secret">{fp}</span> — możesz go porównać z osobą poza systemem.</p> : null}
        </div>
        <DialogFooter>
          <Button onClick={share} disabled={!target || busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Udostępnij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
