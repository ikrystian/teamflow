import type { ReportSource } from "@/lib/reports/time-report"

const hoursFormat = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 })

/** „12,25” — godziny z dokładnością do kwadransa, bez zbędnych zer. */
export const formatNumber = (value: number) => hoursFormat.format(value)

export const formatHours = (hours: number) => `${hoursFormat.format(hours)} h`

export const formatShare = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%")

export const sourceColor = (source: ReportSource) => `var(--report-${source})`

/** Polska odmiana: 1 zadanie, 2–4 zadania (bez 12–14), 5+ zadań. */
export function plural(count: number, one: string, few: string, many: string) {
  if (count === 1) return one
  const lastDigit = count % 10
  const lastTwo = count % 100
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}
