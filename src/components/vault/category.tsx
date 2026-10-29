import {
  Box,
  Database,
  FolderUp,
  Globe,
  KeyRound,
  Link2,
  Mail,
  Megaphone,
  Server,
  Share2,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryOf, TYPE_DEFS, type CategoryId, type CredentialType } from "@/lib/vault/types";

/**
 * Każda kategoria ma stałą ikonę i kolor w całej aplikacji (rozdział 5.1).
 * Kolor nigdy nie jest jedynym nośnikiem informacji — zawsze towarzyszy mu ikona i tekst.
 */
export const CATEGORY_STYLE: Record<CategoryId, { icon: LucideIcon; className: string; dot: string }> = {
  web: { icon: Globe, className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200", dot: "bg-sky-500" },
  hosting: { icon: Server, className: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200", dot: "bg-violet-500" },
  domains: { icon: Link2, className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200", dot: "bg-amber-500" },
  email: { icon: Mail, className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200", dot: "bg-emerald-500" },
  social: { icon: Share2, className: "bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200", dot: "bg-pink-500" },
  ads: { icon: Megaphone, className: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200", dot: "bg-orange-500" },
  api: { icon: KeyRound, className: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200", dot: "bg-cyan-500" },
  notes: { icon: StickyNote, className: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200", dot: "bg-yellow-500" },
  other: { icon: Box, className: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200", dot: "bg-zinc-500" },
};

export const TYPE_ICON: Record<CredentialType, LucideIcon> = {
  website: Globe,
  hosting: Server,
  ftp: FolderUp,
  ssh: Terminal,
  database: Database,
  domain: Link2,
  email: Mail,
  social: Share2,
  ads: Megaphone,
  api: KeyRound,
  secure_note: StickyNote,
  other: Box,
};

export function TypeIcon({ type, className, faviconUrl }: { type: CredentialType; className?: string; faviconUrl?: string | null }) {
  const cat = CATEGORY_STYLE[categoryOf(type)];
  const Icon = TYPE_ICON[type];
  return (
    <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md", cat.className, className)} title={TYPE_DEFS[type].label}>
      {faviconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- favicon z zewnętrznej usługi (opcjonalnie)
        <img src={faviconUrl} alt="" className="size-4" referrerPolicy="no-referrer" loading="lazy" />
      ) : (
        <Icon className="size-4" aria-hidden />
      )}
      <span className="sr-only">{TYPE_DEFS[type].label}</span>
    </span>
  );
}

export function CategoryBadge({ category, count }: { category: CategoryId; count?: number }) {
  const s = CATEGORY_STYLE[category];
  const Icon = s.icon;
  const label = CATEGORIES.find((c) => c.id === category)!.label;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", s.className)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
      {count !== undefined ? <span className="tabular-nums opacity-80">({count})</span> : null}
    </span>
  );
}

/** Favicon serwisu — wyłącznie gdy użytkownik włączy opcję (prywatność: zapytanie do zewnętrznej usługi). */
export function faviconFor(url: string, enabled: boolean): string | null {
  if (!enabled || !url) return null;
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname;
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;
  } catch {
    return null;
  }
}
