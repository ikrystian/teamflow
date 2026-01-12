"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, MoreHorizontal, Plus, AlertCircle, Trash2, X, Loader2 } from "lucide-react"
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
import { TaskDetailsSheet } from "../tasks/task-details-sheet"
import type { Task, TaskStatus } from "@/types"
import { toast } from "sonner"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"

interface KanbanBoardProps {
  projectId: string
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onTaskDelete: (task: Task) => void
  canEditTask: (task: Task) => boolean
  onCreateTask?: () => void
}

import { getPriorityColor, getPriorityShortName, getPriorityDisplayName } from "@/lib/task-format-utils"

function SortableTaskCard({
  task,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  isUpdating = false,
  taskStatuses
}: {
  task: Task
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: boolean
  isUpdating?: boolean
  taskStatuses: TaskStatus[]
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
    if (task.statusId && taskStatuses.length > 0) {
      const doneStatus = taskStatuses.find(status => status.name === "Done")
      if (doneStatus && task.statusId === doneStatus.id) {
        return false
      }
    }

    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    // Task is overdue one day after the due date
    const overdueDate = new Date(due)
    overdueDate.setDate(due.getDate() + 1)

    return today >= overdueDate
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
        className={`mb-2 cursor-pointer hover:shadow-md transition-all border-l-4 ${isUpdating
          ? 'border-l-yellow-500 bg-yellow-50/50'
          : ''
          }`}
        style={{
          borderLeftColor: isUpdating ? undefined : (task.project?.color || '#3B82F6'),
          paddingTop: 5,
          paddingBottom: 0
        }}
      >
        <CardContent className="p-3" onClick={(event) => { onViewDetails(task); event.stopPropagation() }}>
          <div className="flex items-start justify-between mb-2 select-none">
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
                {canEdit && (
                  <>
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
            <div className="flex items-center  gap-2 flex-wrap">
              {task.priority && (
                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`} title={getPriorityDisplayName(task.priority)}>
                  {getPriorityShortName(task.priority)}
                </Badge>
              )}

              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                  <Calendar className="h-3 w-3" />
                  {formatTaskDueDateWithRelative(task.dueDate)}
                  {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3 text-red-600" />}
                </div>
              )}

              {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.estimatedHours}h
                </div>
              )}
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
  projectId
}: {
  status: TaskStatus
  onTaskCreated: () => void
  projectId: string
}) {
  const { data: session } = useSession()
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
          projectId: projectId,
          statusId: status.id,
          assigneeId: (session?.user as any)?.id,
        }),
      })

      if (response.ok) {
        setTitle("")
        setIsAdding(false)
        setError("")
        toast.success("Zadanie zostało utworzone")
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
    <Card className="border-dashed border-2 border-gray-300 p-0">
      <CardContent className="p-2">
        <form onSubmit={handleSubmit} className="space-y-2 flex alitems-center gap-2">
          <Input
            placeholder="Wprowadź tytuł zadania..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            autoFocus
            className="pb-0  pt-0 mb-0"
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-3 w-3" />
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
  updatingTasks,
  taskStatuses,
  onCreateTask
}: {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: (task: Task) => boolean
  onTaskCreated: () => void
  projectId: string
  updatingTasks: Set<string>
  taskStatuses: TaskStatus[]
  onCreateTask?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  return (
    <div className="flex-shrink-0 w-80">
      <div className={`bg-muted/30 rounded-lg p-4 h-full transition-colors ${isOver ? 'bg-primary/10 ring-2 ring-primary/20' : ''
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
                taskStatuses={taskStatuses}
              />
            ))}

            {/* Wyświetl przycisk dodawania zadania tylko w domyślnej kolumnie */}
            {status.isDefault && (
              <div className="space-y-2">
                <QuickAddTask
                  status={status}
                  onTaskCreated={onTaskCreated}
                  projectId={projectId}
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
        </SortableContext>
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
  onCreateTask
}: KanbanBoardProps) {
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Always use optimistic tasks for display
  const displayTasks = optimisticTasks

  // Update optimistic tasks when props tasks change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

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

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [])

  useEffect(() => {
    fetchTaskStatuses()
  }, [fetchTaskStatuses])

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
    const newStatusId = over.id as string

    const task = displayTasks.find(t => t.id === taskId)
    if (!task) return

    // If the task is already in this status, do nothing
    if (task.statusId === newStatusId) return

    // Mark task as updating
    setUpdatingTasks(prev => new Set(prev).add(taskId))

    // Optimistic update
    const updatedTask = { ...task, statusId: newStatusId }
    setOptimisticTasks(prevTasks =>
      prevTasks.map(t => t.id === taskId ? updatedTask : t)
    )

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statusId: newStatusId }),
      })

      if (response.ok) {
        onTaskUpdated()
        toast.success("Status zadania został zaktualizowany")
      } else {
        // Rollback on error
        setOptimisticTasks(prevTasks =>
          prevTasks.map(t => t.id === taskId ? task : t)
        )
        toast.error("Nie udało się zaktualizować statusu zadania")
      }
    } catch (error) {
      console.error("Error updating task status:", error)
      // Rollback on error
      setOptimisticTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? task : t)
      )
      toast.error("Wystąpił błąd podczas aktualizacji statusu")
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return displayTasks.filter(task => {
      // Match by statusId
      return task.statusId === status.id
    })
  }



  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }



  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {taskStatuses.length > 0 ? taskStatuses.map((status) => (
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
              projectId={projectId}
              updatingTasks={updatingTasks}
              taskStatuses={taskStatuses}
              onCreateTask={onCreateTask}
            />
          )) : (
            <div className="flex items-center justify-center w-full h-64 text-muted-foreground">
              Ładowanie statusów zadań...
            </div>
          )}


        </div>

        <DragOverlay>
          {activeTask ? (
            <Card className="w-72 opacity-95 shadow-2xl rotate-3 transform bg-card border-0 rounded-lg">
              <CardContent className="p-3">
                <h3 className="text-sm font-medium text-foreground leading-tight">
                  {activeTask.title}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  {activeTask.assignee && (
                    <ClickableAvatar
                      userId={activeTask.assignee.id}
                      avatarUrl={activeTask.assignee.avatarUrl}
                      name={activeTask.assignee.name}
                      size="md"
                      className="border-2 border-white shadow-sm"
                    />
                  )}
                  {activeTask.priority && (
                    <Badge
                      variant="outline"
                      className={`${getPriorityColor(activeTask.priority)} text-xs px-2 py-0.5 h-5 font-medium`}
                    >
                      {activeTask.priority}
                    </Badge>
                  )}
                </div>
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
