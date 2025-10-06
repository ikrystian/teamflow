"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Paperclip,
  Image as ImageIcon,
  MessageSquare,
  Timer
} from "lucide-react"
import type { Task } from "@/types"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import { getPriorityColor, getPriorityDisplayName } from "@/lib/task-format-utils"

interface ReadOnlyTaskDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
}

export function ReadOnlyTaskDetails({
  open,
  onOpenChange,
  task
}: ReadOnlyTaskDetailsProps) {
  if (!task) return null

  const priorityColor = getPriorityColor(task.priority)
  const priorityName = getPriorityDisplayName(task.priority)

  // Calculate progress based on completed subtasks
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0
  const totalSubtasks = task.subtasks?.length || 0
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

  // Calculate total time logged
  const totalTimeLogged = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0

  // Calculate completed todos
  const completedTodos = task.todos?.filter(todo => todo.isCompleted).length || 0
  const totalTodos = task.todos?.length || 0
  const todoProgress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[50vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[80vh]">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
                {task.priority && (
                  <Badge variant="outline" className={priorityColor}>
                    {priorityName}
                  </Badge>
                )}
              </div>

              {task.description && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}
            </div>

            {/* Subtasks */}
            {totalSubtasks > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Podzadania ({completedSubtasks}/{totalSubtasks})
                  </CardTitle>
                  <Progress value={progress} className="w-full" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.subtasks?.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          subtask.isCompleted
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <span className={subtask.isCompleted ? 'line-through text-muted-foreground' : ''}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Todos */}
            {totalTodos > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Lista kontrolna ({completedTodos}/{totalTodos})
                  </CardTitle>
                  <Progress value={todoProgress} className="w-full" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.todos?.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          todo.isCompleted
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <span className={todo.isCompleted ? 'line-through text-muted-foreground' : ''}>
                        {todo.title}
                      </span>
                      {todo.timeSpent && todo.timeSpent > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {todo.timeSpent}h
                        </Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            {task.comments && task.comments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Komentarze ({task.comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.author.avatarUrl} />
                        <AvatarFallback>
                          {comment.author.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{comment.author.name}</span>
                          <span className="text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {((task.attachments && task.attachments.length > 0) || (task.images && task.images.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Paperclip className="w-5 h-5" />
                    Załączniki ({(task.attachments?.length || 0) + (task.images?.length || 0)})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.images?.map((image) => (
                    <div key={image.id} className="flex items-center gap-2 p-2 border rounded">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{image.filename}</span>
                      <Badge variant="outline" className="text-xs">
                        {(image.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  ))}
                  {task.attachments?.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{attachment.originalName}</span>
                      <Badge variant="outline" className="text-xs">
                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informacje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: task.taskStatus?.color || '#6B7280' }}
                    />
                    <span className="text-sm">{task.taskStatus?.name || 'Brak statusu'}</span>
                  </div>
                </div>

                <Separator />

                {/* Assignee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Przypisane do</label>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task.assignee.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nieprzypisane</span>
                  )}
                </div>

                <Separator />

                {/* Created by */}
                {task.createdBy && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Utworzone przez</label>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={task.createdBy.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {task.createdBy.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.createdBy.name}</span>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Due Date */}
                {task.dueDate && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Termin wykonania</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatTaskDueDateWithRelative(task.dueDate)}</span>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Time tracking */}
                {(task.estimatedHours || totalTimeLogged > 0) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Czas pracy</label>
                      <div className="space-y-1">
                        {totalTimeLogged > 0 && (
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{totalTimeLogged}h zaraportowane</span>
                          </div>
                        )}
                        {task.estimatedHours && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{task.estimatedHours}h szacowane</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Dates */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Daty</label>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Utworzone: {new Date(task.createdAt).toLocaleDateString('pl-PL')}</div>
                    {task.startTime && (
                      <div>Rozpoczęcie: {new Date(task.startTime).toLocaleString('pl-PL')}</div>
                    )}
                    {task.endTime && (
                      <div>Zakończenie: {new Date(task.endTime).toLocaleString('pl-PL')}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Entries */}
            {task.timeEntries && task.timeEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Timer className="w-5 h-5" />
                    Historia czasu ({task.timeEntries.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={entry.user.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {entry.user.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{entry.hours}h</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString('pl-PL')}
                          </div>
                        </div>
                      </div>
                      {entry.description && (
                        <span className="text-xs text-muted-foreground max-w-32 truncate">
                          {entry.description}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
