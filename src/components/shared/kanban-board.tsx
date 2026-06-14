"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MoreHorizontal, Plus, AlertCircle, Trash2, X, Check, Loader2, Send, GitBranch } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source"
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element"
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@/components/ui/drop-indicator"
import type { Task, TaskStatus } from "@/types"
import type { Session } from "next-auth"
import { toast } from "sonner"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import {
  getPriorityColor,
  getPriorityShortName,
  getPriorityDisplayName,
  formatEstimatedHours,
  formatProjectDisplay,
} from "@/lib/task-format-utils"
import { TaskDetailsDialog } from "../tasks/task-details-dialog"
import { autoScheduleSlackForDoneTask } from "@/lib/auto-schedule-slack"

// Domyślny termin wykonania dla nowych zadań: teraz + 1 dzień + 1 godzina.
function getDefaultDueDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(date.getHours() + 1)
  return date
}

export interface KanbanBoardProps {
  /** If provided, tasks will be created in this project by default and project select is hidden. */
  projectId?: string
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onTaskDelete: (task: Task) => void
  canEditTask: (task: Task) => boolean
  onCreateTask?: () => void
  /** Required when projectId is not provided (so the user can pick a project for new tasks). */
  projects?: Array<{ id: string; name: string }>
  /** Optional - if not provided, useSession() is used internally. */
  session?: Session | null
  /** Hide the project select in QuickAddTask (used in "My tasks" view). */
  hideProjectSelect?: boolean
  /** Pre-fetched task statuses. If not provided, the component fetches them itself. */
  taskStatuses?: TaskStatus[]
  /** Show project name on each task card. Default: true when projectId is not provided. */
  showProjectName?: boolean
  /** Show the "Mark as complete" action. */
  enableMarkComplete?: boolean
  /** Show the "Szczegóły" (Details) dropdown item. */
  showDetailsMenuItem?: boolean
  /**
   * Server-side pagination (per status column). When `onLoadMore` is provided the
   * board switches from client-side reveal to fetching pages from the server:
   * - `columnTotals` — total number of tasks in each column (for the badge),
   * - `columnHasMore` — whether a column still has unloaded tasks,
   * - `onLoadMore` — called with a statusId when its scroll sentinel appears.
   */
  columnTotals?: Record<string, number>
  columnHasMore?: Record<string, boolean>
  onLoadMore?: (statusId: string) => void
}

interface StatusColumn extends TaskStatus {
  tasks: Task[]
}

// Number of task cards rendered per column on first paint, and how many more
// are revealed each time the user scrolls near the bottom of a column. The full
// task list lives in memory; this only limits how many cards are mounted at once
// so columns with a large number of tasks stay responsive.
const TASKS_PER_PAGE = 30

function isTaskDone(task: Task, taskStatuses: TaskStatus[]): boolean {
  const doneStatus = taskStatuses.find(status => status.name === "Done")
  return !!(doneStatus && task.statusId === doneStatus.id)
}

