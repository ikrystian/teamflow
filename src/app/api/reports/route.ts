import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { isSystemAdmin } from "@/lib/roles"
import type { AppSession as Session } from "@/lib/auth/types"
import { type DateRange, daysBetween, dayKeyInZone, isDayKey, isValidTimeZone } from "@/lib/reports/period"
import { type TimeReportInput, buildTimeCsv, buildTimeReport } from "@/lib/reports/time-report"

const DEFAULT_TIME_ZONE = "Europe/Warsaw"
const MAX_RANGE_DAYS = 3660

function parseRange(from: string | null, to: string | null): DateRange | null | "invalid" {
  if (!from && !to) return null
  if (!isDayKey(from) || !isDayKey(to) || from > to || daysBetween(from, to) > MAX_RANGE_DAYS) return "invalid"
  return { from, to }
}

// Raport czasu: godziny z wpisów czasu i podzadań (jak na kartach zadań) w wybranym
// okresie. Okres przychodzi jako daty kalendarzowe (`from`/`to`, włącznie) wraz ze
// strefą użytkownika (`tz`); `format=csv` zwraca pojedyncze wpisy z okresu.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession() as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const tzParam = searchParams.get("tz")
    const timeZone = tzParam && isValidTimeZone(tzParam) ? tzParam : DEFAULT_TIME_ZONE
    const range = parseRange(searchParams.get("from"), searchParams.get("to"))
    const compareRange = parseRange(searchParams.get("compareFrom"), searchParams.get("compareTo"))
    const projectParam = searchParams.get("projectId")
    const projectId = projectParam && projectParam !== "all" ? projectParam : null
    const personParam = searchParams.get("personId")
    const personId = personParam && personParam !== "all" ? personParam : null

    if (range === "invalid" || compareRange === "invalid") {
      return NextResponse.json({ error: "Nieprawidłowy zakres dat" }, { status: 400 })
    }

    // Administrator widzi wszystkie projekty, pozostali — te, których są członkami
    // lub autorami (jak lista projektów). Zarchiwizowane projekty zostają w raporcie,
    // bo ich godziny to wciąż przepracowany czas.
    const admin = isSystemAdmin(session.user.role, session.user.email)
    const projects = await prisma.project.findMany({
      where: admin ? {} : { OR: [{ createdById: userId }, { members: { some: { userId } } }] },
      select: { id: true, name: true, color: true, slug: true, archived: true },
      orderBy: [{ archived: "asc" }, { sortOrder: "asc" }],
    })

    if (projectId && !projects.some((project) => project.id === projectId)) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 })
    }

    // Bez `include: { project }` — na MongoDB relacja dociąga cały dokument projektu
    // (z obrazkiem base64) do każdego zadania. Projekty łączymy w pamięci.
    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: projectId
          ? [{ projectId }]
          : [
              { projectId: { in: projects.map((project) => project.id) } },
              admin
                ? { projectId: null }
                : { projectId: null, OR: [{ assigneeId: userId }, { createdById: userId }] },
            ],
      },
      select: {
        id: true,
        key: true,
        title: true,
        projectId: true,
        assigneeId: true,
        createdById: true,
        statusId: true,
        estimatedHours: true,
        archived: true,
      },
    })
    const taskIds = tasks.map((task) => task.id)

    const [entries, subtasks, statuses, taskTags] = await Promise.all([
      prisma.timeEntry.findMany({
        where: { taskId: { in: taskIds } },
        select: { id: true, taskId: true, userId: true, hours: true, date: true, description: true },
      }),
      prisma.todo.findMany({
        where: { taskId: { in: taskIds }, timeSpent: { not: null } },
        select: { id: true, taskId: true, title: true, timeSpent: true, createdAt: true },
      }),
      prisma.taskStatus.findMany({
        select: { id: true, name: true, color: true, order: true },
        orderBy: { order: "asc" },
      }),
      prisma.taskTag.findMany({
        where: { taskId: { in: taskIds } },
        select: { taskId: true, tag: { select: { id: true, name: true, color: true } } },
      }),
    ])

    const personIds = new Set<string>(entries.map((entry) => entry.userId))
    for (const task of tasks) {
      if (task.assigneeId) personIds.add(task.assigneeId)
      if (task.createdById) personIds.add(task.createdById)
    }
    if (personId) personIds.add(personId)
    const people = await prisma.user.findMany({
      where: { id: { in: [...personIds] } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    })

    const input: TimeReportInput = {
      tasks,
      entries,
      subtasks,
      projects,
      people,
      statuses,
      taskTags,
      range,
      compareRange: range ? compareRange : null,
      personId,
      timeZone,
      today: dayKeyInZone(new Date(), timeZone),
    }

    if (searchParams.get("format") === "csv") {
      const suffix = range ? (range.from === range.to ? range.from : `${range.from}_${range.to}`) : "caly-okres"
      return new NextResponse(`﻿${buildTimeCsv(input)}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="raport-czasu-${suffix}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    return NextResponse.json({
      ...buildTimeReport(input),
      projectOptions: projects,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
