"use client"

import { useState, useEffect } from "react"
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskDetailsSheet } from "./task-details-sheet"
import type { Task, TaskStatus } from "@/types"
import type { Session } from "next-auth"
import { toast } from "sonner"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import { getPriorityColor, getPriorityDisplayName, formatProjectDisplay } from "@/lib/task-format-utils"
import { formatEstimatedHours } from "@/lib/task-format-utils"

interface TasksKanbanBoardProps {
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onTaskDelete: (task: Task) => void
  canEditTask: (task: Task) => boolean
  projects: Array<{
    id: string
    name: string
  }>
  session: Session | null
  hideProjectSelect?: boolean
  taskStatuses: TaskStatus[]
}

interface StatusColumn extends TaskStatus {
  tasks: Task[]
}




function SortableTaskCard({
  task,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  isUpdating = false,
  onMarkComplete,
  taskStatuses
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
  session: Session | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : isUpdating ? 0.8 : 1,
    scale: isDragging ? 1.05 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    // Don't show completed tasks as overdue
    if (isTaskCompleted()) return false

    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    // Task is overdue one day after the due date
    const overdueDate = new Date(due)
    overdueDate.setDate(due.getDate() + 1)

    return today >= overdueDate
  }

  const isTaskCompleted = () => {
    const doneStatus = taskStatuses.find(status => status.name === "Done")
    return doneStatus && task.statusId === doneStatus.id
  }

  const handleMarkComplete = () => {
    if (onMarkComplete) {
      onMarkComplete(task)
    }
  }


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <Card
        className={`mb-2 cursor-pointer hover:shadow-md transition-all border-l-4 ${
          isUpdating
            ? 'border-l-yellow-500 bg-yellow-50/50'
            : isTaskCompleted()
            ? 'bg-green-50/80 border-l-green-500'
            : ''
        }`}
        style={{
          borderLeftColor: isUpdating ? undefined : isTaskCompleted() ? '#10B981' : (task.project?.color || '#3B82F6'),
          paddingTop: 5,
          paddingBottom: 0
        }}
      >
        <CardContent className="py-2 px-3 select-none"
                 onClick={() => onViewDetails(task)}
>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h4
                    className="font-medium text-sm leading-tight cursor-pointer hover:text-primary truncate"
                  >
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
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(event) => {onViewDetails(task); event.stopPropagation(); }}>
                  Szczegóły
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    {!isTaskCompleted() && (
                      <DropdownMenuItem onClick={event => {handleMarkComplete(); event.stopPropagation()}}>
                        <Check className="mr-2 h-4 w-4" />
                        Oznacz jako zakończone
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(event) => { onTimeTracking(task); event.stopPropagation();}}>
                      <Clock className="mr-2 h-4 w-4" />
                      Loguj czas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(event) => {event.stopPropagation(); onDelete(task)}}
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
            <div className="text-xs text-muted-foreground">
              {task?.project?.name}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {task.priority && (
                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`} title={getPriorityDisplayName(task.priority)}>
                  {getPriorityDisplayName(task.priority).slice(0, 1)}
                </Badge>
              )}

              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs ${
                  isOverdue(task.dueDate) ? 'text-red-600' : 'text-muted-foreground'
                }`}>
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

              <div className="flex-1"></div>
              {task.assignee  && (
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
  projects,
  session,
  hideProjectSelect = false
}: {
  status: TaskStatus
  onTaskCreated: () => void
  projects: Array<{
    id: string
    name: string
  }>
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
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          projectId: selectedProjectId && selectedProjectId !== "no-project" ? selectedProjectId : undefined,
          statusId: status.id,
          assigneeId: session?.user?.id // Automatycznie przypisz do autora
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
          {!hideProjectSelect && projects.length > 0 && (
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
            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded border">
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
  updatingTasks,
  projects,
  session,
  hideProjectSelect = false,
  onMarkComplete,
  taskStatuses
}: {
  status: StatusColumn
  tasks: Task[]
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: (task: Task) => boolean
  onTaskCreated: () => void
  updatingTasks: Set<string>
  projects: Array<{
    id: string
    name: string
  }>
  session: Session | null
  hideProjectSelect?: boolean
  onMarkComplete?: (task: Task) => void
  taskStatuses: TaskStatus[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  return (
    <div className="flex-shrink-0 w-80">
      <div className={`bg-muted/30 rounded-lg p-4 h-full transition-colors ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/20' : ''
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{status.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </div>
        </div>

        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef} className="space-y-2 min-h-[400px]">
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
                session={session}
              />
            ))}

            {/* Wyświetl przycisk dodawania zadania tylko w domyślnej kolumnie */}
            {status.isDefault && (
              <QuickAddTask
                status={status}
                onTaskCreated={onTaskCreated}
                projects={projects}
                session={session}
                hideProjectSelect={hideProjectSelect}
              />
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export function TasksKanbanBoard({
  tasks,
  onTaskUpdated,
  onTaskEdit,
  onTimeTracking,
  onTaskDelete,
  canEditTask,
  projects,
  session,
  hideProjectSelect = false,
  taskStatuses
}: TasksKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Always use optimistic tasks for display
  const displayTasks = optimisticTasks

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getTasksByStatus = (status: TaskStatus) => {
    return displayTasks.filter(task => {
      // Match by statusId
      return task.statusId === status.id
    })
  }

  // Create status columns based on global task statuses
  const statusColumns: StatusColumn[] = taskStatuses.map(status => ({
    ...status,
    tasks: getTasksByStatus(status)
  }))

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = displayTasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // The drop target can be either a column (its id is a status id) or another
    // task card inside a column. When a column is full, the card under the cursor
    // is what gets reported as `over`, so resolve it back to that card's column.
    const overTask = displayTasks.find(t => t.id === overId)
    const newStatusId = overTask ? overTask.statusId : overId

    // Find the status by id
    const newTaskStatus = taskStatuses.find(status => status.id === newStatusId)
    if (!newTaskStatus) return

    const task = displayTasks.find(t => t.id === taskId)
    if (!task || task.statusId === newTaskStatus.id) return

    // Optimistic update - immediately update UI
    setUpdatingTasks(prev => new Set(prev).add(taskId))
    setOptimisticTasks(prev =>
      prev.map(t => t.id === taskId ? {
        ...t,
        statusId: newTaskStatus.id
      } : t)
    )

    // Show immediate feedback
    toast.loading(`Przenoszenie zadania do "${newTaskStatus.name}"...`, {
      id: `move-task-${taskId}`,
      duration: 2000
    })

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusId: newTaskStatus.id
        }),
      })

      if (!response.ok) {
        // Revert optimistic update on error - restore original task
        setOptimisticTasks(prev =>
          prev.map(t => t.id === taskId ? {
            ...t,
            statusId: task.statusId
          } : t)
        )
        console.error("Failed to update task status")
        toast.error("Nie udało się przenieść zadania. Spróbuj ponownie.", {
          id: `move-task-${taskId}`
        })
      } else {
        // Success - keep optimistic update and refresh data in background
        toast.success(`Zadanie przeniesione do "${newTaskStatus.name}"`, {
          id: `move-task-${taskId}`
        })
        onTaskUpdated()
      }
    } catch (error) {
      // Revert optimistic update on error - restore original task
      setOptimisticTasks(prev =>
        prev.map(t => t.id === taskId ? {
          ...t,
          statusId: task.statusId
        } : t)
      )
      console.error("Error updating task status:", error)
      toast.error("Wystąpił błąd podczas przenoszenia zadania", {
        id: `move-task-${taskId}`
      })
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  const handleMarkComplete = async (task: Task) => {
    // Find the "Done" status
    const doneStatus = taskStatuses.find(status => status.name === "Done")
    if (!doneStatus) {
      toast.error("Nie znaleziono statusu 'Done'")
      return
    }

    // Don't do anything if already completed
    if (task.statusId === doneStatus.id) {
      return
    }

    // Optimistic update - immediately update UI
    setUpdatingTasks(prev => new Set(prev).add(task.id))
    setOptimisticTasks(prev =>
      prev.map(t => t.id === task.id ? {
        ...t,
        statusId: doneStatus.id
      } : t)
    )

    // Show immediate feedback
    toast.loading("Oznaczanie zadania jako zakończone...", {
      id: `complete-task-${task.id}`,
      duration: 2000
    })

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusId: doneStatus.id
        }),
      })

      if (!response.ok) {
        // Revert optimistic update on error
        setOptimisticTasks(prev =>
          prev.map(t => t.id === task.id ? {
            ...t,
            statusId: task.statusId
          } : t)
        )
        console.error("Failed to mark task as complete")
        toast.error("Nie udało się oznaczyć zadania jako zakończone", {
          id: `complete-task-${task.id}`
        })
      } else {
        // Success - keep optimistic update and refresh data in background
        toast.success("Zadanie oznaczone jako zakończone", {
          id: `complete-task-${task.id}`
        })
        onTaskUpdated()
      }
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticTasks(prev =>
        prev.map(t => t.id === task.id ? {
          ...t,
          statusId: task.statusId
        } : t)
      )
      console.error("Error marking task as complete:", error)
      toast.error("Wystąpił błąd podczas oznaczania zadania", {
        id: `complete-task-${task.id}`
      })
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(task.id)
        return newSet
      })
    }
  }

  // Sync optimistic tasks with props tasks when they change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {statusColumns.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={status.tasks}
              onEdit={onTaskEdit}
              onTimeTracking={onTimeTracking}
              onViewDetails={handleViewDetails}
              onDelete={onTaskDelete}
              canEdit={canEditTask}
              onTaskCreated={onTaskUpdated}
              updatingTasks={updatingTasks}
              projects={projects}
              session={session}
              hideProjectSelect={hideProjectSelect}
              onMarkComplete={handleMarkComplete}
              taskStatuses={taskStatuses}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <Card
              className="w-80 opacity-90 rotate-3 shadow-lg border-l-4"
              style={{
                borderLeftColor: activeTask.project?.color || '#3B82F6'
              }}
            >
              <CardContent className="p-3">
                <h4 className="font-medium text-sm">{activeTask.title}</h4>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

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
