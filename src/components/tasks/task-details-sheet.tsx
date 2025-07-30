"use client"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
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
  ListTodo,
  Lock,
  Unlock,
  Shield
} from "lucide-react"
import { ImageGallery } from "@/components/ui/image-gallery"
import { TaskComments } from "@/components/tasks/task-comments"
import { TaskTodos } from "@/components/tasks/task-todos"
import { TaskBlockDialog } from "@/components/tasks/task-block-dialog"
import type { Task, Todo } from "@/types"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import { getTaskBlockedDurationInfo, canUserBlockTask } from "@/lib/task-utils"
import { ClickableAvatar } from "../ui/clickable-avatar"

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface TaskDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task, e: React.MouseEvent) => void
  onTimeTracking?: (task: Task, e: React.MouseEvent) => void
  onDelete?: (task: Task, e: React.MouseEvent) => void
  onTaskUpdated?: () => void
  canEdit?: boolean
}

export function TaskDetailsSheet({
  open,
  onOpenChange,
  task,
  onEdit,
  onTimeTracking,
  onDelete,
  onTaskUpdated,
  canEdit = false
}: TaskDetailsSheetProps) {
  const { data: session } = useSession() as { data: Session | null }
  const [comments, setComments] = useState(task?.comments || [])
  const [todos, setTodos] = useState(task?.todos || [])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)

  // Fetch fresh task data when sheet opens
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

  // Function to handle task updates and refresh the view
  const handleTaskUpdated = () => {
    // Call the parent's onTaskUpdated to refresh the task data
    if (onTaskUpdated) {
      onTaskUpdated()
    }
  }

  const handleCommentAdded = (newComment: { id: string; content: string; createdAt: string; author: { id: string; name: string; avatarUrl?: string } }) => {
    setComments(prev => [newComment, ...prev])
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId))
  }

  const handleTodosChange = (updatedTodos: Todo[]) => {
    setTodos(updatedTodos)
    handleTaskUpdated()
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

    // Don't show completed tasks as overdue
    if (task && task.statusId && taskStatuses.length > 0) {
      const doneStatus = taskStatuses.find(status => status.name === "Done")
      if (doneStatus && task.statusId === doneStatus.id) {
        return false
      }
    }

    return new Date(dueDate) < new Date()
  }



  const totalLoggedHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
  const completedSubtasks = task.subtasks.filter(subtask => subtask.isCompleted).length
  const subtaskProgress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-hidden flex flex-col">
        <SheetHeader className="space-y-3 pb-4 border-b">
          <div className="space-y-4">
            <SheetTitle className="text-2xl font-bold line-clamp-2 text-left">
              {task.title}
            </SheetTitle>
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
            <div className="flex items-center gap-2 flex-wrap">
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
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col px-4">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Przegląd
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Zadania
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Aktywność
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Assignee */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                        Przypisany
                      </div>



                      {task.assignee ? (


                      <Tooltip>
                        <TooltipTrigger>

                          <ClickableAvatar
                              userId={task.assignee.id}
                              avatarUrl={task.assignee.avatarUrl}
                              name={task.assignee.name}
                              size="sm"
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="font-medium">{task.assignee.name}</span>
                        </TooltipContent>
                      </Tooltip>


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

                      <Tooltip>
                        <TooltipTrigger>

                          <ClickableAvatar
                              userId={task.createdBy.id}
                              avatarUrl={task.createdBy.avatarUrl}
                              name={task.createdBy.name}
                              size="sm"
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="font-medium">{task.createdBy.name}</span>
                        </TooltipContent>
                      </Tooltip>
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
                            {formatTaskDueDateWithRelative(task.dueDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Brak terminu</span>
                      )}
                    </div>


                    {/* Created */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <CheckSquare className="h-4 w-4" />
                        Data utworzenia
                      </div>
                      <span className="font-medium">
                        {formatTaskDueDateWithRelative(task.createdAt)}
                      </span>
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

                  </div>
                </CardContent>
              </Card>

              {/* Task Blocking Section */}
              {(() => {
                const blockingInfo = getTaskBlockedDurationInfo(task)
                if (!blockingInfo && !task.isBlocked) return null

                return (
                  <Card className={task.isBlocked ? "border-red-500 bg-red-50/50" : "border-orange-500 bg-orange-50/50"}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {task.isBlocked ? (
                          <>
                            <Lock className="h-5 w-5 text-red-600" />
                            Zadanie zablokowane
                          </>
                        ) : (
                          <>
                            <Unlock className="h-5 w-5 text-orange-600" />
                            Historia blokowania
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {task.isBlocked && task.blockReason && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            Powód blokady
                          </div>
                          <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{task.blockReason}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {task.blockedAt && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Data blokowania
                            </div>
                            <span className="text-sm font-medium">
                              {formatTaskDueDateWithRelative(task.blockedAt)}
                            </span>
                          </div>
                        )}

                        {task.unblockedAt && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4" />
                              Data odblokowania
                            </div>
                            <span className="text-sm font-medium">
                              {formatTaskDueDateWithRelative(task.unblockedAt)}
                            </span>
                          </div>
                        )}

                        {blockingInfo && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Timer className="h-4 w-4" />
                              Czas blokowania
                            </div>
                            <span className="text-sm font-medium">
                              {blockingInfo.formattedDuration}
                            </span>
                          </div>
                        )}

                        {task.blockedBy && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <UserIcon className="h-4 w-4" />
                              Zablokowane przez
                            </div>
                            <div className="flex items-center gap-2">
                              <ClickableAvatar
                                userId={task.blockedBy.id}
                                avatarUrl={task.blockedBy.avatarUrl}
                                name={task.blockedBy.name}
                                size="sm"
                              />
                              <span className="text-sm font-medium">{task.blockedBy.name}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Block/Unblock Button */}
                      {(() => {
                        const canBlock = canUserBlockTask(task, session?.user?.id)
                        if (!canBlock) return null

                        return (
                          <div className="pt-4 border-t">
                            <Button
                              variant={task.isBlocked ? "default" : "destructive"}
                              size="sm"
                              onClick={() => setBlockDialogOpen(true)}
                              className={task.isBlocked ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {task.isBlocked ? (
                                <>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Odblokuj zadanie
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Zablokuj zadanie
                                </>
                              )}
                            </Button>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )
              })()}

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

              {/* Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Komentarze ({comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskComments
                    taskId={task.id}
                    comments={comments}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="todos" className="mt-0">
              <TaskTodos
                taskId={task.id}
                todos={todos}
                onTodosChange={handleTodosChange}
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
                        Zadanie utworzone {formatTaskDueDateWithRelative(task.createdAt)}
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
      </SheetContent>

      {/* Task Block Dialog */}
      <TaskBlockDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        task={task}
        onTaskUpdated={handleTaskUpdated}
      />
    </Sheet>
  )
}
