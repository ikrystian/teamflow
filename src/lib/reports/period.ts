// Okresy raportu czasu liczone na datach kalendarzowych („YYYY-MM-DD”), a nie na
// chwilach w czasie: granice wybiera przeglądarka w strefie użytkownika, a serwer
// przypisuje każdy wpis do dnia w tej samej strefie. Dzięki temu „październik”
// znaczy to samo po obu stronach, niezależnie od strefy serwera.

export type DayKey = string

export interface DateRange {
  from: DayKey
  to: DayKey
}

export type PeriodUnit = "week" | "month" | "quarter" | "year"
export type Granularity = "day" | "week" | "month"

const DAY_MS = 86_400_000
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseDay(day: DayKey): Date {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, date))
}

export function formatDay(date: Date): DayKey {
  return date.toISOString().slice(0, 10)
}

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && DAY_KEY_PATTERN.test(value) && formatDay(parseDay(value)) === value
}

export function addDays(day: DayKey, amount: number): DayKey {
  return formatDay(new Date(parseDay(day).getTime() + amount * DAY_MS))
}

/** Liczba dni od `from` do `to` (0 dla tego samego dnia). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS)
}

/** Dzisiejsza data w lokalnej strefie przeglądarki. */
export function localDayKey(date = new Date()): DayKey {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** Północ danego dnia w lokalnej strefie — do kontrolek kalendarza. */
export function dayKeyToLocalDate(day: DayKey): Date {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(year, month - 1, date)
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>()

/** Data kalendarzowa chwili `date` w strefie `timeZone`. */
export function dayKeyInZone(date: Date, timeZone: string): DayKey {
  let formatter = zoneFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    zoneFormatters.set(timeZone, formatter)
  }
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

export function startOfUnit(day: DayKey, unit: PeriodUnit): DayKey {
  const date = parseDay(day)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  switch (unit) {
    case "week":
      // Tydzień zaczyna się w poniedziałek.
      return addDays(day, -((date.getUTCDay() + 6) % 7))
    case "month":
      return formatDay(new Date(Date.UTC(year, month, 1)))
    case "quarter":
      return formatDay(new Date(Date.UTC(year, month - (month % 3), 1)))
    case "year":
      return formatDay(new Date(Date.UTC(year, 0, 1)))
  }
}

export function endOfUnit(day: DayKey, unit: PeriodUnit): DayKey {
  const date = parseDay(day)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  switch (unit) {
    case "week":
      return addDays(startOfUnit(day, "week"), 6)
    case "month":
      return formatDay(new Date(Date.UTC(year, month + 1, 0)))
    case "quarter":
      return formatDay(new Date(Date.UTC(year, month - (month % 3) + 3, 0)))
    case "year":
      return formatDay(new Date(Date.UTC(year, 11, 31)))
  }
}

// --- Wybór okresu ----------------------------------------------------------

export const PERIOD_PRESETS = [
  { id: "week", label: "Ten tydzień" },
  { id: "last-week", label: "Poprzedni tydzień" },
  { id: "month", label: "Ten miesiąc" },
  { id: "last-month", label: "Poprzedni miesiąc" },
  { id: "30d", label: "Ostatnie 30 dni" },
  { id: "quarter", label: "Ten kwartał" },
  { id: "year", label: "Ten rok" },
  { id: "all", label: "Cały okres" },
] as const

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["id"]

const PRESET_UNITS: Partial<Record<PeriodPreset, PeriodUnit>> = {
  week: "week",
  "last-week": "week",
  month: "month",
  "last-month": "month",
  quarter: "quarter",
  year: "year",
}

/** Preset trzymany po nazwie (przesuwa się z dniem) albo stały zakres dat. */
export type PeriodSelection =
  | { kind: "preset"; preset: PeriodPreset }
  | { kind: "range"; range: DateRange; unit: PeriodUnit | null }

export const DEFAULT_SELECTION: PeriodSelection = { kind: "preset", preset: "month" }

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return PERIOD_PRESETS.some((preset) => preset.id === value)
}

/** Zakres presetu na dzień `today`; `null` = cały okres. Bieżące okresy kończą się dziś. */
export function presetRange(preset: PeriodPreset, today: DayKey): DateRange | null {
  switch (preset) {
    case "week":
      return { from: startOfUnit(today, "week"), to: today }
    case "last-week": {
      const end = addDays(startOfUnit(today, "week"), -1)
      return { from: startOfUnit(end, "week"), to: end }
    }
    case "month":
      return { from: startOfUnit(today, "month"), to: today }
    case "last-month": {
      const end = addDays(startOfUnit(today, "month"), -1)
      return { from: startOfUnit(end, "month"), to: end }
    }
    case "30d":
      return { from: addDays(today, -29), to: today }
    case "quarter":
      return { from: startOfUnit(today, "quarter"), to: today }
    case "year":
      return { from: startOfUnit(today, "year"), to: today }
    case "all":
      return null
  }
}

export function selectionRange(selection: PeriodSelection, today: DayKey): DateRange | null {
  return selection.kind === "preset" ? presetRange(selection.preset, today) : selection.range
}

export function selectionUnit(selection: PeriodSelection): PeriodUnit | null {
  return selection.kind === "preset" ? PRESET_UNITS[selection.preset] ?? null : selection.unit
}

/**
 * Sąsiedni okres tej samej długości (strzałki ◀ ▶): dla okresów kalendarzowych
 * poprzedni/następny tydzień, miesiąc, kwartał lub rok, dla pozostałych zakres
 * przesunięty o własną długość. `null`, gdy nie ma dokąd przejść (cały okres,
 * przyszłość). Wynik pokrywający się z presetem wraca jako ten preset.
 */
export function shiftSelection(selection: PeriodSelection, direction: -1 | 1, today: DayKey): PeriodSelection | null {
  const range = selectionRange(selection, today)
  if (!range) return null
  const unit = selectionUnit(selection)

  let from: DayKey
  let to: DayKey
  if (unit) {
    from = direction < 0 ? startOfUnit(addDays(range.from, -1), unit) : addDays(endOfUnit(range.from, unit), 1)
    to = endOfUnit(from, unit)
  } else {
    const length = daysBetween(range.from, range.to) + 1
    from = addDays(range.from, direction * length)
    to = addDays(range.to, direction * length)
  }
  if (from > today) return null

  const shifted: DateRange = { from, to: to > today ? today : to }
  const preset = PERIOD_PRESETS.find(({ id }) => {
    const candidate = presetRange(id, today)
    return candidate && (PRESET_UNITS[id] ?? null) === unit && candidate.from === shifted.from && candidate.to === shifted.to
  })
  return preset ? { kind: "preset", preset: preset.id } : { kind: "range", range: shifted, unit }
}

/** Czy zakres to dokładnie jeden pełny tydzień, miesiąc, kwartał lub rok. */
export function isWholeUnit(range: DateRange, unit: PeriodUnit | null): boolean {
  return !!unit && range.from === startOfUnit(range.from, unit) && range.to === endOfUnit(range.from, unit)
}

/**
 * Okres odniesienia dla porównania: poprzedni pełny tydzień/miesiąc/kwartał/rok,
 * a dla okresu trwającego („od początku miesiąca do dziś”) — tyle samo dni od
 * początku poprzedniego. Inne zakresy porównujemy z tyloma dniami tuż przed nimi.
 */
export function comparisonRange(range: DateRange, unit: PeriodUnit | null): DateRange {
  if (unit && startOfUnit(range.from, unit) === range.from) {
    const from = startOfUnit(addDays(range.from, -1), unit)
    const end = endOfUnit(from, unit)
    if (range.to === endOfUnit(range.from, unit)) return { from, to: end }
    const to = addDays(from, daysBetween(range.from, range.to))
    return { from, to: to > end ? end : to }
  }
  const length = daysBetween(range.from, range.to) + 1
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) }
}

