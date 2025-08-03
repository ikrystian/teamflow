"use client"

import { useState, useEffect, useCallback } from "react"
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
  Timer,
  File
} from "lucide-react"
import { EditableCell } from "@/components/dashboard/editable-cell"
import { QuickTimeEntry } from "./quick-time-entry"
import { TaskDetailsForm } from "./task-details-form"
import type { Task, User, TaskStatus, TaskUpdateData } from "@/types"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import { getPriorityColor, getPriorityDisplayName, formatProjectDisplay } from "@/lib/task-format-utils"
import { toast } from "sonner"

interface TaskPopoverProps {
  task: Task
  children: React.ReactNode
  onTaskClick?: (task: Task) => void
  onEdit?: (task: Task, e: React.MouseEvent) => void
  onTimeTracking?: (task: Task, e: React.MouseEvent) => void
  onTaskUpdate?: (taskId: string, updates: TaskUpdateData) => void | Promise<void>
  onTimeLogged?: () => void
  users?: User[]
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
  onTaskUpdate,
  onTimeLogged,
  users = [],
  canEdit = false,
  side = "top",
  align = "center"
}: TaskPopoverProps) {
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [optimisticTask, setOptimisticTask] = useState<Task>(task)
  const [isEditingDetails, setIsEditingDetails] = useState(false)

  // Sync optimistic task with prop changes
  useEffect(() => {
    setOptimisticTask(task)
  }, [task])

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

  // Optimistic update function
  const handleOptimisticTaskUpdate = useCallback(async (updates: TaskUpdateData) => {
    if (!onTaskUpdate) return

    // Optimistic update - immediately update UI
    setOptimisticTask(prev => ({
      ...prev,
      ...updates,
      // Handle assignee update specially
      ...(updates.assigneeId !== undefined && {
        assignee: updates.assigneeId ? users.find(u => u.id === updates.assigneeId) : undefined
      })
    }))

    // Show immediate feedback
    toast.loading("Aktualizowanie zadania...", {
      id: `update-task-${task.id}`,
      duration: 2000
    })

    try {
      // Call the original update function
      const result = onTaskUpdate(task.id, updates)
      if (result instanceof Promise) {
        await result
      }

      // Success feedback
      toast.success("Zadanie zostało zaktualizowane", {
        id: `update-task-${task.id}`
      })
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticTask(task)
      console.error("Error updating task:", error)
      toast.error("Nie udało się zaktualizować zadania", {
        id: `update-task-${task.id}`
      })
    }
  }, [task, users, onTaskUpdate])

  const handleTimeLogged = useCallback(() => {
    if (onTimeLogged) {
      onTimeLogged()
    }
  }, [onTimeLogged])

  const handleDetailsFormSave = useCallback(async (updates: TaskUpdateData) => {
    await handleOptimisticTaskUpdate(updates)
    setIsEditingDetails(false)
  }, [handleOptimisticTaskUpdate])

  const handleDetailsFormCancel = useCallback(() => {
    setIsEditingDetails(false)
  }, [])

  const handleEditDetailsClick = useCallback(() => {
    setIsEditingDetails(true)
  }, [])


  const getTaskStatus = (task: Task) => {
    if (task.statusId) {
      return taskStatuses.find(status => status.id === task.statusId)
    }
    return null
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false

    // Don't show completed tasks as overdue
    if (optimisticTask && optimisticTask.statusId && taskStatuses.length > 0) {
      const doneStatus = taskStatuses.find(status => status.name === "Done")
      if (doneStatus && optimisticTask.statusId === doneStatus.id) {
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



  const totalLoggedHours = optimisticTask.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
  const completedSubtasks = optimisticTask.subtasks?.filter(subtask => subtask.isCompleted).length || 0
  const subtaskProgress = optimisticTask.subtasks?.length > 0 ? (completedSubtasks / optimisticTask.subtasks.length) * 100 : 0

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
            {canEdit && onTaskUpdate ? (
              <EditableCell
                value={optimisticTask.title}
                type="text"
                onSave={(value) => handleOptimisticTaskUpdate({ title: value })}
                className="font-semibold text-sm"
                placeholder="Tytuł zadania"
              />
            ) : (
              <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                {optimisticTask.title}
              </h3>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs tuncate overflow-hidden justify-start max-w-[200px]">
                {formatProjectDisplay(optimisticTask.project)}
              </Badge>

              {canEdit && onTaskUpdate ? (
                <EditableCell
                  value={optimisticTask.priority || ""}
                  type="priority"
                  onSave={(value) => handleOptimisticTaskUpdate({ priority: value })}
                  placeholder="Ustaw priorytet"
                />
              ) : optimisticTask.priority ? (
                <Badge variant="secondary" className={`text-xs ${getPriorityColor(optimisticTask.priority)}`}>
                  {getPriorityDisplayName(optimisticTask.priority)}
                </Badge>
              ) : null}

              {canEdit && onTaskUpdate ? (
                <EditableCell
                  value={optimisticTask.statusId || ""}
                  type="status"
                  taskStatuses={taskStatuses}
                  onSave={(value) => handleOptimisticTaskUpdate({ statusId: value })}
                  placeholder="Ustaw status"
                />
              ) : (() => {
                const taskStatus = getTaskStatus(optimisticTask)
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
          {(optimisticTask.description || (canEdit && onTaskUpdate)) && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Opis</h4>
              {canEdit && onTaskUpdate ? (
                <EditableCell
                  value={optimisticTask.description || ""}
                  type="text"
                  onSave={(value) => handleOptimisticTaskUpdate({ description: value })}
                  placeholder="Dodaj opis zadania"
                  className="text-xs text-muted-foreground"
                />
              ) : (
                <div
                  className="text-xs text-muted-foreground line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: optimisticTask.description || "" }}
                />
              )}
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            {canEdit && onTaskUpdate ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground">Szczegóły zadania</h4>
                  {!isEditingDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditDetailsClick}
                      className="h-6 px-2 text-xs"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edytuj
                    </Button>
                  )}
                </div>

                {isEditingDetails ? (
                  <TaskDetailsForm
                    task={optimisticTask}
                    users={users}
                    taskStatuses={taskStatuses}
                    onSave={handleDetailsFormSave}
                    onCancel={handleDetailsFormCancel}
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Assignee - Read Only */}
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      {optimisticTask.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={optimisticTask.assignee.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {optimisticTask.assignee.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{optimisticTask.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nieprzypisany</span>
                      )}
                    </div>

                    {/* Due Date - Read Only */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {optimisticTask.dueDate ? (
                        <div className={`flex items-center gap-1 text-xs ${
                          isOverdue(optimisticTask.dueDate) ? "text-destructive" : "text-foreground"
                        }`}>
                          {isOverdue(optimisticTask.dueDate) && <AlertCircle className="h-3 w-3" />}
                          <span className="font-medium">
                            {formatTaskDueDateWithRelative(optimisticTask.dueDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Brak terminu</span>
                      )}
                    </div>

                    {/* Time Tracking - Read Only */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {optimisticTask.estimatedHours ? (
                          <div className="text-xs">
                            <span className="font-medium">{totalLoggedHours.toFixed(1)}h</span>
                            <span className="text-muted-foreground"> / {optimisticTask.estimatedHours}h</span>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <span className="font-medium">{totalLoggedHours.toFixed(1)}h</span>
                            <span className="text-muted-foreground"> zalogowane</span>
                          </div>
                        )}
                      </div>
                      {optimisticTask.estimatedHours && (
                        <Progress
                          value={(totalLoggedHours / optimisticTask.estimatedHours) * 100}
                          className="h-1"
                        />
                      )}
                    </div>

                    {/* Subtasks - Read Only */}
                    {optimisticTask.subtasks && optimisticTask.subtasks.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <div className="text-xs">
                            <span className="font-medium">{completedSubtasks}/{optimisticTask.subtasks.length}</span>
                            <span className="text-muted-foreground"> podzadań</span>
                          </div>
                        </div>
                        <Progress value={subtaskProgress} className="h-1" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Read-only view for users without edit permissions */
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground">Szczegóły zadania</h4>

                {/* Assignee - Read Only */}
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  {optimisticTask.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={optimisticTask.assignee.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {optimisticTask.assignee.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{optimisticTask.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Nieprzypisany</span>
                  )}
                </div>

                {/* Due Date - Read Only */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {optimisticTask.dueDate ? (
                    <div className={`flex items-center gap-1 text-xs ${
                      isOverdue(optimisticTask.dueDate) ? "text-destructive" : "text-foreground"
                    }`}>
                      {isOverdue(optimisticTask.dueDate) && <AlertCircle className="h-3 w-3" />}
                      <span className="font-medium">
                        {formatTaskDueDateWithRelative(optimisticTask.dueDate)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Brak terminu</span>
                  )}
                </div>

                {/* Time Tracking - Read Only */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {optimisticTask.estimatedHours ? (
                      <div className="text-xs">
                        <span className="font-medium">{totalLoggedHours.toFixed(1)}h</span>
                        <span className="text-muted-foreground"> / {optimisticTask.estimatedHours}h</span>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="font-medium">{totalLoggedHours.toFixed(1)}h</span>
                        <span className="text-muted-foreground"> zalogowane</span>
                      </div>
                    )}
                  </div>
                  {optimisticTask.estimatedHours && (
                    <Progress
                      value={(totalLoggedHours / optimisticTask.estimatedHours) * 100}
                      className="h-1"
                    />
                  )}
                </div>

                {/* Subtasks - Read Only */}
                {optimisticTask.subtasks && optimisticTask.subtasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <div className="text-xs">
                        <span className="font-medium">{completedSubtasks}/{optimisticTask.subtasks.length}</span>
                        <span className="text-muted-foreground"> podzadań</span>
                      </div>
                    </div>
                    <Progress value={subtaskProgress} className="h-1" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File Attachments */}
          {optimisticTask.attachments && optimisticTask.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Załączniki ({optimisticTask.attachments.length})</h4>
              <div className="space-y-1">
                {optimisticTask.attachments.slice(0, 3).map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-xs">
                    <File className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate flex-1" title={attachment.originalName}>
                      {attachment.originalName}
                    </span>
                    <span className="text-muted-foreground">
                      {(attachment.size / 1024).toFixed(0)}KB
                    </span>
                  </div>
                ))}
                {optimisticTask.attachments.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{optimisticTask.attachments.length - 3} więcej
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Time Entry */}
          {canEdit && onTaskUpdate && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Szybkie dodanie czasu</h4>
              <QuickTimeEntry
                task={optimisticTask}
                onTimeLogged={handleTimeLogged}
                disabled={false}
              />
            </div>
          )}

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
                  onTaskClick(optimisticTask)
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
                  onEdit(optimisticTask, e)
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
                  onTimeTracking(optimisticTask, e)
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
