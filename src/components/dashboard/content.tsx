"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import type { Task, User, TaskStatus } from "@/types"
import type { Session } from "next-auth"
import { usePageHeader } from "@/contexts/header-context"
import { formatTaskDueDateWithRelative, formatCreatedDate } from "@/lib/date-utils"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, CalendarClock, History, Check, CircleDot, AlertTriangle, Sparkles, Plus, CalendarCheck2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PrintTodosDialog } from "./print-todos-dialog"
import { UserReportSummary } from "./user-report-summary"
import { TagsSummary } from "./tags-summary"
import { PageHeader, PageBody } from "./page-header"

const pluralizeTasks = (count: number) =>
  count === 1 ? "zadanie" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "zadania" : "zadań"

interface StatTileProps {
  label: string
  value: number | string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "primary" | "warning" | "danger"
}

const toneClasses: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
}

function StatTile({ label, value, hint, icon: Icon, tone = "default" }: StatTileProps) {
  return (
    <Card className="gap-3 py-4">
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          <span className={cn("flex size-7 items-center justify-center rounded-md", toneClasses[tone])}>
            <Icon className="size-3.5" />
          </span>
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

interface TaskRowProps {
  task: Task
  person?: User
  dateLabel: string
  dateTone?: "default" | "danger" | "primary"
  isDone: boolean
  isCompleting: boolean
  onOpen: () => void
  onMarkDone: (event: React.MouseEvent) => void
}

function TaskRow({ task, person, dateLabel, dateTone = "default", isDone, isCompleting, onOpen, onMarkDone }: TaskRowProps) {
  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/60"
      onClick={onOpen}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: task.project?.color || "var(--primary)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {task.key && <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{task.key}</span>}
          <span className={cn("truncate text-[13px] font-medium", isDone && "text-muted-foreground line-through")}>{task.title}</span>
        </div>
        {task.project && <p className="truncate text-xs text-muted-foreground">{task.project.name}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isDone && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-success/10 hover:text-success focus-visible:opacity-100"
            onClick={onMarkDone}
            disabled={isCompleting}
            title="Oznacz jako zakończone"
            aria-label="Oznacz jako zakończone"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
            dateTone === "danger" && "bg-destructive/10 text-destructive",
            dateTone === "primary" && "bg-primary/10 text-primary",
            dateTone === "default" && "bg-muted text-muted-foreground"
          )}
        >
          {dateLabel}
        </span>
        {person && (
          <Avatar className="size-5">
            <AvatarImage src={person.avatarUrl || ""} alt={person.name} />
            <AvatarFallback className="text-[10px]">{person.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
      <Icon className="size-5 text-muted-foreground/60" />
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  )
}

export function DashboardContent() {
  const { data: session } = useSession() as { data: Session | null }
  const [tasks, setTasks] = useState<Task[]>([])
  const [, setUsers] = useState<User[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [, setSelectedTask] = useState<Task | null>(null)
  const [, setDetailsDialogOpen] = useState(false)

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/user/admin-status')
          if (response.ok) {
            const data = await response.json()
            setIsAdmin(data.isAdmin)
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error checking admin status:', error)
          }
        }
      }
    }
    checkAdminStatus()
  }, [session])

  const firstName = session?.user?.name?.split(" ")[0]
  const todayLabel = new Date().toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })

  usePageHeader(
    <PageHeader
      title={firstName ? `Cześć, ${firstName}` : "Panel"}
      description={`${todayLabel.charAt(0).toUpperCase()}${todayLabel.slice(1)} · ${isAdmin ? "przegląd wszystkich zadań w systemie" : "przegląd Twoich zadań"}`}
      actions={
        <>
          <PrintTodosDialog tasks={tasks} />
          <Button size="sm" asChild>
            <Link href="/dashboard/tasks/new">
              <Plus />
              <span className="hidden sm:inline">Nowe zadanie</span>
            </Link>
          </Button>
        </>
      }
    />,
    [isAdmin, tasks, firstName, todayLabel] // Re-render when admin status or tasks change
  )

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      } else {
        // Only log non-ok responses in development
        if (process.env.NODE_ENV === 'development') {
          console.warn("Failed to fetch tasks:", response.status, response.statusText)
        }
        setTasks([]) // Set empty array on error
      }
    } catch (error) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error fetching tasks:", error instanceof Error ? error.message : error)
      }
      setTasks([]) // Set empty array on error
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error fetching users:", error)
      }
    }
  }

  const fetchTaskStatuses = async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error fetching task statuses:", error)
      }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchTasks(), fetchUsers(), fetchTaskStatuses()])
      setLoading(false)

    }
    fetchData()
  }, [fetchTasks])



  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setDetailsDialogOpen(true)
  }

  const handleMarkDone = async (task: Task, event: React.MouseEvent) => {
    event.stopPropagation()

    const doneStatus = taskStatuses.find(status => status.name === "Done")
    if (!doneStatus) {
      toast.error("Nie znaleziono statusu 'Done'")
      return
    }

    if (task.statusId === doneStatus.id) return
    if (completingTaskIds.has(task.id)) return

    setCompletingTaskIds(prev => new Set(prev).add(task.id))

    const previousStatusId = task.statusId
    setTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, statusId: doneStatus.id } : t)
    )

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: doneStatus.id }),
      })

      if (!response.ok) {
        setTasks(prev =>
          prev.map(t => t.id === task.id ? { ...t, statusId: previousStatusId } : t)
        )
        toast.error("Nie udało się oznaczyć zadania jako zakończone")
      } else {
        toast.success("Zadanie oznaczone jako zakończone")
        // The Slack change-note send is queued server-side by the task PATCH
        // endpoint when it detects the move to Done.
        await fetchTasks()
      }
    } catch (error) {
      setTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, statusId: previousStatusId } : t)
      )
      console.error("Error marking task as done:", error)
      toast.error("Wystąpił błąd podczas oznaczania zadania")
    } finally {
      setCompletingTaskIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }


  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  // Get user's upcoming tasks (due in next 7 days)
  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate || !session?.user?.id) return false

    // For admin, show all upcoming tasks; for user, show only assigned/created tasks
    const hasAccess = isAdmin ||
      task.assignee?.id === session.user.id ||
      task.createdBy?.id === session.user.id

    if (!hasAccess) return false

    const dueDate = new Date(task.dueDate)
    const today = new Date()
    const sevenDaysFromNow = new Date()

    // Normalize dates to compare date-only (not timestamps)
    dueDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    sevenDaysFromNow.setHours(0, 0, 0, 0)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    return dueDate >= today && dueDate <= sevenDaysFromNow
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

  // Get recently updated tasks (updated in last 3 days)
  const recentlyUpdatedTasks = tasks.filter(task => {
    if (!task.createdAt || !session?.user?.id) return false

    // For admin, show all recent tasks; for user, show only assigned/created tasks
    const hasAccess = isAdmin ||
      task.assignee?.id === session.user.id ||
      task.createdBy?.id === session.user.id

    if (!hasAccess) return false

    const updatedDate = new Date(task.createdAt)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    return updatedDate >= threeDaysAgo
  }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 10)

  const isTaskDone = (task: Task) =>
    task.taskStatus?.name === "Done" ||
    (!!task.statusId && taskStatuses.some(s => s.id === task.statusId && s.name === "Done"))

  const myTasks = tasks.filter(task =>
    isAdmin ||
    task.assignee?.id === session?.user?.id ||
    task.createdBy?.id === session?.user?.id
  )
  const openTasks = myTasks.filter(task => !isTaskDone(task))
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const overdueTasks = openTasks.filter(task => task.dueDate && new Date(task.dueDate) < startOfToday)

  return (
    <PageBody className="space-y-8" >
      <div id="dashboard-content" className="space-y-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Otwarte zadania"
            value={openTasks.length}
            hint={isAdmin ? "w całym systemie" : "przypisane lub utworzone przez Ciebie"}
            icon={CircleDot}
            tone="primary"
          />
          <StatTile
            label="Po terminie"
            value={overdueTasks.length}
            hint={overdueTasks.length === 0 ? "wszystko na czas" : "wymagają uwagi"}
            icon={AlertTriangle}
            tone={overdueTasks.length > 0 ? "danger" : "default"}
          />
          <StatTile
            label="Termin w 7 dni"
            value={upcomingTasks.length}
            hint={`${upcomingTasks.length} ${pluralizeTasks(upcomingTasks.length)} do wykonania`}
            icon={CalendarClock}
            tone="warning"
          />
          <StatTile
            label="Nowe (3 dni)"
            value={recentlyUpdatedTasks.length}
            hint="ostatnio dodane zadania"
            icon={Sparkles}
          />
        </div>

        {/* User Report Summary */}
        <UserReportSummary />

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Upcoming Tasks */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>
                <CalendarClock className="size-4 text-muted-foreground" />
                Najbliższe zadania
              </CardTitle>
              <CardDescription>
                {upcomingTasks.length === 0
                  ? "Brak nadchodzących zadań w najbliższych 7 dniach"
                  : `${upcomingTasks.length} ${pluralizeTasks(upcomingTasks.length)} z terminem w ciągu 7 dni`
                }
              </CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
                  <Link href="/dashboard/tasks">Wszystkie</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-3">
              {upcomingTasks.length === 0 ? (
                <div className="px-2">
                  <EmptyState icon={CalendarCheck2} text="Wszystkie zadania są pod kontrolą!" />
                </div>
              ) : (
                <div className="max-h-96 space-y-px overflow-y-auto">
                  {upcomingTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      person={task.assignee}
                      dateLabel={formatTaskDueDateWithRelative(task.dueDate!)}
                      dateTone={new Date(task.dueDate!).toDateString() === new Date().toDateString() ? "primary" : "default"}
                      isDone={isTaskDone(task)}
                      isCompleting={completingTaskIds.has(task.id)}
                      onOpen={() => handleTaskDetails(task)}
                      onMarkDone={(e) => handleMarkDone(task, e)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Updated Tasks */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>
                <History className="size-4 text-muted-foreground" />
                Ostatnio dodane
              </CardTitle>
              <CardDescription>
                {recentlyUpdatedTasks.length === 0
                  ? "Brak aktywności w ostatnich 3 dniach"
                  : `${recentlyUpdatedTasks.length} ${pluralizeTasks(recentlyUpdatedTasks.length)} z ostatnich 3 dni`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3">
              {recentlyUpdatedTasks.length === 0 ? (
                <div className="px-2">
                  <EmptyState icon={Clock} text="Brak ostatnich aktualizacji zadań" />
                </div>
              ) : (
                <div className="max-h-96 space-y-px overflow-y-auto">
                  {recentlyUpdatedTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      person={task.createdBy}
                      dateLabel={formatCreatedDate(task.createdAt!)}
                      isDone={isTaskDone(task)}
                      isCompleting={completingTaskIds.has(task.id)}
                      onOpen={() => handleTaskDetails(task)}
                      onMarkDone={(e) => handleMarkDone(task, e)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tags Summary */}
        <TagsSummary />
      </div>
    </PageBody>
  )
}
