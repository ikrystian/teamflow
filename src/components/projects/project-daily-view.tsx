"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react"
import { type Task } from "@/types"
import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns"
import { pl } from "date-fns/locale"
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSwipe } from "@/hooks/use-swipe"
import { cn } from "@/lib/utils"
import { QuickAddTaskCommand } from "./quick-add-task-command"

interface ProjectDailyViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onCreateTask?: () => void
  onTaskUpdate?: (taskId: string, updates: { startTime?: string; endTime?: string; assigneeId?: string }) => Promise<void>
  onTaskCreated?: () => void
  /** Optimistic create hooks forwarded to the quick-add command. */
  onOptimisticCreate?: (title: string) => string | undefined
  onOptimisticRollback?: (tempId: string) => void
  projectId?: string
  className?: string
}

interface TaskWithTime extends Task {
  displayStartTime?: string
  displayEndTime?: string
  duration?: number
}

// Height of one hour row in the time grid; task blocks are positioned with it.
const SLOT_HEIGHT = 60

/** "10:00 – 11:30", a start time, or the due time for tasks without a slot. */
function taskTimeLabel(task: TaskWithTime): string {
  if (task.displayStartTime && task.displayEndTime) return `${task.displayStartTime} – ${task.displayEndTime}`
  if (task.displayStartTime || task.displayEndTime) return (task.displayStartTime || task.displayEndTime)!
  if (task.dueDate) return `termin ${format(new Date(task.dueDate), "HH:mm")}`
  return ""
}

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'high': return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
    case 'medium': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20'
    case 'low': return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

// Draggable Task Component
function DraggableTask({ task, layout, top, height, isUpdating, onTaskClick, showAssignee = false }: {
  task: TaskWithTime
  layout: { width: number; left: number; column: number }
  top: number
  height: number
  isUpdating: boolean
  onTaskClick?: (task: Task) => void
  /** Single-column (phone) day view: people aren't columns, so tag the block. */
  showAssignee?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return draggable({
      element,
      getInitialData: () => ({ type: "daily-task", taskId: task.id }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [task.id])

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={[task.title, taskTimeLabel(task), showAssignee ? task.assignee?.name : undefined].filter(Boolean).join(", ")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onTaskClick?.(task)
        }
      }}
      className={`absolute overflow-hidden p-2 rounded-md border cursor-grab active:cursor-grabbing hover:shadow-sm transition-all pointer-events-auto outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-touch-callout:none] select-none ${getPriorityColor(task.priority)} ${isUpdating ? 'animate-pulse' : ''}`}
      style={{
        top: `${top}px`,
        height: `${height - 4}px`,
        left: `${layout.left}%`,
        width: `${layout.width - 2}%`,
        opacity: isDragging ? 0.5 : isUpdating ? 0.7 : 1,
        zIndex: isDragging ? 1000 : 10 + layout.column,
      }}
      onClick={() => {
        if (!isDragging && !isUpdating) {
          onTaskClick?.(task)
        }
      }}
    >
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1 text-xs font-medium truncate">{task.title}</div>
        {showAssignee && task.assignee?.name && (
          <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background/70 text-[10px] font-semibold">
            {task.assignee.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {(task.displayStartTime || task.displayEndTime) && (
        <div className="flex items-center gap-1 mt-1">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            {task.displayStartTime && task.displayEndTime
              ? `${task.displayStartTime} - ${task.displayEndTime}`
              : task.displayStartTime || task.displayEndTime
            }
          </span>
        </div>
      )}
      {task.priority && height > 40 && layout.width > 30 && (
        <Badge variant="secondary" className="text-xs mt-1">
          {task.priority}
        </Badge>
      )}
    </div>
  )
}

// Droppable Time Slot Component. In day view slots are keyed by assignee; in
// week view by date (empty assigneeId = keep the task's current assignee).
function DroppableTimeSlot({ assigneeId, hour, date, children }: {
  assigneeId: string
  hour: number
  /** ISO date of the slot's day (week view); day view uses the selected date. */
  date?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === "daily-task",
      getData: () => ({ assigneeId, hour, ...(date && { date }) }),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    })
  }, [assigneeId, hour, date])

  return (
    <div
      ref={ref}
      className={`min-h-[50px] p-1 transition-colors ${isOver ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 border-dashed border-2' : ''
        }`}
    >
      {children}
    </div>
  )
}

