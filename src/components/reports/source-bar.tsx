import { cn } from "@/lib/utils"
import { REPORT_SOURCES, type SourceHours } from "@/lib/reports/time-report"
import { sourceColor } from "./format"

/**
 * Poziomy pasek godzin podzielony na źródła (te same barwy na całej stronie).
 * `scale` to wartość pełnej szerokości — domyślnie suma, czyli pasek 100%.
 */
export function SourceBar({
  bySource,
  total,
  scale = total,
  animate = false,
  className,
}: {
  bySource: SourceHours
  total: number
  scale?: number
  animate?: boolean
  className?: string
}) {
  const filled = scale > 0 ? Math.min(100, (total / scale) * 100) : 0

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted", className)} aria-hidden>
      {filled > 0 && (
        <div
          className={cn("flex h-full gap-[2px] overflow-hidden rounded-full", animate && "report-grow-x")}
          style={{ width: `max(${filled}%, 4px)` }}
        >
          {REPORT_SOURCES.filter((source) => bySource[source] > 0).map((source) => (
            <span
              key={source}
              className="h-full min-w-[3px] basis-0"
              style={{ flexGrow: bySource[source], backgroundColor: sourceColor(source) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Znacznik barwy źródła w legendzie (prostokąt — jak słupki, które opisuje). */
export function SourceSwatch({ source, className }: { source: keyof SourceHours; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)}
      style={{ backgroundColor: sourceColor(source) }}
    />
  )
}
