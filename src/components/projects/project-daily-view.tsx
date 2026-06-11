"use client"

import { useState, useMemo, useEffect, useRef } from "react"
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
import { format, addDays, subDays, isSameDay } from "date-fns"
import { pl } from "date-fns/locale"
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { toast } from "sonner"
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

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Draggable Task Component
function DraggableTask({ task, layout, top, height, isUpdating, onTaskClick }: {
  task: TaskWithTime
  layout: { width: number; left: number; column: number }
  top: number
  height: number
  isUpdating: boolean
  onTaskClick?: (task: Task) => void
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
      className={`absolute p-2 rounded-md border cursor-grab active:cursor-grabbing hover:shadow-sm transition-all pointer-events-auto ${getPriorityColor(task.priority)} ${isUpdating ? 'animate-pulse' : ''}`}
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
      <div className="text-xs font-medium truncate">{task.title}</div>
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

// Droppable Time Slot Component
function DroppableTimeSlot({ assigneeId, hour, children }: {
  assigneeId: string
  hour: number
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
      getData: () => ({ assigneeId, hour }),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    })
  }, [assigneeId, hour])

  return (
    <div
      ref={ref}
      className={`min-h-[50px] p-1 transition-colors ${isOver ? 'bg-blue-50 border-blue-200 border-dashed border-2' : ''
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
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())

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

  // Filter tasks for selected date (use optimistic tasks for immediate UI updates)
  const tasksForDate = useMemo(() => {
    return optimisticTasks.filter(task => {
      // Check if task has startTime or endTime on selected date
      if (task.startTime && isSameDay(new Date(task.startTime), selectedDate)) {
        return true
      }
      if (task.endTime && isSameDay(new Date(task.endTime), selectedDate)) {
        return true
      }
      // Also include tasks with dueDate on selected date
      if (task.dueDate && isSameDay(new Date(task.dueDate), selectedDate)) {
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
  }, [optimisticTasks, selectedDate])

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
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1))
    } else {
      setSelectedDate(addDays(selectedDate, 1))
    }
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

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

      // Each hour slot is 60px (min-h-[60px]), so multiply by duration
      return Math.max(1, durationHours) * 60
    }
    return 60 // Default height for 1 hour
  }

  const getTaskTopOffset = (task: TaskWithTime) => {
    if (task.startTime) {
      const start = new Date(task.startTime)
      const minutes = start.getMinutes()
      // Calculate offset based on minutes (60px per hour)
      return (minutes / 60) * 60
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
  tasksForDateRef.current = tasksForDate
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
          target.data.hour as number
        )
      },
    })
  }, [])

  // Handle drag end
  const handleTaskDrop = async (taskId: string, assigneeId: string, hour: number) => {
    const onTaskUpdate = onTaskUpdateRef.current
    const selectedDate = selectedDateRef.current
    if (!onTaskUpdate) return

    const task = tasksForDateRef.current.find(t => t.id === taskId)
    if (!task) return

    const minute = 0

    // Calculate new start time
    const newStartTime = new Date(selectedDate)
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

    // Check if assignee is changing
    const isAssigneeChanging = assigneeId !== 'unassigned' && assigneeId !== task.assignee?.id
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

  return (
    <div className={className}>
        <div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Widok dzienny
              </div>
              <div>
                Zadania z podziałem na osoby i godziny dla {formatDate(selectedDate)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                {projectId && (
                  <QuickAddTaskCommand
                    projectId={projectId}
                    onTaskCreated={onTaskCreated}
                    onOptimisticCreate={onOptimisticCreate}
                    onOptimisticRollback={onOptimisticRollback}
                  />
                )}
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Dzisiaj
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {onCreateTask && (
                  <Button onClick={onCreateTask} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj zadanie
                  </Button>
                )}



                <DatePicker
                  value={selectedDate}
                  onChange={(date) => date && setSelectedDate(date)}
                />
              </div>

            </div>
          </div>
        </div>
        <div>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">

              {/* Time slots grid */}
              <div className="relative">
                {/* Time grid background */}
                <div className="space-y-1">
                  {timeSlots.map(({ hour, displayTime }) => (
                    <div key={hour} className="grid grid-cols-[100px_1fr] gap-4 min-h-[60px] border-b border-gray-100">
                      <div className="flex items-start pt-2">
                        <span className="text-sm text-muted-foreground font-mono">{displayTime}</span>
                      </div>
                      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Object.keys(tasksByAssignee).length}, 1fr)` }}>
                        {Object.keys(tasksByAssignee).map(assigneeId => (
                          <DroppableTimeSlot key={`${assigneeId}-${hour}`} assigneeId={assigneeId} hour={hour}>
                            <div></div>
                          </DroppableTimeSlot>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tasks overlay */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  <div className="grid grid-cols-[100px_1fr] gap-4 h-full">
                    <div></div> {/* Time column spacer */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Object.keys(tasksByAssignee).length}, 1fr)` }}>
                      {Object.keys(tasksByAssignee).map((assigneeId) => {
                        const assigneeTasks = tasksByAssignee[assigneeId] || []
                        const taskLayouts = calculateTaskLayout(assigneeTasks)

                        return (
                          <div key={assigneeId} className="relative">
                            {assigneeTasks.map(task => {
                              const height = getTaskHeight(task)
                              const topOffset = getTaskTopOffset(task)
                              const startHour = task.startTime ? new Date(task.startTime).getHours() : 8
                              const slotIndex = startHour - 8 // 8 is the first hour
                              const top = slotIndex * 61 + topOffset + 8 // 61px per slot (60px + 1px border) + 8px padding

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
                                />
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {tasksForDate.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Brak zadań na ten dzień</h3>
              <p className="text-gray-500 mb-4">
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
        </div>
      </div>
  )
}
