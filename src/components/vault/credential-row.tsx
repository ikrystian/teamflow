"use client";

import { Copy, Ellipsis, ExternalLink, Eye, EyeOff, FileClock, Move, Pencil, Share2, Trash, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatAgoShort, shortName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HealthFlag } from "@/lib/vault/health";
import { logEvent, revealSecrets, type VaultItem } from "@/lib/vault/store";
import { displayAddress, openableUrl, primarySecret, TYPE_DEFS } from "@/lib/vault/types";
import { CredentialBadges } from "./badges";
import { faviconFor, TypeIcon } from "./category";
import { TotpCode } from "./totp-code";
import { useCredentialActions, usePrefs } from "./use-credential-actions";

export type RowAction = "open" | "edit" | "history" | "share" | "team" | "move" | "delete";

/** Hasło odsłonięte na 30 s (konfigurowalne), potem samo się ukrywa (rozdział 5.1). */
export function useReveal(item: VaultItem) {
  const { revealSeconds } = usePrefs();
  const { handleError } = useCredentialActions();
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(() => setValue(null), revealSeconds * 1000);
    return () => clearTimeout(t);
  }, [value, revealSeconds]);
  async function toggle() {
    if (value) return setValue(null);
    try {
      const s = await revealSecrets(item.id, "reveal");
      const v = primarySecret(item.type, s);
      if (!v) return;
      setValue(v);
      logEvent("credential.reveal_password", item.id);
    } catch (e) {
      handleError(e);
    }
  }
  return { value, toggle };
}

function lastChange(item: VaultItem) {
  if (item.passwordChangedAt) return `hasło zmienione ${formatAgoShort(item.passwordChangedAt)}${item.updatedByName ? ` przez ${shortName(item.updatedByName)}` : ""}`;
  return `zmieniono ${formatAgoShort(item.updatedAt)}${item.updatedByName ? ` przez ${shortName(item.updatedByName)}` : ""}`;
}

