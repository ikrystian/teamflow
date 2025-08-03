"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  User as UserIcon,
  Clock,
  Eye,
  FileText,
  Paperclip
} from "lucide-react"
import type { Task, TaskStatus } from "@/types"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import { getPriorityColor, getPriorityDisplayName } from "@/lib/task-format-utils"

interface ReadOnlyKanbanBoardProps {
  tasks: Task[]
  taskStatuses: TaskStatus[]
  onTaskClick?: (task: Task) => void
}

interface ReadOnlyTaskCardProps {
  task: Task
  onTaskClick?: (task: Task) => void
}

function ReadOnlyTaskCard({ task, onTaskClick }: ReadOnlyTaskCardProps) {
  const priorityColor = getPriorityColor(task.priority)
  const priorityName = getPriorityDisplayName(task.priority)

  // Calculate progress based on completed subtasks
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0
  const totalSubtasks = task.subtasks?.length || 0
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

  // Calculate total time logged
  const totalTimeLogged = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4"
      style={{ borderLeftColor: task.project?.color || '#3B82F6' }}
      onClick={() => onTaskClick?.(task)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with title and priority */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm line-clamp-2 leading-tight">
              {task.title}
            </h3>
            {task.priority && (
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${priorityColor}`}
              >
                {priorityName}
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Assignee and due date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {task.assignee ? (
              <div className="flex items-center gap-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={task.assignee.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {task.assignee.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-20">{task.assignee.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                <UserIcon className="w-4 h-4" />
                <span>Nieprzypisane</span>
              </div>
            )}
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatTaskDueDateWithRelative(task.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Progress bar for subtasks */}
        {totalSubtasks > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Podzadania</span>
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Time tracking */}
        {(task.estimatedHours || totalTimeLogged > 0) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {totalTimeLogged > 0 && `${totalTimeLogged}h zaraportowane`}
              {task.estimatedHours && totalTimeLogged > 0 && " / "}
              {task.estimatedHours && `${task.estimatedHours}h szacowane`}
            </span>
          </div>
        )}

        {/* Attachments and comments indicators */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </div>
          )}
          {((task.attachments && task.attachments.length > 0) || (task.images && task.images.length > 0)) && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              <span>{(task.attachments?.length || 0) + (task.images?.length || 0)}</span>
            </div>
          )}
        </div>

        {/* View details button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            onTaskClick?.(task)
          }}
        >
          <Eye className="w-3 h-3 mr-1" />
          Zobacz szczegóły
        </Button>
      </CardContent>
    </Card>
  )
}

interface ReadOnlyKanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

function ReadOnlyKanbanColumn({ status, tasks, onTaskClick }: ReadOnlyKanbanColumnProps) {
  return (
    <div className="flex flex-col w-80 shrink-0">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-semibold text-sm">{status.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 min-h-[400px] bg-muted/20">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <div className="mb-2">Brak zadań</div>
          </div>
        ) : (
          tasks.map((task) => (
            <ReadOnlyTaskCard
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function ReadOnlyKanbanBoard({ tasks, taskStatuses, onTaskClick }: ReadOnlyKanbanBoardProps) {
  // Group tasks by status
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.statusId === status.id)
  }

  const statusColumns = taskStatuses.map(status => ({
    ...status,
    tasks: getTasksByStatus(status)
  }))

  if (taskStatuses.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-64 text-muted-foreground">
        Ładowanie statusów zadań...
      </div>
    )
  }

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {statusColumns.map((status) => (
        <ReadOnlyKanbanColumn
          key={status.id}
          status={status}
          tasks={status.tasks}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  )
}
