// UnifiedKanbanBoard.tsx – combines project‑specific and global task kanban boards
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MoreHorizontal, Plus, AlertCircle, Trash2, X, Check, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"
import type { Task, TaskStatus } from "@/types"
import type { Session } from "next-auth"
import { toast } from "sonner"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import { getPriorityColor, getPriorityShortName, getPriorityDisplayName, formatProjectDisplay, formatEstimatedHours } from "@/lib/task-format-utils"

/** Props for the unified board.
 *  - `projectId` is optional; when provided the board works in the project context (no project selector).
 *  - `projects` & `session` are optional; when provided the quick‑add task shows a project selector.
 */
interface UnifiedKanbanBoardProps {
  projectId?: string
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onTaskDelete: (task: Task) => void
  canEditTask: (task: Task) => boolean
  onCreateTask?: () => void // used only in project view for extra detailed task creation
  projects?: Array<{ id: string; name: string }>
  session?: Session | null
  hideProjectSelect?: boolean
  taskStatuses: TaskStatus[]
}

/** A sortable card representing a single task. */
function SortableTaskCard({
  task,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  isUpdating = false,
  onMarkComplete,
  taskStatuses,
}: {
  task: Task
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: boolean
  isUpdating?: boolean
  onMarkComplete?: (task: Task) => void
  taskStatuses: TaskStatus[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    return draggable({
      element,
      getInitialData: () => ({ type: "task", taskId: task.id, statusId: task.statusId }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [task.id, task.statusId])

  const style = { opacity: isDragging ? 0.5 : isUpdating ? 0.8 : 1 }

  const isTaskCompleted = () => {
    const done = taskStatuses.find((s) => s.name === "Done")
    return done && task.statusId === done.id
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    if (isTaskCompleted()) return false
    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    const overdueDate = new Date(due)
    overdueDate.setDate(due.getDate() + 1)
    return today >= overdueDate
  }

  return (
    <div ref={ref} style={style} className="touch-none cursor-grab active:cursor-grabbing">
      <Card
        className={`mb-2 cursor-pointer hover:shadow-md transition-all border-l-4 ${
          isUpdating
            ? "border-l-yellow-500 bg-yellow-50/50"
            : isTaskCompleted()
            ? "bg-green-50/80 border-l-green-500"
            : ""
        }`}
        style={{
          borderLeftColor: isUpdating
            ? undefined
            : isTaskCompleted()
            ? "#10B981"
            : task.project?.color || "#3B82F6",
          paddingTop: 5,
          paddingBottom: 0,
        }}
      >
        <CardContent
          className="py-2 px-3 select-none"
          onClick={() => onViewDetails(task)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="font-medium text-sm leading-tight cursor-pointer hover:text-primary">
                    {task.title}
                  </h4>
                </div>
              </div>
              {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-yellow-600 flex-shrink-0" />}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { onViewDetails(task); e.stopPropagation() }}>
                  Szczegóły
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    {!isTaskCompleted() && (
                      <DropdownMenuItem onClick={(e) => { onMarkComplete && onMarkComplete(task); e.stopPropagation() }}>
                        <Check className="mr-2 h-4 w-4" />
                        Oznacz jako zakończone
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => { onTimeTracking(task); e.stopPropagation() }}>
                      <Clock className="mr-2 h-4 w-4" />
                      Loguj czas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task) }} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Usuń
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {task.priority && (
                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`} title={getPriorityDisplayName(task.priority)}>
                  {getPriorityShortName(task.priority)}
                </Badge>
              )}
              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate) ? "text-red-600" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" />
                  {formatTaskDueDateWithRelative(task.dueDate)}
                  {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3 text-red-600" />}
                </div>
              )}
              {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatEstimatedHours(task.estimatedHours)}
                </div>
              )}
              <div className="flex-1" />
              {task.assignee && (
                <div className="flex items-center justify-end">
                  <ClickableAvatar
                    userId={task.assignee.id}
                    avatarUrl={task.assignee.avatarUrl}
                    name={task.assignee.name}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Quick‑add form that optionally shows a project selector. */
function QuickAddTask({
  status,
  onTaskCreated,
  projects = [],
  session,
  hideProjectSelect = false,
  projectId,
}: {
  status: TaskStatus
  onTaskCreated: () => void
  projects?: Array<{ id: string; name: string }>
  session?: Session | null
  hideProjectSelect?: boolean
  projectId?: string
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // When a specific projectId is supplied we fix the selector to that project.
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId)
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projectId, projects, selectedProjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          projectId: selectedProjectId && selectedProjectId !== "no-project" ? selectedProjectId : undefined,
          statusId: status.id,
          assigneeId: (session?.user as { id: string })?.id,
        }),
      })
      if (response.ok) {
        setTitle("")
        setIsAdding(false)
        toast.success("Zadanie zostało utworzone")
        window.dispatchEvent(new CustomEvent('task-created'))
        onTaskCreated()
      } else {
        const data = await response.json()
        const msg = data.error || "Nie udało się utworzyć zadania"
        setError(msg)
        toast.error(msg)
      }
    } catch (err) {
      console.error("Error creating task:", err)
      const msg = "Wystąpił błąd podczas tworzenia zadania"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setTitle("")
    setIsAdding(false)
    setError("")
  }

  if (!isAdding) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="w-full justify-start text-muted-foreground hover:text-foreground">
        <Plus className="mr-2 h-4 w-4" />
        Dodaj zadanie
      </Button>
    )
  }

  return (
    <Card className="mb-2 p-2">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wpisz nazwę zadania..."
            autoFocus
            className="text-xs h-7"
            disabled={loading}
          />
          {!hideProjectSelect && projects.length > 0 && (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={loading}>
              <SelectTrigger className="mb-2">
                <SelectValue placeholder="Wybierz projekt (opcjonalne)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">
                  <span className="text-muted-foreground">Brak projektu</span>
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatProjectDisplay(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {error && (
            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded border">{error}</div>
          )}
          <div className="flex gap-2 items-center">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={loading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/** Column wrapper – receives tasks already filtered for the given status. */
function KanbanColumn({
  status,
  tasks,
  onEdit,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  onTaskCreated,
  updatingTasks,
  projects,
  session,
  hideProjectSelect = false,
  onMarkComplete,
  taskStatuses,
  projectId,
}: {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: (task: Task) => boolean
  onTaskCreated: () => void
  updatingTasks: Set<string>
  projects?: Array<{ id: string; name: string }>
  session?: Session | null
  hideProjectSelect?: boolean
  onMarkComplete?: (task: Task) => void
  taskStatuses: TaskStatus[]
  projectId?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === "task",
      getData: () => ({ type: "column", statusId: status.id }),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    })
  }, [status.id])

  return (
    <div className="flex-shrink-0 w-80">
      <div className={`bg-muted/30 rounded-lg p-4 h-full transition-colors ${isOver ? 'bg-primary/10 ring-2 ring-primary/20' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{status.name}</h3>
            <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
          </div>
        </div>
        <div ref={ref} className="space-y-2 min-h-[400px]">
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <div className="mb-2">Brak zadań</div>
              <div className="text-xs">Przeciągnij zadanie tutaj lub dodaj nowe</div>
            </div>
          )}
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onTimeTracking={onTimeTracking}
              onViewDetails={onViewDetails}
              onDelete={onDelete}
              canEdit={canEdit(task)}
              isUpdating={updatingTasks.has(task.id)}
              onMarkComplete={onMarkComplete}
              taskStatuses={taskStatuses}
            />
          ))}
          {/* Show quick‑add only in the default column */}
          {status.isDefault && (
            <QuickAddTask
              status={status}
              onTaskCreated={onTaskCreated}
              projects={projects || []}
              session={session}
              hideProjectSelect={hideProjectSelect}
              projectId={projectId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/** Unified Kanban board component. */
export function UnifiedKanbanBoard({
  projectId,
  tasks,
  onTaskUpdated,
  onTaskEdit,
  onTimeTracking,
  onTaskDelete,
  canEditTask,
  onCreateTask,
  projects = [],
  session,
  hideProjectSelect = false,
  taskStatuses,
}: UnifiedKanbanBoardProps) {
  const { data: sessionData } = useSession()
  const effectiveSession = session ?? sessionData
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const displayTasks = optimisticTasks
  const displayTasksRef = useRef<Task[]>(displayTasks)
  displayTasksRef.current = displayTasks
  const taskStatusesRef = useRef<TaskStatus[]>(taskStatuses)
  taskStatusesRef.current = taskStatuses

  // Sync when prop tasks change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  const getTasksByStatus = (status: TaskStatus) =>
    displayTasks.filter((t) => t.statusId === status.id)

  const handleTaskDrop = async (taskId: string, newStatusId: string) => {
    const newStatus = taskStatusesRef.current.find((s) => s.id === newStatusId)
    if (!newStatus) return
    const task = displayTasksRef.current.find((t) => t.id === taskId)
    if (!task || task.statusId === newStatus.id) return
    setUpdatingTasks((prev) => new Set(prev).add(taskId))
    setOptimisticTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, statusId: newStatus.id } : t))
    )
    toast.loading(`Przenoszenie zadania do "${newStatus.name}"...`, { id: `move-${taskId}` })
    try {
      const resp = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: newStatus.id }),
      })
      if (!resp.ok) throw new Error("bad response")
      toast.success(`Zadanie przeniesione do "${newStatus.name}"`, { id: `move-${taskId}` })
      onTaskUpdated()
    } catch (e) {
      console.error(e)
      // rollback
      setOptimisticTasks((prev) =>
        prev.map((t) => (t.id === taskId ? task : t))
      )
      toast.error("Nie udało się przenieść zadania", { id: `move-${taskId}` })
    } finally {
      setUpdatingTasks((prev) => {
        const s = new Set(prev)
        s.delete(taskId)
        return s
      })
    }
  }

  const handleMarkComplete = async (task: Task) => {
    const done = taskStatuses.find((s) => s.name === "Done")
    if (!done) return toast.error("Nie znaleziono statusu 'Done'")
    if (task.statusId === done.id) return
    setUpdatingTasks((prev) => new Set(prev).add(task.id))
    const original = task
    setOptimisticTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, statusId: done.id } : t))
    )
    toast.loading("Oznaczanie zadania jako zakończone...", { id: `complete-${task.id}` })
    try {
      const resp = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: done.id }),
      })
      if (!resp.ok) throw new Error("bad response")
      toast.success("Zadanie oznaczone jako zakończone", { id: `complete-${task.id}` })
      onTaskUpdated()
    } catch (e) {
      console.error(e)
      setOptimisticTasks((prev) =>
        prev.map((t) => (t.id === task.id ? original : t))
      )
      toast.error("Nie udało się oznaczyć zadania jako zakończone", { id: `complete-${task.id}` })
    } finally {
      setUpdatingTasks((prev) => {
        const s = new Set(prev)
        s.delete(task.id)
        return s
      })
    }
  }

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  // Register drag monitor once
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "task",
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return
        handleTaskDrop(source.data.taskId as string, target.data.statusId as string)
      },
    })
  }, [])

  return (
    <>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {taskStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={getTasksByStatus(status)}
            onEdit={onTaskEdit}
            onTimeTracking={onTimeTracking}
            onViewDetails={handleViewDetails}
            onDelete={onTaskDelete}
            canEdit={canEditTask}
            onTaskCreated={onTaskUpdated}
            updatingTasks={updatingTasks}
            projects={projects}
            session={effectiveSession}
            hideProjectSelect={hideProjectSelect}
            onMarkComplete={handleMarkComplete}
            taskStatuses={taskStatuses}
            projectId={projectId}
          />
        ))}
      </div>
      <TaskDetailsSheet
        open={taskDetailsDialogOpen}
        onOpenChange={setTaskDetailsDialogOpen}
        task={selectedTask}
        onEdit={onTaskEdit}
        onTimeTracking={onTimeTracking}
        onDelete={onTaskDelete}
        onTaskUpdated={onTaskUpdated}
        canEdit={selectedTask ? canEditTask(selectedTask) : false}
      />
    </>
  )
}

// Re‑export for backward compatibility (optional)
export { UnifiedKanbanBoard as default }
