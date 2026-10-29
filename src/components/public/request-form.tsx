"use client";

import { CheckCircle2, Loader2, Plus, ShieldCheck, Trash, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ensureCrypto, sealIntakeSubmission } from "@/lib/crypto";
import { api } from "@/lib/vault/api";
import { formatDateTime } from "@/lib/format";
import { TYPE_DEFS, type CredentialType } from "@/lib/vault/types";
import { TypeIcon } from "@/components/vault/category";
import { PasswordInput } from "@/components/vault/password-input";

type Meta = { id: string; status: "open" | "submitted" | "closed"; clientName: string; workspaceName: string; requestedTypes: CredentialType[]; message: string | null; expiresAt: string; intakePublicKey: string; intakeKeyVersion: number };
type Item = { key: string; type: CredentialType; name: string; url: string; login: string; password: string; totp: string; notes: string; fields: Record<string, string> };

const newItem = (type: CredentialType): Item => ({ key: crypto.randomUUID(), type, name: TYPE_DEFS[type].label, url: "", login: "", password: "", totp: "", notes: "", fields: {} });

export function RequestForm({ token }: { token: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<Meta>(`/api/request/${token}`)
      .then((m) => {
        setMeta(m);
        setItems(m.requestedTypes.map(newItem));
        // Klucz agencji przypięty w części adresu po # — serwer nie podmieni go niezauważenie.
        const pk = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("pk");
        if (pk && pk !== m.intakePublicKey) setPinError(true);
      })
      .catch((e) => setError((e as Error).message));
  }, [token]);

  const update = (key: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!meta || pinError) return;
    setBusy(true);
    setError(null);
    try {
      await ensureCrypto();
      const payload = {
        requestId: meta.id,
        submittedBy: who,
        items: items.filter((i) => i.login || i.password || i.notes || i.url || Object.values(i.fields).some(Boolean)).map(({ key: _k, ...rest }) => rest),
      };
      if (!payload.items.length) throw new Error("Uzupełnij co najmniej jeden dostęp");
      const ciphertext = sealIntakeSubmission(meta.intakePublicKey, meta.id, payload);
      await api(`/api/request/${token}`, { method: "POST", body: JSON.stringify({ ciphertext, intakeKeyVersion: meta.intakeKeyVersion, itemCount: payload.items.length }) });
      setItems([]);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !meta)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Formularz nie działa</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  if (!meta) return <Loader2 className="mx-auto mt-10 animate-spin" aria-label="Ładowanie" />;
  if (done || meta.status === "submitted")
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" aria-hidden /> Dziękujemy — dostępy zostały przekazane
          </CardTitle>
          <CardDescription>Dane zostały zaszyfrowane w Twojej przeglądarce i są czytelne tylko dla zespołu {meta.workspaceName}. Możesz zamknąć tę stronę.</CardDescription>
        </CardHeader>
      </Card>
    );
  if (meta.status !== "open")
    return (
      <Card>
        <CardHeader>
          <CardTitle>Formularz jest nieaktywny</CardTitle>
          <CardDescription>Prośba wygasła lub została anulowana. Poproś {meta.workspaceName} o nowy link.</CardDescription>
        </CardHeader>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {meta.workspaceName} prosi o dostępy: {meta.clientName}
        </CardTitle>
        <CardDescription className="space-y-2">
          <span className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> Dane zaszyfrują się w Twojej przeglądarce, zanim opuszczą komputer. Prosimy nie wysyłać haseł e-mailem ani komunikatorem.
          </span>
          <span className="block">Formularz jest ważny do {formatDateTime(meta.expiresAt)}.</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pinError ? (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-red-100 p-3 text-sm text-red-950 dark:bg-red-950 dark:text-red-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Klucz szyfrowania nie zgadza się z linkiem. Nie wysyłaj danych i skontaktuj się z agencją.
          </p>
        ) : null}
        {meta.message ? <p className="mb-4 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{meta.message}</p> : null}
        <form onSubmit={submit} className="space-y-6">
          {items.map((it) => {
            const def = TYPE_DEFS[it.type];
            const extra = def.fields.filter((f) => ["host", "port", "protocol", "databaseName", "registrar", "authInfo", "platform", "accountId", "apiKey", "apiSecret", "content", "supportPin", "providerClientId", "panel", "cms"].includes(f.key));
            return (
              <fieldset key={it.key} className="space-y-3 rounded-lg border p-4">
                <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
                  <TypeIcon type={it.type} className="size-6" /> {def.label}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${it.key}-name`}>Nazwa (np. czego dotyczy)</Label>
                    <Input id={`${it.key}-name`} value={it.name} onChange={(e) => update(it.key, { name: e.target.value })} />
                  </div>
                  {it.type !== "secure_note" ? (
                    <div className="space-y-1">
                      <Label htmlFor={`${it.key}-url`}>{def.urlLabel ?? "Adres strony logowania"}</Label>
                      <Input id={`${it.key}-url`} value={it.url} onChange={(e) => update(it.key, { url: e.target.value })} inputMode="url" />
                    </div>
                  ) : null}
                  {def.hasLogin ? (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor={`${it.key}-login`}>{def.loginLabel ?? "Login"}</Label>
                        <Input id={`${it.key}-login`} value={it.login} onChange={(e) => update(it.key, { login: e.target.value })} autoComplete="off" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${it.key}-pw`}>Hasło</Label>
                        <PasswordInput id={`${it.key}-pw`} value={it.password} onChange={(v) => update(it.key, { password: v })} generator={false} meter={false} autoComplete="off" />
                      </div>
                    </>
                  ) : null}
                  {extra.map((f) => (
                    <div key={f.key} className={`space-y-1 ${f.multiline ? "sm:col-span-2" : ""}`}>
                      <Label htmlFor={`${it.key}-${f.key}`}>{f.label}</Label>
                      {f.multiline ? (
                        <Textarea id={`${it.key}-${f.key}`} value={it.fields[f.key] ?? ""} onChange={(e) => update(it.key, { fields: { ...it.fields, [f.key]: e.target.value } })} rows={4} />
                      ) : (
                        <Input id={`${it.key}-${f.key}`} value={it.fields[f.key] ?? ""} onChange={(e) => update(it.key, { fields: { ...it.fields, [f.key]: e.target.value } })} autoComplete="off" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${it.key}-notes`}>Uwagi (opcjonalnie)</Label>
                  <Textarea id={`${it.key}-notes`} value={it.notes} onChange={(e) => update(it.key, { notes: e.target.value })} rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setItems((l) => [...l, newItem(it.type)])}>
                    <Plus aria-hidden /> Kolejny: {def.label}
                  </Button>
                  {items.length > 1 ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>
                      <Trash aria-hidden /> Usuń
                    </Button>
                  ) : null}
                </div>
              </fieldset>
            );
          })}
          <div className="space-y-1">
            <Label htmlFor="who">Twoje imię i nazwisko</Label>
            <Input id="who" value={who} onChange={(e) => setWho(e.target.value)} required />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy || pinError || !who.trim()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />} Zaszyfruj i wyślij
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
