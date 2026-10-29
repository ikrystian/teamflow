"use client";

import { Download, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aeadEncryptJson, ensureCrypto, generateSalt, DEFAULT_KDF_PARAMS, deriveMasterKeys, wipe } from "@/lib/crypto";
import { authClient } from "@/lib/auth/client";
import { unwrap } from "@/lib/vault/api";
import { autoMapping, detectSource, IMPORT_FIELDS, matchClient, parseCsv, rowsToDrafts, toCsv, type ImportField, type Mapping } from "@/lib/vault/import";
import { StepUpCancelled, withStepUp } from "@/lib/vault/step-up";
import { exportDecrypted, importDrafts, lockVault, newClientVault, syncVault, useVault } from "@/lib/vault/store";
import { TYPE_DEFS } from "@/lib/vault/types";
import { createClientAction } from "@/server/actions/clients";
import { deleteAccountAction } from "@/server/actions/account";

function download(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const SOURCE_LABEL: Record<string, string> = { bitwarden: "Bitwarden", "1password": "1Password", keepass: "KeePass / KeePassXC", chrome: "Chrome / Edge", firefox: "Firefox", generic: "Inny CSV" };

function ImportWizard({ canCreateClients }: { canCreateClients: boolean }) {
  const allClients = useVault((s) => s.clients);
  const clients = useMemo(() => allClients.filter((c) => c.canEdit), [allClients]);
  const [file, setFile] = useState<{ headers: string[]; rows: Record<string, string>[]; source: string; errors: string[] } | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [mode, setMode] = useState<"single" | "group">("single");
  const [target, setTarget] = useState("");
  const [createMissing, setCreateMissing] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    // Plik czytany wyłącznie w przeglądarce — nie trafia na serwer w postaci jawnej.
    const text = await f.text();
    const parsed = parseCsv(text);
    const source = detectSource(parsed.headers);
    setFile({ ...parsed, source });
    setMapping(autoMapping(parsed.headers));
    setMode(parsed.headers.some((h) => ["folder", "group", "grupa"].includes(h.toLowerCase())) ? "group" : "single");
  }

  const drafts = useMemo(() => (file ? rowsToDrafts(file.rows, mapping) : []), [file, mapping]);
  const groups = useMemo(() => [...new Set(drafts.map((d) => d.group).filter(Boolean))], [drafts]);
  const unmatched = groups.filter((g) => !matchClient(g, clients));

  async function run() {
    setProgress(0);
    try {
      await ensureCrypto();
      const created = new Map<string, string>();
      if (mode === "group" && createMissing && canCreateClients) {
        for (const g of unmatched) {
          const id = crypto.randomUUID();
          const name = g.split("/").pop()!.trim() || g;
          const r = await createClientAction({ id, vaultGrant: newClientVault(id), name, status: "active", tags: ["import"], services: [], address: {} });
          if (!r.ok) throw new Error(r.error);
          created.set(g, id);
        }
        await syncVault();
      }
      const list = drafts
        .map((d) => {
          const clientId = mode === "single" ? target : (matchClient(d.group, useVault.getState().clients) ?? created.get(d.group) ?? target);
          return clientId ? { clientId, type: d.type, sensitivity: "standard" as const, overview: d.overview, secrets: d.secrets } : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));
      const n = await importDrafts(list, file!.source, (i) => setProgress(Math.min(100, Math.round((i / Math.max(1, list.length)) * 100))));
      toast.success(`Zaimportowano ${n} dostępów`);
      setFile(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import z CSV</CardTitle>
        <CardDescription>Bitwarden, 1Password, KeePass, Chrome/Edge, Firefox lub dowolny CSV. Plik jest przetwarzany i szyfrowany w przeglądarce. Po imporcie usuń plik CSV z dysku.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="imp-file">Plik CSV</Label>
          <Input id="imp-file" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {file ? (
          <>
            <p className="text-sm">
              Rozpoznano: <strong>{SOURCE_LABEL[file.source]}</strong> · {file.rows.length} wierszy · {drafts.length} wpisów do importu
            </p>
            {file.errors.length ? <p className="text-sm text-amber-700">{file.errors.join("; ")}</p> : null}
            <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <legend className="mb-2 text-sm font-medium">Mapowanie kolumn</legend>
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label htmlFor={`map-${f.key}`} className="text-xs">{f.label}</Label>
                  <Select value={mapping[f.key] ?? "__none"} onValueChange={(v) => setMapping({ ...mapping, [f.key as ImportField]: v === "__none" ? undefined : v })}>
                    <SelectTrigger id={`map-${f.key}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— pomiń —</SelectItem>
                      {file.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Przypisanie do klientów</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="imp-mode" checked={mode === "single"} onChange={() => setMode("single")} /> Wszystko do jednego klienta
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="imp-mode" checked={mode === "group"} onChange={() => setMode("group")} disabled={!mapping.group} /> Według folderu / grupy
                </label>
              </div>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="w-72" aria-label={mode === "single" ? "Klient" : "Klient dla wpisów bez dopasowania"}>
                  <SelectValue placeholder={mode === "single" ? "Wybierz klienta" : "Klient dla pozostałych (opcjonalnie)"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode === "group" ? (
                <div className="space-y-1 text-sm">
                  <p>
                    Grupy: {groups.length} · dopasowane do klientów: {groups.length - unmatched.length}
                  </p>
                  {unmatched.length ? (
                    <label className="flex items-center gap-2">
                      <Checkbox checked={createMissing} onCheckedChange={(v) => setCreateMissing(v === true)} disabled={!canCreateClients} /> Utwórz brakujących klientów ({unmatched.slice(0, 5).join(", ")}
                      {unmatched.length > 5 ? "…" : ""})
                    </label>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
            <div className="max-h-56 overflow-auto rounded-md border text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1">Typ</th>
                    <th className="px-2 py-1">Nazwa</th>
                    <th className="px-2 py-1">Login</th>
                    <th className="px-2 py-1">Grupa</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.slice(0, 50).map((d) => (
                    <tr key={d.index} className="border-t">
                      <td className="px-2 py-1">{TYPE_DEFS[d.type].label}</td>
                      <td className="px-2 py-1">{d.overview.name}</td>
                      <td className="px-2 py-1">{d.overview.login}</td>
                      <td className="px-2 py-1">{d.group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {progress !== null ? <Progress value={progress} aria-label="Postęp importu" /> : null}
            <Button onClick={run} disabled={progress !== null || !drafts.length || (mode === "single" && !target)}>
              {progress !== null ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />} Zaszyfruj i importuj {drafts.length}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExportPanel() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function run(kind: "csv" | "encrypted") {
    setBusy(kind);
    try {
      const rows = await exportDecrypted();
      const date = new Date().toISOString().slice(0, 10);
      if (kind === "csv") {
        download(`nexus-sejf-eksport-${date}.csv`, `﻿${toCsv(rows)}`, "text/csv;charset=utf-8");
      } else {
        await ensureCrypto();
        const salt = generateSalt();
        const { encryptionKey, authKey } = await deriveMasterKeys(password, salt, DEFAULT_KDF_PARAMS);
        const ciphertext = aeadEncryptJson(encryptionKey, { exportedAt: new Date().toISOString(), items: rows }, "dostepnik:export:v1");
        wipe(encryptionKey, authKey);
        download(`nexus-sejf-eksport-${date}.json`, JSON.stringify({ format: "dostepnik-export-v1", kdf: { ...DEFAULT_KDF_PARAMS, salt }, ciphertext }, null, 2), "application/json");
        setPassword("");
      }
      toast.success(`Wyeksportowano ${rows.length} wpisów`);
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Eksport sejfu</CardTitle>
        <CardDescription>Wymaga ponownego potwierdzenia tożsamości i trafia do dziennika zdarzeń. Odszyfrowanie odbywa się w przeglądarce.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="exp-pw">Hasło pliku (zaszyfrowany JSON)</Label>
            <Input id="exp-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <Button onClick={() => run("encrypted")} disabled={Boolean(busy) || password.length < 12}>
            {busy === "encrypted" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />} Zaszyfrowany JSON
          </Button>
        </div>
        <div className="flex items-start gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-2">
            <p>Eksport CSV zawiera hasła w postaci jawnej. Używaj go tylko do migracji i usuń plik zaraz po imporcie.</p>
            <Button size="sm" variant="outline" onClick={() => run("csv")} disabled={Boolean(busy)}>
              {busy === "csv" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />} Eksport CSV (jawny)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DataSettings({ canExport, isOwner, canCreateClients }: { canExport: boolean; isOwner: boolean; canCreateClients: boolean }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <ImportWizard canCreateClients={canCreateClients} />
      {canExport ? (
        <ExportPanel />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eksport sejfu</CardTitle>
            <CardDescription>Eksport danych może wykonać właściciel albo administrator, któremu właściciel nadał to uprawnienie.</CardDescription>
          </CardHeader>
        </Card>
      )}
      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dane przestrzeni (RODO)</CardTitle>
            <CardDescription>Eksport danych CRM, zespołu i dziennika zdarzeń na żądanie (JSON). Usunięcie przestrzeni znajdziesz w ustawieniach przestrzeni.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await withStepUp("Eksport danych przestrzeni", async () => {
                    const res = await fetch("/api/export/gdpr");
                    if (res.status === 403) {
                      const b = await res.json();
                      const { ApiError } = await import("@/lib/vault/api");
                      throw new ApiError(b.error, 403, b.code);
                    }
                    if (!res.ok) throw new Error("Nie udało się wyeksportować danych");
                    download(`nexus-dane-${new Date().toISOString().slice(0, 10)}.json`, await res.text(), "application/json");
                  });
                } catch (e) {
                  if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
                }
              }}
            >
              <Download aria-hidden /> Eksportuj dane przestrzeni
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Usuń konto</CardTitle>
          <CardDescription>Usunięcie danych na żądanie (RODO). Przestrzenie, w których jesteś jedyną osobą, zostaną usunięte. Właściciel przestrzeni z zespołem musi najpierw przekazać własność.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Na pewno usunąć konto? Tej operacji nie można cofnąć.")) return;
              try {
                await withStepUp("Usunięcie konta", () => unwrap(deleteAccountAction()));
                lockVault("account_deleted");
                await authClient.signOut().catch(() => {});
                router.push("/auth/signin");
              } catch (e) {
                if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
              }
            }}
          >
            Usuń konto na zawsze
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
