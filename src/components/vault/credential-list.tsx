"use client";

import { Plus } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HealthFlag } from "@/lib/vault/health";
import type { VaultItem } from "@/lib/vault/store";
import { CATEGORIES, categoryOf, TYPE_DEFS, type CategoryId, type CredentialType } from "@/lib/vault/types";
import { CATEGORY_STYLE, CategoryBadge } from "./category";
import { CredentialCard, CredentialRow, type RowAction } from "./credential-row";
import { useCredentialActions } from "./use-credential-actions";

export type ListProps = {
  items: VaultItem[];
  flags: Map<string, Set<HealthFlag>>;
  view: "table" | "cards";
  showClient?: boolean;
  /** Pokazuje puste kategorie z podpowiedzią akcji (karta klienta). */
  showEmptyCategories?: boolean;
  canAdd?: boolean;
  canShareExternal: boolean;
  selection: Set<string>;
  onSelectionChange: (s: Set<string>) => void;
  onAction: (item: VaultItem, a: RowAction) => void;
  onAdd?: (type?: CredentialType) => void;
  groupByCategory?: boolean;
};

const EMPTY_HINT: Record<CategoryId, { text: string; type: CredentialType }> = {
  web: { text: "Dodaj pierwszy panel WWW / CMS", type: "website" },
  hosting: { text: "Dodaj pierwszy dostęp FTP", type: "ftp" },
  domains: { text: "Dodaj pierwszą domenę", type: "domain" },
  email: { text: "Dodaj pierwszą skrzynkę", type: "email" },
  social: { text: "Dodaj pierwsze konto social media", type: "social" },
  ads: { text: "Dodaj pierwsze konto reklamowe", type: "ads" },
  api: { text: "Dodaj pierwszy klucz API", type: "api" },
  notes: { text: "Dodaj pierwszą bezpieczną notatkę", type: "secure_note" },
  other: { text: "Dodaj inny dostęp", type: "other" },
};

/**
 * Lista dostępów pogrupowana według stałych kategorii (rozdział 5.1–5.3), w widoku tabeli
 * lub kart, z obsługą klawiatury: ↑/↓, L (login), P (hasło), T (2FA), O (adres), Enter (szczegóły).
 */