export function ProjectDailyView({
  tasks,
  onTaskClick,
  onCreateTask,
  onTaskUpdate,
  onTaskCreated,
  onOptimisticCreate,
  onOptimisticRollback,
  projectId,
  className
}: ProjectDailyViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week">("day")
  // Phones get a one-column timeline (day) and an agenda list (week) instead
  // of the wide grids.
  const isMobile = useIsMobile()
  // Side the next day/week slides in from after navigating.
  const [slideFrom, setSlideFrom] = useState<"left" | "right" | null>(null)
  const [swipeArea, setSwipeArea] = useState<HTMLDivElement | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())

  // Days of the week containing the selected date (Monday first).
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    })
  }, [selectedDate])

  // Update optimistic tasks when props tasks change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  // Generate time slots (8:00 - 18:00 in 1-hour intervals)
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour <= 18; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: `${hour}:00`
      })
    }
    return slots
  }, [])

  // Tasks scheduled/due on the given date, decorated with display times.
  // Used by both the day view (selected date) and the week view (each day).
  const tasksMatchingDate = useCallback((date: Date): TaskWithTime[] => {
    return optimisticTasks.filter(task => {
      // Check if task has startTime or endTime on the date
      if (task.startTime && isSameDay(new Date(task.startTime), date)) {
        return true
      }
      if (task.endTime && isSameDay(new Date(task.endTime), date)) {
        return true
      }
      // Also include tasks with dueDate on the date
      if (task.dueDate && isSameDay(new Date(task.dueDate), date)) {
        return true
      }
      return false
    }).map(task => {
      const taskWithTime: TaskWithTime = { ...task }

      if (task.startTime) {
        const startTime = new Date(task.startTime)
        taskWithTime.displayStartTime = format(startTime, 'HH:mm')
      }

      if (task.endTime) {
        const endTime = new Date(task.endTime)
        taskWithTime.displayEndTime = format(endTime, 'HH:mm')
      }

      if (task.startTime && task.endTime) {
        const start = new Date(task.startTime)
        const end = new Date(task.endTime)
        taskWithTime.duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 100)) / 100 // hours
      }

      return taskWithTime
    })
  }, [optimisticTasks])

  // Filter tasks for selected date (use optimistic tasks for immediate UI updates)
  const tasksForDate = useMemo(
    () => tasksMatchingDate(selectedDate),
    [tasksMatchingDate, selectedDate]
  )

  // Week view: tasks bucketed per day of the selected week.
  const tasksByWeekDay = useMemo(
    () => weekDays.map(day => ({ day, tasks: tasksMatchingDate(day) })),
    [weekDays, tasksMatchingDate]
  )

  // Group tasks by assignee
  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string, TaskWithTime[]> = {}

    // Add unassigned tasks group
    grouped['unassigned'] = []

    tasksForDate.forEach(task => {
      const assigneeId = task.assignee?.id || 'unassigned'
      if (!grouped[assigneeId]) {
        grouped[assigneeId] = []
      }
      grouped[assigneeId].push(task)
    })

    return grouped
  }, [tasksForDate])

  const navigateDate = (direction: 'prev' | 'next') => {
    setSlideFrom(direction === 'next' ? 'right' : 'left')
    if (viewMode === 'week') {
      setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1))
    } else if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1))
    } else {
      setSelectedDate(addDays(selectedDate, 1))
    }
  }

  const goToToday = () => {
    setSlideFrom(null)
    setSelectedDate(new Date())
  }

  // Swipe the calendar sideways to move a day (or week) back and forth.
  useSwipe(swipeArea, {
    axis: "x",
    onSwipe: (direction) => navigateDate(direction === "left" ? "next" : "prev"),
  })

  const formatDate = (date: Date) => {
    return format(date, "EEEE, d MMMM yyyy", { locale: pl })
  }



  const getTaskHeight = (task: TaskWithTime) => {
    if (task.startTime && task.endTime) {
      const start = new Date(task.startTime)
      const end = new Date(task.endTime)
      const startHour = start.getHours()
      const endHour = end.getHours()
      const startMinutes = start.getMinutes()
      const endMinutes = end.getMinutes()

      // Calculate duration in hours
      const durationHours = (endHour - startHour) + (endMinutes - startMinutes) / 60

      // Each hour slot is SLOT_HEIGHT px, so multiply by duration
      return Math.max(1, durationHours) * SLOT_HEIGHT
    }
    return SLOT_HEIGHT // Default height for 1 hour
  }

  const getTaskTopOffset = (task: TaskWithTime) => {
    if (task.startTime) {
      const start = new Date(task.startTime)
      const minutes = start.getMinutes()
      // Calculate offset based on minutes (SLOT_HEIGHT px per hour)
      return (minutes / 60) * SLOT_HEIGHT
    }
    return 0
  }

  // Check if two tasks overlap in time
  const tasksOverlap = (task1: TaskWithTime, task2: TaskWithTime) => {
    if (!task1.startTime || !task2.startTime) return false

    const start1 = new Date(task1.startTime)
    const end1 = task1.endTime ? new Date(task1.endTime) : new Date(start1.getTime() + 60 * 60 * 1000) // Default 1 hour
    const start2 = new Date(task2.startTime)
    const end2 = task2.endTime ? new Date(task2.endTime) : new Date(start2.getTime() + 60 * 60 * 1000) // Default 1 hour

    return start1 < end2 && start2 < end1
  }

  // Calculate layout for overlapping tasks using interval scheduling algorithm
  const calculateTaskLayout = (tasks: TaskWithTime[]) => {
    const layouts: Record<string, { width: number; left: number; column: number }> = {}

    // Filter tasks with time and sort by start time
    const timedTasks = tasks.filter(task => task.startTime).sort((a, b) => {
      return new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    })

    // Handle tasks without time separately
    const untimedTasks = tasks.filter(task => !task.startTime)

    if (timedTasks.length === 0) {
      // Only untimed tasks - give them full width
      untimedTasks.forEach(task => {
        layouts[task.id] = { width: 100, left: 0, column: 0 }
      })
      return layouts
    }

    // Find all overlapping groups using a more sophisticated algorithm
    const columns: TaskWithTime[][] = []

    for (const task of timedTasks) {
      // Find the first column where this task doesn't overlap with the last task
      let placedInColumn = false

      for (let i = 0; i < columns.length; i++) {
        const column = columns[i]
        const lastTaskInColumn = column[column.length - 1]

        if (!tasksOverlap(task, lastTaskInColumn)) {
          column.push(task)
          placedInColumn = true
          break
        }
      }

      // If no suitable column found, create a new one
      if (!placedInColumn) {
        columns.push([task])
      }
    }

    // Calculate layout based on columns
    const totalColumns = columns.length
    const columnWidth = totalColumns > 0 ? 100 / totalColumns : 100

    columns.forEach((column, columnIndex) => {
      column.forEach(task => {
        layouts[task.id] = {
          width: columnWidth,
          left: columnWidth * columnIndex,
          column: columnIndex
        }
      })
    })

    // Handle untimed tasks - place them in first column if available
    untimedTasks.forEach(task => {
      layouts[task.id] = {
        width: totalColumns > 0 ? columnWidth : 100,
        left: 0,
        column: 0
      }
    })

    return layouts
  }

  // Keep latest data accessible inside the drag monitor without re-registering it.
  const tasksForDateRef = useRef<TaskWithTime[]>(tasksForDate)
  // In week view a dragged task can come from any day of the week, so the drop
  // handler needs the whole week's tasks to find it.
  tasksForDateRef.current = viewMode === "week"
    ? tasksByWeekDay.flatMap(({ tasks }) => tasks)
    : tasksForDate
  const selectedDateRef = useRef<Date>(selectedDate)
  selectedDateRef.current = selectedDate
  const onTaskUpdateRef = useRef(onTaskUpdate)
  onTaskUpdateRef.current = onTaskUpdate

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "daily-task",
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return
        handleTaskDrop(
          source.data.taskId as string,
          target.data.assigneeId as string,
          target.data.hour as number,
          target.data.date as string | undefined
        )
      },
    })
  }, [])

  // Handle drag end. `dateIso` is set when dropping on a week-view slot (the
  // slot's day); day-view slots fall back to the selected date.
  const handleTaskDrop = async (taskId: string, assigneeId: string, hour: number, dateIso?: string) => {
    const onTaskUpdate = onTaskUpdateRef.current
    const selectedDate = selectedDateRef.current
    if (!onTaskUpdate) return

    const task = tasksForDateRef.current.find(t => t.id === taskId)
    if (!task) return

    const minute = 0

    // Calculate new start time
    const newStartTime = new Date(dateIso ? new Date(dateIso) : selectedDate)
    newStartTime.setHours(hour, minute, 0, 0)

    // Calculate new end time (preserve duration if exists)
    let newEndTime: Date | undefined
    if (task.startTime && task.endTime) {
      const originalStart = new Date(task.startTime)
      const originalEnd = new Date(task.endTime)
      const duration = originalEnd.getTime() - originalStart.getTime()
      newEndTime = new Date(newStartTime.getTime() + duration)
    } else if (task.endTime) {
      // If only endTime exists, set it to 1 hour after new start
      newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000)
    }

    // Prepare updates
    const updates: { startTime?: string; endTime?: string; assigneeId?: string } = {
      startTime: newStartTime.toISOString(),
    }

    if (newEndTime) {
      updates.endTime = newEndTime.toISOString()
    }

    // Check if assignee is changing. Week-view slots pass an empty assigneeId
    // (columns are days, not people) — the task keeps its current assignee.
    const isAssigneeChanging = !!assigneeId && assigneeId !== 'unassigned' && assigneeId !== task.assignee?.id
    const isUnassigning = assigneeId === 'unassigned' && task.assignee?.id

    if (isAssigneeChanging) {
      updates.assigneeId = assigneeId
    } else if (isUnassigning) {
      updates.assigneeId = undefined
    }

    // Store original task for potential rollback
    const originalTask = { ...task }

    // Optimistic update - immediately update UI
    setUpdatingTasks(prev => new Set(prev).add(taskId))
    setOptimisticTasks(prev =>
      prev.map(t => t.id === taskId ? {
        ...t,
        startTime: updates.startTime || t.startTime,
        endTime: updates.endTime || t.endTime,
        assignee: updates.assigneeId !== undefined
          ? ( undefined)
          : t.assignee
      } : t)
    )

    // Show loading toast
    const timeStr = format(newStartTime, 'HH:mm')
    const assigneeName = assigneeId === 'unassigned'
      ? 'nieprzypisane'
      :  'nieznany'

    toast.loading(`Przenoszenie zadania na ${timeStr} (${assigneeName})...`, {
      id: `move-task-${taskId}`,
      duration: 3000
    })

    try {
      await onTaskUpdate(taskId, updates)

      // Success toast
      toast.success(`Zadanie przeniesione na ${timeStr}`, {
        id: `move-task-${taskId}`
      })
    } catch (error) {
      console.error('Failed to update task:', error)

      // Rollback optimistic update on error
      setOptimisticTasks(prev =>
        prev.map(t => t.id === taskId ? originalTask : t)
      )

      // Error toast
      toast.error('Nie udało się przenieść zadania. Spróbuj ponownie.', {
        id: `move-task-${taskId}`
      })
    } finally {
      // Remove from updating tasks
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  // Block geometry shared by the day and week grids.
  const renderTaskBlocks = (dayTasks: TaskWithTime[], showAssignee = false) => {
    const taskLayouts = calculateTaskLayout(dayTasks)
    return dayTasks.map(task => {
      const height = getTaskHeight(task)
      const topOffset = getTaskTopOffset(task)
      const startHour = task.startTime ? new Date(task.startTime).getHours() : 8
      const slotIndex = startHour - 8 // 8 is the first hour
      const top = slotIndex * SLOT_HEIGHT + topOffset + 8 // + the hour label's top padding

      const layout = taskLayouts[task.id] || { width: 100, left: 0, column: 0 }

      return (
        <DraggableTask
          key={task.id}
          task={task}
          layout={layout}
          top={top}
          height={height}
          isUpdating={updatingTasks.has(task.id)}
          onTaskClick={onTaskClick}
          showAssignee={showAssignee}
        />
      )
    })
  }

  const hourRow = (hour: number, displayTime: string, slots: React.ReactNode, compact = false) => (
    <div
      key={hour}
      className={cn("grid border-b border-border", compact ? "grid-cols-[2.75rem_1fr] gap-2" : "grid-cols-[100px_1fr] gap-4")}
      style={{ height: SLOT_HEIGHT }}
    >
      <div className="flex items-start pt-2">
        <span className={cn("text-muted-foreground font-mono", compact ? "text-xs" : "text-sm")}>{displayTime}</span>
      </div>
      {slots}
    </div>
  )

  const weekRange = `${format(weekDays[0], "d MMM", { locale: pl })} – ${format(weekDays[6], "d MMM yyyy", { locale: pl })}`

  const dayView = isMobile ? (
    /* Telefon: jedna oś czasu; osoba przy zadaniu zamiast kolumn na osoby. */
    <div className="relative">
      <div>
        {timeSlots.map(({ hour, displayTime }) =>
          hourRow(hour, displayTime, (
            <DroppableTimeSlot assigneeId="" hour={hour}>
              <div></div>
            </DroppableTimeSlot>
          ), true)
        )}
      </div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="grid grid-cols-[2.75rem_1fr] gap-2 h-full">
          <div></div>
          <div className="relative">{renderTaskBlocks(tasksForDate, true)}</div>
        </div>
      </div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">

        {/* Time slots grid */}
        <div className="relative">
          {/* Time grid background */}
          <div>
            {timeSlots.map(({ hour, displayTime }) =>
              hourRow(hour, displayTime, (
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Object.keys(tasksByAssignee).length}, 1fr)` }}>
                  {Object.keys(tasksByAssignee).map(assigneeId => (
                    <DroppableTimeSlot key={`${assigneeId}-${hour}`} assigneeId={assigneeId} hour={hour}>
                      <div></div>
                    </DroppableTimeSlot>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Tasks overlay */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="grid grid-cols-[100px_1fr] gap-4 h-full">
              <div></div> {/* Time column spacer */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Object.keys(tasksByAssignee).length}, 1fr)` }}>
                {Object.keys(tasksByAssignee).map((assigneeId) => (
                  <div key={assigneeId} className="relative">
                    {renderTaskBlocks(tasksByAssignee[assigneeId] || [])}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const weekView = isMobile ? (
    /* Telefon: agenda — dni jeden pod drugim, zadania w kolejności godzin. */
    <ol className="space-y-2" aria-label={`Zadania w tygodniu ${weekRange}`}>
      {tasksByWeekDay.map(({ day, tasks: dayTasks }) => {
        const today = isSameDay(day, new Date())
        const sorted = [...dayTasks].sort((a, b) => {
          const time = (t: TaskWithTime) => new Date(t.startTime || t.dueDate || 0).getTime()
          return time(a) - time(b)
        })
        return (
          <li key={day.toISOString()} className={cn("rounded-xl border bg-card/60", today && "border-primary/40")}>
            <button
              type="button"
              onClick={() => { setSlideFrom(null); setSelectedDate(day); setViewMode("day") }}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left"
              aria-label={`${format(day, "EEEE, d MMMM", { locale: pl })}: ${dayTasks.length} zadań — pokaż dzień`}
            >
              <span className={cn("text-sm font-medium first-letter:uppercase", today ? "text-primary" : "text-foreground")}>
                {format(day, "EEEE, d MMMM", { locale: pl })}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {today && <Badge variant="secondary" className="text-[10px]">Dziś</Badge>}
                <span className="tabular-nums">{dayTasks.length}</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
            {sorted.length > 0 && (
              <ul className="space-y-1.5 border-t px-2 py-2">
                {sorted.map(task => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onTaskClick?.(task)}
                      className={cn("flex min-h-11 w-full items-center gap-3 rounded-md border px-2.5 py-2 text-left", getPriorityColor(task.priority))}
                    >
                      <span className="w-[5.5rem] shrink-0 font-mono text-[11px] tabular-nums opacity-80">{taskTimeLabel(task) || "—"}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  ) : (
    /* Widok tygodniowy: kolumny = dni tygodnia, wiersze = godziny. */
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Nagłówki dni */}
        <div className="grid grid-cols-[100px_1fr] gap-4 border-b pb-2 mb-1">
          <div></div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => { setSlideFrom(null); setSelectedDate(day); setViewMode("day") }}
                title="Przejdź do widoku dnia"
                className={`text-center text-sm rounded py-1 transition-colors hover:bg-muted ${
                  isSameDay(day, new Date())
                    ? "font-semibold text-primary bg-primary/10"
                    : "font-medium text-muted-foreground"
                }`}
              >
                {format(day, "EEE d.MM", { locale: pl })}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          {/* Siatka godzin */}
          <div>
            {timeSlots.map(({ hour, displayTime }) =>
              hourRow(hour, displayTime, (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(day => (
                    <DroppableTimeSlot
                      key={`${day.toISOString()}-${hour}`}
                      assigneeId=""
                      hour={hour}
                      date={day.toISOString()}
                    >
                      <div></div>
                    </DroppableTimeSlot>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Nakładka z zadaniami */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="grid grid-cols-[100px_1fr] gap-4 h-full">
              <div></div> {/* Time column spacer */}
              <div className="grid grid-cols-7 gap-2">
                {tasksByWeekDay.map(({ day, tasks: dayTasks }) => (
                  <div key={day.toISOString()} className="relative">
                    {renderTaskBlocks(dayTasks)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4" />
            {viewMode === "day" ? "Widok dzienny" : "Widok tygodniowy"}
          </h2>
          <p className="text-xs text-muted-foreground first-letter:uppercase" aria-live="polite">
            {viewMode === "day"
              ? isMobile ? formatDate(selectedDate) : `Zadania z podziałem na osoby i godziny dla ${formatDate(selectedDate)}`
              : isMobile ? weekRange : `Zadania w tygodniu ${weekRange}`}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          {/* Przełącznik widoku dzień / tydzień */}
          <div role="group" aria-label="Zakres kalendarza" className="flex items-center rounded-md border p-0.5">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 pointer-coarse:h-8 pointer-coarse:px-3"
              aria-pressed={viewMode === "day"}
              onClick={() => { setSlideFrom(null); setViewMode("day") }}
            >
              Dzień
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 pointer-coarse:h-8 pointer-coarse:px-3"
              aria-pressed={viewMode === "week"}
              onClick={() => { setSlideFrom(null); setViewMode("week") }}
            >
              Tydzień
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 pointer-coarse:size-9"
              onClick={() => navigateDate('prev')}
              aria-label={viewMode === "day" ? "Poprzedni dzień" : "Poprzedni tydzień"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="pointer-coarse:h-9" onClick={goToToday}>
              {isMobile ? "Dziś" : "Dzisiaj"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 pointer-coarse:size-9"
              onClick={() => navigateDate('next')}
              aria-label={viewMode === "day" ? "Następny dzień" : "Następny tydzień"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <DatePicker
              value={selectedDate}
              onChange={(date) => {
                if (!date) return
                setSlideFrom(null)
                setSelectedDate(date)
              }}
              compact={isMobile}
              className={isMobile ? "size-9" : "ml-1 h-8 w-auto"}
            />
          </div>
          {projectId && (
            <div className="min-w-0 basis-full sm:w-56 sm:basis-auto">
              <QuickAddTaskCommand
                projectId={projectId}
                onTaskCreated={onTaskCreated}
                onOptimisticCreate={onOptimisticCreate}
                onOptimisticRollback={onOptimisticRollback}
              />
            </div>
          )}
          {onCreateTask && (
            <Button onClick={onCreateTask} size="sm" className="max-sm:hidden">
              <Plus className="mr-2 h-4 w-4" />
              Dodaj zadanie
            </Button>
          )}
        </div>
      </div>

      {/* Swiping sideways moves to the previous / next day or week; vertical
          scrolling and pinch zoom stay with the browser. */}
      <div ref={setSwipeArea} className="touch-pan-y touch-pinch-zoom">
        <div
          key={`${viewMode}-${selectedDate.toDateString()}`}
          className={cn(
            slideFrom && "animate-in fade-in-0 duration-200",
            slideFrom === "right" && "slide-in-from-right-8",
            slideFrom === "left" && "slide-in-from-left-8"
          )}
        >
          {viewMode === "day" ? dayView : weekView}

          {viewMode === "day" && tasksForDate.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Brak zadań na ten dzień</h3>
              <p className="text-muted-foreground mb-4">
                Nie ma żadnych zadań zaplanowanych na {formatDate(selectedDate)}
              </p>
              {onCreateTask && (
                <Button onClick={onCreateTask}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj zadanie
                </Button>
              )}
            </div>
          )}
          {viewMode === "week" && !isMobile && tasksByWeekDay.every(({ tasks: dayTasks }) => dayTasks.length === 0) && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Brak zadań w tym tygodniu</h3>
              <p className="text-muted-foreground mb-4">
                Nie ma żadnych zadań zaplanowanych w tym tygodniu
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
