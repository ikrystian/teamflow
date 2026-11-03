import { isArchiveStatusName, isDoneStatusName } from "@/lib/task-status-helpers"
import {
  AUTO_DONE_ESTIMATE_DESCRIPTION,
  COMMIT_ENTRY_PREFIX,
  MERGE_REQUEST_ESTIMATE_DESCRIPTION,
} from "@/lib/time-entry-descriptions"
import {
  type DateRange,
  type DayKey,
  type Granularity,
  bucketOf,
  dayKeyInZone,
  formatDay,
  granularityFor,
  listBuckets,
} from "./period"

// Raport czasu liczy godziny dokładnie tak jak karta zadania na tablicy projektu
// („zaraportowane / planowane”) i statystyki kolumn: wpisy czasu + czas podzadań,
// razem z zadaniami zarchiwizowanymi, bez usuniętych. Okres i osoba filtrują
// pojedyncze wpisy (po dniu, którego dotyczą), a nie zadania — godziny wpisane
// w październiku do zadania z lipca należą do października.

export const REPORT_SOURCES = ["manual", "subtask", "commit", "estimate"] as const
export type ReportSource = (typeof REPORT_SOURCES)[number]
export type SourceHours = Record<ReportSource, number>

export const SOURCE_LABELS: Record<ReportSource, string> = {
  manual: "Ręcznie",
  subtask: "Podzadania",
  commit: "Commity (AI)",
  estimate: "Szacunek (auto)",
}

export const SOURCE_DESCRIPTIONS: Record<ReportSource, string> = {
  manual: "wpisy czasu dodane w zadaniach",
  subtask: "czas wpisany przy podzadaniach",
  commit: "czas commitów oszacowany przez model przy merge requeście",
  estimate: "estymacja wpisana automatycznie przy zamknięciu zadania bez zaraportowanego czasu",
}

export interface ReportTask {
  id: string
  key: string | null
  title: string
  projectId: string | null
  assigneeId: string | null
  createdById: string | null
  statusId: string | null
  estimatedHours: number | null
  archived: boolean
}

export interface ReportTimeEntry {
  id: string
  taskId: string
  userId: string
  hours: number
  date: Date
  description: string | null
}

export interface ReportSubtask {
  id: string
  taskId: string
  title: string
  timeSpent: number | null
  createdAt: Date
}

export interface ReportProject {
  id: string
  name: string
  color: string
  slug: string | null
  archived: boolean
}

