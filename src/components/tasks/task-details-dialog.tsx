"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  User,
  UserCheck,
  Clock,
  Edit,
  CheckSquare,
  MessageSquare,
  Timer,
  AlertCircle,
  CheckCircle2,
  Image
} from "lucide-react"
import { ImageGallery } from "@/components/ui/image-gallery"
import { TaskComments } from "@/components/tasks/task-comments"

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TaskImage {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  createdAt: string
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
    team: {
      id: string
      name: string
    }
  }
  assignee?: User
  createdBy?: User
  subtasks: {
    id: string
    title: string
    isCompleted: boolean
  }[]
  comments: {
    id: string
    content: string
    createdAt: string
    author: {
      id: string
      name: string
      avatarUrl?: string
    }
  }[]
  timeEntries?: {
    id: string
    hours: number
    description?: string
    date: string
    user: User
  }[]
  images?: TaskImage[]
}

interface TaskDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task) => void
  onTimeTracking?: (task: Task) => void
  canEdit?: boolean
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onEdit,
  onTimeTracking,
  canEdit = false
}: TaskDetailsDialogProps) {
  const [comments, setComments] = useState(task?.comments || [])
  
  useEffect(() => {
    setComments(task?.comments || [])
  }, [task?.comments])
  
  const handleCommentAdded = (newComment: any) => {
    setComments(prev => [newComment, ...prev])
  }
  
  if (!task) return null

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "bg-green-100 text-green-800 border-green-200"
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "To Do":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow"
    } else {
      return date.toLocaleDateString()
    }
  }

  const totalLoggedHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
  const completedSubtasks = task.subtasks.filter(subtask => subtask.isCompleted).length
  const subtaskProgress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <DialogTitle className="text-xl font-semibold leading-tight">
                {task.title}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                in {task.project.name}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit?.(task)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onTimeTracking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onTimeTracking?.(task)
                  }}
                >
                  <Timer className="h-4 w-4 mr-2" />
                  Log Time
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor(task.status)}>
              {task.status}
            </Badge>
            {task.priority && (
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority} Priority
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <div 
                className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </div>
          )}

          {/* Images */}
          {task.images && task.images.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Image className="h-4 w-4 mr-2" />
                Images ({task.images.length})
              </h4>
              <ImageGallery 
                images={task.images} 
                editable={false}
              />
            </div>
          )}

          {/* Task Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assignee */}
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Assignee</p>
                {task.assignee ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {task.assignee.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 mt-1">Unassigned</span>
                )}
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center space-x-3">
              <UserCheck className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Created By</p>
                {task.createdBy ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.createdBy.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {task.createdBy.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{task.createdBy.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 mt-1">Unknown</span>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Due Date</p>
                {task.dueDate ? (
                  <div className={`flex items-center space-x-1 mt-1 ${
                    isOverdue(task.dueDate) ? "text-red-600" : "text-gray-900"
                  }`}>
                    {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3" />}
                    <span className="text-sm font-medium">
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 mt-1">No due date</span>
                )}
              </div>
            </div>

            {/* Time Tracking */}
            {task.estimatedHours && (
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                  <span className="text-sm font-medium mt-1">
                    {totalLoggedHours.toFixed(1)}h / {task.estimatedHours}h
                  </span>
                </div>
              </div>
            )}

            {/* Created */}
            <div className="flex items-center space-x-3">
              <CheckSquare className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
                <span className="text-sm font-medium mt-1">
                  {formatDate(task.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">
                  Subtasks ({completedSubtasks}/{task.subtasks.length})
                </h4>
                <span className="text-xs text-gray-500">
                  {Math.round(subtaskProgress)}% complete
                </span>
              </div>
              <Progress value={subtaskProgress} className="mb-3" />
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center space-x-2">
                    {subtask.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 border border-gray-300 rounded" />
                    )}
                    <span className={`text-sm ${
                      subtask.isCompleted ? "line-through text-gray-500" : "text-gray-900"
                    }`}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <TaskComments
            taskId={task.id}
            comments={comments}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
