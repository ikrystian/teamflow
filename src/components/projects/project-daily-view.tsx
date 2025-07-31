"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Plus
} from "lucide-react"
import { type Task } from "@/types"
import { format, addDays, subDays, startOfDay, endOfDay, isSameDay } from "date-fns"
import { pl } from "date-fns/locale"

interface ProjectDailyViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onCreateTask?: () => void
  teamMembers: Array<{
    id: string
    name: string
    email: string
    avatarUrl?: string
  }>
  className?: string
}

interface TaskWithTime extends Task {
  displayStartTime?: string
  displayEndTime?: string
  duration?: number
}

export function ProjectDailyView({
  tasks,
  onTaskClick,
  onCreateTask,
  teamMembers,
  className
}: ProjectDailyViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

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

  // Filter tasks for selected date
  const tasksForDate = useMemo(() => {
    return tasks.filter(task => {
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
  }, [tasks, selectedDate])

  // Group tasks by assignee
  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string, TaskWithTime[]> = {}

    // Initialize with all team members
    teamMembers.forEach(member => {
      grouped[member.id] = []
    })

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
  }, [tasksForDate, teamMembers])

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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Widok dzienny
            </CardTitle>
            <CardDescription>
              Zadania z podziałem na osoby i godziny dla {formatDate(selectedDate)}
            </CardDescription>
          </div>
          <div>
            <div className="flex items-center space-x-2">
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

            </div>
            <div>
            </div>
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header with team members */}
            <div className="grid grid-cols-[100px_1fr] gap-4 mb-4">
              <div className="text-sm font-medium text-muted-foreground">Czas</div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Object.keys(tasksByAssignee).length}, 1fr)` }}>
                {Object.entries(tasksByAssignee).map(([assigneeId, tasks]) => {
                  const member = teamMembers.find(m => m.id === assigneeId)
                  return (
                    <div key={assigneeId} className="text-center">
                      {assigneeId === 'unassigned' ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <span className="text-sm font-medium">Nieprzypisane</span>
                          <span className="text-xs text-muted-foreground">{tasks.length} zadań</span>
                        </div>
                      ) : member ? (
                        <div className="flex flex-col items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{tasks.length} zadań</span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

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
                        <div key={`${assigneeId}-${hour}`} className="min-h-[50px] p-1">
                          {/* Empty slot for background grid */}
                        </div>
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
                              <div
                                key={task.id}
                                className={`absolute p-2 rounded-md border cursor-pointer hover:shadow-sm transition-shadow pointer-events-auto ${getPriorityColor(task.priority)}`}
                                style={{
                                  top: `${top}px`,
                                  height: `${height - 4}px`, // Subtract padding
                                  left: `${layout.left}%`,
                                  width: `${layout.width - 2}%`, // Subtract small margin between tasks
                                  zIndex: 10 + layout.column // Higher z-index for later columns
                                }}
                                onClick={() => onTaskClick?.(task)}
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
      </CardContent>
    </Card>
  )
}
