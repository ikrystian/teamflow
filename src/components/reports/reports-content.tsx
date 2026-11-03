"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleCheck,
  Clock,
  Download,
  FolderKanban,
  Info,
  ListChecks,
  Minus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react"
import { usePageHeader } from "@/contexts/header-context"
import { PageBody, PageHeader } from "@/components/dashboard/page-header"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCountUp } from "@/hooks/use-count-up"
import { useSession } from "@/lib/auth/use-session"
import type { AppSession as Session } from "@/lib/auth/types"
import { formatDateTime } from "@/lib/format"
import { projectPath } from "@/lib/project-slug"
import { cn } from "@/lib/utils"
import {
  type DateRange,
  type DayKey,
  type PeriodSelection,
  type PeriodUnit,
  DEFAULT_SELECTION,
  comparisonRange,
  isWholeUnit,
  localDayKey,
  periodLabel,
  rangeText,
  selectionFromParams,
  selectionRange,
  selectionToParams,
  selectionUnit,
  shiftSelection,
} from "@/lib/reports/period"
import { REPORT_SOURCES, SOURCE_DESCRIPTIONS, SOURCE_LABELS, type TimeReport } from "@/lib/reports/time-report"
import { HoursTimeline } from "./hours-timeline"
import { PeriodPicker } from "./period-picker"
import { SourceBar, SourceSwatch } from "./source-bar"
import { formatHours, formatNumber, formatShare, plural } from "./format"

type ReportResponse = TimeReport & {
  projectOptions: { id: string; name: string; color: string; slug: string | null; archived: boolean }[]
  generatedAt: string
}

export interface ReportsSearchParams {
  period?: string
  from?: string
  to?: string
  unit?: string
  project?: string
  person?: string
}

interface Filters {
  selection: PeriodSelection
  projectId: string
  personId: string
}

const ALL = "all"
const TASKS_PREVIEW = 15

/** Staggered entrance step (see .glass-rise). */
const rise = (step: number) => ({ "--rise": step }) as React.CSSProperties

// „Dziś” jest zewnętrznym stanem (zegar przeglądarki): `null` na serwerze i przy
// hydracji, potem data lokalna — sprawdzana co minutę, więc o północy okresy się przesuną.
const subscribeToClock = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 60_000)
  return () => window.clearInterval(timer)
}
const useToday = () => useSyncExternalStore<DayKey | null>(subscribeToClock, localDayKey, () => null)

