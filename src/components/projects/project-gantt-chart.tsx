"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  Clock,
  Filter
} from "lucide-react"
import { type Task } from "@/types"
import { format, parseISO, addDays, startOfDay, endOfDay } from "date-fns"
import { pl } from "date-fns/locale"

interface ProjectGanttChartProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  className?: string
}

interface GanttTask {
  id: string
  title: string
  startDate: Date
  endDate: Date
  progress: number
  assignee?: {
    id: string
    name: string
    avatarUrl?: string | null
  }
  priority?: string
  status?: string
  color: string
  dependencies?: string[]
}

interface TimelineScale {
  scale: 'days' | 'weeks' | 'months'
  label: string
}

const TIMELINE_SCALES: TimelineScale[] = [
  { scale: 'days', label: 'Dni' },
  { scale: 'weeks', label: 'Tygodnie' },
  { scale: 'months', label: 'Miesiące' }
]

const PRIORITY_COLORS = {
  high: '#ef4444', // red-500
  medium: '#f59e0b', // amber-500
  low: '#10b981', // emerald-500
}

const STATUS_COLORS = {
  'todo': '#6b7280', // gray-500
  'in-progress': '#3b82f6', // blue-500
  'review': '#f59e0b', // amber-500
  'done': '#10b981', // emerald-500
}

