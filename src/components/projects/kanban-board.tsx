"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, User, Clock, Edit, MoreHorizontal, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  DragOverEvent,
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

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  statusId?: string
  priority?: string
  dueDate?: string
  estimatedHours?: number
  createdAt: string
  project: {
    id: string
    name: string
  }
  assignee?: User
  createdBy?: User
  subtasks: {
    id: string
    title: string
    isCompleted: boolean
  }[]
  timeEntries?: {
    id: string
    hours: number
    description?: string
    date: string
    user: User
  }[]
}

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface KanbanBoardProps {
  projectId: string
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  canEditTask: (task: Task) => boolean
}

function SortableTaskCard({
  task,
  onEdit,
  onTimeTracking,
  canEdit,
  isUpdating = false
}: {
  task: Task
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
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
    transition,
    opacity: isDragging ? 0.5 : isUpdating ? 0.7 : 1,
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const totalLoggedHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
  const completedSubtasks = task.subtasks.filter(subtask => subtask.isCompleted).length

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-3"
    >
      <Card className={`hover:shadow-md transition-all ${isUpdating ? 'ring-2 ring-blue-200 shadow-lg' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div
              {...attributes}
              {...listeners}
              className="flex-1 cursor-grab active:cursor-grabbing pr-2"
            >
              <CardTitle className={`text-sm font-medium line-clamp-2 ${isUpdating ? 'text-blue-600' : ''}`}>
                {task.title}
                {isUpdating && (
                  <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                )}
              </CardTitle>
            </div>
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent
          className="pt-0"
          {...attributes}
          {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="space-y-3">
            {task.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-1">
              {task.priority && (
                <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                  {task.priority}
                </Badge>
              )}
            </div>

            {task.dueDate && (
              <div className={`flex items-center text-xs ${
                isOverdue(task.dueDate) ? "text-red-600" : "text-gray-500"
              }`}>
                <Calendar className="mr-1 h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}

            {task.assignee && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.assignee.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {task.assignee.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-600">{task.assignee.name}</span>
              </div>
            )}

            {task.subtasks.length > 0 && (
              <div className="text-xs text-gray-500">
                Subtasks: {completedSubtasks}/{task.subtasks.length}
              </div>
            )}

            {task.estimatedHours && (
              <div className="text-xs text-gray-500">
                <Clock className="inline mr-1 h-3 w-3" />
                {totalLoggedHours.toFixed(1)}h / {task.estimatedHours}h
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onTimeTracking,
  canEdit,
  onCreateTask,
  updatingTasks
}: {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  canEdit: (task: Task) => boolean
  onCreateTask: () => void
  updatingTasks: Set<string>
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  return (
    <div className="flex-shrink-0 w-80">
      <div
        ref={setNodeRef}
        className={`bg-gray-50 rounded-lg p-4 h-full transition-colors ${
          isOver ? "bg-blue-50 border-2 border-blue-300 border-dashed" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <h3 className="font-medium text-gray-900">{status.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateTask}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[200px]">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onTimeTracking={onTimeTracking}
                canEdit={canEdit(task)}
                isUpdating={updatingTasks.has(task.id)}
              />
            ))}
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
  canEditTask
}: KanbanBoardProps) {
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([])
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())

  // Use optimistic tasks if available, otherwise use props tasks
  const displayTasks = optimisticTasks.length > 0 ? optimisticTasks : tasks

  // Update optimistic tasks when props tasks change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchTaskStatuses = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses`)
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }

  useEffect(() => {
    fetchTaskStatuses()
  }, [projectId])

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
    const updateData: any = {
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

  const handleCreateTask = () => {
    // This will be handled by the parent component
    // For now, we'll just trigger the task updated callback
    onTaskUpdated()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {taskStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={getTasksByStatus(status)}
            onEdit={onTaskEdit}
            onTimeTracking={onTimeTracking}
            canEdit={canEditTask}
            onCreateTask={handleCreateTask}
            updatingTasks={updatingTasks}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="w-80 opacity-90">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {activeTask.title}
              </CardTitle>
            </CardHeader>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