export function ReportsContent({ searchParams }: { searchParams: ReportsSearchParams }) {
  const { data: session } = useSession() as { data: Session | null }
  const today = useToday()
  const [filters, setFilters] = useState<Filters>(() => ({
    selection: selectionFromParams(searchParams) ?? DEFAULT_SELECTION,
    projectId: searchParams.project || ALL,
    personId: searchParams.person || ALL,
  }))
  const [loaded, setLoaded] = useState<{ key: string; report: ReportResponse } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const range = today ? selectionRange(filters.selection, today) : null
  const unit = selectionUnit(filters.selection)

  const query = useMemo(() => {
    if (!today) return null
    const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    const period = selectionRange(filters.selection, today)
    if (period) {
      const compare = comparisonRange(period, selectionUnit(filters.selection))
      params.set("from", period.from)
      params.set("to", period.to)
      params.set("compareFrom", compare.from)
      params.set("compareTo", compare.to)
    }
    if (filters.projectId !== ALL) params.set("projectId", filters.projectId)
    if (filters.personId !== ALL) params.set("personId", filters.personId)
    return params.toString()
  }, [today, filters])

  const requestKey = query ? `${query}#${attempt}` : null
  const report = loaded?.report ?? null
  const failed = !!requestKey && failedKey === requestKey
  const loading = !!requestKey && loaded?.key !== requestKey && !failed

  useEffect(() => {
    if (!query || !requestKey) return
    const controller = new AbortController()
    fetch(`/api/reports?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        setLoaded({ key: requestKey, report: (await response.json()) as ReportResponse })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error("Error fetching report:", error)
        setFailedKey(requestKey)
      })
    return () => controller.abort()
  }, [query, requestKey])

  // Filtry w adresie — raport można odświeżyć, dodać do zakładek albo komuś wysłać.
  useEffect(() => {
    const params = new URLSearchParams(selectionToParams(filters.selection))
    if (filters.projectId !== ALL) params.set("project", filters.projectId)
    if (filters.personId !== ALL) params.set("person", filters.personId)
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`)
  }, [filters])

  const projectName =
    filters.projectId === ALL
      ? "Wszystkie projekty"
      : report?.projectOptions.find((project) => project.id === filters.projectId)?.name ?? "Projekt"
  const personName =
    filters.personId === ALL
      ? "Wszystkie osoby"
      : report?.options.people.find((person) => person.id === filters.personId)?.name ?? "Osoba"
  const csvHref = query ? `/api/reports?${query}&format=csv` : undefined

  usePageHeader(
    <PageHeader
      title="Raporty"
      description={`Czas pracy · ${projectName} · ${personName}`}
      actions={
        <Button variant="outline" size="sm" asChild>
          <a href={csvHref} download aria-disabled={!csvHref}>
            <Download />
            <span className="hidden sm:inline">Eksport CSV</span>
          </a>
        </Button>
      }
    />,
    [projectName, personName, csvHref]
  )

  const setSelection = (selection: PeriodSelection) => setFilters((current) => ({ ...current, selection }))

  return (
    <PageBody className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {today ? (
          <PeriodPicker selection={filters.selection} today={today} onChange={setSelection} />
        ) : (
          <LoadingSkeleton className="h-8 w-60 rounded-md" />
        )}
        <Select value={filters.projectId} onValueChange={(projectId) => setFilters((current) => ({ ...current, projectId }))}>
          <SelectTrigger size="sm" className="w-[calc(50%-0.25rem)] sm:w-52" aria-label="Projekt">
            <SelectValue placeholder="Projekt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Wszystkie projekty</SelectItem>
            {report?.projectOptions.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="truncate">{project.name}</span>
                {project.archived && <span className="text-xs text-muted-foreground">archiwum</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.personId} onValueChange={(personId) => setFilters((current) => ({ ...current, personId }))}>
          <SelectTrigger size="sm" className="w-[calc(50%-0.25rem)] sm:w-48" aria-label="Osoba">
            <SelectValue placeholder="Osoba" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Wszystkie osoby</SelectItem>
            {report?.options.people.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                <span className="truncate">{person.name}</span>
                {person.id === session?.user?.id && <span className="text-xs text-muted-foreground">(Ty)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {range && <span className="ml-1 text-xs text-muted-foreground max-sm:hidden">{rangeText(range)}</span>}
      </div>

      {failed ? (
        <Card className="items-center gap-3 py-14 text-center">
          <p className="text-sm font-medium">Nie udało się załadować raportu</p>
          <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
            <RotateCcw />
            Spróbuj ponownie
          </Button>
        </Card>
      ) : !report || !today ? (
        <ReportSkeleton />
      ) : (
        <div
          className={cn("space-y-8 transition-opacity duration-300", loading && "pointer-events-none opacity-60")}
          aria-busy={loading}
        >
          <ReportHero report={report} range={range} unit={unit} />
          {report.totals.hours === 0 ? (
            <EmptyPeriod
              previous={shiftSelection(filters.selection, -1, today)}
              today={today}
              allTime={range === null}
              onSelect={setSelection}
            />
          ) : (
            <>
              <TimelineCard report={report} />
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <ProjectsCard report={report} />
                <div className="space-y-6">
                  {report.people.length > 1 && <PeopleCard report={report} />}
                  <StatusCard report={report} />
                  {report.tags.length > 0 && <TagsCard report={report} />}
                </div>
              </div>
              <TasksCard key={query} report={report} />
            </>
          )}
          <Methodology generatedAt={report.generatedAt} />
        </div>
      )}
    </PageBody>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] xl:gap-10">
        <div className="space-y-4 py-2">
          <LoadingSkeleton className="h-3 w-56" />
          <LoadingSkeleton className="h-20 w-72" />
          <LoadingSkeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {REPORT_SOURCES.map((source) => (
              <LoadingSkeleton key={source} className="h-10" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LoadingSkeleton className="col-span-2 h-32 rounded-xl" />
          <LoadingSkeleton className="h-32 rounded-xl" />
          <LoadingSkeleton className="h-32 rounded-xl" />
        </div>
      </div>
      <LoadingSkeleton className="h-80 rounded-xl" />
    </div>
  )
}

// --- Hero: liczba godzin i to, skąd się wzięły ---------------------------------

function ReportHero({ report, range, unit }: { report: ReportResponse; range: DateRange | null; unit: PeriodUnit | null }) {
  const { totals } = report
  const hours = useCountUp(totals.hours, 2)
  const estimateShare = totals.hours > 0 ? totals.bySource.estimate / totals.hours : 0
  const planPercent =
    totals.estimatedHours > 0 ? Math.round((totals.estimatedTasksReportedHours / totals.estimatedHours) * 100) : null

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] xl:gap-10">
      <div className="glass-rise flex min-w-0 flex-col justify-end py-2" style={rise(0)}>
        <p className="kicker text-primary">
          Raport czasu — {range ? rangeText(range) : "cały okres"}
        </p>
        <h2 className="mt-3 flex items-baseline gap-3 font-display leading-[0.85] font-light tracking-tight">
          <span className="text-6xl sm:text-7xl md:text-8xl">{formatNumber(hours)}</span>
          <span className="display-italic text-3xl text-muted-foreground md:text-4xl">h</span>
        </h2>
        <ComparisonLine report={report} unit={unit} />

        {totals.hours > 0 && (
          <div className="mt-8">
            <span className="kicker text-muted-foreground">Skąd są te godziny</span>
            <SourceBar className="mt-3 h-3" animate bySource={totals.bySource} total={totals.hours} />
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {REPORT_SOURCES.map((source) => (
                <li key={source} className={cn("min-w-0", totals.bySource[source] === 0 && "opacity-50")} title={SOURCE_DESCRIPTIONS[source]}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <SourceSwatch source={source} />
                    <span className="truncate">{SOURCE_LABELS[source]}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-base font-semibold tabular-nums">{formatHours(totals.bySource[source])}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatShare(totals.bySource[source], totals.hours)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {estimateShare >= 0.2 && (
              <p className="mt-5 flex max-w-2xl gap-2 text-[13px] text-pretty text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {formatShare(totals.bySource.estimate, totals.hours)} godzin to estymacje dopisane automatycznie przy
                  zamykaniu zadań bez zaraportowanego czasu — plan, a nie pomiar pracy.
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 content-end gap-3">
        <Figure
          index="01"
          label="Zadania z czasem"
          value={totals.tasks}
          hint={`${totals.closedTasks} zamkniętych · ${totals.people} ${plural(totals.people, "osoba", "osoby", "osób")}`}
          icon={ListChecks}
          step={1}
          className="col-span-2"
        >
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Zamknięte zadania"
            aria-valuemin={0}
            aria-valuemax={totals.tasks}
            aria-valuenow={totals.closedTasks}
          >
            <div
              className="report-grow-x h-full rounded-full bg-primary"
              style={{ width: `${totals.tasks ? (totals.closedTasks / totals.tasks) * 100 : 0}%` }}
            />
          </div>
        </Figure>
        <Figure
          index="02"
          label="Aktywne dni"
          value={totals.activeDays}
          hint={totals.activeDays ? `śr. ${formatHours(totals.hours / totals.activeDays)} dziennie` : "brak wpisów"}
          icon={Clock}
          step={2}
        />
        <Figure
          index="03"
          label="Raport / plan"
          value={planPercent}
          suffix="%"
          hint={
            planPercent === null
              ? "brak estymacji"
              : `${formatNumber(totals.estimatedTasksReportedHours)} z ${formatHours(totals.estimatedHours)}`
          }
          title={`Cały czas z kart ${totals.estimatedTasks} ${plural(totals.estimatedTasks, "zadania", "zadań", "zadań")} z estymacją, wobec sumy estymacji`}
          icon={CircleCheck}
          step={3}
        />
      </div>
    </section>
  )
}

function ComparisonLine({ report, unit }: { report: ReportResponse; unit: PeriodUnit | null }) {
  const previous = report.totals.previousHours
  const compare = report.compareRange
  if (previous === null || !compare) return <p className="mt-4 text-sm text-muted-foreground">Wszystkie zaraportowane godziny</p>

  const diff = Math.round((report.totals.hours - previous) * 100) / 100
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus
  const change =
    previous > 0
      ? `${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.round((Math.abs(diff) / previous) * 100)}%`
      : `${diff > 0 ? "+" : ""}${formatHours(diff)}`
  const label = isWholeUnit(compare, unit) ? periodLabel(compare, unit) : rangeText(compare)

  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground tabular-nums">
        <Icon className="size-3.5" />
        {change}
      </span>
      <span>
        względem: {label} · {formatHours(previous)}
      </span>
    </p>
  )
}

function Figure({
  index,
  label,
  value,
  suffix,
  hint,
  title,
  icon: Icon,
  step,
  className,
  children,
}: {
  index: string
  label: string
  value: number | null
  suffix?: string
  hint: string
  title?: string
  icon: React.ComponentType<{ className?: string }>
  step: number
  className?: string
  children?: React.ReactNode
}) {
  const shown = useCountUp(value ?? 0)

  return (
    <Card className={cn("glass-rise gap-0 py-0", className)} style={rise(step)} title={title}>
      <CardContent className="flex h-full flex-col px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="kicker truncate text-muted-foreground">
            <span className="text-foreground/60">{index}</span> — {label}
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[var(--glass-edge)]">
            <Icon className="size-3.5" />
          </span>
        </div>
        <div className="mt-auto pt-5 font-display text-5xl leading-[0.85] font-light tracking-tight">
          {value === null ? "—" : shown}
          {value !== null && suffix && <span className="ml-1 text-2xl text-muted-foreground">{suffix}</span>}
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>
        {children}
      </CardContent>
    </Card>
  )
}

function EmptyPeriod({
  previous,
  today,
  allTime,
  onSelect,
}: {
  previous: PeriodSelection | null
  today: DayKey
  allTime: boolean
  onSelect: (selection: PeriodSelection) => void
}) {
  return (
    <Card className="glass-rise items-center gap-3 py-14 text-center" style={rise(4)}>
      <Clock className="size-6 text-muted-foreground/60" />
      <div>
        <p className="text-sm font-medium">Brak zaraportowanego czasu w tym okresie</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Ani wpisów czasu, ani podzadań z czasem dla wybranych filtrów.</p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {previous && (
          <Button variant="outline" size="sm" onClick={() => onSelect(previous)}>
            Pokaż: {periodLabel(selectionRange(previous, today), selectionUnit(previous))}
          </Button>
        )}
        {!allTime && (
          <Button variant="ghost" size="sm" onClick={() => onSelect({ kind: "preset", preset: "all" })}>
            Cały okres
          </Button>
        )}
      </div>
    </Card>
  )
}

// --- Oś czasu ---------------------------------------------------------------------

function TimelineCard({ report }: { report: ReportResponse }) {
  const [view, setView] = useState<"chart" | "table">("chart")
  const present = REPORT_SOURCES.filter((source) => report.totals.bySource[source] > 0)
  const cadence = { day: "Dziennie", week: "Tygodniowo, od poniedziałku", month: "Miesięcznie" }[report.granularity]

  return (
    <Card className="glass-rise" style={rise(4)}>
      <CardHeader>
        <CardTitle>
          <BarChart3 />
          Godziny w czasie
        </CardTitle>
        <CardDescription>
          {cadence}
          {report.timelineRange && ` · ${rangeText(report.timelineRange)}`}
        </CardDescription>
        <CardAction>
          <div className="flex rounded-md bg-muted p-0.5" role="group" aria-label="Widok">
            {(["chart", "table"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
                  view === option && "bg-background text-foreground shadow-xs"
                )}
              >
                {option === "chart" ? "Wykres" : "Tabela"}
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {view === "chart" && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legenda">
            {present.map((source) => (
              <li key={source} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SourceSwatch source={source} />
                {SOURCE_LABELS[source]}
              </li>
            ))}
          </ul>
        )}
        <HoursTimeline buckets={report.timeline} granularity={report.granularity} view={view} />
      </CardContent>
    </Card>
  )
}

// --- Rozbicia -------------------------------------------------------------------------

function ProjectsCard({ report }: { report: ReportResponse }) {
  const max = Math.max(0, ...report.projects.map((project) => project.hours))

  return (
    <Card className="glass-rise" style={rise(5)}>
      <CardHeader>
        <CardTitle>
          <FolderKanban />
          Projekty
        </CardTitle>
        <CardDescription>Godziny w okresie; „na tablicy” to suma z kart wszystkich zadań projektu</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="-mx-2 divide-y divide-border">
          {report.projects.map((project, index) => (
            <li key={project.id ?? "none"} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 px-2 py-3">
              <span className="pt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                  {project.id ? (
                    <Link href={projectPath({ id: project.id, slug: project.slug })} className="truncate text-[13px] font-medium hover:underline">
                      {project.name}
                    </Link>
                  ) : (
                    <span className="truncate text-[13px] font-medium">{project.name}</span>
                  )}
                  {project.archived && (
                    <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[10px] font-normal">
                      archiwum
                    </Badge>
                  )}
                </div>
                <SourceBar className="mt-2.5" bySource={project.bySource} total={project.hours} scale={max} />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {project.tasks} {plural(project.tasks, "zadanie", "zadania", "zadań")} · na tablicy {formatHours(project.boardHours)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums">{formatHours(project.hours)}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                  {formatShare(project.hours, report.totals.hours)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function PeopleCard({ report }: { report: ReportResponse }) {
  const max = Math.max(0, ...report.people.map((person) => person.hours))

  return (
    <Card className="glass-rise" style={rise(6)}>
      <CardHeader>
        <CardTitle>
          <Users />
          Osoby
        </CardTitle>
        <CardDescription>Podzadania liczymy osobie przypisanej do zadania</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {report.people.map((person) => (
            <li key={person.id ?? "none"} className="flex items-center gap-3">
              <Avatar className="size-7">
                <AvatarImage src={person.avatarUrl || ""} alt="" />
                <AvatarFallback className="text-[11px]">{person.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-medium">{person.name}</span>
                  <span className="text-[13px] font-semibold tabular-nums">{formatHours(person.hours)}</span>
                </div>
                <SourceBar className="mt-1.5" bySource={person.bySource} total={person.hours} scale={max} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function StatusCard({ report }: { report: ReportResponse }) {
  return (
    <Card className="glass-rise" style={rise(7)}>
      <CardHeader>
        <CardTitle>
          <ListChecks />
          Gdzie są teraz te zadania
        </CardTitle>
        <CardDescription>
          {report.totals.closedTasks} z {report.totals.tasks} zamkniętych (Done lub Archive)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {report.statuses.map((status) => (
            <li key={status.id ?? "none"} className="flex items-center gap-2.5 text-[13px]">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="min-w-0 flex-1 truncate">{status.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {status.tasks} {plural(status.tasks, "zadanie", "zadania", "zadań")}
              </span>
              <span className="w-16 text-right font-medium tabular-nums">{formatHours(status.hours)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function TagsCard({ report }: { report: ReportResponse }) {
  return (
    <Card className="glass-rise" style={rise(8)}>
      <CardHeader>
        <CardTitle>Tagi</CardTitle>
        <CardDescription>Zadanie z kilkoma tagami liczy się przy każdym z nich</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {report.tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs">
              <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
              <span className="font-medium tabular-nums">{formatHours(tag.hours)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// --- Zadania ----------------------------------------------------------------------------

type TaskSort = "hours" | "total" | "estimate"

function TasksCard({ report }: { report: ReportResponse }) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<TaskSort>("hours")
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const matching = needle
      ? report.tasks.filter((task) => `${task.key ?? ""} ${task.title} ${task.project.name}`.toLowerCase().includes(needle))
      : report.tasks
    const value = (task: ReportResponse["tasks"][number]) =>
      sort === "hours" ? task.hours : sort === "total" ? task.totalHours : task.estimatedHours ?? -1
    return [...matching].sort((a, b) => value(b) - value(a))
  }, [report.tasks, search, sort])
  const visible = expanded ? rows : rows.slice(0, TASKS_PREVIEW)
  const maxHours = Math.max(0, ...report.tasks.map((task) => task.hours))

  const sortHeader = (key: TaskSort, label: string, hint?: string) => (
    <TableHead className="text-right" aria-sort={sort === key ? "descending" : "none"} title={hint}>
      <button
        type="button"
        onClick={() => setSort(key)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", sort === key && "text-foreground")}
      >
        {label}
        {sort === key && <ArrowDown className="size-3" />}
      </button>
    </TableHead>
  )

  return (
    <Card className="glass-rise" style={rise(9)}>
      <CardHeader>
        <CardTitle>
          <ListChecks />
          Zadania
        </CardTitle>
        <CardDescription>
          {report.tasks.length} {plural(report.tasks.length, "zadanie", "zadania", "zadań")} z czasem w okresie · kolumna
          „Na karcie” pokazuje to samo co karta zadania na tablicy
        </CardDescription>
        <CardAction>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Szukaj zadania"
              aria-label="Szukaj zadania"
              className="h-8 w-40 pl-8 text-[13px] sm:w-56"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zadanie</TableHead>
              <TableHead className="max-md:hidden">Projekt</TableHead>
              <TableHead className="max-sm:hidden">Status</TableHead>
              <TableHead className="max-lg:hidden">Osoba</TableHead>
              {sortHeader("hours", "W okresie")}
              {sortHeader("total", "Na karcie", "Cały zaraportowany czas zadania — wszystkie okresy i osoby")}
              {sortHeader("estimate", "Plan")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="max-w-[18rem] whitespace-normal">
                  <div className="flex min-w-0 items-baseline gap-2">
                    {task.key && <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{task.key}</span>}
                    <span className="truncate text-[13px] font-medium" title={task.title}>
                      {task.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground md:hidden">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                    <span className="truncate">{task.project.name}</span>
                  </div>
                </TableCell>
                <TableCell className="max-md:hidden">
                  <div className="flex max-w-40 items-center gap-1.5 text-[13px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: task.project.color }} />
                    {task.project.id ? (
                      <Link href={projectPath({ id: task.project.id, slug: task.project.slug })} className="truncate hover:underline">
                        {task.project.name}
                      </Link>
                    ) : (
                      <span className="truncate">{task.project.name}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-sm:hidden">
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: task.status?.color ?? "#6B7280" }} />
                    <span className="truncate">{task.status?.name ?? "Bez statusu"}</span>
                    {task.archived && <span className="text-[11px] text-muted-foreground">· arch.</span>}
                  </div>
                </TableCell>
                <TableCell className="max-lg:hidden">
                  {task.assignee ? (
                    <div className="flex items-center gap-2 text-[13px]">
                      <Avatar className="size-5">
                        <AvatarImage src={task.assignee.avatarUrl || ""} alt="" />
                        <AvatarFallback className="text-[10px]">{task.assignee.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-28 truncate">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="w-28 text-right">
                  <div className="text-[13px] font-semibold tabular-nums">{formatNumber(task.hours)}</div>
                  <SourceBar className="mt-1 ml-auto h-1 w-16" bySource={task.bySource} total={task.hours} scale={maxHours} />
                </TableCell>
                <TableCell className="text-right text-[13px] tabular-nums">{formatNumber(task.totalHours)}</TableCell>
                <TableCell className="text-right text-[13px] text-muted-foreground tabular-nums">
                  {task.estimatedHours ? formatNumber(task.estimatedHours) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-[13px] text-muted-foreground">
                  Żadne zadanie nie pasuje do „{search}”
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {rows.length > TASKS_PREVIEW && (
          <div className="mt-3 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Pokaż mniej" : `Pokaż wszystkie (${rows.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Metodologia ----------------------------------------------------------------------

function Methodology({ generatedAt }: { generatedAt: string }) {
  const points = [
    "Godziny to wpisy czasu i czas podzadań — ta sama suma, którą pokazuje karta zadania („zaraportowane / planowane”) i statystyki kolumn na tablicy.",
    "Wpis czasu liczy się w dniu, którego dotyczy. Podzadanie nie ma własnej daty ani autora, więc liczy się w dniu utworzenia i osobie przypisanej do zadania.",
    "Raport obejmuje zadania i projekty zarchiwizowane, pomija usunięte. Zamknięte zadanie to takie w statusie Done lub Archive.",
    "„Szacunek (auto)” to estymacja dopisana automatycznie, gdy zadanie zamknięto bez zaraportowanego czasu; „Commity (AI)” — czas commitów oszacowany przy merge requeście.",
  ]

  return (
    <section className="grid gap-6 border-t pt-8 lg:grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)] lg:gap-10">
      <div>
        <p className="kicker text-muted-foreground">Metodologia</p>
        <h3 className="mt-2 font-display text-3xl leading-tight font-light tracking-tight">
          Jak liczymy <span className="display-italic text-primary">godziny</span>
        </h3>
        <p className="mt-3 text-xs text-muted-foreground">Wygenerowano {formatDateTime(generatedAt)}</p>
      </div>
      <ol className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {points.map((point, index) => (
          <li key={index} className="flex gap-3 text-[13px] leading-relaxed text-pretty text-muted-foreground">
            <span className="font-mono text-[11px] leading-relaxed text-foreground/60">{String(index + 1).padStart(2, "0")}</span>
            <span>{point}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