export function ProjectGanttChart({ tasks, onTaskClick }: ProjectGanttChartProps) {
  const [timelineScale, setTimelineScale] = useState<'days' | 'weeks' | 'months'>('weeks')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [currentDate] = useState(new Date())

  // Transform tasks to Gantt format
  const ganttTasks = useMemo((): GanttTask[] => {
    return tasks
      .filter(task => task.dueDate || task.createdAt) // Only tasks with dates
      .map(task => {
        const createdDate = parseISO(task.createdAt)
        const dueDate = task.dueDate ? parseISO(task.dueDate) : addDays(createdDate, 7) // Default 7 days if no due date

        // Calculate progress based on subtasks completion
        const completedSubtasks = task.subtasks.filter(st => st.isCompleted).length
        const totalSubtasks = task.subtasks.length
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

        // Determine color based on priority or status
        const color = task.priority
          ? PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || STATUS_COLORS['todo']
          : STATUS_COLORS[task.statusId as keyof typeof STATUS_COLORS] || task.project?.color || '#3b82f6'

        return {
          id: task.id,
          title: task.title,
          startDate: createdDate,
          endDate: dueDate,
          progress,
          assignee: task.assignee,
          priority: task.priority,
          status: task.statusId,
          color,
          dependencies: [] // TODO: implement task dependencies
        }
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [tasks])

  // Calculate date range for timeline
  const dateRange = useMemo(() => {
    if (ganttTasks.length === 0) {
      const start = startOfDay(currentDate)
      return {
        start,
        end: addDays(start, 30)
      }
    }

    const allDates = ganttTasks.flatMap(task => [task.startDate, task.endDate])
    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Add some padding
    return {
      start: addDays(startOfDay(earliestDate), -7),
      end: addDays(endOfDay(latestDate), 7)
    }
  }, [ganttTasks, currentDate])

  // Generate timeline columns based on scale
  const timelineColumns = useMemo(() => {
    const columns = []
    const { start, end } = dateRange
    let current = new Date(start)

    while (current <= end) {
      let nextDate: Date
      let formatStr: string

      switch (timelineScale) {
        case 'days':
          formatStr = 'd'
          nextDate = addDays(current, 1)
          break
        case 'weeks':
          formatStr = 'w'
          nextDate = addDays(current, 7)
          break
        case 'months':
          formatStr = 'MMM'
          nextDate = addDays(current, 30)
          break
        default:
          formatStr = 'd'
          nextDate = addDays(current, 1)
      }

      columns.push({
        date: new Date(current),
        label: format(current, formatStr, { locale: pl }),
        fullLabel: format(current, 'dd.MM.yyyy', { locale: pl })
      })

      current = nextDate
    }

    return columns
  }, [dateRange, timelineScale])

  // Calculate task bar position and width
  const getTaskBarStyle = (task: GanttTask) => {
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    const startOffset = Math.ceil((task.startDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))

    const leftPercent = (startOffset / totalDays) * 100
    const widthPercent = (duration / totalDays) * 100

    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.max(1, widthPercent)}%`,
      backgroundColor: task.color,
    }
  }

  const handleTaskClick = (task: GanttTask) => {
    setSelectedTaskId(task.id)
    const originalTask = tasks.find(t => t.id === task.id)
    if (originalTask && onTaskClick) {
      onTaskClick(originalTask)
    }
  }

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high': return 'Wysoki'
      case 'medium': return 'Średni'
      case 'low': return 'Niski'
      default: return priority
    }
  }

  if (ganttTasks.length === 0) {
    return (
      <div>
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Wykres Gantta</span>
          </div>
          <div>
            Wizualizacja terminów i postępu zadań w projekcie
          </div>
        </div>
        <div>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak zadań z datami</h3>
            <p className="text-gray-500">
              Dodaj terminy do zadań, aby zobaczyć wykres Gantta
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Wykres Gantta</span>
            </div>
            <div>
              Wizualizacja terminów i postępu zadań w projekcie
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Timeline Scale Selector */}
            <div className="flex items-center border rounded-lg">
              {TIMELINE_SCALES.map((scale) => (
                <Button
                  key={scale.scale}
                  variant={timelineScale === scale.scale ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimelineScale(scale.scale)}
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {scale.label}
                </Button>
              ))}
            </div>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtry
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="gantt-container">
          {/* Header with timeline */}
          <div className="gantt-header grid grid-cols-12 border-b">
            <div className="col-span-4 p-3 bg-gray-50 font-medium border-r">
              Zadanie
            </div>
            <div className="col-span-8 relative">
              <div className="flex h-12 items-center">
                {timelineColumns.map((column) => (
                  <div
                    key={column.date.toISOString()}
                    className="flex-1 text-center text-xs font-medium px-1 border-r last:border-r-0"
                    title={column.fullLabel}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task rows */}
          <div className="gantt-body">
            {ganttTasks.map((task) => (
              <div
                key={task.id}
                className={`gantt-row grid grid-cols-12 border-b hover:bg-gray-50 ${
                  selectedTaskId === task.id ? 'bg-blue-50' : ''
                }`}
              >
                {/* Task info column */}
                <div className="col-span-4 p-3 border-r">
                  <div className="space-y-1">
                    <div className="font-medium text-sm truncate">{task.title}</div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {task.assignee && (
                        <div className="flex items-center space-x-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={task.assignee.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {task.assignee.name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{task.assignee.name}</span>
                        </div>
                      )}
                      {task.priority && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: task.color, color: task.color }}
                        >
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(task.startDate, 'dd.MM')} - {format(task.endDate, 'dd.MM')}
                    </div>
                  </div>
                </div>

                {/* Timeline column */}
                <div className="col-span-8 relative p-2">
                  <div className="relative h-8">
                    {/* Task bar */}
                    <div
                      className="absolute top-1 h-6 rounded cursor-pointer transition-all hover:shadow-md"
                      style={getTaskBarStyle(task)}
                      onClick={() => handleTaskClick(task)}
                      title={`${task.title} (${task.progress.toFixed(0)}%)`}
                    >
                      {/* Progress indicator */}
                      {task.progress > 0 && (
                        <div
                          className="h-full bg-black bg-opacity-20 rounded-l"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}

                      {/* Task label */}
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-white text-xs font-medium truncate">
                          {task.title}
                        </span>
                      </div>
                    </div>

                    {/* Today indicator */}
                    {(() => {
                      const todayOffset = Math.ceil((currentDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
                      const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
                      const todayPercent = (todayOffset / totalDays) * 100

                      if (todayPercent >= 0 && todayPercent <= 100) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                            style={{ left: `${todayPercent}%` }}
                            title="Dzisiaj"
                          />
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Dzisiaj</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-black bg-opacity-20 rounded"></div>
              <span>Postęp</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>Kliknij zadanie, aby zobaczyć szczegóły</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
