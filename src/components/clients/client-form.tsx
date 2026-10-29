"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ensureCrypto } from "@/lib/crypto";
import { api } from "@/lib/vault/api";
import { newClientVault, syncVault } from "@/lib/vault/store";
import { CLIENT_STATUSES, clientSchema, isValidNip, SERVICES } from "@/lib/validation";
import { createClientAction, updateClientAction } from "@/server/actions/clients";

export type ClientFormValue = {
  name: string;
  taxId: string;
  status: "lead" | "active" | "paused" | "ended";
  website: string;
  industry: string;
  address: { street?: string; postalCode?: string; city?: string; country?: string };
  ownerUserId: string;
  tags: string[];
  services: string[];
};

export const emptyClient = (ownerUserId: string): ClientFormValue => ({ name: "", taxId: "", status: "active", website: "", industry: "", address: {}, ownerUserId, tags: [], services: [] });

export function ClientFormDialog({
  open,
  onOpenChange,
  initial,
  clientId,
  members,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: ClientFormValue;
  clientId?: string;
  members: { userId: string; name: string }[];
}) {
  const router = useRouter();
  const [v, setV] = useState<ClientFormValue>(initial);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function nipLookup() {
    if (!isValidNip(v.taxId)) return setError("Nieprawidłowy NIP (błędna suma kontrolna)");
    setLookup(true);
    setError(null);
    try {
      const r = await api<{ name: string; address: ClientFormValue["address"]; vatStatus: string | null } | null>(`/api/nip/${encodeURIComponent(v.taxId)}`);
      if (!r) return toast.info("Nie znaleziono firmy w wykazie podatników VAT");
      setV((p) => ({ ...p, name: p.name || r.name, address: { ...r.address, ...Object.fromEntries(Object.entries(p.address).filter(([, x]) => x)) } }));
      toast.success(`Uzupełniono z wykazu VAT${r.vatStatus ? ` (status: ${r.vatStatus})` : ""}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLookup(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...v, tags: [...new Set(tags.split(",").map((t) => t.trim()).filter(Boolean))], ownerUserId: v.ownerUserId || null };
    const parsed = clientSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    try {
      if (clientId) {
        const r = await updateClientAction(clientId, payload);
        if (!r.ok) throw new Error(r.error);
        toast.success("Zapisano dane klienta");
        router.refresh();
        onOpenChange(false);
      } else {
        await ensureCrypto();
        const id = crypto.randomUUID();
        // Nowy sejf klienta: klucz powstaje w przeglądarce, na serwer trafia tylko kopia zaszyfrowana kluczem publicznym.
        const vaultGrant = newClientVault(id);
        const r = await createClientAction({ ...payload, id, vaultGrant });
        if (!r.ok) throw new Error(r.error);
        await syncVault();
        toast.success("Dodano klienta");
        // Bez zamykania dialogu przez rodzica — jego router.replace nadpisałby przejście.
        router.push(`/dashboard/clients/${id}/credentials`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof ClientFormValue>(k: K, val: ClientFormValue[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{clientId ? "Edytuj klienta" : "Nowy klient"}</DialogTitle>
          <DialogDescription>Dane firmy (CRM) są szyfrowane w spoczynku i dostępne dla serwera — nie wpisuj tu haseł.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="cl-nip">NIP</Label>
              <Input id="cl-nip" value={v.taxId} onChange={(e) => set("taxId", e.target.value)} inputMode="numeric" placeholder="np. 526-025-09-95" />
            </div>
            <Button type="button" variant="outline" onClick={nipLookup} disabled={lookup || !v.taxId}>
              {lookup ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />} Uzupełnij z wykazu VAT
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cl-name">Nazwa</Label>
              <Input id="cl-name" value={v.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-status">Status</Label>
              <Select value={v.status} onValueChange={(s) => set("status", s as ClientFormValue["status"])}>
                <SelectTrigger id="cl-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                      {s.value === "ended" ? " (archiwum)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-www">Strona www</Label>
              <Input id="cl-www" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="klient.pl" inputMode="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-ind">Branża</Label>
              <Input id="cl-ind" value={v.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cl-street">Adres</Label>
              <Input id="cl-street" value={v.address.street ?? ""} onChange={(e) => set("address", { ...v.address, street: e.target.value })} placeholder="Ulica i numer" />
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2 sm:col-span-2">
              <Input aria-label="Kod pocztowy" value={v.address.postalCode ?? ""} onChange={(e) => set("address", { ...v.address, postalCode: e.target.value })} placeholder="00-000" />
              <Input aria-label="Miasto" value={v.address.city ?? ""} onChange={(e) => set("address", { ...v.address, city: e.target.value })} placeholder="Miasto" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-owner">Opiekun po stronie agencji</Label>
              <Select value={v.ownerUserId || undefined} onValueChange={(s) => set("ownerUserId", s)}>
                <SelectTrigger id="cl-owner" className="w-full">
                  <SelectValue placeholder="Wybierz" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-tags">Tagi</Label>
              <Input id="cl-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="oddzielone przecinkami" />
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Usługi</legend>
            <div className="flex flex-wrap gap-4">
              {SERVICES.map((s) => (
                <div key={s.value} className="flex items-center gap-2">
                  <Checkbox id={`svc-${s.value}`} checked={v.services.includes(s.value)} onCheckedChange={(c) => set("services", c ? [...v.services, s.value] : v.services.filter((x) => x !== s.value))} />
                  <Label htmlFor={`svc-${s.value}`} className="font-normal">{s.label}</Label>
                </div>
              ))}
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} {clientId ? "Zapisz" : "Dodaj klienta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
