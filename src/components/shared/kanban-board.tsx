"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import {
  getPriorityColor,
  getPriorityShortName,
  getPriorityDisplayName,
  formatEstimatedHours,
  formatProjectDisplay,
} from "@/lib/task-format-utils"
import { TaskDetailsDialog } from "../tasks/task-details-dialog"

export interface KanbanBoardProps {
  /** If provided, tasks will be created in this project by default and project select is hidden. */
  projectId?: string
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onTaskDelete: (task: Task) => void
  canEditTask: (task: Task) => boolean
  onCreateTask?: () => void
  /** Required when projectId is not provided (so the user can pick a project for new tasks). */
  projects?: Array<{ id: string; name: string }>
  /** Optional - if not provided, useSession() is used internally. */
  session?: Session | null
  /** Hide the project select in QuickAddTask (used in "My tasks" view). */
  hideProjectSelect?: boolean
  /** Pre-fetched task statuses. If not provided, the component fetches them itself. */
  taskStatuses?: TaskStatus[]
  /** Show project name on each task card. Default: true when projectId is not provided. */
  showProjectName?: boolean
  /** Show the "Mark as complete" action. */
  enableMarkComplete?: boolean
  /** Show the "Szczegóły" (Details) dropdown item. */
  showDetailsMenuItem?: boolean
}

interface StatusColumn extends TaskStatus {
  tasks: Task[]
}

function isTaskDone(task: Task, taskStatuses: TaskStatus[]): boolean {
  const doneStatus = taskStatuses.find(status => status.name === "Done")
  return !!(doneStatus && task.statusId === doneStatus.id)
}

