"use client";

import { Info, Loader2, Plus, ShieldAlert, TriangleAlert, Trash, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isValidTotpInput } from "@/lib/crypto/totp";
import { detectFromUrl } from "@/lib/vault/detect";
import { StepUpCancelled } from "@/lib/vault/step-up";
import { saveCredential, useVault, type VaultItem } from "@/lib/vault/store";
import {
  ACCOUNT_OWNERS,
  CATEGORIES,
  CREDENTIAL_TYPES,
  DEFAULT_PORTS,
  emptyOverview,
  emptySecrets,
  ENVIRONMENTS,
  suggestsPartnerAccess,
  TYPE_DEFS,
  type CredentialOverview,
  type CredentialSecrets,
  type CredentialType,
  type CustomField,
  type FieldDef,
  type Sensitivity,
} from "@/lib/vault/types";
import { TypeIcon } from "./category";
import { PasswordInput } from "./password-input";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Edycja istniejącego wpisu (sekrety muszą być już odsłonięte). */
  item?: VaultItem | null;
  clientId?: string;
  initialType?: CredentialType;
  onSaved?: (id: string) => void;
};

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Siatka kafelków z ikonami (rozdział 5.5, krok 1). */
export function TypeGrid({ onPick }: { onPick: (t: CredentialType) => void }) {
  return (
    <div className="space-y-4">
      {CATEGORIES.map((c) => (
        <div key={c.id}>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{c.label}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {c.types.map((t) => (
              <button key={t} type="button" onClick={() => onPick(t)} className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted">
                <TypeIcon type={t} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{TYPE_DEFS[t].label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{TYPE_DEFS[t].examples}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CredentialForm({ open, onOpenChange, item, clientId, initialType, onSaved }: Props) {
  const allClients = useVault((st) => st.clients);
  const clients = useMemo(() => allClients.filter((c) => c.canEdit), [allClients]);
  const editing = Boolean(item);
  const [type, setType] = useState<CredentialType | null>(item?.type ?? initialType ?? null);
  const [client, setClient] = useState<string>(item?.clientId ?? clientId ?? "");
  const [sensitivity, setSensitivity] = useState<Sensitivity>(item?.sensitivity ?? "standard");
  const [o, setO] = useState<CredentialOverview>(() => (item?.overview ? structuredClone(item.overview) : emptyOverview(type ?? "website")));
  const [s, setS] = useState<CredentialSecrets>(() => (item?.secrets ? structuredClone(item.secrets) : emptySecrets(type ?? "website")));
  const [tagsText, setTagsText] = useState((item?.overview?.tags ?? []).join(", "));
  const [suggestion, setSuggestion] = useState<ReturnType<typeof detectFromUrl>>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const def = type ? TYPE_DEFS[type] : null;
  const selectedClient = clients.find((c) => c.id === client);
  const canCritical = selectedClient?.canViewCritical ?? false;

  function pickType(t: CredentialType) {
    setType(t);
    setO((prev) => ({ ...emptyOverview(t), name: prev.name, url: prev.url, login: prev.login, notes: prev.notes, tags: prev.tags, environment: prev.environment, accountOwner: prev.accountOwner, custom: prev.custom }));
    setS((prev) => ({ ...emptySecrets(t), password: prev.password, totp: prev.totp, custom: prev.custom }));
  }

  function applyDetection(d: NonNullable<ReturnType<typeof detectFromUrl>>) {
    if (d.type !== type) pickType(d.type);
    setO((prev) => ({
      ...prev,
      name: prev.name || d.name,
      login: prev.login || d.login || "",
      url: d.url ?? prev.url,
      fields: { ...emptyOverview(d.type).fields, ...prev.fields, ...Object.fromEntries(Object.entries(d.fields).filter(([, v]) => v)) },
    }));
    setSuggestion(null);
  }

  function onUrlChange(value: string) {
    setO((prev) => ({ ...prev, url: value }));
    const d = detectFromUrl(value);
    if (!d) return setSuggestion(null);
    // Nowy wpis bez nazwy: podpowiedź stosujemy od razu; w pozostałych przypadkach pytamy.
    if (!editing && !o.name) applyDetection(d);
    else if (d.type !== type || !o.name) setSuggestion(d);
  }

  function setField(key: string, value: string, secret: boolean) {
    if (secret) setS((prev) => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
    else
      setO((prev) => {
        const fields = { ...prev.fields, [key]: value };
        // Domyślny port podąża za protokołem / silnikiem, jeśli nie został zmieniony ręcznie.
        if ((key === "protocol" || key === "engine") && DEFAULT_PORTS[value]) {
          const oldDefault = DEFAULT_PORTS[prev.fields[key]] ?? "";
          if (!prev.fields.port || prev.fields.port === oldDefault) fields.port = DEFAULT_PORTS[value];
        }
        return { ...prev, fields };
      });
  }

  function renderField(f: FieldDef) {
    const id = `f-${f.key}`;
    const value = (f.secret ? s.fields[f.key] : o.fields[f.key]) ?? "";
    const onChange = (v: string) => setField(f.key, v, Boolean(f.secret));
    if (type === "ftp" && (f.key === "privateKey" || f.key === "keyPassphrase") && o.fields.authMethod !== "key") return null;
    let control: React.ReactNode;
    if (f.kind === "select") {
      control = (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Wybierz…" />
          </SelectTrigger>
          <SelectContent>
            {f.options!.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else if (f.multiline || f.kind === "textarea") {
      control = <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={f.secret ? 6 : 3} className={f.secret ? "secret text-xs" : undefined} placeholder={f.placeholder} spellCheck={false} />;
    } else if (f.secret) {
      control = <PasswordInput id={id} value={value} onChange={onChange} generator={f.key !== "keyPassphrase"} meter={false} autoComplete="off" />;
    } else {
      control = (
        <Input
          id={id}
          type={f.kind === "date" ? "date" : f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : f.kind === "port" || f.kind === "number" ? "number" : "text"}
          inputMode={f.kind === "port" ? "numeric" : undefined}
          min={f.kind === "port" ? 1 : undefined}
          max={f.kind === "port" ? 65535 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          spellCheck={false}
        />
      );
    }
    return (
      <Field key={f.key} label={f.label} htmlFor={id} hint={f.help}>
        {control}
      </Field>
    );
  }

  const fieldsBySection = useMemo(() => {
    const out = { login: [] as FieldDef[], connection: [] as FieldDef[], details: [] as FieldDef[] };
    for (const f of def?.fields ?? []) out[f.section].push(f);
    return out;
  }, [def]);

  function setCustom(list: CustomField[]) {
    setO((prev) => ({ ...prev, custom: list.filter((c) => c.kind !== "hidden") }));
    setS((prev) => ({ ...prev, custom: list.filter((c) => c.kind === "hidden") }));
  }
  const custom = [...o.custom, ...s.custom];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !def) return;
    setError(null);
    if (!client) return setError("Wybierz klienta");
    if (!o.name.trim()) return setError("Podaj nazwę wpisu");
    if (s.totp.trim() && !isValidTotpInput(s.totp)) return setError("Sekret 2FA jest nieprawidłowy (base32 lub otpauth://)");
    if (sensitivity === "critical" && !canCritical) return setError("Nie masz uprawnień do wpisów krytycznych u tego klienta");
    setBusy(true);
    try {
      const tags = [...new Set(tagsText.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 30);
      const id = await saveCredential({ id: item?.id, clientId: client, type, sensitivity, overview: { ...o, name: o.name.trim(), tags }, secrets: s });
      toast.success(editing ? "Zapisano zmiany" : "Dodano dostęp");
      onSaved?.(id);
      onOpenChange(false);
    } catch (err) {
      if (!(err instanceof StepUpCancelled)) setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const partnerHint = type && suggestsPartnerAccess(type, o);
  const agencyOwned = o.accountOwner === "agency" && (type === "domain" || type === "hosting" || type === "social" || type === "ads");

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type ? <TypeIcon type={type} /> : null}
            {editing ? "Edytuj dostęp" : type ? `Nowy dostęp: ${def!.label}` : "Wybierz typ dostępu"}
          </DialogTitle>
          <DialogDescription>Dane są szyfrowane w przeglądarce przed wysłaniem. Szkic formularza istnieje tylko w pamięci tej karty.</DialogDescription>
        </DialogHeader>

        {!type ? (
          <TypeGrid onPick={pickType} />
        ) : (
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {!editing ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Typ:</span>
                <Select value={type} onValueChange={(v) => pickType(v as CredentialType)}>
                  <SelectTrigger className="h-8 w-auto" aria-label="Typ dostępu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDENTIAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_DEFS[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nazwa" htmlFor="c-name">
                <Input id="c-name" value={o.name} onChange={(e) => setO({ ...o, name: e.target.value })} placeholder={`np. ${def!.examples.split(",")[0]} — panel admina`} required autoFocus />
              </Field>
              <Field label="Klient" htmlFor="c-client">
                <Select value={client || undefined} onValueChange={setClient} disabled={editing}>
                  <SelectTrigger id="c-client" className="w-full">
                    <SelectValue placeholder="Wybierz klienta" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {type !== "secure_note" ? (
              <Field label={def!.urlLabel ?? "Adres URL"} htmlFor="c-url" hint="Wklejony adres podpowiada typ i nazwę, np. adres z „/wp-admin” to WordPress.">
                <Input id="c-url" value={o.url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://" inputMode="url" spellCheck={false} />
              </Field>
            ) : null}
            {suggestion ? (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <WandSparkles className="size-4" aria-hidden /> Wygląda na: <strong>{suggestion.name}</strong> ({TYPE_DEFS[suggestion.type].label})
                </span>
                <Button type="button" size="sm" variant="secondary" onClick={() => applyDetection(suggestion)}>
                  Zastosuj
                </Button>
              </div>
            ) : null}

            {def!.hasLogin ? (
              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold">Logowanie</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={def!.loginLabel ?? "Login"} htmlFor="c-login">
                    <Input id="c-login" value={o.login} onChange={(e) => setO({ ...o, login: e.target.value })} autoComplete="off" spellCheck={false} />
                  </Field>
                  <Field label="Hasło" htmlFor="c-password">
                    <PasswordInput id="c-password" value={s.password} onChange={(v) => setS({ ...s, password: v })} inputs={[o.login, o.name]} autoComplete="new-password" />
                  </Field>
                </div>
                {fieldsBySection.login.length ? <div className="grid gap-4 sm:grid-cols-2">{fieldsBySection.login.map(renderField)}</div> : null}
              </fieldset>
            ) : fieldsBySection.login.length ? (
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-semibold">Dane dostępowe</legend>
                {fieldsBySection.login.map(renderField)}
              </fieldset>
            ) : null}

            {fieldsBySection.connection.length ? (
              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold">Połączenie</legend>
                <div className="grid gap-4 sm:grid-cols-2">{fieldsBySection.connection.map(renderField)}</div>
              </fieldset>
            ) : null}

            {fieldsBySection.details.length ? (
              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold">Szczegóły</legend>
                <div className="grid gap-4 sm:grid-cols-2">{fieldsBySection.details.map(renderField)}</div>
              </fieldset>
            ) : null}

            {partnerHint ? (
              <div className="space-y-3 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
                <p className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Zamiast hasła klienta lepiej zapisać, które konto agencji ma nadane uprawnienia (dostęp partnerski). Klient zachowuje kontrolę, a agencja nie przechowuje jego hasła.
                </p>
                <Field label="Konto agencji z uprawnieniami" htmlFor="c-partner">
                  <Input id="c-partner" value={o.partnerAccess ?? ""} onChange={(e) => setO({ ...o, partnerAccess: e.target.value })} placeholder="np. ads@agencja.pl / Business Manager ID" />
                </Field>
              </div>
            ) : null}

            {type !== "secure_note" ? (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-semibold">2FA</legend>
                <Field label="Sekret 2FA (opcjonalnie)" htmlFor="c-totp" hint="Klucz base32 lub adres otpauth:// z kodu QR. Kod będzie liczony w przeglądarce.">
                  <PasswordInput id="c-totp" value={s.totp} onChange={(v) => setS({ ...s, totp: v })} generator={false} meter={false} autoComplete="off" />
                </Field>
                {s.totp && sensitivity === "critical" ? (
                  <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    Sekret 2FA obok hasła to wygoda kosztem rozdzielenia czynników. Przy kontach krytycznych zalecamy klucz sprzętowy lub dostęp partnerski.
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 text-sm font-semibold">Informacje</legend>
              <Field label="Środowisko" htmlFor="c-env">
                <Select value={o.environment} onValueChange={(v) => setO({ ...o, environment: v as CredentialOverview["environment"] })}>
                  <SelectTrigger id="c-env" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Właściciel konta" htmlFor="c-owner">
                <Select value={o.accountOwner} onValueChange={(v) => setO({ ...o, accountOwner: v as CredentialOverview["accountOwner"] })}>
                  <SelectTrigger id="c-owner" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_OWNERS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tagi" htmlFor="c-tags" hint="Oddzielone przecinkami">
                <Input id="c-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
              </Field>
            </fieldset>
            {agencyOwned ? (
              <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Konto jest zarejestrowane na agencję, nie na klienta. Przy końcu współpracy własność trzeba będzie przenieść — trafi to do pakietu przekazania.
              </p>
            ) : null}

            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="c-critical" className="flex items-center gap-2">
                  <ShieldAlert className="size-4" aria-hidden /> Wpis krytyczny
                </Label>
                <p className="text-xs text-muted-foreground">Odsłonięcie i skopiowanie wymaga ponownego potwierdzenia tożsamości. Członkowie zespołu widzą go tylko po indywidualnym nadaniu.</p>
              </div>
              <Switch id="c-critical" checked={sensitivity === "critical"} onCheckedChange={(v) => setSensitivity(v ? "critical" : "standard")} disabled={!canCritical} />
            </div>

            <Field label="Notatka" htmlFor="c-notes" hint="Szyfrowana end-to-end razem z wpisem.">
              <Textarea id="c-notes" value={o.notes} onChange={(e) => setO({ ...o, notes: e.target.value })} rows={3} />
            </Field>

            <fieldset className="space-y-2">
              <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
                Pola własne
                <Button type="button" size="sm" variant="ghost" onClick={() => setCustom([...custom, { id: crypto.randomUUID(), label: "", kind: "text", value: "" }])}>
                  <Plus aria-hidden /> Dodaj pole
                </Button>
              </legend>
              {custom.map((c, idx) => (
                <div key={c.id} className="grid grid-cols-[1fr_7rem_1.5fr_auto] items-end gap-2">
                  <Input aria-label="Nazwa pola" placeholder="Nazwa" value={c.label} onChange={(e) => setCustom(custom.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                  <Select value={c.kind} onValueChange={(v) => setCustom(custom.map((x, i) => (i === idx ? { ...x, kind: v as CustomField["kind"] } : x)))}>
                    <SelectTrigger aria-label="Rodzaj pola">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Tekst</SelectItem>
                      <SelectItem value="hidden">Ukryte</SelectItem>
                      <SelectItem value="url">Adres</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                    </SelectContent>
                  </Select>
                  {c.kind === "hidden" ? (
                    <PasswordInput id={`cf-${c.id}`} aria-label="Wartość" value={c.value} onChange={(v) => setCustom(custom.map((x, i) => (i === idx ? { ...x, value: v } : x)))} meter={false} generator={false} autoComplete="off" />
                  ) : (
                    <Input aria-label="Wartość" type={c.kind === "date" ? "date" : c.kind === "url" ? "url" : "text"} value={c.value} onChange={(e) => setCustom(custom.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))} />
                  )}
                  <Button type="button" variant="ghost" size="icon" aria-label="Usuń pole" onClick={() => setCustom(custom.filter((_, i) => i !== idx))}>
                    <Trash aria-hidden />
                  </Button>
                </div>
              ))}
            </fieldset>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              {!editing ? (
                <Button type="button" variant="ghost" onClick={() => setType(null)}>
                  Zmień typ
                </Button>
              ) : null}
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} {editing ? "Zapisz zmiany" : "Dodaj dostęp"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