// --- Parametry adresu --------------------------------------------------------

export function selectionToParams(selection: PeriodSelection): Record<string, string> {
  if (selection.kind === "preset") return { period: selection.preset }
  return {
    from: selection.range.from,
    to: selection.range.to,
    ...(selection.unit && { unit: selection.unit }),
  }
}

export function selectionFromParams(params: {
  period?: string | null
  from?: string | null
  to?: string | null
  unit?: string | null
}): PeriodSelection | null {
  if (isPeriodPreset(params.period)) return { kind: "preset", preset: params.period }
  if (isDayKey(params.from) && isDayKey(params.to) && params.from <= params.to) {
    const unit = (["week", "month", "quarter", "year"] as const).find((candidate) => candidate === params.unit) ?? null
    const aligned = unit && startOfUnit(params.from, unit) === params.from ? unit : null
    return { kind: "range", range: { from: params.from, to: params.to }, unit: aligned }
  }
  return null
}

// --- Kubełki osi czasu -------------------------------------------------------

/** Dziennie do ~1,5 miesiąca, tygodniowo do pół roku, dalej miesięcznie. */
export function granularityFor(range: DateRange): Granularity {
  const days = daysBetween(range.from, range.to) + 1
  if (days <= 45) return "day"
  if (days <= 26 * 7) return "week"
  return "month"
}

