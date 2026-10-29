"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, ExternalLink, Eye, EyeOff, FileClock, Loader2, Paperclip, Pencil, RotateCcw, Share2, ShieldAlert, Trash, Upload, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatBytes, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { api } from "@/lib/vault/api";
import { StepUpCancelled, withStepUp } from "@/lib/vault/step-up";
import {
  decryptAttachmentList,
  decryptVersion,
  downloadAttachment,
  logEvent,
  revealSecrets,
  saveCredential,
  uploadAttachment,
  useVault,
  type VaultItem,
} from "@/lib/vault/store";
import { ACCOUNT_OWNERS, connectionString, ENVIRONMENTS, openableUrl, primarySecret, suggestsPartnerAccess, TYPE_DEFS } from "@/lib/vault/types";
import { STRENGTH_LABELS } from "@/lib/crypto/strength";
import { CredentialBadges } from "./badges";
import { TypeIcon } from "./category";
import type { RowAction } from "./credential-row";
import { TotpCode } from "./totp-code";
import { useCredentialActions, usePrefs } from "./use-credential-actions";
import type { HealthFlag } from "@/lib/vault/health";
import { revokeShareAction } from "@/server/actions/sharing";
import { unshareInTeamAction } from "@/server/actions/team";

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({ label, value, onCopy, secret, mono, children }: { label: string; value?: string; onCopy?: () => void; secret?: boolean; mono?: boolean; children?: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const { revealSeconds } = usePrefs();
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), revealSeconds * 1000);
    return () => clearTimeout(t);
  }, [visible, revealSeconds]);
  if (!value && !children) return null;
  return (
    <div className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50">
      <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={`min-w-0 flex-1 text-sm break-words whitespace-pre-wrap ${mono || secret ? "secret" : ""}`}>{children ?? (secret && !visible ? "••••••••••" : value)}</span>
      {secret ? (
        <Button variant="ghost" size="icon" className="size-7" onClick={() => setVisible(!visible)} aria-label={visible ? `Ukryj: ${label}` : `Pokaż: ${label}`}>
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      ) : null}
      {onCopy ? (
        <Button variant="ghost" size="icon" className="size-7" onClick={onCopy} aria-label={`Kopiuj: ${label}`}>
          <Copy aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

type Version = { id: string; encryptedData: string; encryptedSecrets: string; createdAt: string; createdByName: string | null; passwordChangedAt: string | null };
type Attachment = { id: string; encryptedMeta: string; size: number; createdAt: string };
type ShareRow = { id: string; label: string | null; status: string; expiresAt: string; viewCount: number; maxViews: number; createdByName: string | null; hasPassword: boolean };
type TeamShare = { userId: string; name: string; email: string };

export function CredentialSheet({ item, flags, onClose, onAction }: { item: VaultItem | null; flags?: Set<HealthFlag>; onClose: () => void; onAction: (a: RowAction) => void }) {
  const open = Boolean(item);
  const { copyLogin, copyPassword, copyTotp, openUrl, copyText, handleError } = useCredentialActions();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"details" | "history">("details");
  const live = useVault((s) => (item ? s.items.find((i) => i.id === item.id) : null)) ?? item;
  const id = item?.id;

  useEffect(() => {
    if (id) logEvent("credential.view", id);
  }, [id]);

  const attachments = useQuery({ queryKey: ["attachments", id], queryFn: () => api<Attachment[]>(`/api/credentials/${id}/attachments`), enabled: open && (live?.attachments ?? 0) > 0 });
  const shares = useQuery({ queryKey: ["shares", id], queryFn: () => api<ShareRow[]>(`/api/vault/shares?credential=${id}`), enabled: open && !live?.direct });
  const team = useQuery({ queryKey: ["team-shares", id], queryFn: () => api<TeamShare[]>(`/api/credentials/${id}/team`), enabled: open && Boolean(live?.canEdit) });
  const versions = useQuery({
    queryKey: ["versions", id],
    queryFn: () => withStepUp("Historia wpisu krytycznego", () => api<Version[]>(`/api/credentials/${id}/versions`)),
    enabled: open && tab === "history",
  });

  if (!live) return <Sheet open={false} />;
  const o = live.overview;
  const s = live.secrets;
  const def = TYPE_DEFS[live.type];
  const conn = o ? connectionString(live.type, o) : null;

  async function reveal() {
    try {
      await revealSecrets(live!.id, "reveal");
      logEvent("credential.reveal_password", live!.id);
    } catch (e) {
      handleError(e);
    }
  }

  async function restore(v: Version) {
    try {
      const d = decryptVersion(live!.id, v);
      if (!live!.secrets) await revealSecrets(live!.id, "edit");
      await saveCredential({ id: live!.id, clientId: live!.clientId, type: live!.type, sensitivity: live!.sensitivity, overview: d.overview, secrets: d.secrets });
      toast.success("Przywrócono wersję z " + formatDateTime(v.createdAt));
      await qc.invalidateQueries({ queryKey: ["versions", id] });
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
    }
  }

  async function onUpload(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    try {
      await uploadAttachment(live!.id, f);
      toast.success("Dodano zaszyfrowany załącznik");
      await qc.invalidateQueries({ queryKey: ["attachments", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const decryptedAttachments = attachments.data ? decryptAttachmentList(live.id, attachments.data) : [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <TypeIcon type={live.type} />
            <div className="min-w-0">
              <SheetTitle className="truncate">{o?.name ?? "Wpis"}</SheetTitle>
              <SheetDescription>
                {def.label} · {live.clientName}
              </SheetDescription>
            </div>
          </div>
          <CredentialBadges item={live} flags={flags} />
          <div className="flex flex-wrap gap-2 pt-2">
            {live.canEdit ? (
              <Button size="sm" variant="secondary" onClick={() => onAction("edit")}>
                <Pencil aria-hidden /> Edytuj
              </Button>
            ) : null}
            {!live.direct ? (
              <Button size="sm" variant="ghost" onClick={() => setTab(tab === "history" ? "details" : "history")} aria-pressed={tab === "history"}>
                <FileClock aria-hidden /> Historia
              </Button>
            ) : null}
            {!live.direct ? (
              <Button size="sm" variant="ghost" onClick={() => onAction("share")}>
                <Share2 aria-hidden /> Udostępnij
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        {!o ? (
          <p className="px-4 text-sm text-destructive">{live.error}</p>
        ) : tab === "history" ? (
          <div className="space-y-3 px-4 pb-6">
            <p className="text-sm text-muted-foreground">Poprzednie wersje wpisu (zaszyfrowane tym samym kluczem wpisu). Przywrócenie tworzy nową wersję.</p>
            {versions.isLoading ? <Loader2 className="animate-spin" aria-label="Ładowanie" /> : null}
            {versions.data?.length === 0 ? <p className="text-sm">Brak wcześniejszych wersji.</p> : null}
            <ol className="space-y-2">
              {versions.data?.map((v) => {
                let summary = "";
                try {
                  const d = decryptVersion(live.id, v);
                  summary = `${d.overview.name} · login: ${d.overview.login || "—"}`;
                } catch {
                  summary = "(nie można odszyfrować)";
                }
                return (
                  <li key={v.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{formatDateTime(v.createdAt)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {v.createdByName ?? "—"} · {summary}
                      </p>
                    </div>
                    {live.canEdit ? (
                      <Button size="sm" variant="outline" onClick={() => restore(v)}>
                        <RotateCcw aria-hidden /> Przywróć
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="space-y-5 px-4 pb-8">
            {live.sensitivity === "critical" && !s ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="size-4" aria-hidden /> Wpis krytyczny — sekrety są wydawane po ponownym potwierdzeniu tożsamości.
                </span>
                <Button size="sm" onClick={reveal}>
                  Odsłoń
                </Button>
              </div>
            ) : null}

            {def.hasLogin || o.url ? (
              <Section title="Logowanie">
                <Row label={def.loginLabel ?? "Login"} value={o.login} onCopy={() => copyLogin(live)} />
                {def.hasLogin && s ? <Row label="Hasło" value={s.password} secret onCopy={() => copyPassword(live)} /> : null}
                {o.url ? (
                  <Row label={def.urlLabel ?? "Adres"} value={o.url}>
                    <span className="flex items-center gap-1">
                      <span className="truncate">{o.url}</span>
                      {openableUrl(live.type, o) ? (
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openUrl(live)} aria-label="Otwórz adres w nowej karcie">
                          <ExternalLink aria-hidden />
                        </Button>
                      ) : null}
                    </span>
                  </Row>
                ) : null}
                {def.fields
                  .filter((f) => f.section === "login")
                  .map((f) => {
                    const v = f.secret ? s?.fields[f.key] : o.fields[f.key];
                    return <Row key={f.key} label={f.label} value={v} secret={f.secret} onCopy={v ? () => copyText(live, v, f.label, Boolean(f.secret)) : undefined} />;
                  })}
              </Section>
            ) : null}

            {def.fields.some((f) => f.section === "connection") || conn ? (
              <Section title="Połączenie">
                {conn ? <Row label="Gotowy ciąg" value={conn} mono onCopy={() => (copyText(live, conn, "ciąg połączenia", false), logEvent("credential.copy_connection", live.id))} /> : null}
                {def.fields
                  .filter((f) => f.section === "connection")
                  .map((f) => {
                    const raw = f.secret ? s?.fields[f.key] : o.fields[f.key];
                    const v = f.options ? (f.options.find((x) => x.value === raw)?.label ?? raw) : raw;
                    return <Row key={f.key} label={f.label} value={v} secret={f.secret} mono={f.multiline} onCopy={raw ? () => copyText(live, raw, f.label, Boolean(f.secret)) : undefined} />;
                  })}
              </Section>
            ) : null}

            {o.hasTotp ? (
              <Section title="2FA">
                {s?.totp ? (
                  <Row label="Kod" value="totp">
                    <TotpCode secret={s.totp} onCopy={() => copyTotp(live)} />
                  </Row>
                ) : (
                  <p className="px-2 text-sm text-muted-foreground">Odsłoń wpis, aby zobaczyć kod.</p>
                )}
              </Section>
            ) : null}

            {def.fields.some((f) => f.section === "details") ? (
              <Section title={live.type === "secure_note" ? "Treść" : "Szczegóły"}>
                {def.fields
                  .filter((f) => f.section === "details")
                  .map((f) => {
                    const raw = f.secret ? s?.fields[f.key] : o.fields[f.key];
                    const v = f.kind === "date" && raw ? formatDate(raw) : f.options ? (f.options.find((x) => x.value === raw)?.label ?? raw) : raw;
                    return <Row key={f.key} label={f.label} value={v} secret={f.secret && live.type !== "secure_note"} mono={f.multiline && f.secret} onCopy={raw ? () => copyText(live, raw, f.label, Boolean(f.secret)) : undefined} />;
                  })}
              </Section>
            ) : null}

            {o.notes ? (
              <Section title="Notatki">
                <p className="px-2 text-sm whitespace-pre-wrap">{o.notes}</p>
              </Section>
            ) : null}

            {o.custom.length || s?.custom.length ? (
              <Section title="Pola własne">
                {o.custom.map((c) => (
                  <Row key={c.id} label={c.label || "Pole"} value={c.kind === "date" ? formatDate(c.value) : c.value} onCopy={() => copyText(live, c.value, c.label, false)} />
                ))}
                {s?.custom.map((c) => (
                  <Row key={c.id} label={c.label || "Pole ukryte"} value={c.value} secret onCopy={() => copyText(live, c.value, c.label, true)} />
                ))}
              </Section>
            ) : null}

            {suggestsPartnerAccess(live.type, o) && !o.partnerAccess ? (
              <p className="rounded-md bg-sky-50 p-3 text-sm text-sky-950 dark:bg-sky-950 dark:text-sky-100">
                Wskazówka: zamiast hasła klienta zapisz, które konto agencji ma nadane uprawnienia (dostęp partnerski).
              </p>
            ) : null}

            <Section title="Informacje">
              <Row label="Typ" value={def.label} />
              <Row label="Klient" value={live.clientName} />
              <Row label="Środowisko" value={ENVIRONMENTS.find((e) => e.value === o.environment)?.label} />
              <Row label="Właściciel konta" value={ACCOUNT_OWNERS.find((e) => e.value === o.accountOwner)?.label} />
              {o.partnerAccess ? <Row label="Dostęp partnerski" value={o.partnerAccess} /> : null}
              <Row label="Wrażliwość" value={live.sensitivity === "critical" ? "krytyczny" : "standardowy"} />
              {live.strengthScore != null ? <Row label="Siła hasła" value={`${STRENGTH_LABELS[live.strengthScore]} (${live.strengthScore}/4)`} /> : null}
              <Row label="Zmiana hasła" value={live.passwordChangedAt ? `${formatDateTime(live.passwordChangedAt)} (${formatRelative(live.passwordChangedAt)})` : "—"} />
              {live.expiresAt ? <Row label="Wygasa" value={formatDate(live.expiresAt)} /> : null}
              <Row label="Utworzono" value={formatDateTime(live.createdAt)} />
              <Row label="Ostatnia zmiana" value={`${formatDateTime(live.updatedAt)}${live.updatedByName ? ` · ${live.updatedByName}` : ""}`} />
              {o.tags.length ? <Row label="Tagi" value={o.tags.join(", ")} /> : null}
              {s && primarySecret(live.type, s) ? null : null}
            </Section>

            <Section title="Załączniki" icon={<Paperclip className="size-3.5" aria-hidden />}>
              {decryptedAttachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate text-sm">{a.meta.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
                  <Button variant="ghost" size="icon" className="size-7" aria-label={`Pobierz ${a.meta.name}`} onClick={() => downloadAttachment(a.id).catch(handleError)}>
                    <Download aria-hidden />
                  </Button>
                  {live.canEdit ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Usuń ${a.meta.name}`}
                      onClick={async () => {
                        await api(`/api/attachments/${a.id}`, { method: "DELETE" });
                        await qc.invalidateQueries({ queryKey: ["attachments", id] });
                        toast.success("Usunięto załącznik");
                      }}
                    >
                      <Trash aria-hidden />
                    </Button>
                  ) : null}
                </div>
              ))}
              {live.canEdit ? (
                <>
                  <input ref={fileRef} type="file" className="sr-only" id={`file-${live.id}`} onChange={(e) => onUpload(e.target.files?.[0])} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />} Dodaj szyfrowany załącznik
                  </Button>
                  <p className="text-xs text-muted-foreground">Np. klucz SSH, plik konfiguracyjny (maks. 10 MB). Plik jest szyfrowany w przeglądarce.</p>
                </>
              ) : !decryptedAttachments.length ? (
                <p className="px-2 text-sm text-muted-foreground">Brak załączników.</p>
              ) : null}
            </Section>

            {team.data?.length || shares.data?.length ? (
              <Section title="Udostępnienia" icon={<Users className="size-3.5" aria-hidden />}>
                {team.data?.map((t) => (
                  <div key={t.userId} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <Users className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{t.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const r = await unshareInTeamAction(live.id, t.userId);
                        if (!r.ok) return toast.error(r.error);
                        await qc.invalidateQueries({ queryKey: ["team-shares", id] });
                      }}
                    >
                      Cofnij
                    </Button>
                  </div>
                ))}
                {shares.data?.map((sh) => (
                  <div key={sh.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <Share2 className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1">
                      Link {sh.status === "active" ? "aktywny" : sh.status === "used" ? "wykorzystany" : sh.status === "expired" ? "wygasł" : "unieważniony"} · {sh.viewCount}/{sh.maxViews} wyświetleń · do {formatDateTime(sh.expiresAt)}
                    </span>
                    {sh.status === "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const r = await revokeShareAction(sh.id);
                          if (!r.ok) return toast.error(r.error);
                          await qc.invalidateQueries({ queryKey: ["shares", id] });
                          toast.success("Unieważniono link");
                        }}
                      >
                        Unieważnij
                      </Button>
                    ) : null}
                  </div>
                ))}
              </Section>
            ) : null}
            <Separator />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
