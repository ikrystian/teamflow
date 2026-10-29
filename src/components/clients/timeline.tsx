import { actionLabel } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/layout/page-header";

type Event = { id: number; action: string; actorName: string | null; metadata: Record<string, unknown>; createdAt: string };

function detail(e: Event): string | null {
  const m = e.metadata;
  if (m.changes && typeof m.changes === "object") return `zmienione: ${Object.keys(m.changes as object).join(", ")}`;
  if (typeof m.name === "string") return m.name;
  if (typeof m.type === "string") return `typ: ${m.type}`;
  return null;
}

export function ActivityTimeline({ events }: { events: Event[] }) {
  if (!events.length) return <EmptyState title="Brak zdarzeń" description="Tu pojawi się historia zmian klienta i jego dostępów." />;
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-background bg-primary" aria-hidden />
          <p className="text-sm">
            <span className="font-medium">{e.actorName ?? "System"}</span> · {actionLabel(e.action)}
            {detail(e) ? <span className="text-muted-foreground"> · {detail(e)}</span> : null}
          </p>
          <time className="text-xs text-muted-foreground" dateTime={e.createdAt}>
            {formatDateTime(e.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
