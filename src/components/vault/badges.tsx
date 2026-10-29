import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthFlag } from "@/lib/vault/health";
import type { VaultItem } from "@/lib/vault/store";
import { ENVIRONMENTS } from "@/lib/vault/types";

const tone = {
  danger: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  muted: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ children, variant = "muted", title }: { children: React.ReactNode; variant?: keyof typeof tone; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium whitespace-nowrap", tone[variant])}>
      {children}
    </span>
  );
}

/** Statusy jako małe odznaki (rozdział 5.1): „słabe”, „powtórzone”, „ponad 180 dni”, „wyciek”, „2FA”, „krytyczny”. */
export function CredentialBadges({ item, flags }: { item: VaultItem; flags?: Set<HealthFlag> }) {
  const env = item.overview?.environment;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {item.sensitivity === "critical" ? (
        <StatusBadge variant="danger" title="Odsłonięcie wymaga ponownego potwierdzenia tożsamości">
          <ShieldAlert className="size-3" aria-hidden /> krytyczny
        </StatusBadge>
      ) : null}
      {flags?.has("breached") ? <StatusBadge variant="danger">wyciek</StatusBadge> : null}
      {flags?.has("weak") ? <StatusBadge variant="warn">słabe</StatusBadge> : null}
      {flags?.has("reused") ? <StatusBadge variant="warn">powtórzone</StatusBadge> : null}
      {flags?.has("old") ? <StatusBadge variant="info">ponad 180 dni</StatusBadge> : null}
      {item.needsRotation ? <StatusBadge variant="warn">do zmiany</StatusBadge> : null}
      {item.overview?.hasTotp ? <StatusBadge variant="ok">2FA</StatusBadge> : null}
      {env && env !== "production" ? <StatusBadge>{ENVIRONMENTS.find((e) => e.value === env)?.label}</StatusBadge> : null}
      {item.direct ? <StatusBadge variant="info">udostępniony</StatusBadge> : null}
    </span>
  );
}
