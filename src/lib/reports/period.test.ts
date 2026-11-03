import { describe, expect, it } from "vitest"
import {
  bucketTitle,
  comparisonRange,
  dayKeyInZone,
  endOfUnit,
  granularityFor,
  isDayKey,
  listBuckets,
  periodLabel,
  presetRange,
  rangeText,
  selectionFromParams,
  selectionToParams,
  shiftSelection,
  startOfUnit,
} from "./period"

// Wtorek
const TODAY = "2026-11-03"

describe("calendar units", () => {
  it("starts weeks on Monday", () => {
    expect(startOfUnit("2026-11-03", "week")).toBe("2026-11-02")
    expect(startOfUnit("2026-11-01", "week")).toBe("2026-10-26")
    expect(endOfUnit("2026-11-01", "week")).toBe("2026-11-01")
  })

  it("handles month, quarter and year ends", () => {
    expect(endOfUnit("2026-02-10", "month")).toBe("2026-02-28")
    expect(endOfUnit("2028-02-10", "month")).toBe("2028-02-29")
    expect(startOfUnit("2026-11-03", "quarter")).toBe("2026-10-01")
    expect(endOfUnit("2026-11-03", "quarter")).toBe("2026-12-31")
    expect(startOfUnit("2026-11-03", "year")).toBe("2026-01-01")
  })

  it("validates day keys", () => {
    expect(isDayKey("2026-11-03")).toBe(true)
    expect(isDayKey("2026-02-30")).toBe(false)
    expect(isDayKey("2026-11-3")).toBe(false)
    expect(isDayKey(null)).toBe(false)
  })

  it("maps instants to the calendar day of a time zone", () => {
    // 00:30 w Warszawie (zima, UTC+1) to jeszcze poprzedni dzień w UTC.
    expect(dayKeyInZone(new Date("2026-10-31T23:30:00Z"), "Europe/Warsaw")).toBe("2026-11-01")
    expect(dayKeyInZone(new Date("2026-10-31T23:30:00Z"), "UTC")).toBe("2026-10-31")
  })
})

