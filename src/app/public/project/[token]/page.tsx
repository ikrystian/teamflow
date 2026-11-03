import { notFound } from "next/navigation"
import type { Metadata } from "next"
import * as LucideIcons from "lucide-react"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { GlassAtmosphere } from "@/components/layout/glass-atmosphere"
import { NexusLogo } from "@/components/ui/nexus-logo"
import { getPriorityDisplayName } from "@/lib/task-format-utils"
import { isArchiveStatusName, isDoneStatusName } from "@/lib/task-status-helpers"
import {
  Calendar,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Share2,
  User,
} from "lucide-react"

export const dynamic = "force-dynamic"

function ProjectIcon({ iconName, color, className = "w-5 h-5" }: {
  iconName?: string | null,
  color?: string,
  className?: string
}) {
  const IconComponent = iconName
    ? (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[iconName]
    : undefined
  const Icon = IconComponent ?? LucideIcons.Folder

  return <Icon className={className} style={{ color: color || '#3B82F6' }} />
}

// Fetch a project purely by its public share token. No session is required —
// this is the read-only board shared with people who don't have an account.
async function getSharedProject(token: string) {
  if (!token) return null

  return prisma.project.findFirst({
    where: { shareToken: token },
    select: {
      name: true,
      description: true,
      color: true,
      icon: true,
      archived: true,
      updatedAt: true,
      tasks: {
        where: { deletedAt: null, archived: false },
        select: {
          id: true,
          key: true,
          title: true,
          priority: true,
          dueDate: true,
          statusId: true,
          assignee: { select: { name: true } },
          todos: { select: { isCompleted: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const project = await getSharedProject(token)

  if (!project) {
    return {
      title: "Projekt nie znaleziony – Nexus",
      robots: { index: false, follow: false },
    }
  }

  const description = `Tablica zadań projektu ${project.name} (${project.tasks.length} zadań) – widok tylko do odczytu.`

  return {
    metadataBase: new URL(env.APP_URL),
    title: `${project.name} – Nexus`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: project.name,
      description,
      type: "website",
      siteName: "Nexus",
      url: new URL(`/public/project/${token}`, env.APP_URL).toString(),
      locale: "pl_PL",
    },
  }
}

const formatDate = (date: Date | null) =>
  date
    ? new Date(date).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
      })
    : null

const priorityClass = (priority: string) =>
  priority === "HIGH" || priority === "URGENT"
    ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
    : priority === "MEDIUM"
    ? "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400"
    : "border-neutral-500/20 bg-neutral-50/5 text-neutral-600 dark:text-neutral-400"

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const project = await getSharedProject(token)

  if (!project) {
    notFound()
  }

  const statuses = (await prisma.taskStatus.findMany({ orderBy: { order: "asc" } }))
    .filter((status) => !isArchiveStatusName(status.name))

  const tasks = project.tasks
  const columns = [
    ...statuses.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color,
      tasks: tasks.filter((task) => task.statusId === status.id),
    })),
    {
      id: "none",
      name: "Bez statusu",
      color: "#6B7280",
      tasks: tasks.filter((task) => !task.statusId),
    },
  ].filter((column) => column.id !== "none" || column.tasks.length > 0)

  const visibleTasks = columns.flatMap((column) => column.tasks)
  const doneStatusIds = new Set(statuses.filter((s) => isDoneStatusName(s.name)).map((s) => s.id))
  const completedCount = visibleTasks.filter((task) => task.statusId && doneStatusIds.has(task.statusId)).length
  const now = new Date()
  const overdueCount = visibleTasks.filter(
    (task) => task.dueDate && task.dueDate < now && !(task.statusId && doneStatusIds.has(task.statusId))
  ).length

  const projectColor = project.color || "#3B82F6"

  const stats = [
    { label: "Wszystkie zadania", value: visibleTasks.length, icon: LayoutGrid, className: "" },
    { label: "Ukończone", value: completedCount, icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Przeterminowane", value: overdueCount, icon: Clock, className: overdueCount > 0 ? "text-red-600 dark:text-red-400" : "" },
  ]

  return (
    <div className="min-h-screen text-neutral-800 dark:text-neutral-100 font-sans antialiased relative overflow-hidden pb-16">
      <GlassAtmosphere />

      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] opacity-20 dark:opacity-15 blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle 450px at 50% -50px, ${projectColor}, transparent)`
        }}
      />

      <nav className="glass-surface sticky top-0 z-40 w-full border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <NexusLogo size={28} className="size-7" />
            <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-50">Nexus</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: projectColor }} />
              Tablica projektu
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-900/50 px-3 py-1.5 rounded-xl border border-neutral-200/30 dark:border-neutral-800/30 shadow-sm">
            <Share2 className="h-3.5 w-3.5" style={{ color: projectColor }} />
            <span>Widok publiczny</span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 relative z-10">
        {/* Hero */}
        <div className="pb-6 mb-8 border-b border-neutral-200/40 dark:border-neutral-800/40 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <ProjectIcon iconName={project.icon} color={projectColor} className="h-7 w-7 shrink-0" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
              {project.name}
            </h1>
            {project.archived && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider border-neutral-500/20 text-neutral-500">
                Zarchiwizowany
              </span>
            )}
          </div>
          {project.description && (
            <p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, className }) => (
            <div key={label} className="glass-surface rounded-2xl border p-5 flex items-center gap-3">
              <Icon className="h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{label}</p>
                <p className={`text-2xl font-bold ${className}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {columns.map((column) => (
            <section
              key={column.id}
              className="glass-surface rounded-2xl border p-3 w-72 shrink-0 flex flex-col max-h-[70vh]"
            >
              <header className="flex items-center justify-between px-1.5 pb-3">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                  {column.name}
                </h2>
                <span className="text-[11px] font-semibold text-neutral-400">{column.tasks.length}</span>
              </header>

              <div className="space-y-2 overflow-y-auto">
                {column.tasks.length === 0 && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-6">Brak zadań</p>
                )}
                {column.tasks.map((task) => {
                  const completedTodos = task.todos.filter((t) => t.isCompleted).length
                  const isOverdue = task.dueDate && task.dueDate < now && !doneStatusIds.has(column.id)

                  return (
                    <article
                      key={task.id}
                      className="rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/40 p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {task.key && (
                          <span className="font-mono text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                            {task.key}
                          </span>
                        )}
                        {task.priority && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${priorityClass(task.priority)}`}>
                            {getPriorityDisplayName(task.priority)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 leading-snug break-words">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <span className="flex items-center gap-1 min-w-0">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[110px]">{task.assignee?.name || "Nieprzypisane"}</span>
                        </span>
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.todos.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {completedTodos}/{task.todos.length}
                          </span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800/30 text-xs text-neutral-400 dark:text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>Ostatnia aktualizacja: {new Date(project.updatedAt).toLocaleDateString("pl-PL")}</p>
          <div className="flex items-center gap-2 text-[10px] bg-neutral-100/50 dark:bg-neutral-900/50 px-2.5 py-1 rounded-full border border-neutral-200/40 dark:border-neutral-800/40 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Widok tylko do odczytu</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
