"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/layout/page-header";
import { formatDateTime } from "@/lib/format";
import { openSubmission, saveCredential, type IntakeItem } from "@/lib/vault/store";
import { emptyOverview, emptySecrets, TYPE_DEFS } from "@/lib/vault/types";
import { reviewAccessRequestAction, revokeAccessRequestAction } from "@/server/actions/sharing";
import { StatusBadge } from "./badges";
import { TypeIcon } from "./category";

type Req = { id: string; clientId: string; clientName: string; requestedTypes: string[]; status: string; expired: boolean; createdAt: string; submittedAt: string | null; createdByName: string | null; recipientEmail: string | null };

/** Zamiana pozycji z formularza klienta na wpis sejfu. */
function toDraft(clientId: string, it: IntakeItem) {
  const def = TYPE_DEFS[it.type];
  const overview = { ...emptyOverview(it.type), name: it.name || def.label, url: it.url, login: it.login, notes: it.notes, tags: ["od klienta"] };
  const secrets = { ...emptySecrets(it.type), password: it.password, totp: it.totp };
  for (const f of def.fields) {
    const v = it.fields?.[f.key];
    if (!v) continue;
    if (f.secret) secrets.fields[f.key] = v;
    else overview.fields[f.key] = v;
  }
  return { clientId, type: it.type, sensitivity: "standard" as const, overview, secrets };
}

function Review({ req, onDone }: { req: Req; onDone: () => void }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; items: (IntakeItem & { keep: boolean })[]; submittedBy: string }>({ loading: true, error: null, items: [], submittedBy: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    openSubmission(req.id)
      .then((s) => setState({ loading: false, error: null, items: s.payload.items.map((i) => ({ ...i, keep: true })), submittedBy: s.payload.submittedBy }))
      .catch((e) => setState((p) => ({ ...p, loading: false, error: (e as Error).message })));
  }, [req.id]);

  async function accept() {
    setBusy(true);
    try {
      const keep = state.items.filter((i) => i.keep);
      for (const it of keep) await saveCredential(toDraft(req.clientId, it));
      const r = await reviewAccessRequestAction(req.id, "accepted", keep.length);
      if (!r.ok) throw new Error(r.error);
      toast.success(`Dodano ${keep.length} dostępów do sejfu ${req.clientName}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    const r = await reviewAccessRequestAction(req.id, "rejected", 0);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Odrzucono zgłoszenie (szyfrogram usunięty)");
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dostępy od klienta: {req.clientName}</DialogTitle>
          <DialogDescription>Odszyfrowane w Twojej przeglądarce kluczem skrzynki „Do przejrzenia”. {state.submittedBy ? `Wypełnił(a): ${state.submittedBy}.` : ""}</DialogDescription>
        </DialogHeader>
        {state.loading ? <Loader2 className="animate-spin" aria-label="Odszyfrowywanie" /> : null}
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <ul className="space-y-2">
          {state.items.map((it, idx) => (
            <li key={idx} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Checkbox checked={it.keep} onCheckedChange={(v) => setState((p) => ({ ...p, items: p.items.map((x, i) => (i === idx ? { ...x, keep: v === true } : x)) }))} aria-label="Zachowaj ten dostęp" />
                <TypeIcon type={it.type} />
                <Input value={it.name} onChange={(e) => setState((p) => ({ ...p, items: p.items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)) }))} aria-label="Nazwa wpisu" />
              </div>
              <p className="text-sm text-muted-foreground">
                {TYPE_DEFS[it.type].label}
                {it.url ? ` · ${it.url}` : ""}
                {it.login ? ` · login: ${it.login}` : ""}
                {it.password ? " · hasło: ••••••" : ""}
                {it.totp ? " · 2FA" : ""}
              </p>
              {it.notes ? <p className="text-sm whitespace-pre-wrap">{it.notes}</p> : null}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={reject} disabled={busy}>
            <X aria-hidden /> Odrzuć
          </Button>
          <Button onClick={accept} disabled={busy || state.loading || !!state.error || !state.items.some((i) => i.keep)}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />} Zaakceptuj i zapisz w sejfie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InboxList({ requests }: { requests: Req[] }) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<Req | null>(null);
  const submitted = requests.filter((r) => r.status === "submitted");
  const pending = requests.filter((r) => r.status === "pending" && !r.expired);
  const closed = requests.filter((r) => !submitted.includes(r) && !pending.includes(r));

  const table = (list: Req[], actions: (r: Req) => React.ReactNode) =>
    list.length ? (
      <ul className="divide-y rounded-lg border">
        {list.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.clientName}</p>
              <p className="text-sm text-muted-foreground">
                {r.requestedTypes.map((t) => TYPE_DEFS[t as keyof typeof TYPE_DEFS]?.label ?? t).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                Prośba: {formatDateTime(r.createdAt)} · {r.createdByName ?? "—"}
                {r.recipientEmail ? ` · do ${r.recipientEmail}` : ""}
                {r.submittedAt ? ` · wypełniono ${formatDateTime(r.submittedAt)}` : ""}
              </p>
            </div>
            <div className="flex gap-2">{actions(r)}</div>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState title="Pusto" />
    );

  return (
    <>
      <Tabs defaultValue="submitted">
        <TabsList>
          <TabsTrigger value="submitted">Do przejrzenia ({submitted.length})</TabsTrigger>
          <TabsTrigger value="pending">Oczekujące ({pending.length})</TabsTrigger>
          <TabsTrigger value="closed">Zamknięte</TabsTrigger>
        </TabsList>
        <TabsContent value="submitted" className="pt-4">
          {table(submitted, (r) => (
            <Button onClick={() => setReviewing(r)}>Przejrzyj</Button>
          ))}
        </TabsContent>
        <TabsContent value="pending" className="pt-4">
          {table(pending, (r) => (
            <Button
              variant="outline"
              onClick={async () => {
                const res = await revokeAccessRequestAction(r.id);
                if (!res.ok) return toast.error(res.error);
                router.refresh();
              }}
            >
              Anuluj prośbę
            </Button>
          ))}
        </TabsContent>
        <TabsContent value="closed" className="pt-4">
          {table(closed, (r) => (
            <StatusBadge variant={r.status === "accepted" ? "ok" : "muted"}>{r.status === "accepted" ? "zaakceptowano" : r.status === "rejected" ? "odrzucono" : r.expired ? "wygasła" : "anulowano"}</StatusBadge>
          ))}
        </TabsContent>
      </Tabs>
      {reviewing ? <Review req={reviewing} onDone={() => (setReviewing(null), router.refresh())} /> : null}
    </>
  );
}
