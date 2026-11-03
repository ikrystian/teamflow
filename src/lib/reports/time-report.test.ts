import { describe, expect, it } from "vitest"
import { AUTO_DONE_ESTIMATE_DESCRIPTION, commitEntryDescription } from "@/lib/time-entry-descriptions"
import {
  type ReportTask,
  type TimeReportInput,
  buildTimeCsv,
  buildTimeReport,
  classifyTimeEntry,
  entryDay,
} from "./time-report"

const TZ = "Europe/Warsaw"

const task = (overrides: Partial<ReportTask> & { id: string }): ReportTask => ({
  key: overrides.id.toUpperCase(),
  title: `Zadanie ${overrides.id}`,
  projectId: "p1",
  assigneeId: "anna",
  createdById: "anna",
  statusId: "todo",
  estimatedHours: null,
  archived: false,
  ...overrides,
})

const baseInput = (overrides: Partial<TimeReportInput> = {}): TimeReportInput => ({
  tasks: [
    // Utworzone w lipcu, praca w październiku — dawny raport gubił takie godziny.
    task({ id: "t1", estimatedHours: 4, statusId: "done" }),
    task({ id: "t2", assigneeId: "jan", createdById: "jan", archived: true, statusId: "archive" }),
    task({ id: "t3", projectId: "p2" }),
  ],
  entries: [
    { id: "e1", taskId: "t1", userId: "anna", hours: 2, date: new Date("2026-10-14T09:00:00Z"), description: null },
    { id: "e2", taskId: "t1", userId: "jan", hours: 1.5, date: new Date("2026-10-15T00:00:00Z"), description: "review" },
    { id: "e3", taskId: "t2", userId: "jan", hours: 3, date: new Date("2026-10-31T23:30:00Z"), description: AUTO_DONE_ESTIMATE_DESCRIPTION },
    { id: "e4", taskId: "t3", userId: "anna", hours: 1, date: new Date("2026-09-20T10:00:00Z"), description: commitEntryDescription("Fix") },
    // Wpis do zadania spoza zakresu (np. usuniętego) — pomijany.
    { id: "e5", taskId: "deleted", userId: "anna", hours: 8, date: new Date("2026-10-10T10:00:00Z"), description: null },
  ],
  subtasks: [
    { id: "s1", taskId: "t1", title: "Widok", timeSpent: 2.5, createdAt: new Date("2026-10-20T08:00:00Z") },
    { id: "s2", taskId: "t1", title: "Bez czasu", timeSpent: null, createdAt: new Date("2026-10-20T08:00:00Z") },
  ],
  projects: [
    { id: "p1", name: "Prosta Sprawa", color: "#0da192", slug: "prosta-sprawa", archived: false },
    { id: "p2", name: "Studio", color: "#4287f5", slug: null, archived: true },
  ],
  people: [
    { id: "anna", name: "Anna", email: "anna@example.com", avatarUrl: null },
    { id: "jan", name: null, email: "jan@example.com", avatarUrl: null },
  ],
  statuses: [
    { id: "todo", name: "To Do", color: "#3B82F6", order: 0 },
    { id: "done", name: "Done", color: "#10B981", order: 3 },
    { id: "archive", name: "Archive", color: "#6B7280", order: 4 },
  ],
  range: { from: "2026-10-01", to: "2026-10-31" },
  compareRange: { from: "2026-09-01", to: "2026-09-30" },
  personId: null,
  timeZone: TZ,
  today: "2026-11-03",
  ...overrides,
})

describe("classifyTimeEntry", () => {
  it("recognises automatic entries by their description", () => {
    expect(classifyTimeEntry(AUTO_DONE_ESTIMATE_DESCRIPTION)).toBe("estimate")
    expect(classifyTimeEntry("Automatyczne zalogowanie czasu zaplanowanego (merge-request)")).toBe("estimate")
    expect(classifyTimeEntry(commitEntryDescription("Nowy formularz"))).toBe("commit")
    expect(classifyTimeEntry("Spotkanie z klientem")).toBe("manual")
    expect(classifyTimeEntry(null)).toBe("manual")
  })
})