export interface ReportPerson {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

export interface ReportStatus {
  id: string
  name: string
  color: string
  order: number
}

export interface ReportTaskTag {
  taskId: string
  tag: { id: string; name: string; color: string }
}

export interface TimeReportInput {
  tasks: ReportTask[]
  entries: ReportTimeEntry[]
  subtasks: ReportSubtask[]
  projects: ReportProject[]
  people: ReportPerson[]
  statuses: ReportStatus[]
  taskTags?: ReportTaskTag[]
  /** `null` = cały okres. */
  range: DateRange | null
  compareRange: DateRange | null
  personId: string | null
  timeZone: string
  today: DayKey
}

export interface TimeReport {
  range: DateRange | null
  compareRange: DateRange | null
  /** Zakres osi czasu — dla całego okresu od pierwszego wpisu do dziś. */
  timelineRange: DateRange | null
  granularity: Granularity
  totals: {
    hours: number
    bySource: SourceHours
    previousHours: number | null
    tasks: number
    closedTasks: number
    activeDays: number
    people: number
    /** Zadania z okresu, które mają estymację, i ich zaraportowany czas (z kart). */
    estimatedTasks: number
    estimatedHours: number
    estimatedTasksReportedHours: number
  }
  timeline: { bucket: DayKey; hours: number; bySource: SourceHours }[]
  projects: {
    id: string | null
    name: string
    color: string
    slug: string | null
    archived: boolean
    hours: number
    bySource: SourceHours
    tasks: number
    /** Suma z kart wszystkich zadań projektu (cały czas, wszystkie osoby). */
    boardHours: number
  }[]
  people: {
    id: string | null
    name: string
    avatarUrl: string | null
    hours: number
    bySource: SourceHours
    tasks: number
  }[]
  statuses: {
    id: string | null
    name: string
    color: string
    order: number
    closed: boolean
    tasks: number
    hours: number
  }[]
  tasks: {
    id: string
    key: string | null
    title: string
    archived: boolean
    project: { id: string | null; name: string; color: string; slug: string | null }
    status: { id: string; name: string; color: string; closed: boolean } | null
    assignee: { id: string; name: string; avatarUrl: string | null } | null
    hours: number
    bySource: SourceHours
    /** To samo co na karcie zadania: cały zaraportowany czas, wszystkie osoby. */
    totalHours: number
    estimatedHours: number | null
    lastDay: DayKey
  }[]
  tags: { id: string; name: string; color: string; hours: number; tasks: number }[]
  options: { people: { id: string; name: string; avatarUrl: string | null }[] }
}

export interface TimeItem {
  source: ReportSource
  hours: number
  day: DayKey
  taskId: string
  personId: string | null
  description: string | null
}

const NONE = "__none__"
const NEUTRAL_COLOR = "#6B7280"

const round = (value: number) => Math.round(value * 100) / 100

const emptySources = (): SourceHours => ({ manual: 0, subtask: 0, commit: 0, estimate: 0 })

const roundSources = (sources: SourceHours): SourceHours => ({
  manual: round(sources.manual),
  subtask: round(sources.subtask),
  commit: round(sources.commit),
  estimate: round(sources.estimate),
})

export function classifyTimeEntry(description: string | null | undefined): Exclude<ReportSource, "subtask"> {
  if (!description) return "manual"
  if (description.startsWith(COMMIT_ENTRY_PREFIX)) return "commit"
  if (description === AUTO_DONE_ESTIMATE_DESCRIPTION || description === MERGE_REQUEST_ESTIMATE_DESCRIPTION) return "estimate"
  return "manual"
}

/**
 * Dzień, którego dotyczy wpis czasu. Formularz czasu zapisuje samą datę (północ
 * UTC) i wtedy liczy się dokładnie ta data; pozostałe wpisy są chwilami w czasie
 * i trafiają do dnia w strefie użytkownika.
 */
export function entryDay(date: Date, timeZone: string): DayKey {
  const dateOnly =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
  return dateOnly ? formatDay(date) : dayKeyInZone(date, timeZone)
}

export function collectTimeItems(
  tasks: ReportTask[],
  entries: ReportTimeEntry[],
  subtasks: ReportSubtask[],
  timeZone: string
): TimeItem[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const items: TimeItem[] = []

  for (const entry of entries) {
    if (!taskById.has(entry.taskId) || !Number.isFinite(entry.hours) || entry.hours === 0) continue
    items.push({
      source: classifyTimeEntry(entry.description),
      hours: entry.hours,
      day: entryDay(entry.date, timeZone),
      taskId: entry.taskId,
      personId: entry.userId,
      description: entry.description,
    })
  }

  for (const subtask of subtasks) {
    const task = taskById.get(subtask.taskId)
    const hours = subtask.timeSpent ?? 0
    if (!task || !Number.isFinite(hours) || hours === 0) continue
    // Podzadanie nie ma autora ani daty pracy: liczymy je osobie przypisanej
    // do zadania (lub jego autorowi), w dniu utworzenia podzadania.
    items.push({
      source: "subtask",
      hours,
      day: dayKeyInZone(subtask.createdAt, timeZone),
      taskId: task.id,
      personId: task.assigneeId ?? task.createdById,
      description: subtask.title,
    })
  }

  return items
}

export function selectPeriodItems(items: TimeItem[], range: DateRange | null, personId: string | null): TimeItem[] {
  return items.filter(
    (item) => (!range || (item.day >= range.from && item.day <= range.to)) && (!personId || item.personId === personId)
  )
}

interface Aggregate {
  hours: number
  bySource: SourceHours
  taskIds: Set<string>
  lastDay: DayKey
}

function addTo(map: Map<string, Aggregate>, key: string, item: TimeItem) {
  let aggregate = map.get(key)
  if (!aggregate) {
    aggregate = { hours: 0, bySource: emptySources(), taskIds: new Set(), lastDay: item.day }
    map.set(key, aggregate)
  }
  aggregate.hours += item.hours
  aggregate.bySource[item.source] += item.hours
  aggregate.taskIds.add(item.taskId)
  if (item.day > aggregate.lastDay) aggregate.lastDay = item.day
}

const isClosedStatus = (status: ReportStatus | undefined) =>
  !!status && (isDoneStatusName(status.name) || isArchiveStatusName(status.name))

const personName = (person: ReportPerson) => person.name || person.email

export function buildTimeReport(input: TimeReportInput): TimeReport {
  const items = collectTimeItems(input.tasks, input.entries, input.subtasks, input.timeZone)
  const periodItems = selectPeriodItems(items, input.range, input.personId)

  const taskById = new Map(input.tasks.map((task) => [task.id, task]))
  const projectById = new Map(input.projects.map((project) => [project.id, project]))
  const personById = new Map(input.people.map((person) => [person.id, person]))
  const statusById = new Map(input.statuses.map((status) => [status.id, status]))
  const statusOf = (task: ReportTask) => (task.statusId ? statusById.get(task.statusId) : undefined)

  // Suma z karty zadania: wszystkie wpisy i podzadania, bez filtrów okresu i osoby.
  const taskTotals = new Map<string, number>()
  for (const item of items) taskTotals.set(item.taskId, (taskTotals.get(item.taskId) ?? 0) + item.hours)

  const bySource = emptySources()
  const days = new Set<DayKey>()
  const byTask = new Map<string, Aggregate>()
  const byProject = new Map<string, Aggregate>()
  const byPerson = new Map<string, Aggregate>()
  const byStatus = new Map<string, Aggregate>()

  for (const item of periodItems) {
    const task = taskById.get(item.taskId)!
    bySource[item.source] += item.hours
    days.add(item.day)
    addTo(byTask, item.taskId, item)
    addTo(byProject, task.projectId ?? NONE, item)
    addTo(byPerson, item.personId ?? NONE, item)
    addTo(byStatus, task.statusId ?? NONE, item)
  }

  const sortedDays = [...days].sort()
  const lastDay = sortedDays.at(-1)
  const timelineRange =
    input.range ?? (lastDay ? { from: sortedDays[0], to: lastDay > input.today ? lastDay : input.today } : null)
  const granularity: Granularity = timelineRange ? granularityFor(timelineRange) : "day"
  const timelineSources = new Map(
    (timelineRange ? listBuckets(timelineRange, granularity) : []).map((bucket) => [bucket, emptySources()])
  )
  for (const item of periodItems) {
    const sources = timelineSources.get(bucketOf(item.day, granularity))
    if (sources) sources[item.source] += item.hours
  }

  const boardHours = new Map<string, number>()
  for (const task of input.tasks) {
    const key = task.projectId ?? NONE
    boardHours.set(key, (boardHours.get(key) ?? 0) + (taskTotals.get(task.id) ?? 0))
  }

  const workedTasks = [...byTask.keys()].map((id) => taskById.get(id)!)
  const estimatedTasks = workedTasks.filter((task) => (task.estimatedHours ?? 0) > 0)
  const previousHours = input.compareRange
    ? round(selectPeriodItems(items, input.compareRange, input.personId).reduce((sum, item) => sum + item.hours, 0))
    : null

  const tagTotals = new Map<string, { id: string; name: string; color: string; hours: number; tasks: number }>()
  for (const { taskId, tag } of input.taskTags ?? []) {
    const aggregate = byTask.get(taskId)
    if (!aggregate) continue
    const total = tagTotals.get(tag.id) ?? { ...tag, hours: 0, tasks: 0 }
    total.hours += aggregate.hours
    total.tasks += 1
    tagTotals.set(tag.id, total)
  }

  const optionIds = new Set(items.map((item) => item.personId).filter((id): id is string => !!id))
  if (input.personId) optionIds.add(input.personId)

  return {
    range: input.range,
    compareRange: input.compareRange,
    timelineRange,
    granularity,
    totals: {
      hours: round(periodItems.reduce((sum, item) => sum + item.hours, 0)),
      bySource: roundSources(bySource),
      previousHours,
      tasks: workedTasks.length,
      closedTasks: workedTasks.filter((task) => isClosedStatus(statusOf(task))).length,
      activeDays: days.size,
      people: byPerson.size,
      estimatedTasks: estimatedTasks.length,
      estimatedHours: round(estimatedTasks.reduce((sum, task) => sum + (task.estimatedHours ?? 0), 0)),
      estimatedTasksReportedHours: round(estimatedTasks.reduce((sum, task) => sum + (taskTotals.get(task.id) ?? 0), 0)),
    },
    timeline: [...timelineSources].map(([bucket, sources]) => ({
      bucket,
      hours: round(REPORT_SOURCES.reduce((sum, source) => sum + sources[source], 0)),
      bySource: roundSources(sources),
    })),
    projects: [...byProject]
      .map(([key, aggregate]) => {
        const project = key === NONE ? undefined : projectById.get(key)
        return {
          id: key === NONE ? null : key,
          name: project?.name ?? (key === NONE ? "Bez projektu" : "Nieznany projekt"),
          color: project?.color ?? NEUTRAL_COLOR,
          slug: project?.slug ?? null,
          archived: project?.archived ?? false,
          hours: round(aggregate.hours),
          bySource: roundSources(aggregate.bySource),
          tasks: aggregate.taskIds.size,
          boardHours: round(boardHours.get(key) ?? 0),
        }
      })
      .sort((a, b) => b.hours - a.hours),
    people: [...byPerson]
      .map(([key, aggregate]) => {
        const person = key === NONE ? undefined : personById.get(key)
        return {
          id: key === NONE ? null : key,
          name: person ? personName(person) : key === NONE ? "Nieprzypisane" : "Nieznany użytkownik",
          avatarUrl: person?.avatarUrl ?? null,
          hours: round(aggregate.hours),
          bySource: roundSources(aggregate.bySource),
          tasks: aggregate.taskIds.size,
        }
      })
      .sort((a, b) => b.hours - a.hours),
    statuses: [...byStatus]
      .map(([key, aggregate]) => {
        const status = key === NONE ? undefined : statusById.get(key)
        return {
          id: key === NONE ? null : key,
          name: status?.name ?? "Bez statusu",
          color: status?.color ?? NEUTRAL_COLOR,
          order: status?.order ?? Number.MAX_SAFE_INTEGER,
          closed: isClosedStatus(status),
          tasks: aggregate.taskIds.size,
          hours: round(aggregate.hours),
        }
      })
      .sort((a, b) => a.order - b.order),
    tasks: [...byTask]
      .map(([id, aggregate]) => {
        const task = taskById.get(id)!
        const project = task.projectId ? projectById.get(task.projectId) : undefined
        const status = statusOf(task)
        const assignee = task.assigneeId ? personById.get(task.assigneeId) : undefined
        return {
          id,
          key: task.key,
          title: task.title,
          archived: task.archived,
          project: {
            id: task.projectId,
            name: project?.name ?? "Bez projektu",
            color: project?.color ?? NEUTRAL_COLOR,
            slug: project?.slug ?? null,
          },
          status: status ? { id: status.id, name: status.name, color: status.color, closed: isClosedStatus(status) } : null,
          assignee: assignee ? { id: assignee.id, name: personName(assignee), avatarUrl: assignee.avatarUrl } : null,
          hours: round(aggregate.hours),
          bySource: roundSources(aggregate.bySource),
          totalHours: round(taskTotals.get(id) ?? 0),
          estimatedHours: task.estimatedHours,
          lastDay: aggregate.lastDay,
        }
      })
      .sort((a, b) => b.hours - a.hours || b.lastDay.localeCompare(a.lastDay)),
    tags: [...tagTotals.values()]
      .map((tag) => ({ ...tag, hours: round(tag.hours) }))
      .sort((a, b) => b.hours - a.hours),
    options: {
      people: [...optionIds]
        .map((id) => personById.get(id))
        .filter((person): person is ReportPerson => !!person)
        .map((person) => ({ id: person.id, name: personName(person), avatarUrl: person.avatarUrl }))
        .sort((a, b) => a.name.localeCompare(b.name, "pl")),
    },
  }
}

const csvCell = (value: unknown) => {
  const text = value == null ? "" : String(value)
  // Ochrona przed wstrzyknięciem formuł w arkuszach kalkulacyjnych.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

/** Pojedyncze wpisy z okresu (średniki, przecinek dziesiętny — format polskiego Excela). */
export function buildTimeCsv(input: TimeReportInput): string {
  const taskById = new Map(input.tasks.map((task) => [task.id, task]))
  const projectById = new Map(input.projects.map((project) => [project.id, project]))
  const personById = new Map(input.people.map((person) => [person.id, person]))

  const rows = selectPeriodItems(
    collectTimeItems(input.tasks, input.entries, input.subtasks, input.timeZone),
    input.range,
    input.personId
  ).map((item) => {
    const task = taskById.get(item.taskId)!
    const person = item.personId ? personById.get(item.personId) : undefined
    return [
      item.day,
      (task.projectId && projectById.get(task.projectId)?.name) || "Bez projektu",
      task.key ?? "",
      task.title,
      person ? personName(person) : "",
      SOURCE_LABELS[item.source],
      String(round(item.hours)).replace(".", ","),
      item.description ?? "",
    ]
  })
  rows.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1], "pl") || a[2].localeCompare(b[2]))

  const header = ["data", "projekt", "zadanie", "tytuł zadania", "osoba", "źródło", "godziny", "opis"]
  return [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")
}
