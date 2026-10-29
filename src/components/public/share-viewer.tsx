"use client";

import { Copy, Eye, EyeOff, Loader2, Package, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decryptShare, deriveShareAccess, ensureCrypto } from "@/lib/crypto";
import { api, ApiError } from "@/lib/vault/api";
import { formatDateTime } from "@/lib/format";
import { TotpCode } from "@/components/vault/totp-code";

type Meta = { id: string; kind: "credential" | "handover"; hasPassword: boolean; passwordSalt: string | null; expiresAt: string; remainingViews: number; status: "active" | "used" | "expired" | "revoked"; workspaceName: string };
type Item = { name: string; type: string; url: string; login: string; password: string; totp: string; notes: string; fields: { label: string; value: string; secret: boolean }[] };
type Payload = { kind: "credential"; item: Item } | { kind: "handover"; clientName: string; items: Item[]; transfers: { name: string; type: string; note: string; partnerAccess: string | null }[]; recommendation: string };

function Secret({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={`min-w-0 flex-1 text-sm break-all ${mono ? "secret" : ""}`}>{show ? value : "••••••••••"}</span>
      <Button size="icon" variant="ghost" className="size-8" onClick={() => setShow(!show)} aria-label={show ? `Ukryj: ${label}` : `Pokaż: ${label}`}>
        {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </Button>
      <Button size="icon" variant="ghost" className="size-8" onClick={async () => (await navigator.clipboard.writeText(value), setCopied(true))} aria-label={`Kopiuj: ${label}`}>
        <Copy aria-hidden />
      </Button>
      {copied ? <span className="sr-only" aria-live="polite">Skopiowano</span> : null}
    </div>
  );
}

function Plain({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-sm break-all whitespace-pre-wrap">{value}</span>
      <Button size="icon" variant="ghost" className="size-8" onClick={() => navigator.clipboard.writeText(value)} aria-label={`Kopiuj: ${label}`}>
        <Copy aria-hidden />
      </Button>
    </div>
  );
}

function ItemView({ item }: { item: Item }) {
  return (
    <div className="space-y-2">
      <p className="font-medium">
        {item.name} <span className="text-sm font-normal text-muted-foreground">· {item.type}</span>
      </p>
      <Plain label="Adres" value={item.url} />
      <Plain label="Login" value={item.login} />
      <Secret label="Hasło" value={item.password} />
      {item.totp ? (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <span className="w-28 shrink-0 text-xs text-muted-foreground">Kod 2FA</span>
          <TotpCode secret={item.totp} onCopy={() => void 0} />
        </div>
      ) : null}
      {item.fields.map((f, i) => (f.secret ? <Secret key={i} label={f.label} value={f.value} /> : <Plain key={i} label={f.label} value={f.value} />))}
      {item.notes ? <Plain label="Notatka" value={item.notes} /> : null}
    </div>
  );
}

export function ShareViewer({ id }: { id: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    api<Meta>(`/api/share/${id}`)
      .then(setMeta)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  async function open(e?: React.FormEvent) {
    e?.preventDefault();
    if (!meta) return;
    setBusy(true);
    setError(null);
    try {
      await ensureCrypto();
      const fragment = window.location.hash;
      const { accessKey, encKey } = await deriveShareAccess(id, fragment, meta.hasPassword ? password : undefined, meta.passwordSalt);
      const res = await api<{ ciphertext: string; remainingViews: number }>(`/api/share/${id}`, { method: "POST", body: JSON.stringify({ accessKey }) });
      setPayload(decryptShare<Payload>(encKey, id, res.ciphertext));
      setRemaining(res.remainingViews);
      // Klucz linku nie powinien zostać w historii przeglądarki.
      history.replaceState(null, "", window.location.pathname);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 410 ? "Link wygasł lub został już wykorzystany." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !meta) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link nie działa</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (!meta) return <Loader2 className="mx-auto mt-10 animate-spin" aria-label="Ładowanie" />;

  if (payload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {payload.kind === "handover" ? <Package className="size-5" aria-hidden /> : null}
            {payload.kind === "handover" ? `Pakiet przekazania: ${payload.clientName}` : "Udostępniony dostęp"}
          </CardTitle>
          <CardDescription>
            Od: {meta.workspaceName}. {remaining ? `Link można otworzyć jeszcze ${remaining} raz(y).` : "Link został właśnie zużyty — po zamknięciu strony nie otworzysz go ponownie."} Zapisz dane w bezpiecznym miejscu (np. menedżerze haseł).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {payload.kind === "credential" ? (
            <ItemView item={payload.item} />
          ) : (
            <>
              <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">{payload.recommendation}</p>
              {payload.transfers.length ? (
                <div>
                  <p className="mb-2 font-medium">Konta do przeniesienia własności</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {payload.transfers.map((t, i) => (
                      <li key={i}>
                        {t.name} ({t.type}) — {t.note}
                        {t.partnerAccess ? `: ${t.partnerAccess}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {payload.items.map((it, i) => (
                <ItemView key={i} item={it} />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (meta.status !== "active") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link nie jest już aktywny</CardTitle>
          <CardDescription>{meta.status === "used" ? "Link został już wykorzystany." : meta.status === "revoked" ? "Link został unieważniony przez nadawcę." : `Link wygasł ${formatDateTime(meta.expiresAt)}.`} Poproś nadawcę o nowy.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.kind === "handover" ? "Pakiet przekazania dostępów" : "Ktoś udostępnił Ci dostęp"}</CardTitle>
        <CardDescription>
          Od: {meta.workspaceName}. Dane zostaną odszyfrowane w Twojej przeglądarce. Pozostało wyświetleń: {meta.remainingViews} · ważny do {formatDateTime(meta.expiresAt)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={open} className="space-y-4">
          {meta.hasPassword ? (
            <div className="space-y-1.5">
              <Label htmlFor="sh-pw">Hasło do linku</Label>
              <Input id="sh-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
              <p className="text-xs text-muted-foreground">Nadawca powinien przekazać je innym kanałem.</p>
            </div>
          ) : null}
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Otwarcie zużyje jedno wyświetlenie.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy || (meta.hasPassword && !password)}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Eye aria-hidden />} Pokaż dane
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