describe("entryDay", () => {
  it("keeps date-only entries on their calendar date", () => {
    expect(entryDay(new Date("2026-11-03T00:00:00Z"), TZ)).toBe("2026-11-03")
  })

  it("puts timestamps on the local day of the user", () => {
    expect(entryDay(new Date("2026-10-31T23:30:00Z"), TZ)).toBe("2026-11-01")
  })
})

describe("buildTimeReport", () => {
  it("counts hours like the task card: entries plus subtasks, archived tasks included", () => {
    const report = buildTimeReport(baseInput({ range: null, compareRange: null }))
    const t1 = report.tasks.find((t) => t.id === "t1")!
    // 2 + 1.5 (wpisy) + 2.5 (podzadanie)
    expect(t1.totalHours).toBe(6)
    expect(report.totals.hours).toBe(10)
    expect(report.projects.find((p) => p.id === "p1")!.boardHours).toBe(9)
  })

  it("filters entries by the day they belong to, not by task creation", () => {
    const report = buildTimeReport(baseInput())
    // Październik: e1 + e2 + s1; e3 przypada na 1 listopada w Warszawie, e4 to wrzesień.
    expect(report.totals.hours).toBe(6)
    expect(report.totals.bySource).toEqual({ manual: 3.5, subtask: 2.5, commit: 0, estimate: 0 })
    expect(report.totals.previousHours).toBe(1)
    expect(report.totals.tasks).toBe(1)
    expect(report.totals.activeDays).toBe(3)
  })

  it("filters by person and attributes subtasks to the assignee", () => {
    const anna = buildTimeReport(baseInput({ personId: "anna" }))
    expect(anna.totals.hours).toBe(4.5)
    const jan = buildTimeReport(baseInput({ personId: "jan" }))
    expect(jan.totals.hours).toBe(1.5)
    // Suma na karcie nie zależy od filtra osoby.
    expect(jan.tasks[0].totalHours).toBe(6)
  })

  it("builds a continuous timeline with empty days", () => {
    const report = buildTimeReport(baseInput())
    expect(report.granularity).toBe("day")
    expect(report.timeline).toHaveLength(31)
    expect(report.timeline.find((b) => b.bucket === "2026-10-14")!.hours).toBe(2)
    expect(report.timeline.find((b) => b.bucket === "2026-10-16")!.hours).toBe(0)
  })

  it("spans the whole history up to today for the all-time view", () => {
    const report = buildTimeReport(baseInput({ range: null, compareRange: null }))
    expect(report.timelineRange).toEqual({ from: "2026-09-20", to: "2026-11-03" })
    expect(report.granularity).toBe("day")
    expect(report.timeline).toHaveLength(45)
  })

  it("reports closed tasks, statuses and estimates for the worked tasks", () => {
    const report = buildTimeReport(baseInput({ range: { from: "2026-10-01", to: "2026-11-03" } }))
    expect(report.totals.tasks).toBe(2)
    expect(report.totals.closedTasks).toBe(2)
    expect(report.statuses.map((s) => [s.name, s.tasks])).toEqual([
      ["Done", 1],
      ["Archive", 1],
    ])
    expect(report.totals.estimatedTasks).toBe(1)
    expect(report.totals.estimatedHours).toBe(4)
    expect(report.totals.estimatedTasksReportedHours).toBe(6)
    expect(report.totals.bySource.estimate).toBe(3)
  })

  it("lists people with reported time as filter options", () => {
    const report = buildTimeReport(baseInput())
    expect(report.options.people.map((p) => p.name)).toEqual(["Anna", "jan@example.com"])
  })
})

describe("buildTimeCsv", () => {
  it("exports period entries with Polish decimals", () => {
    const csv = buildTimeCsv(baseInput())
    const lines = csv.split("\r\n")
    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe('"2026-10-14";"Prosta Sprawa";"T1";"Zadanie t1";"Anna";"Ręcznie";"2";""')
    expect(lines[2]).toContain('"jan@example.com";"Ręcznie";"1,5";"review"')
    expect(lines[3]).toContain('"Podzadania";"2,5";"Widok"')
  })
})