describe("presets", () => {
  it("resolves current periods up to today", () => {
    expect(presetRange("week", TODAY)).toEqual({ from: "2026-11-02", to: TODAY })
    expect(presetRange("month", TODAY)).toEqual({ from: "2026-11-01", to: TODAY })
    expect(presetRange("quarter", TODAY)).toEqual({ from: "2026-10-01", to: TODAY })
    expect(presetRange("year", TODAY)).toEqual({ from: "2026-01-01", to: TODAY })
    expect(presetRange("30d", TODAY)).toEqual({ from: "2026-10-05", to: TODAY })
    expect(presetRange("all", TODAY)).toBeNull()
  })

  it("resolves previous full periods", () => {
    expect(presetRange("last-week", TODAY)).toEqual({ from: "2026-10-26", to: "2026-11-01" })
    expect(presetRange("last-month", TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" })
    expect(presetRange("last-month", "2027-01-15")).toEqual({ from: "2026-12-01", to: "2026-12-31" })
  })
})

describe("shiftSelection", () => {
  it("steps through whole calendar months", () => {
    const october = shiftSelection({ kind: "preset", preset: "month" }, -1, TODAY)
    // Poprzedni pełny miesiąc to dokładnie preset „Poprzedni miesiąc”.
    expect(october).toEqual({ kind: "preset", preset: "last-month" })

    const september = shiftSelection(october!, -1, TODAY)
    expect(september).toEqual({ kind: "range", range: { from: "2026-09-01", to: "2026-09-30" }, unit: "month" })

    expect(shiftSelection(september!, 1, TODAY)).toEqual({ kind: "preset", preset: "last-month" })
    expect(shiftSelection(october!, 1, TODAY)).toEqual({ kind: "preset", preset: "month" })
  })

  it("does not move into the future or past the whole history", () => {
    expect(shiftSelection({ kind: "preset", preset: "month" }, 1, TODAY)).toBeNull()
    expect(shiftSelection({ kind: "preset", preset: "all" }, -1, TODAY)).toBeNull()
  })

  it("shifts free ranges by their own length", () => {
    const previous = shiftSelection({ kind: "preset", preset: "30d" }, -1, TODAY)
    expect(previous).toEqual({ kind: "range", range: { from: "2026-09-05", to: "2026-10-04" }, unit: null })
    expect(shiftSelection(previous!, 1, TODAY)).toEqual({ kind: "preset", preset: "30d" })
  })

  it("steps weeks Monday to Sunday", () => {
    expect(shiftSelection({ kind: "preset", preset: "week" }, -1, TODAY)).toEqual({ kind: "preset", preset: "last-week" })
    expect(shiftSelection({ kind: "preset", preset: "last-week" }, -1, TODAY)).toEqual({
      kind: "range",
      range: { from: "2026-10-19", to: "2026-10-25" },
      unit: "week",
    })
  })
})

describe("comparisonRange", () => {
  it("compares a month-to-date with the same days of the previous month", () => {
    expect(comparisonRange({ from: "2026-11-01", to: "2026-11-03" }, "month")).toEqual({ from: "2026-10-01", to: "2026-10-03" })
    expect(comparisonRange({ from: "2026-03-01", to: "2026-03-31" }, "month")).toEqual({ from: "2026-02-01", to: "2026-02-28" })
  })

  it("clamps to the shorter previous month", () => {
    expect(comparisonRange({ from: "2026-03-01", to: "2026-03-30" }, "month")).toEqual({ from: "2026-02-01", to: "2026-02-28" })
  })

  it("uses the same number of days before a free range", () => {
    expect(comparisonRange({ from: "2026-10-05", to: "2026-11-03" }, null)).toEqual({ from: "2026-09-05", to: "2026-10-04" })
  })
})

describe("url params", () => {
  it("round-trips presets and ranges", () => {
    expect(selectionFromParams(selectionToParams({ kind: "preset", preset: "quarter" }))).toEqual({ kind: "preset", preset: "quarter" })
    const range = { kind: "range" as const, range: { from: "2026-09-01", to: "2026-09-30" }, unit: "month" as const }
    expect(selectionFromParams(selectionToParams(range))).toEqual(range)
  })

  it("rejects invalid input and misaligned units", () => {
    expect(selectionFromParams({ from: "2026-10-10", to: "2026-10-01" })).toBeNull()
    expect(selectionFromParams({ period: "decade" })).toBeNull()
    expect(selectionFromParams({ from: "2026-10-10", to: "2026-10-31", unit: "month" })).toEqual({
      kind: "range",
      range: { from: "2026-10-10", to: "2026-10-31" },
      unit: null,
    })
  })
})

describe("buckets and labels", () => {
  it("picks the bucket size from the range length", () => {
    expect(granularityFor({ from: "2026-10-01", to: "2026-10-31" })).toBe("day")
    expect(granularityFor({ from: "2026-10-01", to: "2026-12-31" })).toBe("week")
    expect(granularityFor({ from: "2026-01-01", to: "2026-11-03" })).toBe("month")
  })

  it("lists continuous buckets including empty ones", () => {
    expect(listBuckets({ from: "2026-10-30", to: "2026-11-02" }, "day")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ])
    expect(listBuckets({ from: "2026-10-28", to: "2026-11-10" }, "week")).toEqual(["2026-10-26", "2026-11-02", "2026-11-09"])
    expect(listBuckets({ from: "2026-01-15", to: "2026-03-01" }, "month")).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"])
  })

  it("formats Polish labels", () => {
    expect(periodLabel({ from: "2026-10-01", to: "2026-10-31" }, "month")).toBe("Październik 2026")
    expect(periodLabel({ from: "2026-10-01", to: TODAY }, "quarter")).toBe("Q4 2026")
    expect(periodLabel(null, null)).toBe("Cały okres")
    expect(rangeText({ from: "2026-11-01", to: TODAY })).toBe("1–3 lis 2026")
    expect(rangeText({ from: "2026-10-26", to: "2026-11-01" })).toBe("26 paź – 1 lis 2026")
    expect(bucketTitle("2026-10-26", "week")).toBe("26 paź – 1 lis 2026")
  })
})
