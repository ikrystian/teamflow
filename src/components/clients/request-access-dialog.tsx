"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copyPlain } from "@/lib/vault/clipboard";
import { CREDENTIAL_TYPES, TYPE_DEFS, type CredentialType } from "@/lib/vault/types";
import { createAccessRequestAction } from "@/server/actions/sharing";

/** Prośba o dostępy od klienta (rozdział 4.6) — koniec z hasłami w mailach. */
export function RequestAccessDialog({ clientId, clientName, onClose }: { clientId: string; clientName: string; onClose: () => void }) {
  const [types, setTypes] = useState<CredentialType[]>(["hosting", "website"]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true);
    const r = await createAccessRequestAction({ clientId, requestedTypes: types, message, recipientEmail: email, expiresInDays: days });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setUrl(r.data.url);
    if (email) toast.success(`Wysłano prośbę na ${email}`);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Poproś o dostępy: {clientName}</DialogTitle>
          <DialogDescription>Klient wypełni bezpieczny formularz. Dane zaszyfrują się w jego przeglądarce i trafią do skrzynki „Do przejrzenia”.</DialogDescription>
        </DialogHeader>
        {url ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={url} className="secret text-xs" aria-label="Link do formularza" onFocus={(e) => e.target.select()} />
              <Button onClick={async () => (await copyPlain(url), setCopied(true))} aria-label="Kopiuj link">
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Link jest ważny {days} dni i działa jednorazowo. Pokazujemy go tylko teraz.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Potrzebne dostępy</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CREDENTIAL_TYPES.filter((t) => t !== "other").map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Checkbox id={`rq-${t}`} checked={types.includes(t)} onCheckedChange={(v) => setTypes(v ? [...types, t] : types.filter((x) => x !== t))} />
                    <Label htmlFor={`rq-${t}`} className="font-normal">{TYPE_DEFS[t].label}</Label>
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="rq-msg">Wiadomość dla klienta (opcjonalnie)</Label>
              <Textarea id="rq-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="np. Potrzebujemy dostępu do panelu WordPressa i hostingu, żeby zaktualizować stronę." />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <div className="space-y-1.5">
                <Label htmlFor="rq-email">Wyślij na adres (opcjonalnie)</Label>
                <Input id="rq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="klient@firma.pl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq-days">Ważność (dni)</Label>
                <Input id="rq-days" type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          {url ? (
            <Button onClick={onClose}>Gotowe</Button>
          ) : (
            <Button onClick={create} disabled={busy || !types.length}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Utwórz prośbę
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
