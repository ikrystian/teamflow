"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { type Granularity, bucketAxisLabel, bucketTitle } from "@/lib/reports/period"
import { REPORT_SOURCES, SOURCE_LABELS, type TimeReport } from "@/lib/reports/time-report"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatHours, formatNumber, sourceColor } from "./format"

type Bucket = TimeReport["timeline"][number]

const PLOT_HEIGHT = 208
const LABEL_MIN_WIDTH = 60

/** Okrągłe podziałki osi Y — co najmniej co pół godziny. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / 4
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = Math.max(0.5, ([1, 2, 2.5, 5, 10].find((multiple) => multiple * power >= raw) ?? 10) * power)
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => Math.round(index * step * 100) / 100)
}

const describe = (bucket: Bucket, granularity: Granularity) =>
  [
    `${bucketTitle(bucket.bucket, granularity)}: ${formatHours(bucket.hours)}`,
    ...REPORT_SOURCES.filter((source) => bucket.bySource[source] > 0).map(
      (source) => `${SOURCE_LABELS[source]} ${formatHours(bucket.bySource[source])}`
    ),
  ].join(", ")

export function HoursTimeline({ buckets, granularity, view }: { buckets: Bucket[]; granularity: Granularity; view: "chart" | "table" }) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [plotWidth, setPlotWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const element = plotRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setPlotWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [view])

  if (view === "table") {
    const rows = buckets.filter((bucket) => bucket.hours > 0)
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Okres</TableHead>
            <TableHead className="text-right">Razem</TableHead>
            {REPORT_SOURCES.map((source) => (
              <TableHead key={source} className="text-right max-sm:hidden">
                {SOURCE_LABELS[source]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((bucket) => (
            <TableRow key={bucket.bucket}>
              <TableCell>{bucketTitle(bucket.bucket, granularity)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatNumber(bucket.hours)}</TableCell>
              {REPORT_SOURCES.map((source) => (
                <TableCell key={source} className="text-right tabular-nums text-muted-foreground max-sm:hidden">
                  {bucket.bySource[source] > 0 ? formatNumber(bucket.bySource[source]) : "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  const ticks = niceTicks(Math.max(0, ...buckets.map((bucket) => bucket.hours)))
  const top = ticks[ticks.length - 1]
  const columnWidth = buckets.length ? plotWidth / buckets.length : 0
  // Słupek nigdy nie wypełnia całej kolumny — reszta to oddech między nimi.
  const barWidth = Math.max(2, Math.min(24, Math.floor(columnWidth * 0.62)))
  const labelEvery = Math.max(1, Math.ceil(LABEL_MIN_WIDTH / Math.max(columnWidth, 1)))
  const activeBucket = active !== null ? buckets[active] : undefined
  const lastWithHours = buckets.findLastIndex((bucket) => bucket.hours > 0)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const targets: Record<string, number> = {
      ArrowRight: (active ?? -1) + 1,
      ArrowLeft: (active ?? buckets.length) - 1,
      Home: 0,
      End: buckets.length - 1,
    }
    if (event.key in targets && buckets.length) {
      event.preventDefault()
      setActive(Math.max(0, Math.min(buckets.length - 1, targets[event.key])))
    } else if (event.key === "Escape") {
      setActive(null)
    }
  }

  // Podpowiedź obok aktywnej kolumny, po stronie z większą ilością miejsca.
  const anchor = active !== null ? (active + 0.5) * columnWidth : 0
  const tooltipStyle: React.CSSProperties =
    anchor > plotWidth / 2 ? { right: plotWidth - anchor + barWidth / 2 + 10 } : { left: anchor + barWidth / 2 + 10 }

  return (
    <div
      role="group"
      aria-roledescription="wykres słupkowy"
      aria-label="Godziny w czasie według źródła. Strzałki w lewo i w prawo przechodzą między słupkami."
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => setActive((current) => current ?? Math.max(0, lastWithHours))}
      onBlur={() => setActive(null)}
      className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
    >
      <div className="flex">
        <div className="relative w-9 shrink-0" style={{ height: PLOT_HEIGHT }} aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2.5 translate-y-1/2 text-[11px] leading-none text-muted-foreground tabular-nums"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div ref={plotRef} className="relative min-w-0 flex-1" style={{ height: PLOT_HEIGHT }} onMouseLeave={() => setActive(null)}>
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: `${(tick / top) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {buckets.map((bucket, index) => {
              const sources = REPORT_SOURCES.filter((source) => bucket.bySource[source] > 0)
              const room = Math.max(0, (bucket.hours / top) * PLOT_HEIGHT - (sources.length - 1) * 2)
              return (
                <div
                  key={bucket.bucket}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setActive(index)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-0 inset-x-px rounded-md transition-colors duration-200",
                      active === index && "bg-foreground/[0.05]"
                    )}
                  />
                  {sources.length > 0 && (
                    <div
                      className="report-grow-y relative flex flex-col-reverse gap-[2px]"
                      style={{ width: barWidth, "--rise": index } as React.CSSProperties}
                    >
                      {sources.map((source) => (
                        <span
                          key={source}
                          className={cn(
                            "block transition-[height,filter] duration-500 ease-glass last:rounded-t-[4px]",
                            active === index && "brightness-110"
                          )}
                          style={{
                            height: Math.max(2, (bucket.bySource[source] / bucket.hours) * room),
                            backgroundColor: sourceColor(source),
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {activeBucket && (
            <div
              className="glass-solid pointer-events-none absolute top-0 z-10 w-max min-w-44 rounded-lg border px-3 py-2.5"
              style={tooltipStyle}
            >
              <p className="text-[11px] text-muted-foreground">{bucketTitle(activeBucket.bucket, granularity)}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatHours(activeBucket.hours)}</p>
              {activeBucket.hours > 0 && (
                <ul className="mt-2 space-y-1">
                  {REPORT_SOURCES.filter((source) => activeBucket.bySource[source] > 0).map((source) => (
                    <li key={source} className="flex items-center gap-2 text-xs">
                      <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: sourceColor(source) }} />
                      <span className="text-muted-foreground">{SOURCE_LABELS[source]}</span>
                      <span className="ml-auto pl-3 font-medium tabular-nums">{formatHours(activeBucket.bySource[source])}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="ml-9 flex" aria-hidden>
        {buckets.map((bucket, index) => (
          <div key={bucket.bucket} className="relative h-6 flex-1">
            {index % labelEvery === 0 && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground">
                {bucketAxisLabel(bucket.bucket, granularity)}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {activeBucket ? describe(activeBucket, granularity) : ""}
      </p>
    </div>
  )
}
