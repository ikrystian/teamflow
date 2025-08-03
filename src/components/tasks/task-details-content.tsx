"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Check,
  X,
  Bell
} from "lucide-react"
import { ImageGallery } from "@/components/ui/image-gallery"
import { TaskComments } from "@/components/tasks/task-comments"
import { TaskTodos } from "@/components/tasks/task-todos"
import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SlackNotificationModal } from "@/components/tasks/slack-notification-modal"
import type { Task, Todo, User } from "@/types"
import { formatTaskDueDateWithRelative, dateToLocalDateString } from "@/lib/date-utils"

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface TaskDetailsContentProps {
  task: Task
  onEdit?: (task: Task, e: React.MouseEvent) => void
  onTimeTracking?: (task: Task, e: React.MouseEvent) => void
  onDelete?: (task: Task, e: React.MouseEvent) => void
  onTaskUpdated?: () => void
  canEdit?: boolean
  onClose?: () => void
  showCommentsInTabs?: boolean
}

export function TaskDetailsContent({
  task,
  onEdit,
  onTimeTracking,
  onDelete,
  onTaskUpdated,
  canEdit = false,
  onClose,
  showCommentsInTabs = true
}: TaskDetailsContentProps) {
  const [comments, setComments] = useState(task?.comments || [])
  const [todos, setTodos] = useState(task?.todos || [])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  
  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDescription, setEditDescription] = useState(task.description || "")
  const [editPriority, setEditPriority] = useState(task.priority || "none")
  const [editDueDate, setEditDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : "")
  const [editAssigneeId, setEditAssigneeId] = useState(task.assignee?.id || "unassigned")
  const [editEstimatedHours, setEditEstimatedHours] = useState(task.estimatedHours?.toString() || "none")
  const [saving, setSaving] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)

  // Fetch fresh task data when task changes
  useEffect(() => {
    const fetchTaskData = async () => {
      if (task?.id) {
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

    const fetchTeamMembers = async () => {
      if (task?.project?.team?.id) {
        try {
          const response = await fetch(`/api/teams/${task.project.team.id}/members`)
          if (response.ok) {
            const data = await response.json()
            setTeamMembers(data.members || [])
          }
        } catch (error) {
          console.error("Error fetching team members:", error)
        }
      }
    }

    if (task?.id) {
      fetchTaskData()
      fetchTaskStatuses()
      fetchTeamMembers()
    } else {
      setComments(task?.comments || [])
      setTodos(task?.todos || [])
    }
  }, [task?.id, task?.comments, task?.todos, task?.project?.team?.id])

  // Update local state when task changes
  useEffect(() => {
    setEditTitle(task.title)
    setEditDescription(task.description || "")
    setEditPriority(task.priority || "none")
    setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : "")
    setEditAssigneeId(task.assignee?.id || "unassigned")
    setEditEstimatedHours(task.estimatedHours?.toString() || "none")
  }, [task])

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

  const saveField = async (field: string, value: string | number | undefined) => {
    if (!canEdit) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: value
        }),
      })

      if (response.ok) {
        setEditingField(null)
        onTaskUpdated?.()
      } else {
        console.error("Failed to update task field:", field)
      }
    } catch (error) {
      console.error("Error updating task field:", field, error)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = (field: string) => {
    setEditingField(null)
    // Reset to original values
    switch (field) {
      case 'title':
        setEditTitle(task.title)
        break
      case 'description':
        setEditDescription(task.description || "")
        break
      case 'priority':
        setEditPriority(task.priority || "none")
        break
      case 'dueDate':
        setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : "")
        break
      case 'assigneeId':
        setEditAssigneeId(task.assignee?.id || "unassigned")
        break
      case 'estimatedHours':
        setEditEstimatedHours(task.estimatedHours?.toString() || "none")
        break
    }
  }

  const startEdit = (field: string) => {
    if (!canEdit) return
    setEditingField(field)
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

    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    // Task is overdue one day after the due date
    const overdueDate = new Date(due)
    overdueDate.setDate(due.getDate() + 1)

    return today >= overdueDate
  }

  const totalLoggedHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
  const completedSubtasks = task.subtasks.filter(subtask => subtask.isCompleted).length
  const subtaskProgress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0

  return (
    <div className="overflow-y-auto">
      {/* Header Section */}
      <div className="space-y-4">
        {editingField === 'title' ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-2xl font-bold h-12"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveField('title', editTitle.trim())
                } else if (e.key === 'Escape') {
                  cancelEdit('title')
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveField('title', editTitle.trim())}
              disabled={saving || !editTitle.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => cancelEdit('title')}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <h2 
            className={`text-2xl font-bold line-clamp-2 ${canEdit ? 'cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors' : ''}`}
            onClick={() => startEdit('title')}
            title={canEdit ? "Kliknij aby edytować tytuł" : undefined}
          >
            {task.title}
          </h2>
        )}
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
          {editingField === 'priority' ? (
            <div className="flex items-center gap-2">
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue placeholder="Priorytet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak priorytetu</SelectItem>
                  <SelectItem value="Low">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Niski</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Medium">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span>Średni</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="High">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Wysoki</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveField('priority', editPriority === 'none' ? undefined : editPriority)}
                disabled={saving}
                className="h-7 w-7 p-0"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline" 
                onClick={() => cancelEdit('priority')}
                disabled={saving}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            task.priority ? (
              <Badge 
                variant="secondary" 
                className={`${getPriorityColor(task.priority)} ${canEdit ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => startEdit('priority')}
                title={canEdit ? "Kliknij aby zmienić priorytet" : undefined}
              >
                {task.priority === "Low" ? "Niski" : task.priority === "Medium" ? "Średni" : "Wysoki"}
              </Badge>
            ) : canEdit ? (
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground"
                onClick={() => startEdit('priority')}
                title="Kliknij aby ustawić priorytet"
              >
                Brak priorytetu
              </Badge>
            ) : null
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotificationModal(true)}
          >
            <Bell className="h-4 w-4 mr-2" />
            Powiadom
          </Button>
          {onTimeTracking && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                onClose?.()
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
                onClose?.()
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
                onClose?.()
                onDelete?.(task, e)
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="flex-1 overflow-auto">
        <TabsList className={`grid w-full ${showCommentsInTabs ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Przegląd
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Zadania
          </TabsTrigger>
          {showCommentsInTabs && (
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Komentarze
            </TabsTrigger>
          )}
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Aktywność
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4">
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Opis zadania</CardTitle>
              </CardHeader>
              <CardContent>
                {editingField === 'description' ? (
                  <div className="space-y-3">
                    <div className="border rounded-md">
                      <RichTextEditor
                        content={editDescription}
                        onChange={setEditDescription}
                        placeholder="Wprowadź szczegółowy opis zadania..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveField('description', editDescription.trim() || undefined)}
                        disabled={saving}
                      >
                        <Check className="h-4 w-4" />
                        Zapisz
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelEdit('description')}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`prose prose-sm max-w-none text-muted-foreground ${canEdit ? 'cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors' : ''} ${!task.description ? 'text-muted-foreground italic' : ''}`}
                    onClick={() => startEdit('description')}
                    title={canEdit ? "Kliknij aby edytować opis" : undefined}
                    dangerouslySetInnerHTML={{ __html: task.description || "Brak opisu - kliknij aby dodać" }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Images */}
            {task.images && task.images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
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
                    {editingField === 'assigneeId' ? (
                      <div className="space-y-2">
                        <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Wybierz przypisanego" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Nieprzypisany</SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{member.name || member.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveField('assigneeId', editAssigneeId === 'unassigned' ? null : editAssigneeId)}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEdit('assigneeId')}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`${canEdit ? 'cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors' : ''}`}
                        onClick={() => startEdit('assigneeId')}
                        title={canEdit ? "Kliknij aby zmienić przypisanego" : undefined}
                      >
                        {task.assignee ? (
                          <div className="flex items-center gap-3">
                            {task.assignee.avatarUrl ? (
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
                              <>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={task.assignee.avatarUrl} />
                                  <AvatarFallback className="text-sm">
                                    {task.assignee.name?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{task.assignee.name}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nieprzypisany</span>
                        )}
                      </div>
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
                        {task.createdBy.avatarUrl ? (
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
                          <>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={task.createdBy.avatarUrl} />
                              <AvatarFallback className="text-sm">
                                {task.createdBy.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{task.createdBy.name}</span>
                          </>
                        )}
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
                    {editingField === 'dueDate' ? (
                      <div className="space-y-2">
                        <DatePicker
                          value={editDueDate ? new Date(editDueDate) : undefined}
                          onChange={(date) => setEditDueDate(date ? dateToLocalDateString(date) : '')}
                          className="rounded-lg border shadow-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveField('dueDate', editDueDate || undefined)}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEdit('dueDate')}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`${canEdit ? 'cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors' : ''}`}
                        onClick={() => startEdit('dueDate')}
                        title={canEdit ? "Kliknij aby zmienić termin" : undefined}
                      >
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
                    )}
                  </div>

                  {/* Time Tracking */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Czas pracy
                    </div>
                    {editingField === 'estimatedHours' ? (
                      <div className="space-y-2">
                        <Select value={editEstimatedHours} onValueChange={setEditEstimatedHours}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Wybierz szacowany czas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Brak szacunku</SelectItem>
                            <SelectItem value="0.5">30 minut</SelectItem>
                            <SelectItem value="1">1 godzina</SelectItem>
                            <SelectItem value="1.5">1.5 godziny</SelectItem>
                            <SelectItem value="2">2 godziny</SelectItem>
                            <SelectItem value="2.5">2.5 godziny</SelectItem>
                            <SelectItem value="3">3 godziny</SelectItem>
                            <SelectItem value="3.5">3.5 godziny</SelectItem>
                            <SelectItem value="4">4 godziny</SelectItem>
                            <SelectItem value="4.5">4.5 godziny</SelectItem>
                            <SelectItem value="5">5 godzin</SelectItem>
                            <SelectItem value="5.5">5.5 godziny</SelectItem>
                            <SelectItem value="6">6 godzin</SelectItem>
                            <SelectItem value="6.5">6.5 godziny</SelectItem>
                            <SelectItem value="7">7 godzin</SelectItem>
                            <SelectItem value="7.5">7.5 godziny</SelectItem>
                            <SelectItem value="8">8 godzin</SelectItem>
                            <SelectItem value="12">12 godzin</SelectItem>
                            <SelectItem value="16">16 godzin</SelectItem>
                            <SelectItem value="24">24 godziny</SelectItem>
                            <SelectItem value="40">40 godzin</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveField('estimatedHours', editEstimatedHours === 'none' ? undefined : parseFloat(editEstimatedHours))}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEdit('estimatedHours')}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`${canEdit ? 'cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors' : ''}`}
                        onClick={() => startEdit('estimatedHours')}
                        title={canEdit ? "Kliknij aby zmienić szacowany czas" : undefined}
                      >
                        {task.estimatedHours ? (
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
                        ) : (
                          <span className="text-muted-foreground">Brak szacunku</span>
                        )}
                      </div>
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

            {/* Comments (only if not in tabs) */}
            {!showCommentsInTabs && (
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
            )}
          </TabsContent>

          <TabsContent value="todos" className="mt-0">
            <TaskTodos
              taskId={task.id}
              todos={todos}
              onTodosChange={handleTodosChange}
            />
          </TabsContent>

          {showCommentsInTabs && (
            <TabsContent value="comments" className="mt-0">
              <TaskComments
                taskId={task.id}
                comments={comments}
                onCommentAdded={handleCommentAdded}
                onCommentDeleted={handleCommentDeleted}
              />
            </TabsContent>
          )}

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
      
      {/* Slack Notification Modal */}
      <SlackNotificationModal
        open={showNotificationModal}
        onOpenChange={setShowNotificationModal}
        task={task}
      />
    </div>
  )
}