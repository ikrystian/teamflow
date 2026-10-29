"use client";

import { Mail, Pencil, Phone, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/layout/page-header";
import { deleteContactAction, saveContactAction } from "@/server/actions/clients";

type Contact = { id: string; name: string; role: string | null; email: string | null; phone: string | null; preferredContact: "email" | "phone" | "sms" | "messenger" | "whatsapp" | "other"; notes: string | null };

const METHODS = [
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefon" },
  { value: "sms", label: "SMS" },
  { value: "messenger", label: "Messenger" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Inna" },
] as const;

export function ContactsManager({ clientId, contacts, canEdit }: { clientId: string; contacts: Contact[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [form, setForm] = useState<Omit<Contact, "id">>({ name: "", role: "", email: "", phone: "", preferredContact: "email", notes: "" });

  function open(c: Contact | "new") {
    setEditing(c);
    setForm(c === "new" ? { name: "", role: "", email: "", phone: "", preferredContact: "email", notes: "" } : { ...c });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await saveContactAction(clientId, editing === "new" ? null : editing!.id, { ...form, role: form.role ?? "", email: form.email ?? "", phone: form.phone ?? "", notes: form.notes ?? "" });
    if (!r.ok) return toast.error(r.error);
    toast.success("Zapisano kontakt");
    setEditing(null);
    router.refresh();
  }

  async function remove(c: Contact) {
    if (!confirm(`Usunąć kontakt ${c.name}?`)) return;
    const r = await deleteContactAction(clientId, c.id);
    if (!r.ok) return toast.error(r.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={() => open("new")}>
            <Plus aria-hidden /> Dodaj kontakt
          </Button>
        </div>
      ) : null}
      {contacts.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.role ? <p className="text-sm text-muted-foreground">{c.role}</p> : null}
                </div>
                {canEdit ? (
                  <div className="flex">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => open(c)} aria-label={`Edytuj ${c.name}`}>
                      <Pencil aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => remove(c)} aria-label={`Usuń ${c.name}`}>
                      <Trash aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </div>
              {c.email ? (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Mail className="size-4" aria-hidden /> {c.email}
                </a>
              ) : null}
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Phone className="size-4" aria-hidden /> {c.phone}
                </a>
              ) : null}
              <p className="text-xs text-muted-foreground">Preferowany kontakt: {METHODS.find((m) => m.value === c.preferredContact)?.label}</p>
              {c.notes ? <p className="text-sm whitespace-pre-wrap">{c.notes}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Brak osób kontaktowych" description="Dodaj osoby po stronie klienta: imię i nazwisko, rolę, e-mail, telefon." />
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nowy kontakt" : "Edytuj kontakt"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct-name">Imię i nazwisko</Label>
              <Input id="ct-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ct-role">Rola</Label>
                <Input id="ct-role" value={form.role ?? ""} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="np. Właściciel, Marketing" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-pref">Preferowana forma kontaktu</Label>
                <Select value={form.preferredContact} onValueChange={(v) => setForm({ ...form, preferredContact: v as Contact["preferredContact"] })}>
                  <SelectTrigger id="ct-pref" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-email">E-mail</Label>
                <Input id="ct-email" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-phone">Telefon</Label>
                <Input id="ct-phone" type="tel" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-notes">Notatka</Label>
              <Textarea id="ct-notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