function SortableTaskCard({
  task,
  onTimeTracking,
  onViewDetails,
  onDelete,
  canEdit,
  isUpdating = false,
  onMarkComplete,
  taskStatuses,
  showProjectName,
  showDetailsMenuItem,
  enableMarkComplete,
}: {
  task: Task
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: boolean
  isUpdating?: boolean
  onMarkComplete?: (task: Task) => void
  taskStatuses: TaskStatus[]
  showProjectName: boolean
  showDetailsMenuItem: boolean
  enableMarkComplete: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return draggable({
      element,
      getInitialData: () => ({ type: "task", taskId: task.id, statusId: task.statusId }),
      onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
        // Trello-style preview: a tilted copy of the card following the pointer,
        // grabbed at the same point where the user picked it up.
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: preserveOffsetOnSource({ element, input: location.current.input }),
          render: ({ container }) => {
            const preview = element.cloneNode(true) as HTMLElement
            preview.style.width = `${element.getBoundingClientRect().width}px`
            preview.classList.add("kanban-drag-preview")
            container.appendChild(preview)
          },
        })
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [task.id, task.statusId])

  // Drop target reporting whether the pointer is closer to the top or bottom
  // edge of this card, so the indicator (and the drop) can land on either side.
  useEffect(() => {
    const element = ref.current
    if (!element) return

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === "task",
      getData: ({ input, element: el }) =>
        attachClosestEdge(
          { type: "task-position", taskId: task.id, statusId: task.statusId },
          { input, element: el, allowedEdges: ["top", "bottom"] }
        ),
      // Keep the indicator on this card while the pointer crosses the gap
      // between cards instead of flickering off.
      getIsSticky: () => true,
      onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    })
  }, [task.id, task.statusId])

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    if (isTaskDone(task, taskStatuses)) return false

    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    // Task is overdue one day after the due date
    const overdueDate = new Date(due)
    overdueDate.setDate(due.getDate() + 1)

    return today >= overdueDate
  }

  const completed = isTaskDone(task, taskStatuses)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsContextMenuOpen(true)
  }

  const handleDelete = async () => {
    setIsContextMenuOpen(false)
    setIsDeleting(true)
    // Wait for animation to complete before actually deleting
    await new Promise(resolve => setTimeout(resolve, 200))
    onDelete(task)
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`touch-none cursor-grab active:cursor-grabbing transition-all duration-200 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-in fade-in'
          } ${isDragging ? 'opacity-40' : ''}`}
      >
        <DropdownMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
          <Card
            className={`relative mb-2 cursor-pointer transition-all border-l-4 ${isDragging ? '' : 'hover-card-border-animate'}`}
            style={{
              borderLeftColor: completed
                ? '#10B981'
                : (task.project?.color || '#3B82F6'),
              '--hover-border-color': completed
                ? '#10B981'
                : (task.project?.color || '#3B82F6'),
              paddingTop: 5,
              paddingBottom: 0,
            } as React.CSSProperties}
          >
            <CardContent
              onContextMenu={handleContextMenu}

              className="py-2 px-3 pr-6 select-none pb-3 kanban-card cursor-pointer group relative"
              onClick={(event) => { onViewDetails(task); event.stopPropagation() }}
            >
              {/* Menu button - visible on card hover */}
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:outline-none bg-card/90 transition-opacity duration-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="kanban-card-text font-medium text-sm leading-tight cursor-pointer">
                        {task.key && (
                          <span className="text-muted-foreground  text-xs font-mono mr-1">
                            [{task.key}]
                          </span>
                        )}
                        {task.title}
                      </h4>
                      {task.changesSentAt && (
                        <div title="Wiadomość wysłana na Slack" className="inline-flex">
                          <Send className="h-3 w-3 text-green-600 flex-shrink-0" />
                        </div>
                      )}
                      {task.githubBranchName && (
                        <div title={`Branch: ${task.githubBranchName}`} className="inline-flex">
                          <GitBranch className="h-3 w-3 text-purple-500 flex-shrink-0" />
                        </div>
                      )}
                      {task.githubWorkflowError && (
                        <div title={`Błąd GitHub Workflow: ${task.githubWorkflowError}`} className="inline-flex animate-pulse">
                          <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                  {isUpdating && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
                  )}
                </div>

              </div>

              <div className="space-y-2">
                {showProjectName && task?.project?.name && (
                  <div className="text-xs text-muted-foreground">
                    {task.project.name}
                  </div>
                )}

                {task.githubWorkflowError && (
                  <div className="text-[10px] text-red-600 bg-red-500/10 border border-red-500/25 rounded px-1.5 py-0.5 mt-1 font-medium flex items-center gap-1 select-none">
                    <AlertCircle className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                    <span className="truncate" title={task.githubWorkflowError}>Błąd GitHub: {task.githubWorkflowError}</span>
                  </div>
                )}

                <div className="flex justify-between align-center w-full pt-3">
                  <div className="flex gap-3 items-center">
                    {task.priority && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${getPriorityColor(task.priority)}`}
                        title={getPriorityDisplayName(task.priority)}
                      >
                        {getPriorityShortName(task.priority)}
                      </Badge>
                    )}

                    {task.dueDate && (
                      <div
                        className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-muted-foreground'
                          }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {formatTaskDueDateWithRelative(task.dueDate)}
                        {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3 text-red-600" />}
                      </div>
                    )}
                    {(() => {
                      const mainHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) ?? 0;
                      const subtaskHours = (task.subtasks || task.todos || []).reduce((sum, entry) => sum + (entry.timeSpent ?? 0), 0);
                      const reportedHours = mainHours + subtaskHours;

                      if (!task.estimatedHours && reportedHours === 0) return null;

                      const formattedReported = reportedHours % 1 === 0 ? reportedHours.toString() : reportedHours.toFixed(1);

                      if (task.estimatedHours) {
                        const formattedEstimated = task.estimatedHours % 1 === 0 ? task.estimatedHours.toString() : task.estimatedHours.toFixed(1);
                        return (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground propo-hours" title={`Zaraportowane: ${formattedReported}h / Planowane: ${formattedEstimated}h`}>
                            <Clock className="h-3 w-3" />
                            <span>{formattedReported} / {formattedEstimated}h</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground propo-hours" title={`Zaraportowane: ${formattedReported}h`}>
                            <Clock className="h-3 w-3" />
                            <span>{formattedReported}h</span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  {task.assignee && (

                    <ClickableAvatar
                      userId={task.assignee.id}
                      avatarUrl={task.assignee.avatarUrl}
                      name={task.assignee.name}
                      size="sm"
                      className="relative -right-2 -bottom-1"
                    />
                  )}
                </div>
              </div>
            </CardContent>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Card>
        </DropdownMenu>
      </div>
      {/* Drop indicator on the closest edge; hidden on the dragged card itself
          (dropping there is a no-op). Absolutely positioned so it never shifts
          the layout while dragging. */}
      {closestEdge && !isDragging && <DropIndicator edge={closestEdge} />}
    </div>
  )
}

function QuickAddTask({
  status,
  onTaskCreated,
  projectId,
  projects,
  session,
  hideProjectSelect = false,
  onOptimisticCreate,
  onOptimisticRollback,
}: {
  status: TaskStatus
  onTaskCreated: () => void
  projectId?: string
  projects?: Array<{ id: string; name: string }>
  session: Session | null
  hideProjectSelect?: boolean
  /** Insert a temporary card immediately and return its temp id. */
  onOptimisticCreate?: (title: string, status: TaskStatus, projectId?: string) => string
  /** Remove the temporary card if the server request fails. */
  onOptimisticRollback?: (tempId: string) => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Set default project when projects change
  useEffect(() => {
    if (!projectId && projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId, projectId])

  const submitTask = async (trimmedTitle: string) => {
    setLoading(true)
    setError("")

    // Decide which projectId to use
    const effectiveProjectId = projectId
      ? projectId
      : selectedProjectId && selectedProjectId !== "no-project"
        ? selectedProjectId
        : undefined

    // Optimistic update: show the card immediately and reset the form so the
    // user can keep adding without waiting for the server round-trip.
    const tempId = onOptimisticCreate?.(trimmedTitle, status, effectiveProjectId)
    setTitle("")
    setIsAdding(false)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          projectId: effectiveProjectId,
          statusId: status.id,
          assigneeId: (session?.user as { id?: string })?.id,
          dueDate: getDefaultDueDate().toISOString(),
        }),
      })

      if (response.ok) {
        setError("")
        toast.success("Zadanie zostało utworzone")
        window.dispatchEvent(new CustomEvent('task-created'))
        // Reconcile the optimistic card with server truth.
        onTaskCreated()
      } else {
        const data = await response.json()
        const errorMessage = data.error || "Nie udało się utworzyć zadania"
        setError(errorMessage)
        toast.error(errorMessage)
        if (tempId) onOptimisticRollback?.(tempId)
      }
    } catch (error) {
      console.error("Error creating task:", error)
      const errorMessage = "Wystąpił błąd podczas tworzenia zadania"
      setError(errorMessage)
      toast.error(errorMessage)
      if (tempId) onOptimisticRollback?.(tempId)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    await submitTask(trimmedTitle)
  }

  const handleBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    if (loading) return

    // If focus is shifting to something inside the form, do nothing
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }

    // If focus is shifting to the cancel button, do nothing (let click handler run)
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('[data-action="cancel"]')) {
      return
    }

    // If focus is shifting to a Radix dropdown item/portal, do nothing
    const target = e.relatedTarget as HTMLElement | null
    if (target && (
      target.closest('[role="listbox"]') ||
      target.closest('[role="option"]') ||
      target.closest('[data-radix-popper-content-wrapper]')
    )) {
      return
    }

    const trimmedTitle = title.trim()
    if (trimmedTitle) {
      submitTask(trimmedTitle)
    } else {
      handleCancel()
    }
  }

  const handleCancel = () => {
    setTitle("")
    setIsAdding(false)
    setError("")
  }

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { setError(""); setIsAdding(true) }}
        className="w-full justify-start text-muted-foreground hover:text-foreground"
      >
        <Plus className="mr-2 h-4 w-4" />
        Dodaj zadanie
      </Button>
    )
  }

  return (
    <Card className="mb-2 p-2">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} onBlur={handleBlur} className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wpisz nazwę zadania..."
            autoFocus
            className="text-xs h-7"
            disabled={loading}
          />
          {!hideProjectSelect && !projectId && projects && projects.length > 0 && (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={loading}>
              <SelectTrigger className="mb-2">
                <SelectValue placeholder="Wybierz projekt (opcjonalne)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">
                  <span className="text-muted-foreground">Brak projektu</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {formatProjectDisplay(project)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {error && (
            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded border w-full">
              {error}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              className="w-6 h-6"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
              data-action="cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
  onTaskCreated,
  projectId,
  projects,
  session,
  hideProjectSelect,
  updatingTasks,
  taskStatuses,
  onCreateTask,
  onMarkComplete,
  showProjectName,
  showDetailsMenuItem,
  enableMarkComplete,
  onOptimisticCreate,
  onOptimisticRollback,
  columnTotal,
  serverHasMore,
  onLoadMore,
}: {
  status: StatusColumn
  tasks: Task[]
  onEdit: (task: Task) => void
  onTimeTracking: (task: Task) => void
  onViewDetails: (task: Task) => void
  onDelete: (task: Task) => void
  canEdit: (task: Task) => boolean
  onTaskCreated: () => void
  projectId?: string
  projects?: Array<{ id: string; name: string }>
  session: Session | null
  hideProjectSelect?: boolean
  updatingTasks: Set<string>
  taskStatuses: TaskStatus[]
  onCreateTask?: () => void
  onMarkComplete?: (task: Task) => void
  showProjectName: boolean
  showDetailsMenuItem: boolean
  enableMarkComplete: boolean
  onOptimisticCreate?: (title: string, status: TaskStatus, projectId?: string) => string
  onOptimisticRollback?: (tempId: string) => void
  /** Total task count for this column (server-pagination mode). */
  columnTotal?: number
  /** Whether the column still has unloaded tasks on the server. */
  serverHasMore?: boolean
  /** Called when the scroll sentinel appears, to fetch the next server page. */
  onLoadMore?: (statusId: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)

  // Two pagination modes:
  // - server mode (onLoadMore provided): the parent already passes only the
  //   loaded tasks for this column, and supplies the full total + hasMore flag;
  //   scrolling asks the parent to fetch the next page.
  // - client mode (fallback): all tasks are in memory and we only mount the
  //   first TASKS_PER_PAGE cards, revealing more as the user scrolls.
  const serverMode = !!onLoadMore
  const [visibleCount, setVisibleCount] = useState(TASKS_PER_PAGE)
  const visibleTasks = serverMode ? tasks : tasks.slice(0, visibleCount)
  const hasMore = serverMode ? !!serverHasMore : visibleCount < tasks.length
  const badgeCount = serverMode ? (columnTotal ?? tasks.length) : tasks.length

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === "task",
      getData: () => ({ type: "column", statusId: status.id }),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    })
  }, [status.id])

  // Trello-like auto-scroll: the column scrolls by itself while a card is
  // dragged near its top or bottom edge.
  useEffect(() => {
    const element = scrollContainerRef.current
    if (!element) return

    return autoScrollForElements({
      element,
      canScroll: ({ source }) => source.data.type === "task",
    })
  }, [])

  // Load / reveal the next page of cards when the bottom sentinel scrolls into view.
  useEffect(() => {
    if (!hasMore) return
    const sentinel = sentinelRef.current
    const root = scrollContainerRef.current
    if (!sentinel || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (serverMode) {
            onLoadMore?.(status.id)
          } else {
            setVisibleCount((count) => Math.min(count + TASKS_PER_PAGE, tasks.length))
          }
        }
      },
      { root, rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, tasks.length, serverMode, onLoadMore, status.id])

  return (
    <div className="flex-shrink-0 w-80">
      <div
        ref={scrollContainerRef}
        className={`kanban-scroll rounded-lg p-4 overflow-y-auto h-[calc(100vh-237px)] backdrop-blur-sm transition-colors ${isOver ? 'bg-primary/10 ring-2 ring-primary/20' : 'bg-muted/80'
          }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{status.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {badgeCount}
            </Badge>
          </div>
        </div>

        <div ref={ref} className="space-y-2 min-h-[400px]">
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <div className="mb-2">Brak zadań</div>
              <div className="text-xs">Przeciągnij zadanie tutaj lub dodaj nowe</div>
            </div>
          )}

          {visibleTasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onTimeTracking={onTimeTracking}
              onViewDetails={onViewDetails}
              onDelete={onDelete}
              canEdit={canEdit(task)}
              isUpdating={updatingTasks.has(task.id)}
              onMarkComplete={onMarkComplete}
              taskStatuses={taskStatuses}
              showProjectName={showProjectName}
              showDetailsMenuItem={showDetailsMenuItem}
              enableMarkComplete={enableMarkComplete}
            />
          ))}

          {/* Bottom sentinel: when it scrolls into view the next page is revealed */}
          {hasMore && (
            <div ref={sentinelRef} className="flex items-center justify-center py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              Ładowanie zadań...
            </div>
          )}

          {/* Show add task button only in the default column */}
          {status.isDefault && (
            <div className="space-y-2">
              <QuickAddTask
                status={status}
                onTaskCreated={onTaskCreated}
                projectId={projectId}
                projects={projects}
                session={session}
                hideProjectSelect={hideProjectSelect}
                onOptimisticCreate={onOptimisticCreate}
                onOptimisticRollback={onOptimisticRollback}
              />

            </div>
          )}
        </div>
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
  canEditTask,
  onCreateTask,
  projects,
  session: sessionProp,
  hideProjectSelect = false,
  taskStatuses: taskStatusesProp,
  showProjectName,
  enableMarkComplete = false,
  showDetailsMenuItem = false,
  columnTotals,
  columnHasMore,
  onLoadMore,
}: KanbanBoardProps) {
  const { data: sessionFromHook } = useSession()
  const session: Session | null = (sessionProp ?? (sessionFromHook as Session | null)) ?? null

  const boardRef = useRef<HTMLDivElement>(null)
  const [fetchedTaskStatuses, setFetchedTaskStatuses] = useState<TaskStatus[]>([])
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const taskStatuses = taskStatusesProp ?? fetchedTaskStatuses
  const shouldShowProjectName = showProjectName ?? !projectId

  // Keep latest data accessible inside the drag monitor without re-registering it.
  const displayTasks = optimisticTasks
  const displayTasksRef = useRef<Task[]>(displayTasks)
  displayTasksRef.current = displayTasks
  const taskStatusesRef = useRef<TaskStatus[]>(taskStatuses)
  taskStatusesRef.current = taskStatuses
  // The drag monitor below is registered once and captures the first-render
  // handleTaskDrop, so reach the latest onTaskUpdated through a ref to avoid
  // refreshing against stale board state after a drop.
  const onTaskUpdatedRef = useRef(onTaskUpdated)
  onTaskUpdatedRef.current = onTaskUpdated

  // Update optimistic tasks when props tasks change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  const fetchTaskStatuses = useCallback(async () => {
    if (taskStatusesProp && taskStatusesProp.length > 0) return
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setFetchedTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [taskStatusesProp])

  useEffect(() => {
    fetchTaskStatuses()
  }, [fetchTaskStatuses])

  // Horizontal auto-scroll of the whole board while dragging a card towards
  // a column that is off-screen.
  useEffect(() => {
    const element = boardRef.current
    if (!element) return

    return autoScrollForElements({
      element,
      canScroll: ({ source }) => source.data.type === "task",
    })
  }, [])

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "task",
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return
        handleTaskDrop(
          source.data.taskId as string,
          target.data.statusId as string,
          target.data.type === "task-position"
            ? { taskId: target.data.taskId as string, edge: extractClosestEdge(target.data) }
            : undefined
        )
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTaskDrop = async (
    taskId: string,
    newStatusId: string,
    /** Card the drop landed on (with the closest edge); none = column background. */
    target?: { taskId: string; edge: Edge | null }
  ) => {
    const currentTasks = displayTasksRef.current

    // Ignore drops that don't resolve to a real status column
    const newStatus = taskStatusesRef.current.find(status => status.id === newStatusId)
    if (!newStatus) return

    const task = currentTasks.find(t => t.id === taskId)
    if (!task) return

    // Dropping a card onto itself never moves anything.
    if (target?.taskId === taskId) return

    const getTime = (t: Task) => (t.createdAt ? new Date(t.createdAt).getTime() : 0)
    const columnTasks = currentTasks
      .filter(t => t.statusId === newStatusId && t.id !== taskId)
      .sort((a, b) => getTime(a) - getTime(b))

    // Where the card should land in the target column: above/below the hovered
    // card depending on the closest edge, or at the end when dropped on the
    // column background.
    let insertIndex = columnTasks.length
    if (target) {
      const targetIndex = columnTasks.findIndex(t => t.id === target.taskId)
      if (targetIndex !== -1) {
        insertIndex = target.edge === "bottom" ? targetIndex + 1 : targetIndex
      }
    }

    const before = columnTasks[insertIndex - 1]
    const after = columnTasks[insertIndex]
    const sameColumn = task.statusId === newStatusId

    // Skip drops that wouldn't change anything (the card already sits between
    // its would-be neighbours) so the board doesn't flash a pointless refresh.
    if (sameColumn) {
      const taskTime = getTime(task)
      const beforeTime = before ? getTime(before) : -Infinity
      const afterTime = after ? getTime(after) : Infinity
      if (taskTime > beforeTime && taskTime < afterTime) return
    }

    // Encode the position as a createdAt between the new neighbours (columns
    // are sorted by createdAt ASC).
    let newCreatedAt: string | undefined
    if (before?.createdAt && after?.createdAt) {
      newCreatedAt = new Date((getTime(before) + getTime(after)) / 2).toISOString()
    } else if (after?.createdAt) {
      newCreatedAt = new Date(getTime(after) - 60000).toISOString()
    } else if (before?.createdAt) {
      newCreatedAt = new Date(getTime(before) + 60000).toISOString()
    }

    if (sameColumn && !newCreatedAt) return

    // Mark task as updating
    setUpdatingTasks(prev => new Set(prev).add(taskId))

    // Optimistic update — the card lands in place instantly, Trello-style;
    // no loading/success toasts, only errors are surfaced.
    const previousStatusId = task.statusId
    const previousCreatedAt = task.createdAt
    setOptimisticTasks(prevTasks =>
      prevTasks.map(t => t.id === taskId ? { ...t, statusId: newStatusId, ...(newCreatedAt && { createdAt: newCreatedAt }) } : t)
    )

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusId: newStatusId,
          ...(newCreatedAt && { createdAt: newCreatedAt })
        }),
      })

      if (response.ok) {
        // Card dropped into "Done": queue its Slack send right after the
        // project's latest pending scheduled send, offset by the time reported
        // on the task. No pending send in the project = nothing happens.
        if (newStatus.name === "Done") {
          await autoScheduleSlackForDoneTask(taskId)
        }
        onTaskUpdatedRef.current()
      } else {
        // Rollback on error
        setOptimisticTasks(prevTasks =>
          prevTasks.map(t => t.id === taskId ? { ...t, statusId: previousStatusId, createdAt: previousCreatedAt } : t)
        )
        toast.error("Nie udało się zaktualizować statusu zadania", {
          id: `move-task-${taskId}`,
        })
      }
    } catch (error) {
      console.error("Error updating task status:", error)
      // Rollback on error
      setOptimisticTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? { ...t, statusId: previousStatusId, createdAt: previousCreatedAt } : t)
      )
      toast.error("Wystąpił błąd podczas aktualizacji statusu", {
        id: `move-task-${taskId}`,
      })
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  // Insert a temporary task card immediately so adding a task feels instant.
  // The card is reconciled with server data once onTaskUpdated() refetches,
  // or removed via the rollback handler if the request fails.
  const handleOptimisticCreate = useCallback(
    (title: string, status: TaskStatus, taskProjectId?: string): string => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const now = new Date().toISOString()

      let project: Task["project"] = { id: "", name: "" }
      if (projectId) {
        // Board scoped to a single project: reuse the project info of any existing task.
        const existingProject = displayTasksRef.current.find(t => t.project?.id === projectId)?.project
        project = existingProject ?? { id: projectId, name: "" }
      } else if (taskProjectId) {
        const picked = projects?.find(p => p.id === taskProjectId)
        project = picked ? { id: picked.id, name: picked.name } : { id: "", name: "" }
      }

      const sessionUser = session?.user as { id?: string; name?: string | null; email?: string | null; image?: string | null } | undefined
      const optimisticTask: Task = {
        id: tempId,
        title,
        statusId: status.id,
        dueDate: getDefaultDueDate().toISOString(),
        createdAt: now,
        project,
        assignee: sessionUser?.id
          ? {
            id: sessionUser.id,
            name: sessionUser.name ?? "",
            email: sessionUser.email ?? "",
            avatarUrl: sessionUser.image ?? null,
          }
          : undefined,
        subtasks: [],
        comments: [],
      }

      setOptimisticTasks(prev => [...prev, optimisticTask])
      return tempId
    },
    [projectId, projects, session]
  )

  const handleOptimisticRollback = useCallback((tempId: string) => {
    setOptimisticTasks(prev => prev.filter(t => t.id !== tempId))
  }, [])

  const getTasksByStatus = (status: TaskStatus) => {
    return displayTasks
      .filter(task => task.statusId === status.id)
      .slice()
      .sort((a, b) => {
        // Sort by createdAt ASC so the oldest task is at the top of the
        // column and the newest task (e.g. one just created via QuickAddTask,
        // or one dropped in from another column) ends up at the bottom.
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return aTime - bTime
      })
  }

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  const handleMarkComplete = async (task: Task) => {
    const doneStatus = taskStatuses.find(status => status.name === "Done")
    if (!doneStatus) {
      toast.error("Nie znaleziono statusu 'Done'")
      return
    }

    if (task.statusId === doneStatus.id) return

    const previousStatusId = task.statusId
    setUpdatingTasks(prev => new Set(prev).add(task.id))
    setOptimisticTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, statusId: doneStatus.id } : t)
    )

    toast.loading("Oznaczanie zadania jako zakończone...", {
      id: `complete-task-${task.id}`,
      duration: 2000,
    })

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statusId: doneStatus.id }),
      })

      if (!response.ok) {
        setOptimisticTasks(prev =>
          prev.map(t => t.id === task.id ? { ...t, statusId: previousStatusId } : t)
        )
        toast.error("Nie udało się oznaczyć zadania jako zakończone", {
          id: `complete-task-${task.id}`,
        })
      } else {
        toast.success("Zadanie oznaczone jako zakończone", {
          id: `complete-task-${task.id}`,
        })
        onTaskUpdated()
      }
    } catch (error) {
      setOptimisticTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, statusId: previousStatusId } : t)
      )
      console.error("Error marking task as complete:", error)
      toast.error("Wystąpił błąd podczas oznaczania zadania", {
        id: `complete-task-${task.id}`,
      })
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(task.id)
        return newSet
      })
    }
  }

  return (
    <>
      <div ref={boardRef} className="kanban-scroll flex space-x-4 overflow-x-auto pb-1">
        {taskStatuses.length > 0 ? taskStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={{ ...status, tasks: getTasksByStatus(status) }}
            tasks={getTasksByStatus(status)}
            onEdit={onTaskEdit}
            onTimeTracking={onTimeTracking}
            onViewDetails={handleViewDetails}
            onDelete={onTaskDelete}
            canEdit={canEditTask}
            onTaskCreated={onTaskUpdated}
            projectId={projectId}
            projects={projects}
            session={session}
            hideProjectSelect={hideProjectSelect}
            updatingTasks={updatingTasks}
            taskStatuses={taskStatuses}
            onCreateTask={onCreateTask}
            onMarkComplete={enableMarkComplete ? handleMarkComplete : undefined}
            showProjectName={shouldShowProjectName}
            showDetailsMenuItem={showDetailsMenuItem}
            enableMarkComplete={enableMarkComplete}
            onOptimisticCreate={handleOptimisticCreate}
            onOptimisticRollback={handleOptimisticRollback}
            columnTotal={columnTotals?.[status.id]}
            serverHasMore={columnHasMore?.[status.id]}
            onLoadMore={onLoadMore}
          />
        )) : (
          <div className="flex items-center justify-center w-full h-64 text-muted-foreground">
            Ładowanie statusów zadań...
          </div>
        )}
      </div>

      <TaskDetailsDialog
        open={taskDetailsDialogOpen}
        onOpenChange={setTaskDetailsDialogOpen}
        task={selectedTask}
        onEdit={onTaskEdit}
        onTimeTracking={onTimeTracking}
        onDelete={onTaskDelete}
        onTaskUpdated={onTaskUpdated}
        onTaskDeleted={onTaskUpdated}
        canEdit={selectedTask ? canEditTask(selectedTask) : false}
        projects={projects}
      />
    </>
  )
}
