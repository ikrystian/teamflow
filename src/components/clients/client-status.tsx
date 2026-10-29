import { StatusBadge } from "@/components/vault/badges";
import { CLIENT_STATUSES, SERVICES } from "@/lib/validation";

const variant = { lead: "info", active: "ok", paused: "warn", ended: "muted" } as const;

export function ClientStatusBadge({ status }: { status: "lead" | "active" | "paused" | "ended" }) {
  return <StatusBadge variant={variant[status]}>{CLIENT_STATUSES.find((s) => s.value === status)?.label}</StatusBadge>;
}

export const serviceLabel = (s: string) => SERVICES.find((x) => x.value === s)?.label ?? s;

export function ClientLogo({ logo, name, className }: { logo: string | null; name: string; className?: string }) {
  if (logo)
    // eslint-disable-next-line @next/next/no-img-element -- logo jako data URL
    return <img src={logo} alt="" className={`size-9 shrink-0 rounded-md border object-contain ${className ?? ""}`} />;
  return (
    <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold ${className ?? ""}`} aria-hidden>
      {name
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );
}