export function bucketOf(day: DayKey, granularity: Granularity): DayKey {
  if (granularity === "day") return day
  return startOfUnit(day, granularity)
}

export function listBuckets(range: DateRange, granularity: Granularity): DayKey[] {
  const buckets: DayKey[] = []
  let cursor = bucketOf(range.from, granularity)
  while (cursor <= range.to) {
    buckets.push(cursor)
    cursor =
      granularity === "day"
        ? addDays(cursor, 1)
        : granularity === "week"
          ? addDays(cursor, 7)
          : addDays(endOfUnit(cursor, "month"), 1)
  }
  return buckets
}

// --- Etykiety ----------------------------------------------------------------

const utc = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", ...options })
const dayMonth = utc({ day: "numeric", month: "short" })
const dayMonthYear = utc({ day: "numeric", month: "short", year: "numeric" })
const weekdayDayMonthYear = utc({ weekday: "short", day: "numeric", month: "short", year: "numeric" })
const monthYear = utc({ month: "long", year: "numeric" })
const monthShort = utc({ month: "short" })

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** „3 lis 2026”, „1–3 lis 2026”, „26 paź – 1 lis 2026”. */
export function rangeText(range: DateRange): string {
  const from = parseDay(range.from)
  const to = parseDay(range.to)
  if (range.from === range.to) return dayMonthYear.format(from)
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear()
  if (sameYear && from.getUTCMonth() === to.getUTCMonth()) return `${from.getUTCDate()}–${dayMonthYear.format(to)}`
  if (sameYear) return `${dayMonth.format(from)} – ${dayMonthYear.format(to)}`
  return `${dayMonthYear.format(from)} – ${dayMonthYear.format(to)}`
}

/** Nazwa okresu: „Październik 2026”, „Q4 2026”, „2026”, a dla innych zakresów same daty. */
export function periodLabel(range: DateRange | null, unit: PeriodUnit | null): string {
  if (!range) return "Cały okres"
  const from = parseDay(range.from)
  switch (unit) {
    case "year":
      return String(from.getUTCFullYear())
    case "quarter":
      return `Q${Math.floor(from.getUTCMonth() / 3) + 1} ${from.getUTCFullYear()}`
    case "month":
      return capitalize(monthYear.format(from))
    default:
      return rangeText(range)
  }
}

/** Krótka etykieta osi X. */
export function bucketAxisLabel(bucket: DayKey, granularity: Granularity): string {
  const date = parseDay(bucket)
  return granularity === "month" ? monthShort.format(date) : dayMonth.format(date)
}

/** Pełna nazwa kubełka do podpowiedzi i tabeli. */
export function bucketTitle(bucket: DayKey, granularity: Granularity): string {
  if (granularity === "day") return weekdayDayMonthYear.format(parseDay(bucket))
  if (granularity === "week") return rangeText({ from: bucket, to: addDays(bucket, 6) })
  return capitalize(monthYear.format(parseDay(bucket)))
}
