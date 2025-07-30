"use client"

import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  User as UserIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  Edit,
  Timer
} from "lucide-react"
import type { Task } from "@/types"

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface TaskPopoverProps {
  task: Task
  children: React.ReactNode
  onTaskClick?: (task: Task) => void
  onEdit?: (task: Task, e: React.MouseEvent) => void
  onTimeTracking?: (task: Task, e: React.MouseEvent) => void
  canEdit?: boolean
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
}

export function TaskPopover({
  task,
  children,
  onTaskClick,
  onEdit,
  onTimeTracking,
  canEdit = false,
  side = "top",
  align = "center"
}: TaskPopoverProps) {
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchTaskStatuses = async () => {
      try {
        const response = await fetch('/api/system/task-statuses')
        if (response.ok) {
          const data = await response.json()
          setTaskStatuses(data.taskStatuses)
        }
      } catch (error) {
        console.error("Error fetching task statuses:", error)
      }
    }

    if (isOpen) {
      fetchTaskStatuses()
    }
  }, [isOpen])

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

  const getTaskStatus = (task: Task) => {
    if (task.statusId) {
      return taskStatuses.find(status => status.id === task.statusId)
    }
    return null
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false

    // Don't show completed tasks as overdue
    if (task && task.statusId && taskStatuses.length > 0) {
      const doneStatus = taskStatuses.find(status => status.name === "Done")
      if (doneStatus && task.statusId === doneStatus.id) {
        return false
      }
    }

    return new Date(dueDate) < new Date()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Dzisiaj"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Jutro"
    } else {
      return date.toLocaleDateString()
    }
  }

  const totalLoggedHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
  const completedSubtasks = task.subtasks?.filter(subtask => subtask.isCompleted).length || 0
  const subtaskProgress = task.subtasks?.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side={side}
        align={align}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
              {task.title}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {task.project ? (
                <>
                  <Badge variant="outline" className="text-xs">
                    {task.project.name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {task.project.team.name}
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Brak projektu
                </Badge>
              )}

              {task.priority && (
                <Badge variant="secondary" className={`text-xs ${getPriorityColor(task.priority)}`}>
                  {task.priority === "Low" ? "Niski" : task.priority === "Medium" ? "Średni" : "Wysoki"}
                </Badge>
              )}

              {(() => {
                const taskStatus = getTaskStatus(task)
                return (
                  <Badge
                    variant="default"
                    className="text-white text-xs"
                    style={{ backgroundColor: taskStatus?.color || '#6B7280' }}
                  >
                    {taskStatus?.name || 'Brak statusu'}
                  </Badge>
                )
              })()}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Opis</h4>
              <div
                className="text-xs text-muted-foreground line-clamp-3"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            {/* Assignee */}
            {task.assignee && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {task.assignee.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{task.assignee.name}</span>
                </div>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className={`flex items-center gap-1 text-xs ${
                  isOverdue(task.dueDate) ? "text-destructive" : "text-foreground"
                }`}>
                  {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3" />}
                  <span className="font-medium">
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              </div>
            )}

            {/* Time Tracking */}
            {task.estimatedHours && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-xs">
                    <span className="font-medium">{totalLoggedHours.toFixed(1)}h</span>
                    <span className="text-muted-foreground"> / {task.estimatedHours}h</span>
                  </div>
                </div>
                <Progress
                  value={(totalLoggedHours / task.estimatedHours) * 100}
                  className="h-1"
                />
              </div>
            )}

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <div className="text-xs">
                    <span className="font-medium">{completedSubtasks}/{task.subtasks.length}</span>
                    <span className="text-muted-foreground"> podzadań</span>
                  </div>
                </div>
                <Progress value={subtaskProgress} className="h-1" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {onTaskClick && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  onTaskClick(task)
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                Zobacz
              </Button>
            )}

            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  onEdit(task, e)
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}

            {onTimeTracking && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  onTimeTracking(task, e)
                }}
              >
                <Timer className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