export function CredentialList(p: ListProps) {
  const { copyLogin, copyPassword, copyTotp, openUrl } = useCredentialActions();
  const [focused, setFocused] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!p.groupByCategory) return [{ id: null as CategoryId | null, items: p.items }];
    return CATEGORIES.map((c) => ({ id: c.id as CategoryId | null, items: p.items.filter((i) => categoryOf(i.type) === c.id) })).filter((g) => g.items.length || p.showEmptyCategories);
  }, [p.items, p.groupByCategory, p.showEmptyCategories]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,[role=menu]")) return;
      const idx = flat.findIndex((i) => i.id === focused);
      const item = flat[idx];
      const focusAt = (n: number) => {
        const next = flat[Math.max(0, Math.min(flat.length - 1, n))];
        if (!next) return;
        document.querySelector<HTMLElement>(`[data-credential-row="${next.id}"]`)?.focus();
      };
      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          focusAt(idx + 1);
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          focusAt(idx - 1);
          break;
        case "l":
        case "L":
          if (item && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            void copyLogin(item);
          }
          break;
        case "p":
        case "P":
          if (item && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            void copyPassword(item);
          }
          break;
        case "t":
        case "T":
          if (item) {
            e.preventDefault();
            void copyTotp(item);
          }
          break;
        case "o":
        case "O":
          if (item) {
            e.preventDefault();
            openUrl(item);
          }
          break;
        case "Enter":
          if (item && (e.target as HTMLElement).dataset.credentialRow) {
            e.preventDefault();
            p.onAction(item, "open");
          }
          break;
        case "n":
        case "N":
          if (p.onAdd && p.canAdd) {
            e.preventDefault();
            p.onAdd();
          }
          break;
      }
    },
    [flat, focused, copyLogin, copyPassword, copyTotp, openUrl, p],
  );

  const toggle = (id: string, v: boolean) => {
    const s = new Set(p.selection);
    if (v) s.add(id);
    else s.delete(id);
    p.onSelectionChange(s);
  };

  return (
    <div className="space-y-6" onKeyDown={onKeyDown}>
      {groups.map((g) => (
        <section key={g.id ?? "all"} aria-labelledby={g.id ? `cat-${g.id}` : undefined}>
          {g.id ? (
            <h2 id={`cat-${g.id}`} className="mb-2 flex items-center gap-2">
              <CategoryBadge category={g.id} count={g.items.length} />
            </h2>
          ) : null}
          {g.items.length === 0 && g.id ? (
            <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${CATEGORY_STYLE[g.id].dot}`} aria-hidden /> Brak dostępów w tej kategorii.
              </span>
              {p.canAdd && p.onAdd ? (
                <Button size="sm" variant="ghost" onClick={() => p.onAdd!(EMPTY_HINT[g.id!].type)}>
                  <Plus aria-hidden /> {EMPTY_HINT[g.id].text}
                </Button>
              ) : null}
            </div>
          ) : p.view === "table" ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-left">
                <caption className="sr-only">{g.id ? CATEGORIES.find((c) => c.id === g.id)?.label : "Dostępy"}</caption>
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-8 px-2 py-2">
                      <span className="sr-only">Zaznacz</span>
                    </th>
                    <th className="px-2 py-2 font-medium">Nazwa</th>
                    <th className="px-2 py-2 font-medium">Login</th>
                    <th className="px-2 py-2 font-medium">Hasło</th>
                    <th className="hidden px-2 py-2 font-medium lg:table-cell">Adres lub host</th>
                    <th className="hidden px-2 py-2 font-medium md:table-cell">Kod 2FA</th>
                    <th className="hidden px-2 py-2 font-medium xl:table-cell">Odznaki</th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Akcje</span>
                    </th>
                  </tr>
                </thead>
                {g.items.length > VIRTUALIZE_FROM ? (
                <VirtualRows {...p} items={g.items} focused={focused} setFocused={setFocused} toggle={toggle} />
              ) : (
              <tbody>
                  {g.items.map((i) => (
                    <CredentialRow
                      key={i.id}
                      item={i}
                      flags={p.flags.get(i.id)}
                      showClient={p.showClient}
                      selected={p.selection.has(i.id)}
                      onSelect={(v) => toggle(i.id, v)}
                      onAction={(a) => p.onAction(i, a)}
                      canShareExternal={p.canShareExternal}
                      focused={focused === i.id}
                      onFocus={() => setFocused(i.id)}
                    />
                  ))}
                </tbody>
              )}
              </table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((i) => (
                <CredentialCard
                  key={i.id}
                  item={i}
                  flags={p.flags.get(i.id)}
                  showClient={p.showClient}
                  selected={p.selection.has(i.id)}
                  onSelect={(v) => toggle(i.id, v)}
                  onAction={(a) => p.onAction(i, a)}
                  canShareExternal={p.canShareExternal}
                />
              ))}
            </div>
          )}
        </section>
      ))}
      {p.items.length === 0 && !p.showEmptyCategories ? <p className="py-8 text-center text-sm text-muted-foreground">Brak dostępów spełniających kryteria.</p> : null}
    </div>
  );
}

export const typeLabel = (t: CredentialType) => TYPE_DEFS[t].label;

/** Od ilu wierszy lista jest wirtualizowana (płynne przewijanie tysięcy wpisów). */
export const VIRTUALIZE_FROM = 150;
const ROW_HEIGHT = 57;

function VirtualRows(p: ListProps & { focused: string | null; setFocused: (id: string) => void; toggle: (id: string, v: boolean) => void }) {
  const ref = useRef<HTMLTableSectionElement>(null);
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setMargin(el.getBoundingClientRect().top + window.scrollY);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const v = useWindowVirtualizer({ count: p.items.length, estimateSize: () => ROW_HEIGHT, overscan: 12, scrollMargin: margin });
  const rows = v.getVirtualItems();
  const top = Math.max(0, (rows[0]?.start ?? margin) - margin);
  const bottom = Math.max(0, v.getTotalSize() - ((rows.at(-1)?.end ?? margin) - margin));
  return (
    <tbody ref={ref}>
      {top > 0 ? (
        <tr aria-hidden style={{ height: top }}>
          <td colSpan={8} />
        </tr>
      ) : null}
      {rows.map((r) => {
        const i = p.items[r.index];
        return (
          <CredentialRow
            key={i.id}
            item={i}
            flags={p.flags.get(i.id)}
            showClient={p.showClient}
            selected={p.selection.has(i.id)}
            onSelect={(val) => p.toggle(i.id, val)}
            onAction={(a) => p.onAction(i, a)}
            canShareExternal={p.canShareExternal}
            focused={p.focused === i.id}
            onFocus={() => p.setFocused(i.id)}
          />
        );
      })}
      {bottom > 0 ? (
        <tr aria-hidden style={{ height: bottom }}>
          <td colSpan={8} />
        </tr>
      ) : null}
    </tbody>
  );
}