function SortableTaskCard({
  task,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  isUpdating = false,
  onMarkComplete,
  taskStatuses,
  showProjectName,
  showDetailsMenuItem,
  enableMarkComplete,
}: {
  task: Task
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: boolean
  isUpdating?: boolean
  onMarkComplete?: (task: Task) => void
  taskStatuses: TaskStatus[]
  showProjectName: boolean
  showDetailsMenuItem: boolean
  enableMarkComplete: boolean
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

  const style = {
    opacity: isDragging ? 0.5 : isUpdating ? 0.8 : 1,
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    if (isTaskDone(task, taskStatuses)) return false

    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    // Task is overdue one day after the due date
    const overdueDate = new Date(due)
    overdueDate.setDate(due.getDate() + 1)

    return today >= overdueDate
  }

  const completed = isTaskDone(task, taskStatuses)

  return (
    <div
      ref={ref}
      style={style}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <Card
        className={`mb-2 cursor-pointer hover:shadow-md transition-all border-l-4 ${isUpdating
          ? 'border-l-yellow-500 bg-yellow-50/50'
          : completed
            ? 'bg-green-50/80 border-l-green-500'
            : ''
          }`}
        style={{
          borderLeftColor: isUpdating
            ? undefined
            : completed
              ? '#10B981'
              : (task.project?.color || '#3B82F6'),
          paddingTop: 5,
          paddingBottom: 0,
        }}
      >
        <CardContent
          className="p-3 select-none"
          onClick={(event) => { onViewDetails(task); event.stopPropagation() }}
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
              {isUpdating && (
                <Loader2 className="h-3 w-3 animate-spin text-yellow-600 flex-shrink-0" />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(event) => { event.stopPropagation() }}>
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showDetailsMenuItem && (
                  <DropdownMenuItem onClick={(event) => { onViewDetails(task); event.stopPropagation(); }}>
                    Szczegóły
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <>
                    {enableMarkComplete && !completed && (
                      <DropdownMenuItem onClick={(event) => { onMarkComplete?.(task); event.stopPropagation() }}>
                        <Check className="mr-2 h-4 w-4" />
                        Oznacz jako zakończone
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(event) => { onTimeTracking(task); event.stopPropagation() }}>
                      <Clock className="mr-2 h-4 w-4" />
                      Loguj czas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(event) => { onDelete(task); event.stopPropagation() }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Usuń
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            {showProjectName && task?.project?.name && (
              <div className="text-xs text-muted-foreground">
                {task.project.name}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {task.priority && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getPriorityColor(task.priority)}`}
                  title={getPriorityDisplayName(task.priority)}
                >
                  {getPriorityShortName(task.priority)}
                </Badge>
              )}

              {task.dueDate && (
                <div
                  className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-muted-foreground'
                    }`}
                >
                  <Calendar className="h-3 w-3" />
                  {formatTaskDueDateWithRelative(task.dueDate)}
                  {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3 text-red-600" />}
                </div>
              )}

              {task.estimatedHours ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatEstimatedHours(task.estimatedHours)}
                </div>
              ) : null}

              <div className="flex-1"></div>
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

function QuickAddTask({
  status,
  onTaskCreated,
  projectId,
  projects,
  session,
  hideProjectSelect = false,
}: {
  status: TaskStatus
  onTaskCreated: () => void
  projectId?: string
  projects?: Array<{ id: string; name: string }>
  session: Session | null
  hideProjectSelect?: boolean
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Set default project when projects change
  useEffect(() => {
    if (!projectId && projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId, projectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError("")

    // Decide which projectId to use
    const effectiveProjectId = projectId
      ? projectId
      : selectedProjectId && selectedProjectId !== "no-project"
        ? selectedProjectId
        : undefined

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          projectId: effectiveProjectId,
          statusId: status.id,
          assigneeId: (session?.user as { id?: string })?.id,
        }),
      })

      if (response.ok) {
        setTitle("")
        setIsAdding(false)
        setError("")
        toast.success("Zadanie zostało utworzone")
        window.dispatchEvent(new CustomEvent('task-created'))
        onTaskCreated()
      } else {
        const data = await response.json()
        const errorMessage = data.error || "Nie udało się utworzyć zadania"
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error creating task:", error)
      const errorMessage = "Wystąpił błąd podczas tworzenia zadania"
      setError(errorMessage)
      toast.error(errorMessage)
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="w-full justify-start text-muted-foreground hover:text-foreground"
      >
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
          {!hideProjectSelect && !projectId && projects && projects.length > 0 && (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={loading}>
              <SelectTrigger className="mb-2">
                <SelectValue placeholder="Wybierz projekt (opcjonalne)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">
                  <span className="text-muted-foreground">Brak projektu</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {formatProjectDisplay(project)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {error && (
            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded border w-full">
              {error}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              className="w-6 h-6"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  onTaskCreated,
  projectId,
  projects,
  session,
  hideProjectSelect,
  updatingTasks,
  taskStatuses,
  onCreateTask,
  onMarkComplete,
  showProjectName,
  showDetailsMenuItem,
  enableMarkComplete,
}: {
  status: StatusColumn
  tasks: Task[]
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: (task: Task) => boolean
  onTaskCreated: () => void
  projectId?: string
  projects?: Array<{ id: string; name: string }>
  session: Session | null
  hideProjectSelect?: boolean
  updatingTasks: Set<string>
  taskStatuses: TaskStatus[]
  onCreateTask?: () => void
  onMarkComplete?: (task: Task) => void
  showProjectName: boolean
  showDetailsMenuItem: boolean
  enableMarkComplete: boolean
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
      <div
        className={`bg-muted/30 rounded-lg p-4 h-full transition-colors ${isOver ? 'bg-primary/10 ring-2 ring-primary/20' : ''
          }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{status.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
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
              onEdit={onEdit}
              onTimeTracking={onTimeTracking}
              onViewDetails={onViewDetails}
              onDelete={onDelete}
              canEdit={canEdit(task)}
              isUpdating={updatingTasks.has(task.id)}
              onMarkComplete={onMarkComplete}
              taskStatuses={taskStatuses}
              showProjectName={showProjectName}
              showDetailsMenuItem={showDetailsMenuItem}
              enableMarkComplete={enableMarkComplete}
            />
          ))}

          {/* Show add task button only in the default column */}
          {status.isDefault && (
            <div className="space-y-2">
              <QuickAddTask
                status={status}
                onTaskCreated={onTaskCreated}
                projectId={projectId}
                projects={projects}
                session={session}
                hideProjectSelect={hideProjectSelect}
              />
              {onCreateTask && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateTask}
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz szczegółowe zadanie
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function KanbanBoard({
  projectId,
  tasks,
  onTaskUpdated,
  onTaskEdit,
  onTimeTracking,
  onTaskDelete,
  canEditTask,
  onCreateTask,
  projects,
  session: sessionProp,
  hideProjectSelect = false,
  taskStatuses: taskStatusesProp,
  showProjectName,
  enableMarkComplete = false,
  showDetailsMenuItem = false,
}: KanbanBoardProps) {
  const { data: sessionFromHook } = useSession()
  const session: Session | null = (sessionProp ?? (sessionFromHook as Session | null)) ?? null

  const [fetchedTaskStatuses, setFetchedTaskStatuses] = useState<TaskStatus[]>([])
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const taskStatuses = taskStatusesProp ?? fetchedTaskStatuses
  const shouldShowProjectName = showProjectName ?? !projectId

  // Keep latest data accessible inside the drag monitor without re-registering it.
  const displayTasks = optimisticTasks
  const displayTasksRef = useRef<Task[]>(displayTasks)
  displayTasksRef.current = displayTasks
  const taskStatusesRef = useRef<TaskStatus[]>(taskStatuses)
  taskStatusesRef.current = taskStatuses

  // Update optimistic tasks when props tasks change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  const fetchTaskStatuses = useCallback(async () => {
    if (taskStatusesProp && taskStatusesProp.length > 0) return
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setFetchedTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [taskStatusesProp])

  useEffect(() => {
    fetchTaskStatuses()
  }, [fetchTaskStatuses])

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "task",
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return
        handleTaskDrop(
          source.data.taskId as string,
          target.data.statusId as string
        )
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTaskDrop = async (taskId: string, newStatusId: string) => {
    const currentTasks = displayTasksRef.current

    // Ignore drops that don't resolve to a real status column
    if (!taskStatusesRef.current.some(status => status.id === newStatusId)) return

    const task = currentTasks.find(t => t.id === taskId)
    if (!task) return

    // If the task is already in this status, do nothing
    if (task.statusId === newStatusId) return

    const newStatus = taskStatusesRef.current.find(status => status.id === newStatusId)
    if (!newStatus) return

    // Mark task as updating
    setUpdatingTasks(prev => new Set(prev).add(taskId))

    // Optimistic update
    const previousStatusId = task.statusId
    setOptimisticTasks(prevTasks =>
      prevTasks.map(t => t.id === taskId ? { ...t, statusId: newStatusId } : t)
    )

    // Show immediate feedback
    toast.loading(`Przenoszenie zadania do "${newStatus.name}"...`, {
      id: `move-task-${taskId}`,
      duration: 2000,
    })

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statusId: newStatusId }),
      })

      if (response.ok) {
        toast.success(`Zadanie przeniesione do "${newStatus.name}"`, {
          id: `move-task-${taskId}`,
        })
        onTaskUpdated()
      } else {
        // Rollback on error
        setOptimisticTasks(prevTasks =>
          prevTasks.map(t => t.id === taskId ? { ...t, statusId: previousStatusId } : t)
        )
        toast.error("Nie udało się zaktualizować statusu zadania", {
          id: `move-task-${taskId}`,
        })
      }
    } catch (error) {
      console.error("Error updating task status:", error)
      // Rollback on error
      setOptimisticTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? { ...t, statusId: previousStatusId } : t)
      )
      toast.error("Wystąpił błąd podczas aktualizacji statusu", {
        id: `move-task-${taskId}`,
      })
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return displayTasks.filter(task => task.statusId === status.id)
  }

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  const handleMarkComplete = async (task: Task) => {
    const doneStatus = taskStatuses.find(status => status.name === "Done")
    if (!doneStatus) {
      toast.error("Nie znaleziono statusu 'Done'")
      return
    }

    if (task.statusId === doneStatus.id) return

    const previousStatusId = task.statusId
    setUpdatingTasks(prev => new Set(prev).add(task.id))
    setOptimisticTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, statusId: doneStatus.id } : t)
    )

    toast.loading("Oznaczanie zadania jako zakończone...", {
      id: `complete-task-${task.id}`,
      duration: 2000,
    })

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statusId: doneStatus.id }),
      })

      if (!response.ok) {
        setOptimisticTasks(prev =>
          prev.map(t => t.id === task.id ? { ...t, statusId: previousStatusId } : t)
        )
        toast.error("Nie udało się oznaczyć zadania jako zakończone", {
          id: `complete-task-${task.id}`,
        })
      } else {
        toast.success("Zadanie oznaczone jako zakończone", {
          id: `complete-task-${task.id}`,
        })
        onTaskUpdated()
      }
    } catch (error) {
      setOptimisticTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, statusId: previousStatusId } : t)
      )
      console.error("Error marking task as complete:", error)
      toast.error("Wystąpił błąd podczas oznaczania zadania", {
        id: `complete-task-${task.id}`,
      })
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(task.id)
        return newSet
      })
    }
  }

  return (
    <>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {taskStatuses.length > 0 ? taskStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={{ ...status, tasks: getTasksByStatus(status) }}
            tasks={getTasksByStatus(status)}
            onEdit={onTaskEdit}
            onTimeTracking={onTimeTracking}
            onViewDetails={handleViewDetails}
            onDelete={onTaskDelete}
            canEdit={canEditTask}
            onTaskCreated={onTaskUpdated}
            projectId={projectId}
            projects={projects}
            session={session}
            hideProjectSelect={hideProjectSelect}
            updatingTasks={updatingTasks}
            taskStatuses={taskStatuses}
            onCreateTask={onCreateTask}
            onMarkComplete={enableMarkComplete ? handleMarkComplete : undefined}
            showProjectName={shouldShowProjectName}
            showDetailsMenuItem={showDetailsMenuItem}
            enableMarkComplete={enableMarkComplete}
          />
        )) : (
          <div className="flex items-center justify-center w-full h-64 text-muted-foreground">
            Ładowanie statusów zadań...
          </div>
        )}
      </div>

      <TaskDetailsDialog
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
