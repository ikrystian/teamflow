"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, Edit, MoreHorizontal, Plus, AlertCircle, Trash2, Check, X } from "lucide-react"
import { toast } from "sonner"
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
import { TaskDetailsDialog } from "../tasks/task-details-dialog"
import { TaskStatusDialog } from "./task-status-dialog"
import type { Task, TaskStatus } from "@/types"

interface KanbanBoardProps {
  projectId: string
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onTaskDelete: (task: Task) => void
  canEditTask: (task: Task) => boolean
}

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Low":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function SortableTaskCard({
  task,
  onEdit,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  isUpdating = false
}: {
  task: Task
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: boolean
  isUpdating?: boolean
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
    opacity: isDragging ? 0.3 : isUpdating ? 0.8 : 1,
    scale: isDragging ? 1.05 : 1,
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const completedSubtasks = task.subtasks.filter(subtask => subtask.isCompleted).length
  const completedTodos = task.todos?.filter(todo => todo.isCompleted).length || 0

  // Handle click on card (not on dropdown menu)
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click when dragging
    if (isDragging) return

    // Check if click is on the dropdown menu
    const target = e.target as HTMLElement
    if (target.closest('.task-dropdown')) return

    onViewDetails(task)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-2"
    >
      <Card
        className={`group hover:shadow-lg transition-all duration-200 ${
          isUpdating ? 'ring-2 ring-blue-300 shadow-lg' : ''
        } cursor-pointer hover:translate-y-[-1px] bg-card border-0 shadow-sm rounded-lg`}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-3 ">
            <div
              {...attributes}
              {...listeners}
              className="flex-1 cursor-grab active:cursor-grabbing pr-2"
            >
              <h3 className={`text-sm font-medium leading-tight text-foreground ${
                isUpdating ? 'text-blue-600' : ''
              }`}>
                {task.title}
                {isUpdating && (
                  <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                )}
              </h3>
            </div>
            <div className="flex-shrink-0 task-dropdown opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onTimeTracking(task)}>
                    <Clock className="mr-2 h-4 w-4" />
                    Log Time
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Task
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(task)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Task
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(task.priority || task.subtasks.length > 0) && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.priority && (
                <Badge
                  variant="outline"
                  className={`${getPriorityColor(task.priority)} text-xs px-2 py-0.5 h-5 font-medium`}
                >
                  {task.priority}
                </Badge>
              )}

              {task.subtasks.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground text-xs px-2 py-0.5 h-5 border-border"
                >
                  {completedSubtasks}/{task.subtasks.length}
                </Badge>
              )}

              {task.todos && task.todos.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground text-xs px-2 py-0.5 h-5 border-border"
                >
                  {completedTodos}/{task.todos.length} Todos
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            {task.assignee ? (
              <ClickableAvatar
                userId={task.assignee.id}
                avatarUrl={task.assignee.avatarUrl}
                name={task.assignee.name}
                size="lg"
                className="border-2 border-white shadow-sm"
              />
            ) : (
              <div className="h-7 w-7" />
            )}

            {task.dueDate && (
              <div className={`flex items-center text-xs px-2 py-1 rounded-md ${
                isOverdue(task.dueDate)
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-muted text-muted-foreground border border-border"
              }`}>
                {isOverdue(task.dueDate) ? (
                  <AlertCircle className="mr-1 h-3 w-3" />
                ) : (
                  <Calendar className="mr-1 h-3 w-3" />
                )}
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
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
    <Card className="border-dashed border-2 border-gray-300">
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            placeholder="Wprowadź tytuł zadania..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || loading}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
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
  updatingTasks
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
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  return (
    <div className="flex-shrink-0 w-72">
      <div
        ref={setNodeRef}
        className={`bg-gray-100 rounded-xl p-3 h-full transition-all duration-300 ease-in-out ${
          isOver
            ? "bg-blue-50 border-2 border-blue-300 border-dashed shadow-xl scale-105 transform"
            : "shadow-sm hover:shadow-md hover:bg-gray-50"
        }`}
        style={{ minHeight: '500px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
              {status.name}
            </h3>
            <Badge
              variant="secondary"
              className="text-xs bg-muted text-muted-foreground hover:bg-accent transition-colors"
            >
              {tasks.length}
            </Badge>
          </div>
        </div>

        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[400px]">
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
              />
            ))}

            <QuickAddTask
              status={status}
              onTaskCreated={onTaskCreated}
              projectId={projectId}
            />
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
  canEditTask
}: KanbanBoardProps) {
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([])
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // Use optimistic tasks if available, otherwise use props tasks
  const displayTasks = optimisticTasks.length > 0 ? optimisticTasks : tasks

  // Update optimistic tasks when props tasks change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  useEffect(() => {
    if (selectedTask) {
      const updatedSelectedTask = displayTasks.find(t => t.id === selectedTask.id);
      if (updatedSelectedTask) {
        setSelectedTask(updatedSelectedTask);
      }
    }
  }, [displayTasks, selectedTask]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses`)
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [projectId])

  useEffect(() => {
    fetchTaskStatuses()
  }, [projectId, fetchTaskStatuses])

  const handleDragStart = (event: DragStartEvent) => {
    const task = displayTasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatusId = over.id as string

    const task = displayTasks.find(t => t.id === taskId)
    if (!task) {
      console.error("Task not found:", taskId)
      return
    }

    // Find the status by ID or name (for backward compatibility)
    const newStatus = taskStatuses.find(s => s.id === newStatusId || s.name === newStatusId)
    if (!newStatus) {
      console.error("Status not found:", { newStatusId, availableStatuses: taskStatuses })
      return
    }

    // If the task is already in this status, do nothing
    if (task.statusId === newStatus.id || task.status === newStatus.name) {
      return
    }

    // Store original task state for potential rollback
    const originalTask = { ...task }

    // Mark task as updating
    setUpdatingTasks(prev => new Set(prev).add(taskId))

    // Optimistic update - immediately update the task in local state
    const updatedTask = {
      ...task,
      status: newStatus.name,
      statusId: newStatus.id.startsWith('default-') ? undefined : newStatus.id
    }

    setOptimisticTasks(prevTasks =>
      prevTasks.map(t => t.id === taskId ? updatedTask : t)
    )

    // Prepare update data - don't send statusId for default statuses
    const updateData: { status: string, statusId?: string } = {
      status: newStatus.name,
    }

    // Only send statusId if it's a real database status (not a default one)
    if (!newStatus.id.startsWith('default-')) {
      updateData.statusId = newStatus.id
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        // Success - refresh data from server to ensure consistency
        onTaskUpdated()
      } else {
        // Error - rollback optimistic update
        const errorData = await response.json()
        console.error("Failed to update task status:", errorData)

        setOptimisticTasks(prevTasks =>
          prevTasks.map(t => t.id === taskId ? originalTask : t)
        )

        // Show error message to user
        alert(`Failed to update task status: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error updating task status:", error)

      // Rollback optimistic update on network error
      setOptimisticTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? originalTask : t)
      )

      // Show error message to user
      alert('Network error: Failed to update task status')
    } finally {
      // Remove task from updating state
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return displayTasks.filter(task => {
      // For real database statuses
      if (!status.id.startsWith('default-')) {
        return task.statusId === status.id
      }

      // For default statuses, match by name and either no statusId or matching statusId
      return task.status === status.name && (!task.statusId || task.statusId === status.id)
    })
  }



  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  const handleCreateColumn = () => {
    setStatusDialogOpen(true)
  }

  const handleStatusSaved = () => {
    fetchTaskStatuses()
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
              projectId={projectId}
              updatingTasks={updatingTasks}
            />
          ))}

          {/* Add Column Button */}
          <div className="flex-shrink-0 w-72">
            <Card className="h-fit border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  onClick={handleCreateColumn}
                  className="w-full h-20 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">Dodaj kolumnę</span>
                </Button>
              </CardContent>
            </Card>
          </div>
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

      <TaskStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onStatusSaved={handleStatusSaved}
        projectId={projectId}
        status={null}
      />
    </>
  )
}
