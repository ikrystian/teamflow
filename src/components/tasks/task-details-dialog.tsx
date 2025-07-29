"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  User as UserIcon,
  UserCheck,
  Clock,
  Edit,
  CheckSquare,
  Timer,
  AlertCircle,
  CheckCircle2,
  Image,
  Trash2,
  FileText,
  MessageSquare,
  ListTodo
} from "lucide-react"
import { ImageGallery } from "@/components/ui/image-gallery"
import { TaskComments } from "@/components/tasks/task-comments"
import { TaskTodos } from "@/components/tasks/task-todos"
import type { Task, Todo } from "@/types"

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface TaskDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task, e: React.MouseEvent) => void
  onTimeTracking?: (task: Task, e: React.MouseEvent) => void
  onDelete?: (task: Task, e: React.MouseEvent) => void
  onTaskUpdated?: () => void
  canEdit?: boolean
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onEdit,
  onTimeTracking,
  onDelete,
  onTaskUpdated,
  canEdit = false
}: TaskDetailsDialogProps) {
  const [comments, setComments] = useState(task?.comments || [])
  const [todos, setTodos] = useState(task?.todos || [])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])

  // Fetch fresh task data when dialog opens
  useEffect(() => {
    const fetchTaskData = async () => {
      if (open && task?.id) {
        try {
          const response = await fetch(`/api/tasks/${task.id}`)
          if (response.ok) {
            const data = await response.json()
            setComments(data.task.comments || [])
            setTodos(data.task.todos || [])
          }
        } catch (error) {
          console.error("Error fetching task data:", error)
        }
      }
    }

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

    if (open && task?.id) {
      fetchTaskData()
      fetchTaskStatuses()
    } else {
      setComments(task?.comments || [])
      setTodos(task?.todos || [])
    }
  }, [open, task?.id, task?.comments, task?.todos])

  const handleCommentAdded = (newComment: { id: string; content: string; createdAt: string; author: { id: string; name: string; avatarUrl?: string } }) => {
    setComments(prev => [newComment, ...prev])
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId))
  }

  const handleTodosChange = (updatedTodos: Todo[]) => {
    setTodos(updatedTodos)
    if (onTaskUpdated) {
      onTaskUpdated()
    }
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

  const getTaskStatus = (task: Task) => {
    if (task.statusId) {
      return taskStatuses.find(status => status.id === task.statusId)
    }
    return null
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
      return "Dzisiaj"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Jutro"
    } else {
      return date.toLocaleDateString()
    }
  }

  const totalLoggedHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
  const completedSubtasks = task.subtasks.filter(subtask => subtask.isCompleted).length
  const subtaskProgress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="space-y-4">
            <DialogTitle className="text-2xl font-bold line-clamp-2">
              {task.title}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {task.project ? (
                <>
                  <Badge variant="outline" className="text-xs font-medium">
                    {task.project.name}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium">
                    {task.project.team.name}
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                  Brak projektu
                </Badge>
              )}
              {task.priority && (
                <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                  {task.priority === "Low" ? "Niski" : task.priority === "Medium" ? "Średni" : "Wysoki"}
                </Badge>
              )}
              {(() => {
                const taskStatus = getTaskStatus(task)
                return (
                  <Badge
                    variant="default"
                    className="text-white"
                    style={{ backgroundColor: taskStatus?.color || '#6B7280' }}
                  >
                    {taskStatus?.name || 'Brak statusu'}
                  </Badge>
                )
              })()}
            </div>
            <div className="flex items-center gap-2">
              {onTimeTracking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    onOpenChange(false)
                    onTimeTracking?.(task, e)
                  }}
                >
                  <Timer className="h-4 w-4 mr-2" />
                  Loguj czas
                </Button>
              )}
              {canEdit && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    onOpenChange(false)
                    onEdit(task, e)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edytuj
                </Button>
              )}
              {canEdit && onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    onOpenChange(false)
                    onDelete?.(task, e)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Przegląd
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Zadania
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Komentarze
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Aktywność
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Description */}
              {task.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Opis zadania</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: task.description }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Images */}
              {task.images && task.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <Image className="h-5 w-5" />
                      Załączniki ({task.images.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageGallery
                      images={task.images}
                      editable={false}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Task Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Szczegóły zadania</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assignee */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                        Przypisany
                      </div>
                      {task.assignee ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={task.assignee.avatarUrl} />
                            <AvatarFallback className="text-sm">
                              {task.assignee.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Nieprzypisany</span>
                      )}
                    </div>

                    {/* Author */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <UserCheck className="h-4 w-4" />
                        Utworzone przez
                      </div>
                      {task.createdBy ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={task.createdBy.avatarUrl} />
                            <AvatarFallback className="text-sm">
                              {task.createdBy.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{task.createdBy.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Nieznany</span>
                      )}
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Termin wykonania
                      </div>
                      {task.dueDate ? (
                        <div className={`flex items-center gap-2 ${
                          isOverdue(task.dueDate) ? "text-destructive" : "text-foreground"
                        }`}>
                          {isOverdue(task.dueDate) && <AlertCircle className="h-4 w-4" />}
                          <span className="font-medium">
                            {formatDate(task.dueDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Brak terminu</span>
                      )}
                    </div>

                    {/* Time Tracking */}
                    {task.estimatedHours && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Czas pracy
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{totalLoggedHours.toFixed(1)}h</span>
                            <span className="text-muted-foreground"> / {task.estimatedHours}h</span>
                          </div>
                          <Progress
                            value={(totalLoggedHours / task.estimatedHours) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                    )}

                    {/* Created */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <CheckSquare className="h-4 w-4" />
                        Data utworzenia
                      </div>
                      <span className="font-medium">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subtasks */}
              {task.subtasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Podzadania ({completedSubtasks}/{task.subtasks.length})
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(subtaskProgress)}% ukończono
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={subtaskProgress} className="h-2" />
                    <div className="space-y-3">
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-3 p-2 rounded-lg border">
                          {subtask.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground rounded flex-shrink-0" />
                          )}
                          <span className={`text-sm ${
                            subtask.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                          }`}>
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="todos" className="mt-0">
              <TaskTodos
                taskId={task.id}
                todos={todos}
                onTodosChange={handleTodosChange}
              />
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <TaskComments
                taskId={task.id}
                comments={comments}
                onCommentAdded={handleCommentAdded}
                onCommentDeleted={handleCommentDeleted}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historia aktywności</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-muted-foreground">
                        Zadanie utworzone {formatDate(task.createdAt)}
                      </span>
                    </div>
                    {task.timeEntries && task.timeEntries.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Wpisy czasu pracy:</h4>
                        {task.timeEntries.map((entry, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm pl-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-muted-foreground">
                              {entry.hours}h - {entry.description || 'Brak opisu'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
