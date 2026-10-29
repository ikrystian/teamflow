"use client";

import { LayoutGrid, List, Loader2, Move, Plus, RefreshCw, Tag, TriangleAlert, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { analyzeHealth, FLAG_LABELS, type HealthFlag } from "@/lib/vault/health";
import { normalize } from "@/lib/vault/search";
import { StepUpCancelled } from "@/lib/vault/step-up";
import { addTagToItems, moveItems, revealSecrets, searchVault, syncVault, useVault, type VaultItem } from "@/lib/vault/store";
import { CATEGORIES, categoryOf, type CategoryId, type CredentialType } from "@/lib/vault/types";
import { deleteCredentialAction, markRotationAction } from "@/server/actions/vault";
import { updatePreferencesAction } from "@/server/actions/account";
import { CredentialForm } from "./credential-form";
import { CredentialList, VIRTUALIZE_FROM } from "./credential-list";
import type { RowAction } from "./credential-row";
import { CredentialSheet } from "./credential-sheet";
import { ShareDialog } from "./share-dialog";
import { TeamShareDialog } from "./team-share-dialog";

type Props = {
  /** Gdy podany — widok sejfu jednego klienta (zakładka „Dostępy”). */
  clientId?: string;
  canShareExternal: boolean;
  maxShareHours: number;
  passwordMaxAgeDays: number;
  initialView?: "table" | "cards";
};

export function CredentialsView({ clientId, canShareExternal, maxShareHours, passwordMaxAgeDays, initialView = "table" }: Props) {
  const allItems = useVault((s) => s.items);
  const clients = useVault((s) => s.clients);
  const syncing = useVault((s) => s.syncing);
  const breached = useVault((s) => s.breached);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [view, setView] = useState<"table" | "cards">(initialView);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [client, setClient] = useState<string>(clientId ?? "all");
  const [flagFilter, setFlagFilter] = useState<HealthFlag | "all" | "shared">((search.get("filter") as HealthFlag | "shared") ?? "all");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [formState, setFormState] = useState<{ open: boolean; item: VaultItem | null; type?: CredentialType; key: number }>({ open: false, item: null, key: 0 });
  const [shareItem, setShareItem] = useState<VaultItem | null>(null);
  const [teamItem, setTeamItem] = useState<VaultItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<VaultItem | null>(null);
  const [bulk, setBulk] = useState<null | "move" | "tag">(null);
  const [bulkValue, setBulkValue] = useState("");
  const [busy, setBusy] = useState(false);

  const openId = search.get("open");
  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(search.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  // ?new=ftp z palety poleceń otwiera formularz z wybranym typem (aktualizacja stanu w trakcie renderowania).
  const newParam = search.get("new") as CredentialType | null;
  const [handledNew, setHandledNew] = useState<string | null>(null);
  if (newParam && newParam !== handledNew) {
    setHandledNew(newParam);
    setFormState((s) => ({ open: true, item: null, type: newParam, key: s.key + 1 }));
  }
  useEffect(() => {
    if (newParam) setParam("new", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newParam]);

  const scoped = useMemo(() => (clientId ? allItems.filter((i) => i.clientId === clientId) : allItems), [allItems, clientId]);
  const health = useMemo(() => analyzeHealth(scoped, { maxAgeDays: passwordMaxAgeDays, breached }), [scoped, passwordMaxAgeDays, breached]);

  const items = useMemo(() => {
    let list = scoped;
    if (q.trim()) {
      const ids = new Set(searchVault(q).map((i) => i.id));
      list = list.filter((i) => ids.has(i.id));
    }
    if (category !== "all") list = list.filter((i) => categoryOf(i.type) === category);
    if (!clientId && client !== "all") list = list.filter((i) => i.clientId === client);
    if (flagFilter === "shared") list = list.filter((i) => i.direct);
    else if (flagFilter !== "all") list = list.filter((i) => health.flags.get(i.id)?.has(flagFilter));
    return [...list].sort((a, b) => normalize(a.overview?.name ?? "").localeCompare(normalize(b.overview?.name ?? "")));
  }, [scoped, q, category, client, clientId, flagFilter, health]);

  const current = openId ? (allItems.find((i) => i.id === openId) ?? null) : null;
  const clientInfo = clientId ? clients.find((c) => c.id === clientId) : null;
  const canAdd = clientId ? Boolean(clientInfo?.canEdit) : clients.some((c) => c.canEdit);

  async function onAction(item: VaultItem, a: RowAction) {
    try {
      if (a === "open") return setParam("open", item.id);
      if (a === "edit") {
        if (!item.secrets) await revealSecrets(item.id, "edit");
        const fresh = useVault.getState().items.find((i) => i.id === item.id)!;
        return setFormState((s) => ({ open: true, item: fresh, key: s.key + 1 }));
      }
      if (a === "history") return setParam("open", item.id);
      if (a === "share") return setShareItem(item);
      if (a === "team") return setTeamItem(item);
      if (a === "move") {
        setSelection(new Set([item.id]));
        return setBulk("move");
      }
      if (a === "delete") return setDeleteItem(item);
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
    }
  }

  async function runBulk(kind: "move" | "tag" | "rotate") {
    setBusy(true);
    try {
      const ids = [...selection];
      if (kind === "move") {
        await moveItems(ids, bulkValue);
        toast.success(`Przeniesiono ${ids.length} wpisów`);
      } else if (kind === "tag") {
        const n = await addTagToItems(ids, bulkValue.trim());
        toast.success(`Dodano tag do ${n} wpisów`);
      } else {
        const r = await markRotationAction(ids, true);
        if (!r.ok) throw new Error(r.error);
        await syncVault();
        toast.success(`Oznaczono ${ids.length} wpisów „do zmiany” i utworzono zadania`);
      }
      setSelection(new Set());
      setBulk(null);
      setBulkValue("");
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    const r = await deleteCredentialAction(deleteItem.id);
    if (!r.ok) return toast.error(r.error);
    toast.success("Usunięto wpis");
    setDeleteItem(null);
    if (openId === deleteItem.id) setParam("open", null);
    await syncVault();
  }

  const flagOptions = (Object.keys(FLAG_LABELS) as HealthFlag[]).filter((f) => health.lists[f].length);
  const selectedItems = allItems.filter((i) => selection.has(i.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj: nazwa, klient, adres, login, tag…" aria-label="Szukaj dostępów" className="lg:max-w-sm" />
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Select value={category} onValueChange={(v) => setCategory(v as CategoryId | "all")}>
            <SelectTrigger className="w-44" aria-label="Kategoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie kategorie</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!clientId ? (
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger className="w-44" aria-label="Klient">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy klienci</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={flagFilter} onValueChange={(v) => setFlagFilter(v as HealthFlag | "all" | "shared")}>
            <SelectTrigger className="w-48" aria-label="Kondycja">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Każda kondycja</SelectItem>
              {!clientId ? <SelectItem value="shared">Udostępnione mi</SelectItem> : null}
              {flagOptions.map((f) => (
                <SelectItem key={f} value={f}>
                  {FLAG_LABELS[f]} ({health.lists[f].length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (!v) return;
              setView(v as "table" | "cards");
              void updatePreferencesAction({ vaultView: v });
            }}
            variant="outline"
            aria-label="Widok"
          >
            <ToggleGroupItem value="table" aria-label="Tabela">
              <List aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Karty">
              <LayoutGrid aria-hidden />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="ghost" size="icon" onClick={() => syncVault()} aria-label="Odśwież sejf" disabled={syncing}>
            <RefreshCw className={syncing ? "animate-spin" : undefined} aria-hidden />
          </Button>
          {canAdd ? (
            <Button onClick={() => setFormState((s) => ({ open: true, item: null, key: s.key + 1 }))}>
              <Plus aria-hidden /> Dodaj dostęp
            </Button>
          ) : null}
        </div>
      </div>

      {clientInfo?.rotationRequired ? (
        <p className="flex items-center gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          <TriangleAlert className="size-4" aria-hidden /> Klucz sejfu tego klienta czeka na rotację po odejściu osoby z dostępem. Zostanie zrotowany automatycznie, gdy właściciel lub administrator odblokuje sejf.
        </p>
      ) : null}

      {selection.size ? (
        <div className="glass-solid sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-lg border p-2" role="region" aria-label="Operacje zbiorcze">
          <span className="px-2 text-sm font-medium">Zaznaczono: {selection.size}</span>
          <Button size="sm" variant="outline" onClick={() => setBulk("move")} disabled={selectedItems.some((i) => !i.canEdit)}>
            <Move aria-hidden /> Przenieś do klienta
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulk("tag")} disabled={selectedItems.some((i) => !i.canEdit)}>
            <Tag aria-hidden /> Dodaj tag
          </Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("rotate")} disabled={busy || selectedItems.some((i) => !i.canEdit)}>
            <TriangleAlert aria-hidden /> Oznacz „do zmiany”
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelection(new Set(items.map((i) => i.id)))}>
            Zaznacz wszystkie ({items.length})
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelection(new Set())} aria-label="Wyczyść zaznaczenie">
            <X aria-hidden />
          </Button>
        </div>
      ) : null}

      <CredentialList
        items={items}
        flags={health.flags}
        view={view}
        showClient={!clientId}
        groupByCategory={category === "all" && items.length <= VIRTUALIZE_FROM}
        showEmptyCategories={Boolean(clientId) && !q && flagFilter === "all"}
        canAdd={canAdd}
        canShareExternal={canShareExternal}
        selection={selection}
        onSelectionChange={setSelection}
        onAction={onAction}
        onAdd={(type) => setFormState((s) => ({ open: true, item: null, type, key: s.key + 1 }))}
      />

      <CredentialSheet key={current?.id ?? "none"} item={current} flags={current ? health.flags.get(current.id) : undefined} onClose={() => setParam("open", null)} onAction={(a) => current && onAction(current, a)} />
      <CredentialForm
        key={formState.key}
        open={formState.open}
        onOpenChange={(o) => setFormState((s) => ({ ...s, open: o }))}
        item={formState.item}
        clientId={clientId}
        initialType={formState.type}
        onSaved={(id) => !formState.item && setParam("open", id)}
      />
      <ShareDialog item={shareItem} open={Boolean(shareItem)} onOpenChange={(o) => !o && setShareItem(null)} maxHours={maxShareHours} />
      <TeamShareDialog item={teamItem} open={Boolean(teamItem)} onOpenChange={(o) => !o && setTeamItem(null)} />

      <Dialog open={bulk !== null} onOpenChange={(o) => !o && setBulk(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulk === "move" ? `Przenieś ${selection.size} wpisów do klienta` : `Dodaj tag do ${selection.size} wpisów`}</DialogTitle>
          </DialogHeader>
          {bulk === "move" ? (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-client">Klient docelowy</Label>
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger id="bulk-client" className="w-full">
                  <SelectValue placeholder="Wybierz klienta" />
                </SelectTrigger>
                <SelectContent>
                  {clients
                    .filter((c) => c.canEdit)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Klucze wpisów zostaną ponownie zaszyfrowane kluczem sejfu klienta docelowego.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-tag">Tag</Label>
              <Input id="bulk-tag" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} maxLength={40} />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => runBulk(bulk!)} disabled={busy || !bulkValue.trim()}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Zastosuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć wpis „{deleteItem?.overview?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Wpis zniknie z sejfu, a aktywne linki jednorazowe zostaną unieważnione. Operacja trafi do dziennika zdarzeń.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
