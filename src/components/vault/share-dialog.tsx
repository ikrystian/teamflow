"use client";

import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createShareCiphertext, ensureCrypto } from "@/lib/crypto";
import { copyPlain } from "@/lib/vault/clipboard";
import { StepUpCancelled, withStepUp } from "@/lib/vault/step-up";
import { revealSecrets, type VaultItem } from "@/lib/vault/store";
import { TYPE_DEFS } from "@/lib/vault/types";
import { unwrap } from "@/lib/vault/api";
import { createShareAction } from "@/server/actions/sharing";

export const EXPIRY_OPTIONS = [
  { hours: 1, label: "1 godzina" },
  { hours: 4, label: "4 godziny" },
  { hours: 24, label: "1 dzień" },
  { hours: 72, label: "3 dni" },
  { hours: 168, label: "7 dni" },
];

/** Treść linku: tylko pola potrzebne odbiorcy (bez metadanych sejfu). */
export function sharePayloadFor(item: VaultItem, secrets: NonNullable<VaultItem["secrets"]>) {
  const o = item.overview!;
  const def = TYPE_DEFS[item.type];
  const fields = def.fields
    .map((f) => ({ label: f.label, value: (f.secret ? secrets.fields[f.key] : o.fields[f.key]) ?? "", secret: Boolean(f.secret) }))
    .filter((f) => f.value);
  return {
    name: o.name,
    type: def.label,
    url: o.url,
    login: o.login,
    password: secrets.password,
    totp: secrets.totp,
    notes: o.notes,
    fields: [...fields, ...o.custom.map((c) => ({ label: c.label, value: c.value, secret: false })), ...secrets.custom.map((c) => ({ label: c.label, value: c.value, secret: true }))],
  };
}

/**
 * Link jednorazowy (rozdział 4.6): klucz w części adresu po #, ważność 1 h – 7 dni,
 * domyślnie jedno wyświetlenie, opcjonalne dodatkowe hasło, możliwość unieważnienia.
 */
export function ShareDialog({ item, open, onOpenChange, maxHours }: { item: VaultItem | null; open: boolean; onOpenChange: (o: boolean) => void; maxHours: number }) {
  const [hours, setHours] = useState(24);
  const [views, setViews] = useState(1);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setLink(null);
    setPassword("");
    setUsePassword(false);
    setCopied(false);
  }

  async function create() {
    if (!item) return;
    setBusy(true);
    try {
      await ensureCrypto();
      const secrets = await revealSecrets(item.id, "share");
      const id = crypto.randomUUID();
      const created = await createShareCiphertext(id, { kind: "credential", item: sharePayloadFor(item, secrets) }, usePassword ? password : undefined);
      await withStepUp("Udostępnienie wpisu krytycznego", () =>
        unwrap(
          createShareAction({
            id,
            kind: "credential",
            credentialId: item.id,
            clientId: item.clientId,
            ciphertext: created.ciphertext,
            authHash: created.authHash,
            passwordSalt: created.passwordSalt,
            expiresInHours: hours,
            maxViews: views,
            label: item.overview?.name ?? null,
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
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), !o && reset())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5" aria-hidden /> Link jednorazowy
          </DialogTitle>
          <DialogDescription>{item?.overview?.name}. Klucz jest w części adresu po znaku #, więc serwer go nie zna.</DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link} className="secret text-xs" aria-label="Link do udostępnienia" onFocus={(e) => e.target.select()} />
              <Button
                onClick={async () => {
                  await copyPlain(link);
                  setCopied(true);
                }}
                aria-label="Kopiuj link"
              >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Wyślij link odbiorcy{usePassword ? ", a hasło linku przekaż innym kanałem (np. SMS)" : ""}. Po {views === 1 ? "pierwszym wyświetleniu" : `${views} wyświetleniach`} lub po upływie ważności link przestanie działać. Link pokazujemy tylko teraz.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sh-exp">Ważność</Label>
                <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
                  <SelectTrigger id="sh-exp" className="w-full">
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
                <Label htmlFor="sh-views">Liczba wyświetleń</Label>
                <Input id="sh-views" type="number" min={1} max={20} value={views} onChange={(e) => setViews(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="sh-pw" checked={usePassword} onCheckedChange={(v) => setUsePassword(v === true)} />
              <Label htmlFor="sh-pw" className="font-normal">Dodatkowe hasło do linku</Label>
            </div>
            {usePassword ? <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Hasło linku (przekaż innym kanałem)" aria-label="Hasło linku" autoComplete="new-password" /> : null}
          </div>
        )}
        <DialogFooter>
          {link ? (
            <Button onClick={() => (onOpenChange(false), reset())}>Gotowe</Button>
          ) : (
            <Button onClick={create} disabled={busy || (usePassword && password.length < 6)}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Utwórz link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
