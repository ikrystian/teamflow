"use client";

import { Loader2, Pencil, Plus, ShieldCheck, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/vault/badges";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";
import { ACCOUNT_OWNERS } from "@/lib/vault/types";
import { checkDomainSslAction, deleteDomainAction, saveDomainAction } from "@/server/actions/clients";

type Domain = {
  id: string;
  name: string;
  registrar: string | null;
  expiresAt: string | null;
  hosting: string | null;
  hostingRenewsAt: string | null;
  sslExpiresAt: string | null;
  sslIssuer: string | null;
  sslCheckedAt: string | null;
  sslError: string | null;
  autoCheckSsl: boolean;
  accountOwner: "client" | "agency" | "unknown";
  notes: string | null;
};

function Expiry({ date, label }: { date: string | null; label: string }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(date);
  const variant = d < 0 ? "danger" : d <= 14 ? "danger" : d <= 30 ? "warn" : "ok";
  return (
    <span className="flex flex-col gap-0.5">
      <span>{formatDate(date)}</span>
      <StatusBadge variant={variant}>{d < 0 ? `${label} wygasł(a)` : `za ${d} dni`}</StatusBadge>
    </span>
  );
}

const blank = { name: "", registrar: "", expiresAt: "", hosting: "", hostingRenewsAt: "", autoCheckSsl: true, accountOwner: "client" as Domain["accountOwner"], notes: "" };

export function DomainsManager({ clientId, domains, canEdit }: { clientId: string; domains: Domain[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Domain | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [checking, setChecking] = useState<string | null>(null);

  function open(d: Domain | "new") {
    setEditing(d);
    setForm(d === "new" ? blank : { name: d.name, registrar: d.registrar ?? "", expiresAt: d.expiresAt ?? "", hosting: d.hosting ?? "", hostingRenewsAt: d.hostingRenewsAt ?? "", autoCheckSsl: d.autoCheckSsl, accountOwner: d.accountOwner, notes: d.notes ?? "" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await saveDomainAction(clientId, editing === "new" ? null : editing!.id, form);
    if (!r.ok) return toast.error(r.error);
    toast.success("Zapisano domenę");
    const id = r.data.id;
    setEditing(null);
    if (form.autoCheckSsl) void checkSsl(id);
    router.refresh();
  }

  async function checkSsl(id: string) {
    setChecking(id);
    const r = await checkDomainSslAction(clientId, id);
    setChecking(null);
    if (!r.ok) return toast.error(r.error);
    if (r.data.error && !r.data.expiresAt) toast.error(`SSL: ${r.data.error}`);
    else toast.success(`Certyfikat ważny do ${formatDate(r.data.expiresAt)}`);
    router.refresh();
  }

  async function remove(d: Domain) {
    if (!confirm(`Usunąć domenę ${d.name}?`)) return;
    const r = await deleteDomainAction(clientId, d.id);
    if (!r.ok) return toast.error(r.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Daty wygaśnięcia domen, hostingu i certyfikatów SSL są źródłem przypomnień (e-mail i w aplikacji).</p>
        {canEdit ? (
          <Button onClick={() => open("new")}>
            <Plus aria-hidden /> Dodaj domenę
          </Button>
        ) : null}
      </div>
      {domains.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Domena</th>
                <th className="px-3 py-2 font-medium">Rejestrator</th>
                <th className="px-3 py-2 font-medium">Wygasa</th>
                <th className="px-3 py-2 font-medium">Hosting</th>
                <th className="px-3 py-2 font-medium">Certyfikat SSL</th>
                <th className="px-3 py-2 font-medium">Właściciel</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} className="border-b align-top last:border-0">
                  <td className="px-3 py-2 font-medium">
                    <a href={`https://${d.name}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {d.name}
                    </a>
                  </td>
                  <td className="px-3 py-2">{d.registrar ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Expiry date={d.expiresAt} label="domena" />
                  </td>
                  <td className="px-3 py-2">
                    {d.hosting ?? "—"}
                    {d.hostingRenewsAt ? <span className="block text-xs text-muted-foreground">odnowienie {formatDate(d.hostingRenewsAt)}</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    <Expiry date={d.sslExpiresAt} label="certyfikat" />
                    {d.sslIssuer ? <span className="block text-xs text-muted-foreground">{d.sslIssuer}</span> : null}
                    {d.sslError ? <span className="block text-xs text-destructive">{d.sslError}</span> : null}
                    {d.sslCheckedAt ? <span className="block text-xs text-muted-foreground">sprawdzono {formatDateTime(d.sslCheckedAt)}</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    {d.accountOwner === "agency" ? <StatusBadge variant="warn">agencja</StatusBadge> : ACCOUNT_OWNERS.find((o) => o.value === d.accountOwner)?.label}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => checkSsl(d.id)} aria-label={`Sprawdź SSL ${d.name}`} disabled={checking === d.id}>
                      {checking === d.id ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
                    </Button>
                    {canEdit ? (
                      <>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => open(d)} aria-label={`Edytuj ${d.name}`}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => remove(d)} aria-label={`Usuń ${d.name}`}>
                          <Trash aria-hidden />
                        </Button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Brak domen" description="Dodaj domeny klienta z datami wygaśnięcia — przypomnimy o odnowieniu domeny, hostingu i certyfikatu SSL." />
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nowa domena" : "Edytuj domenę"}</DialogTitle>
            <DialogDescription>Dane do przypomnień. Dostęp do panelu rejestratora zapisz w sejfie (typ „Domena / DNS”).</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="d-name">Domena</Label>
                <Input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="klient.pl" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-reg">Rejestrator</Label>
                <Input id="d-reg" value={form.registrar} onChange={(e) => setForm({ ...form, registrar: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-exp">Data wygaśnięcia domeny</Label>
                <Input id="d-exp" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-owner">Na kogo zarejestrowana</Label>
                <Select value={form.accountOwner} onValueChange={(v) => setForm({ ...form, accountOwner: v as Domain["accountOwner"] })}>
                  <SelectTrigger id="d-owner" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_OWNERS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-host">Hosting</Label>
                <Input id="d-host" value={form.hosting} onChange={(e) => setForm({ ...form, hosting: e.target.value })} placeholder="np. home.pl, pakiet Biznes" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-hostren">Odnowienie hostingu</Label>
                <Input id="d-hostren" type="date" value={form.hostingRenewsAt} onChange={(e) => setForm({ ...form, hostingRenewsAt: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="d-ssl" checked={form.autoCheckSsl} onCheckedChange={(v) => setForm({ ...form, autoCheckSsl: v === true })} />
              <Label htmlFor="d-ssl" className="font-normal">Automatycznie sprawdzaj certyfikat SSL (codziennie)</Label>
            </div>
            {form.accountOwner === "agency" ? <p className="text-sm text-amber-800 dark:text-amber-300">Domena zarejestrowana na agencję — przy końcu współpracy trzeba ją przenieść na klienta.</p> : null}
            <div className="space-y-1.5">
              <Label htmlFor="d-notes">Notatka</Label>
              <Textarea id="d-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="submit">Zapisz</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
