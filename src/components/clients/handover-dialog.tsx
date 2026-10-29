"use client";

import { Check, Copy, Loader2, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createShareCiphertext, ensureCrypto } from "@/lib/crypto";
import { unwrap } from "@/lib/vault/api";
import { copyPlain } from "@/lib/vault/clipboard";
import { StepUpCancelled, withStepUp } from "@/lib/vault/step-up";
import { revealSecrets, useVault } from "@/lib/vault/store";
import { TYPE_DEFS } from "@/lib/vault/types";
import { createShareAction } from "@/server/actions/sharing";
import { EXPIRY_OPTIONS, sharePayloadFor } from "@/components/vault/share-dialog";

/**
 * Pakiet przekazania przy końcu współpracy (rozdział 4.6): wszystkie dostępy klienta
 * w jednym bezpiecznym linku i lista kont, których własność trzeba przenieść.
 */
export function HandoverDialog({ clientId, clientName, maxHours, onClose }: { clientId: string; clientName: string; maxHours: number; onClose: () => void }) {
  const all = useVault((s) => s.items);
  const items = useMemo(() => all.filter((i) => i.clientId === clientId && i.overview), [all, clientId]);
  const transfers = items.filter((i) => i.overview!.accountOwner === "agency" || (i.type === "ads" && i.overview!.fields.accessMethod === "partner") || i.overview!.partnerAccess);
  const [hours, setHours] = useState(72);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await ensureCrypto();
      const entries = [];
      for (const i of items) entries.push(sharePayloadFor(i, await revealSecrets(i.id, "share")));
      const payload = {
        kind: "handover",
        clientName,
        createdAt: new Date().toISOString(),
        items: entries,
        transfers: transfers.map((t) => ({
          name: t.overview!.name,
          type: TYPE_DEFS[t.type].label,
          owner: t.overview!.accountOwner,
          partnerAccess: t.overview!.partnerAccess ?? null,
          note: t.overview!.accountOwner === "agency" ? "Konto zarejestrowane na agencję — przenieś własność na klienta" : "Agencja ma dostęp partnerski — odbierz uprawnienia konta agencji",
        })),
        recommendation: "Po przejęciu dostępów zmień wszystkie hasła i odbierz uprawnienia kontom agencji.",
      };
      const id = crypto.randomUUID();
      const created = await createShareCiphertext(id, payload, password || undefined);
      await withStepUp("Pakiet przekazania", () =>
        unwrap(
          createShareAction({
            id,
            kind: "handover",
            credentialId: null,
            clientId,
            ciphertext: created.ciphertext,
            authHash: created.authHash,
            passwordSalt: created.passwordSalt,
            expiresInHours: hours,
            maxViews: 3,
            label: `Pakiet przekazania — ${clientName} (${items.length} dostępów)`,
          }),
        ),
      );
      setLink(`${location.origin}/share/${id}#${created.fragment}`);
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5" aria-hidden /> Pakiet przekazania: {clientName}
          </DialogTitle>
          <DialogDescription>
            {items.length} dostępów w jednym zaszyfrowanym linku (do 3 wyświetleń). Wpisy krytyczne wymagają potwierdzenia tożsamości.
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link} className="secret text-xs" aria-label="Link do pakietu" onFocus={(e) => e.target.select()} />
              <Button onClick={async () => (await copyPlain(link), setCopied(true))} aria-label="Kopiuj link">
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Przekaż link klientowi{password ? ", a hasło innym kanałem" : ""}. Zarekomenduj zmianę wszystkich haseł po przejęciu.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium">Konta do przeniesienia własności ({transfers.length})</p>
              {transfers.length ? (
                <ul className="max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm">
                  {transfers.map((t) => (
                    <li key={t.id}>
                      {t.overview!.name} — {t.overview!.accountOwner === "agency" ? "zarejestrowane na agencję" : "dostęp partnerski agencji"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Brak — wszystkie konta należą do klienta.</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ho-exp">Ważność</Label>
                <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
                  <SelectTrigger id="ho-exp" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.filter((o) => o.hours <= maxHours).map((o) => (
                      <SelectItem key={o.hours} value={String(o.hours)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ho-pw">Hasło do pakietu (zalecane)</Label>
                <Input id="ho-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          {link ? (
            <Button onClick={onClose}>Gotowe</Button>
          ) : (
            <Button onClick={create} disabled={busy || !items.length}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Utwórz pakiet
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