export function RowMenu({ item, onAction, canShareExternal }: { item: VaultItem; onAction: (a: RowAction) => void; canShareExternal: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Więcej akcji: ${item.overview?.name ?? "wpis"}`}>
          <Ellipsis aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.canEdit ? (
          <DropdownMenuItem onSelect={() => onAction("edit")}>
            <Pencil aria-hidden /> Edytuj
          </DropdownMenuItem>
        ) : null}
        {!item.direct ? (
          <DropdownMenuItem onSelect={() => onAction("history")}>
            <FileClock aria-hidden /> Historia
          </DropdownMenuItem>
        ) : null}
        {canShareExternal && !item.direct ? (
          <DropdownMenuItem onSelect={() => onAction("share")}>
            <Share2 aria-hidden /> Udostępnij linkiem
          </DropdownMenuItem>
        ) : null}
        {item.canEdit ? (
          <DropdownMenuItem onSelect={() => onAction("team")}>
            <Users aria-hidden /> Udostępnij w zespole
          </DropdownMenuItem>
        ) : null}
        {item.canEdit ? (
          <DropdownMenuItem onSelect={() => onAction("move")}>
            <Move aria-hidden /> Przenieś do klienta
          </DropdownMenuItem>
        ) : null}
        {item.canEdit ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onAction("delete")}>
              <Trash aria-hidden /> Usuń
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClick} aria-label={label} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type RowProps = {
  item: VaultItem;
  flags?: Set<HealthFlag>;
  showClient?: boolean;
  selected: boolean;
  onSelect: (v: boolean) => void;
  onAction: (a: RowAction) => void;
  canShareExternal: boolean;
  focused: boolean;
  onFocus: () => void;
};

/** Wiersz dostępu (rozdział 5.3): najczęstsze akcje jednym kliknięciem, bez otwierania szczegółów. */
export function CredentialRow({ item, flags, showClient, selected, onSelect, onAction, canShareExternal, focused, onFocus }: RowProps) {
  const { copyLogin, copyPassword, copyTotp, openUrl } = useCredentialActions();
  const { showFavicons } = usePrefs();
  const reveal = useReveal(item);
  const o = item.overview;

  if (!o) {
    return (
      <tr className="border-b">
        <td />
        <td colSpan={7} className="px-2 py-3 text-sm text-muted-foreground">
          <span className="text-destructive">Nie można odszyfrować wpisu.</span> {item.error}
        </td>
      </tr>
    );
  }
  const hasSecret = item.type !== "secure_note";
  const url = openableUrl(item.type, o);
  const totpSecret = item.secrets?.totp;

  return (
    <tr
      className={cn("group border-b align-middle outline-none hover:bg-muted/40 focus-visible:bg-muted/60", focused && "bg-muted/50")}
      tabIndex={0}
      data-credential-row={item.id}
      onFocus={onFocus}
      aria-label={`${o.name}${showClient ? `, ${item.clientName}` : ""}`}
    >
      <td className="w-8 px-2">
        <Checkbox checked={selected} onCheckedChange={(v) => onSelect(v === true)} aria-label={`Zaznacz ${o.name}`} />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2.5">
          <TypeIcon type={item.type} faviconUrl={faviconFor(o.url, showFavicons)} />
          <div className="min-w-0">
            <button type="button" className="block max-w-[16rem] truncate text-left text-sm font-medium hover:underline" onClick={() => onAction("open")}>
              {o.name || TYPE_DEFS[item.type].label}
            </button>
            <p className="truncate text-xs text-muted-foreground">
              {showClient ? `${item.clientName} · ` : ""}
              {lastChange(item)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-2 py-2">
        {o.login ? (
          <button type="button" onClick={() => copyLogin(item)} className="max-w-[12rem] truncate rounded px-1 text-left text-sm hover:bg-muted" title="Kliknij, aby skopiować login">
            {o.login}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-2">
        {hasSecret ? (
          <div className="flex items-center gap-0.5">
            <span className="secret w-28 truncate text-sm" aria-live="polite">
              {reveal.value ?? "••••••••••"}
            </span>
            <IconButton label={reveal.value ? "Ukryj hasło" : "Pokaż hasło (30 s)"} onClick={reveal.toggle}>
              {reveal.value ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </IconButton>
            <IconButton label="Kopiuj hasło" onClick={() => copyPassword(item)}>
              <Copy aria-hidden />
            </IconButton>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">notatka</span>
        )}
      </td>
      <td className="hidden px-2 py-2 lg:table-cell">
        <div className="flex items-center gap-0.5">
          <span className="max-w-[11rem] truncate text-sm text-muted-foreground" title={o.url}>
            {displayAddress(item.type, o) || "—"}
          </span>
          {url ? (
            <IconButton label="Otwórz stronę logowania w nowej karcie" onClick={() => openUrl(item)}>
              <ExternalLink aria-hidden />
            </IconButton>
          ) : null}
        </div>
      </td>
      <td className="hidden px-2 py-2 md:table-cell">
        {totpSecret ? (
          <TotpCode secret={totpSecret} onCopy={() => copyTotp(item)} />
        ) : o.hasTotp ? (
          <Button variant="ghost" size="sm" onClick={() => copyTotp(item)}>
            2FA
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="hidden px-2 py-2 xl:table-cell">
        <CredentialBadges item={item} flags={flags} />
      </td>
      <td className="w-10 px-2 py-2 text-right">
        <RowMenu item={item} onAction={onAction} canShareExternal={canShareExternal} />
      </td>
    </tr>
  );
}

/** Widok kart (rozdział 5.1) — wygodny na telefonie. */
export function CredentialCard({ item, flags, showClient, onAction, canShareExternal, selected, onSelect }: Omit<RowProps, "focused" | "onFocus">) {
  const { copyLogin, copyPassword, copyTotp, openUrl } = useCredentialActions();
  const { showFavicons } = usePrefs();
  const reveal = useReveal(item);
  const o = item.overview;
  if (!o) return <div className="rounded-lg border p-4 text-sm text-destructive">Nie można odszyfrować wpisu. {item.error}</div>;
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={(v) => onSelect(v === true)} aria-label={`Zaznacz ${o.name}`} className="mt-2" />
        <TypeIcon type={item.type} faviconUrl={faviconFor(o.url, showFavicons)} />
        <div className="min-w-0 flex-1">
          <button type="button" className="block truncate text-left font-medium hover:underline" onClick={() => onAction("open")}>
            {o.name}
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {showClient ? `${item.clientName} · ` : ""}
            {lastChange(item)}
          </p>
        </div>
        <RowMenu item={item} onAction={onAction} canShareExternal={canShareExternal} />
      </div>
      <CredentialBadges item={item} flags={flags} />
      <div className="grid gap-1 text-sm">
        {o.login ? (
          <button type="button" className="truncate rounded px-1 text-left hover:bg-muted" onClick={() => copyLogin(item)}>
            <span className="text-muted-foreground">Login: </span>
            {o.login}
          </button>
        ) : null}
        {item.type !== "secure_note" ? <p className="secret truncate px-1">{reveal.value ?? "••••••••••"}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {item.type !== "secure_note" ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => copyPassword(item)}>
              <Copy aria-hidden /> Hasło
            </Button>
            <Button size="sm" variant="ghost" onClick={reveal.toggle} aria-label={reveal.value ? "Ukryj hasło" : "Pokaż hasło"}>
              {reveal.value ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </>
        ) : null}
        {openableUrl(item.type, o) ? (
          <Button size="sm" variant="ghost" onClick={() => openUrl(item)}>
            <ExternalLink aria-hidden /> Otwórz
          </Button>
        ) : null}
        {item.secrets?.totp ? <TotpCode secret={item.secrets.totp} onCopy={() => copyTotp(item)} /> : null}
      </div>
    </div>
  );
}
