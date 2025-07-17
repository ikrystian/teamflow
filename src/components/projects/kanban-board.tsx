"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, User as UserIcon, Clock, Edit, MoreHorizontal, Plus, AlertCircle, Trash2 } from "lucide-react"
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
import type { Task, User, TaskStatus } from "@/types"

interface KanbanBoardProps {
  projectId: string
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onTaskDelete: (task: Task) => void
  canEditTask: (task: Task) => boolean
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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
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
        } cursor-pointer hover:translate-y-[-1px] bg-white border-0 shadow-sm rounded-lg`}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-3">
            <div
              {...attributes}
              {...listeners}
              className="flex-1 cursor-grab active:cursor-grabbing pr-2"
            >
              <h3 className={`text-sm font-medium leading-tight text-gray-900 ${
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
                  className="bg-gray-50 text-gray-700 text-xs px-2 py-0.5 h-5 border-gray-300"
                >
                  {completedSubtasks}/{task.subtasks.length}
                </Badge>
              )}

              {task.todos && task.todos.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-gray-50 text-gray-700 text-xs px-2 py-0.5 h-5 border-gray-300"
                >
                  {completedTodos}/{task.todos.length} Todos
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            {task.assignee ? (
              <Avatar className="h-7 w-7 border-2 border-white shadow-sm">
                <AvatarImage src={task.assignee.avatarUrl} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium">
                  {task.assignee.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-7 w-7" />
            )}

            {task.dueDate && (
              <div className={`flex items-center text-xs px-2 py-1 rounded-md ${
                isOverdue(task.dueDate)
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200"
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

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  onCreateTask,
  updatingTasks
}: {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: (task: Task) => boolean
  onCreateTask: () => void
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
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              {status.name}
            </h3>
            <Badge
              variant="secondary"
              className="text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              {tasks.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateTask}
            className="h-7 w-7 p-0 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
          </Button>
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
  }, [displayTasks]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

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
              onCreateTask={handleCreateTask}
              updatingTasks={updatingTasks}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <Card className="w-72 opacity-95 shadow-2xl rotate-3 transform bg-white border-0 rounded-lg">
              <CardContent className="p-3">
                <h3 className="text-sm font-medium text-gray-900 leading-tight">
                  {activeTask.title}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  {activeTask.assignee && (
                    <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                      <AvatarImage src={activeTask.assignee.avatarUrl} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium">
                        {activeTask.assignee.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
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
        canEdit={selectedTask ? canEditTask(selectedTask) : false}
      />
    </>
  )
}
